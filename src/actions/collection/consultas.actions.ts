"use server";

// Consultas del sitio público de Collection (sin auth): guarda la consulta,
// la manda a Bitrix y avisa por mail. Todo lo posterior al guardado es
// best-effort: la consulta ya quedó en la base. Sin prisma.$transaction.

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { checkFormRate } from "@/lib/rate-limit";
import { leerAtribucion } from "@/lib/atribucion-server";
import { resumenPauta } from "@/lib/atribucion";
import { SITE_BASE_URL } from "@/lib/cotizador-email";
import { fallar } from "@/lib/presupuesto/acceso";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";
import { leerAjustesCollection } from "@/lib/collection/ajustes";
import {
  consultaSchema,
  datosParaEquipo,
  fechaDeIso,
  numeroConsulta,
  resumenParaViajero,
} from "@/lib/collection/consultas";
import {
  enviarConsultaABitrix,
  ipDelCliente,
  pedirConfirmacionNewsletter,
  tituloPublicado,
  whatsappUrl,
} from "@/lib/collection/consultas-servidor";
import { emailAvisoConsulta, emailConfirmacionConsulta, FROM_COLLECTION } from "@/lib/collection/emails";

const log = logger.child({ module: "collection.consultas.public" });

export interface ConsultaEnviada {
  /** TC-0412 */
  numero: string;
  especialista?: { nombre: string };
}

export async function enviarConsultaCollection(
  input: Record<string, unknown> & { website?: string },
): Promise<Resultado<ConsultaEnviada>> {
  return ejecutar("enviarConsultaCollection", async () => {
    // Honeypot: los bots completan "website". Respondemos como si hubiera salido.
    if (typeof input?.website === "string" && input.website.trim()) {
      return { numero: numeroConsulta(0) };
    }
    if (!checkFormRate("col-consulta", ipDelCliente()).allowed) {
      fallar("Recibimos varios envíos desde tu conexión. Probá de nuevo más tarde.");
    }
    const { website: _website, ...resto } = input ?? {};
    const p = consultaSchema.safeParse(resto);
    if (!p.success) fallar(p.error.issues[0]?.message ?? "Revisá los datos.");
    const d = p.data;

    // Solo experiencias publicadas. Si el slug ya no existe, la consulta entra
    // igual como "contacto" y no se pierde.
    const exp = d.experienciaSlug
      ? await prisma.colExperiencia.findFirst({
          where: { slug: d.experienciaSlug, estado: "PUBLICADA" },
          select: {
            id: true,
            titulo: true,
            publicado: true,
            especialista: {
              select: {
                id: true,
                nombre: true,
                email: true,
                whatsapp: true,
                retrato: { select: { url: true, variantes: true } },
              },
            },
          },
        })
      : null;
    const tituloExp = exp ? tituloPublicado(exp) : null;
    const esp = exp?.especialista ?? null;

    const atrib = leerAtribucion();
    const fila = await prisma.colConsulta.create({
      data: {
        tipo: exp ? "experiencia" : "contacto",
        experienciaId: exp?.id ?? null,
        especialistaId: esp?.id ?? null,
        nombre: d.nombre,
        email: d.email,
        telefono: d.telefono,
        paisCodigo: d.paisCodigo ?? null,
        ocasion: d.ocasion,
        destinos: d.destinos,
        estilo: d.estilo,
        fechaTipo: d.fechaTipo,
        fechaDesde: fechaDeIso(d.fechaDesde),
        fechaHasta: fechaDeIso(d.fechaHasta),
        mesAproximado: d.mesAproximado,
        noches: d.noches ?? null,
        adultos: d.adultos,
        ninos: d.ninos,
        edadesNinos: d.edadesNinos,
        inversion: d.inversion,
        canal: d.canal,
        comentarios: d.comentarios,
        aceptaNovedades: d.aceptaNovedades,
        origenUrl: d.origenUrl,
        atribFirst: atrib?.first ?? undefined,
        atribLast: atrib?.last ?? undefined,
        visitanteId: atrib?.vid,
      },
    });
    const numero = numeroConsulta(fila.numero);
    const pauta = resumenPauta(atrib?.first, atrib?.last);

    // (a) Bitrix, igual que las landings.
    await enviarConsultaABitrix(fila.id);

    const ajustes = await leerAjustesCollection().catch(() => null);

    // (b) Aviso interno: especialista + lista de ajustes, sin repetidos.
    try {
      const destinatarios = Array.from(
        new Set(
          [esp?.email ?? "", ...(ajustes?.emailsConsultas ?? "").split(",")]
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      if (destinatarios.length > 0) {
        const tel = [d.paisCodigo, d.telefono].filter(Boolean).join(" ");
        const tmpl = emailAvisoConsulta({
          numero,
          nombre: d.nombre,
          origen: tituloExp ?? "Contactanos",
          datos: datosParaEquipo(fila, tituloExp, pauta),
          mensaje: d.comentarios,
          mailtoUrl: `mailto:${d.email}?subject=${encodeURIComponent(`Tu consulta ${numero} en Traveloz Collection`)}`,
          whatsappUrl: whatsappUrl(tel),
          panelUrl: `${SITE_BASE_URL}/backend/collection/consultas?abrir=${fila.id}`,
        });
        const r = await sendEmail({
          to: destinatarios,
          from: FROM_COLLECTION,
          replyTo: d.email,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
        });
        if (r.delivered) await prisma.colConsulta.update({ where: { id: fila.id }, data: { avisoEnviado: true } });
      }
    } catch (err) {
      log.error("consulta.aviso failed", err);
    }

    // (c) Confirmación al viajero.
    try {
      const retrato = esp?.retrato
        ? ((esp.retrato.variantes as { w: number; url: string }[] | null) ?? []).find((v) => v.w === 480)?.url ??
          esp.retrato.url
        : null;
      const tmpl = emailConfirmacionConsulta({
        nombre: d.nombre,
        numero,
        especialista: esp ? { nombre: esp.nombre, fotoUrl: retrato, whatsappUrl: whatsappUrl(esp.whatsapp) } : null,
        resumen: resumenParaViajero(fila, tituloExp),
        horario: ajustes?.horario ?? "",
      });
      const r = await sendEmail({
        to: d.email,
        from: FROM_COLLECTION,
        replyTo: esp?.email || ajustes?.emailsConsultas.split(",")[0]?.trim() || undefined,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
      if (r.delivered) await prisma.colConsulta.update({ where: { id: fila.id }, data: { confirmacionEnviada: true } });
    } catch (err) {
      log.error("consulta.confirmacion failed", err);
    }

    // Novedades: doble confirmación, mismo flujo que el newsletter.
    if (d.aceptaNovedades) await pedirConfirmacionNewsletter(d.email, "consulta");

    return { numero, ...(esp ? { especialista: { nombre: esp.nombre } } : {}) };
  });
}
