// Parte servidor de las consultas de Collection: Bitrix, newsletter e IP.
// Sin "use server": lo importan las actions. Nada de esto tira hacia afuera.

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { crearNegocioLead, mensajeErrorCrm } from "@/lib/bitrix";
import { touchSchema, type Touch } from "@/lib/atribucion";
import { leerAjustesCollection } from "@/lib/collection/ajustes";
import { leadDesdeConsulta } from "@/lib/collection/consultas";
import { emailConfirmarNewsletter, FROM_COLLECTION, SITIO_COLLECTION } from "@/lib/collection/emails";

const log = logger.child({ module: "collection.consultas" });

export function ipDelCliente(): string | null {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    return fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip");
  } catch {
    return null;
  }
}

/** Título de lo publicado (la foto del momento de publicar); cae al de la fila. */
export function tituloPublicado(e: { titulo: string; publicado: unknown }): string {
  const campos = (e.publicado as { campos?: { titulo?: unknown } } | null)?.campos;
  const t = typeof campos?.titulo === "string" ? campos.titulo.trim() : "";
  return t || e.titulo;
}

export function whatsappUrl(numero: string | null | undefined): string | null {
  const d = (numero ?? "").replace(/\D/g, "");
  return d.length >= 8 ? `https://wa.me/${d}` : null;
}

function parseTouch(raw: unknown): Touch | null {
  const p = touchSchema.safeParse(raw);
  return p.success ? p.data : null;
}

/**
 * Manda la consulta a Bitrix (mismo contrato que enviarLeadCotizadorABitrix).
 * SALTEADO = no existe o ya está enviada/en curso. BITRIX_OFF=1 corta antes.
 */
export async function enviarConsultaABitrix(id: string): Promise<"OK" | "ERROR" | "SALTEADO"> {
  if (process.env.BITRIX_OFF === "1") return "SALTEADO";
  try {
    const c = await prisma.colConsulta.findUnique({
      where: { id },
      include: { experiencia: { select: { titulo: true, publicado: true } } },
    });
    if (!c) return "SALTEADO";

    // Claim atómico: dos requests a la vez no crean dos negocios.
    const claim = await prisma.colConsulta.updateMany({
      where: { id, OR: [{ crmEstado: null }, { crmEstado: "ERROR" }] },
      data: { crmEstado: "PENDIENTE" },
    });
    if (claim.count === 0) return "SALTEADO";

    try {
      const ajustes = await leerAjustesCollection();
      const lead = leadDesdeConsulta(c, {
        tituloExperiencia: c.experiencia ? tituloPublicado(c.experiencia) : null,
        sourceId: ajustes.bitrixOrigen || null,
        first: parseTouch(c.atribFirst),
        last: parseTouch(c.atribLast),
      });
      const res = await crearNegocioLead(lead);
      if (res) {
        log.info("consulta bitrix ok", { id, modo: res.modo, dealId: res.dealId });
        await prisma.colConsulta.update({
          where: { id },
          data: {
            crmEstado: "OK",
            crmDealId: String(res.dealId),
            crmContactId: res.contactId === null ? null : String(res.contactId),
            crmModo: res.modo,
            crmError: null,
            crmEnviadoEn: new Date(),
            crmIntentos: { increment: 1 },
          },
        });
        return "OK";
      }
      await prisma.colConsulta.update({
        where: { id },
        data: {
          crmEstado: "ERROR",
          crmError: "Bitrix sin webhook configurado (BITRIX_WEBHOOK_URL).",
          crmIntentos: { increment: 1 },
        },
      });
      return "ERROR";
    } catch (err) {
      log.error("consulta bitrix failed", err);
      await prisma.colConsulta.update({
        where: { id },
        data: { crmEstado: "ERROR", crmError: mensajeErrorCrm(err), crmIntentos: { increment: 1 } },
      });
      return "ERROR";
    }
  } catch (err) {
    log.error("consulta bitrix outer failed", err);
    return "ERROR";
  }
}

/**
 * Crea o refresca la suscripción PENDIENTE con token nuevo y manda el mail
 * de confirmación. Un CONFIRMADO no se toca ni se reenvía. Nunca tira.
 */
export async function pedirConfirmacionNewsletter(emailCrudo: string, origen: string): Promise<boolean> {
  try {
    const email = emailCrudo.trim().toLowerCase();
    const previo = await prisma.colSuscriptor.findUnique({ where: { email }, select: { estado: true } });
    if (previo?.estado === "CONFIRMADO") return false;

    const token = randomBytes(24).toString("base64url");
    await prisma.colSuscriptor.upsert({
      where: { email },
      create: { email, token, origen: origen.slice(0, 80) },
      update: { token, estado: "PENDIENTE", bajaEn: null },
    });

    const tmpl = emailConfirmarNewsletter({
      confirmUrl: `${SITIO_COLLECTION}/newsletter/confirmar?token=${token}`,
      bajaUrl: `${SITIO_COLLECTION}/newsletter/baja?token=${token}`,
    });
    const res = await sendEmail({
      to: email,
      from: FROM_COLLECTION,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
      unsubscribeUrl: tmpl.unsubscribeUrl,
    });
    return res.delivered;
  } catch (err) {
    log.error("newsletter confirm failed", err);
    return false;
  }
}
