// Envío de los leads de las landings de marca (CotizadorLead) a Bitrix24.
// Espejo del bloque de submitQuoteForm (public-forms.actions.ts): mismo
// contrato de crmEstado / crmDealId / crmContactId / crmModo / crmError.

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { crearNegocioLead, mensajeErrorCrm, type ConsultaLead } from "@/lib/bitrix";
import { parseRespuestas } from "@/lib/cotizador-form";
import { SITE_BASE_URL } from "@/lib/cotizador-email";
import { resumenPauta, touchSchema, utmDePauta, type Touch } from "@/lib/atribucion";

const log = logger.child({ module: "cotizador.crm" });

const MAX_INTENTOS = 3;
const PAUSA_ENTRE_LEADS_MS = 500;

const IDS_PROPIOS = new Set([
  "telefono",
  "destino",
  "fechas",
  "adultos",
  "ninos",
  "infantes",
  "observaciones",
  "promos",
]);

const MESES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11,
};

/** Inversa de `dateFmt` de cotizador-form: "21 oct. 2026" → medianoche UTC. */
function parseFechaCorta(texto: string): Date | null {
  const m = texto.trim().match(/^(\d{1,2})\s+([a-zA-Záéíóú]+)\.?\s+(\d{4})$/);
  if (!m) return null;
  const mes = MESES[m[2].slice(0, 3).toLowerCase()];
  if (mes === undefined) return null;
  const d = new Date(Date.UTC(Number(m[3]), mes, Number(m[1])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseTouch(raw: unknown): Touch | null {
  const p = touchSchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function consultaDesdeLeadCotizador(
  landing: { slug: string; nombreMarca: string; bitrixSourceId: string | null },
  lead: {
    nombre: string;
    email: string;
    respuestas: unknown;
    atribFirst: unknown;
    atribLast: unknown;
    createdAt: Date;
  },
  opts?: { conFecha?: boolean },
): ConsultaLead {
  const respuestas = parseRespuestas(lead.respuestas);
  const valor = (id: string) => respuestas.find((r) => r.id === id)?.valor?.trim() || "";
  const numero = (id: string) => Number(valor(id)) || 0;

  const [desde, hasta] = valor("fechas")
    .split("→")
    .map((t) => parseFechaCorta(t));
  const first = parseTouch(lead.atribFirst);
  const last = parseTouch(lead.atribLast);

  return {
    nombre: lead.nombre,
    email: lead.email,
    // El PhoneField de la landing guarda el número completo (+598...), así que
    // no hay paisCodigo aparte: normalizarTelefono lo toma como internacional.
    telefono: valor("telefono") || null,
    paisCodigo: null,
    destino: valor("destino") || null,
    fechaDesde: desde ?? null,
    fechaHasta: hasta ?? null,
    adultos: numero("adultos"),
    ninos: numero("ninos"),
    infantes: numero("infantes"),
    comentarios: valor("observaciones") || null,
    aceptaPromos: valor("promos") === "Sí",
    extras: respuestas
      .filter((r) => !IDS_PROPIOS.has(r.id) && r.valor.trim())
      .map((r) => ({ etiqueta: r.etiqueta, valor: r.valor.trim() })),
    origen: `${SITE_BASE_URL}/${landing.slug}`,
    canal: `Landing ${landing.nombreMarca}`,
    pauta: resumenPauta(first, last),
    utm: utmDePauta(first, last),
    sourceId: landing.bitrixSourceId,
    fechaConsulta: opts?.conFecha ? lead.createdAt : null,
  };
}

/** Nunca tira. SALTEADO = sin origen configurado, lead inexistente o ya enviado/en curso. */
export async function enviarLeadCotizadorABitrix(
  leadId: string,
  opts?: { backfill?: boolean },
): Promise<"OK" | "ERROR" | "SALTEADO"> {
  try {
    const lead = await prisma.cotizadorLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        nombre: true,
        email: true,
        respuestas: true,
        atribFirst: true,
        atribLast: true,
        createdAt: true,
        landing: { select: { slug: true, nombreMarca: true, bitrixSourceId: true } },
      },
    });
    if (!lead || !lead.landing.bitrixSourceId) return "SALTEADO";

    // Claim atómico: dos requests a la vez no crean dos negocios.
    const claim = await prisma.cotizadorLead.updateMany({
      where: { id: leadId, OR: [{ crmEstado: null }, { crmEstado: "ERROR" }] },
      data: { crmEstado: "PENDIENTE" },
    });
    if (claim.count === 0) return "SALTEADO";

    try {
      const res = await crearNegocioLead(
        consultaDesdeLeadCotizador(lead.landing, lead, { conFecha: opts?.backfill }),
        { sinVentana: opts?.backfill },
      );
      if (res) {
        log.info("cotizador bitrix ok", {
          leadId,
          modo: res.modo,
          dealId: res.dealId,
          contactId: res.contactId,
        });
        await prisma.cotizadorLead.update({
          where: { id: leadId },
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
      await prisma.cotizadorLead.update({
        where: { id: leadId },
        data: {
          crmEstado: "ERROR",
          crmError: "Bitrix sin webhook configurado (BITRIX_WEBHOOK_URL).",
          crmIntentos: { increment: 1 },
        },
      });
      return "ERROR";
    } catch (err) {
      log.error("cotizador bitrix failed", err);
      await prisma.cotizadorLead.update({
        where: { id: leadId },
        data: {
          crmEstado: "ERROR",
          crmError: mensajeErrorCrm(err),
          crmIntentos: { increment: 1 },
        },
      });
      return "ERROR";
    }
  } catch (err) {
    log.error("cotizador bitrix outer failed", err);
    return "ERROR";
  }
}

function filtroPendientes(landingId: string) {
  return {
    landingId,
    OR: [
      { crmEstado: null },
      { crmEstado: "ERROR" as const, crmIntentos: { lt: MAX_INTENTOS } },
    ],
  };
}

export async function contarPendientesBitrix(landingId: string): Promise<number> {
  return prisma.cotizadorLead.count({ where: filtroPendientes(landingId) });
}

export async function enviarPendientesDeLanding(
  landingId: string,
  max = 25,
): Promise<{ enviados: number; errores: number; pendientes: number }> {
  let ids = await prisma.cotizadorLead.findMany({
    where: { landingId, crmEstado: null },
    orderBy: { createdAt: "asc" },
    take: max,
    select: { id: true },
  });
  if (ids.length === 0) {
    ids = await prisma.cotizadorLead.findMany({
      where: { landingId, crmEstado: "ERROR", crmIntentos: { lt: MAX_INTENTOS } },
      orderBy: { createdAt: "asc" },
      take: max,
      select: { id: true },
    });
  }

  let enviados = 0;
  let errores = 0;
  for (let i = 0; i < ids.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSA_ENTRE_LEADS_MS));
    const res = await enviarLeadCotizadorABitrix(ids[i].id, { backfill: true });
    if (res === "OK") enviados++;
    else if (res === "ERROR") errores++;
  }
  return { enviados, errores, pendientes: await contarPendientesBitrix(landingId) };
}
