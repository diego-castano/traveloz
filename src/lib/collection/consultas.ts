// Consultas de Collection: validación del formulario público y armado del lead
// para Bitrix. Todo puro (sin base ni red) para poder probarlo suelto.

import { z } from "zod";
import type { ConsultaLead } from "@/lib/bitrix";
import { resumenPauta, utmDePauta, type Touch } from "@/lib/atribucion";

export const CANAL_BITRIX = "Collection - sitio web";

/** Links de la experiencia para el negocio de Bitrix: el sitio y el constructor. */
export const urlsExperiencia = (e: { id: string; slug: string | null }) => ({
  paqueteUrl: e.slug ? `https://collection.traveloz.com.uy/experiencias/${e.slug}` : null,
  paqueteAdminUrl: `https://www.traveloz.com.uy/backend/collection/experiencias/${e.id}`,
});

/** Número que ve el equipo y el viajero: TC-0412. */
export const numeroConsulta = (n: number) => `TC-${String(n).padStart(4, "0")}`;

const fechaIso = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Fecha inválida.");

const opcional = (max: number) => z.string().trim().max(max).default("");

export const consultaSchema = z
  .object({
    tipo: z.enum(["experiencia", "contacto"]),
    experienciaSlug: z.string().trim().max(120).optional(),
    nombre: z.string().trim().min(1, "Ingresá tu nombre.").max(200),
    email: z.string().trim().toLowerCase().min(1, "Ingresá tu email.").max(254).email("Email inválido."),
    telefono: z.string().trim().max(40).default(""),
    /** Prefijo del selector: "+598" o "598". */
    paisCodigo: z
      .string()
      .trim()
      .regex(/^\+?\d{1,4}$/, "Código de país inválido.")
      .transform((v) => (v.startsWith("+") ? v : `+${v}`))
      .nullish(),
    ocasion: opcional(120),
    destinos: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
    estilo: opcional(120),
    fechaTipo: z.enum(["rango", "mes", ""]).default(""),
    fechaDesde: fechaIso.nullish(),
    fechaHasta: fechaIso.nullish(),
    mesAproximado: opcional(40),
    noches: z.number().int().min(1).max(120).nullish(),
    adultos: z.number().int().min(1).max(20).default(2),
    ninos: z.number().int().min(0).max(12).default(0),
    edadesNinos: z.array(z.number().int().min(0).max(17)).max(12).default([]),
    inversion: opcional(80),
    canal: z.enum(["whatsapp", "llamada", "email"]).default("email"),
    comentarios: z.string().trim().max(2000).default(""),
    aceptaNovedades: z.boolean().default(false),
    origenUrl: opcional(500),
  })
  .superRefine((v, ctx) => {
    if (v.canal !== "email" && v.telefono.replace(/\D/g, "").length < 6) {
      ctx.addIssue({ code: "custom", path: ["telefono"], message: "Ingresá un teléfono para que te contactemos." });
    }
    if (v.fechaDesde && v.fechaHasta && v.fechaHasta < v.fechaDesde) {
      ctx.addIssue({ code: "custom", path: ["fechaHasta"], message: "La vuelta es anterior a la salida." });
    }
  })
  .transform((v) => ({
    ...v,
    // Solo se guardan fechas del modo elegido y edades de los niños que hay.
    fechaDesde: v.fechaTipo === "rango" ? v.fechaDesde ?? null : null,
    fechaHasta: v.fechaTipo === "rango" ? v.fechaHasta ?? null : null,
    mesAproximado: v.fechaTipo === "mes" ? v.mesAproximado : "",
    edadesNinos: v.edadesNinos.slice(0, v.ninos),
  }));

export type ConsultaInput = z.output<typeof consultaSchema>;

const aFecha = (iso: string | null | undefined) => (iso ? new Date(`${iso}T00:00:00Z`) : null);
export { aFecha as fechaDeIso };

const CANAL_TEXTO: Record<string, string> = { whatsapp: "WhatsApp", llamada: "Llamada", email: "Email" };
export const canalLegible = (c: string) => CANAL_TEXTO[c] ?? c;

/** Fila mínima de ColConsulta que hace falta para armar el lead. */
export interface FilaConsultaLead {
  numero: number;
  nombre: string;
  email: string;
  telefono: string;
  paisCodigo: string | null;
  ocasion: string;
  destinos: string[];
  estilo: string;
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  mesAproximado: string;
  noches: number | null;
  adultos: number;
  ninos: number;
  edadesNinos: number[];
  inversion: string;
  canal: string;
  comentarios: string;
  aceptaNovedades: boolean;
  origenUrl: string;
}

/** Mismo contrato que las landings ("igual que hoy"), con origen Collection. */
export function leadDesdeConsulta(
  c: FilaConsultaLead,
  ctx: {
    tituloExperiencia: string | null;
    /** La experiencia de la consulta, si vino de una. */
    experiencia?: { id: string; slug: string | null } | null;
    sourceId: string | null;
    first: Touch | null;
    last: Touch | null;
  },
): ConsultaLead {
  const extras: { etiqueta: string; valor: string }[] = [];
  const suma = (etiqueta: string, valor: string | null | undefined) => {
    const v = valor?.trim();
    if (v) extras.push({ etiqueta, valor: v });
  };
  suma("Ocasión", c.ocasion);
  suma("Estilo", c.estilo);
  suma("Inversión por persona", c.inversion);
  suma("Canal preferido", canalLegible(c.canal));
  suma("Mes aproximado", c.mesAproximado);
  suma("Noches", c.noches ? String(c.noches) : "");
  suma("Edades de los niños", c.edadesNinos.join(", "));
  suma("Número de consulta", numeroConsulta(c.numero));

  const destino = ctx.tituloExperiencia || c.destinos.join(", ") || null;
  const telefono = [c.paisCodigo, c.telefono].filter(Boolean).join(" ").trim();
  return {
    tituloPaquete: ctx.tituloExperiencia,
    ...(ctx.experiencia ? urlsExperiencia(ctx.experiencia) : {}),
    nombre: c.nombre,
    email: c.email,
    telefono: telefono || null,
    paisCodigo: c.paisCodigo,
    destino,
    fechaDesde: c.fechaDesde,
    fechaHasta: c.fechaHasta,
    adultos: c.adultos,
    ninos: c.ninos,
    infantes: 0,
    comentarios: c.comentarios || null,
    aceptaPromos: c.aceptaNovedades,
    extras,
    origen: c.origenUrl || null,
    canal: CANAL_BITRIX,
    pauta: resumenPauta(ctx.first, ctx.last),
    utm: utmDePauta(ctx.first, ctx.last),
    sourceId: ctx.sourceId || null,
    sourceDescription: `Collection · ${ctx.tituloExperiencia || "Contactanos"}`,
  };
}

// ---------------------------------------------------------------------------
// Texto para los emails y el panel
// ---------------------------------------------------------------------------
const fmtDia = (d: Date) =>
  new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);

export function textoFechas(c: Pick<FilaConsultaLead, "fechaDesde" | "fechaHasta" | "mesAproximado" | "noches">): string {
  let t = "";
  if (c.fechaDesde && c.fechaHasta) t = `${fmtDia(c.fechaDesde)} al ${fmtDia(c.fechaHasta)}`;
  else if (c.fechaDesde) t = `Desde el ${fmtDia(c.fechaDesde)}`;
  else if (c.mesAproximado) t = c.mesAproximado;
  if (c.noches) t = t ? `${t} (${c.noches} noches)` : `${c.noches} noches`;
  return t;
}

export function textoViajeros(c: Pick<FilaConsultaLead, "adultos" | "ninos" | "edadesNinos">): string {
  const a = `${c.adultos} ${c.adultos === 1 ? "adulto" : "adultos"}`;
  if (!c.ninos) return a;
  const edades = c.edadesNinos.length ? ` (${c.edadesNinos.join(", ")} años)` : "";
  return `${a}, ${c.ninos} ${c.ninos === 1 ? "niño" : "niños"}${edades}`;
}

/** Lo que el viajero ve en su confirmación. */
export function resumenParaViajero(
  c: FilaConsultaLead,
  tituloExperiencia: string | null,
): { etiqueta: string; valor: string }[] {
  return [
    { etiqueta: tituloExperiencia ? "Experiencia" : "Destinos", valor: tituloExperiencia || c.destinos.join(", ") },
    { etiqueta: "Fechas", valor: textoFechas(c) },
    { etiqueta: "Viajeros", valor: textoViajeros(c) },
    { etiqueta: "Ocasión", valor: c.ocasion },
    { etiqueta: "Estilo", valor: c.estilo },
    { etiqueta: "Inversión", valor: c.inversion },
    { etiqueta: "Contacto por", valor: canalLegible(c.canal) },
  ];
}

/** Todo lo que recibe el equipo en el aviso interno. */
export function datosParaEquipo(
  c: FilaConsultaLead,
  tituloExperiencia: string | null,
  pauta: string | null,
): { etiqueta: string; valor: string }[] {
  return [
    { etiqueta: "Nombre", valor: c.nombre },
    { etiqueta: "Email", valor: c.email },
    { etiqueta: "Teléfono", valor: [c.paisCodigo, c.telefono].filter(Boolean).join(" ") },
    { etiqueta: "Origen", valor: tituloExperiencia ? `Experiencia: ${tituloExperiencia}` : "Formulario de Contactanos" },
    ...resumenParaViajero(c, tituloExperiencia).filter((d) => d.etiqueta !== "Experiencia"),
    { etiqueta: "Destinos", valor: tituloExperiencia ? c.destinos.join(", ") : "" },
    { etiqueta: "Novedades", valor: c.aceptaNovedades ? "Acepta recibir novedades" : "" },
    { etiqueta: "Página", valor: c.origenUrl },
    { etiqueta: "Pauta", valor: pauta ?? "" },
  ];
}
