"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireCanEdit } from "@/lib/require-auth";
import type { EstadoMensaje } from "@prisma/client";
import { touchSchema, type Touch } from "@/lib/atribucion";

// ---------------------------------------------------------------------------
// Lead admin server actions — list/detail/transition for the 5 form
// submission tables. Each list returns rows ordered newest-first with the
// fields the table view needs; detail returns the full row for the drawer.
// ---------------------------------------------------------------------------

// Identifica la TABLA a la que pertenece una fila (para estado/asignar/borrar).
// Las cotizaciones de paquete y las standalone viven en la misma tabla
// (Cotizacion), así que ambas usan kind="cotizaciones" para mutar.
export type LeadKind =
  | "cotizaciones"
  | "mensajes"
  | "corporativo"
  | "postulaciones"
  | "newsletter";

// El export sí distingue las dos vistas de Cotizacion: "leads" son las que
// tienen paquete asociado; "cotizaciones", las standalone (/cotizar).
export type ExportKind = LeadKind | "leads";

export interface LeadCounts {
  /** Cotizaciones CON paquete asociado (formulario del paquete). */
  leads: number;
  leadsNuevas: number;
  /** Cotizaciones SIN paquete (formulario /cotizar). */
  cotizaciones: number;
  cotizacionesNuevas: number;
  mensajes: number;
  mensajesNuevos: number;
  corporativo: number;
  corporativoNuevos: number;
  postulaciones: number;
  postulacionesNuevas: number;
  newsletter: number;
  newsletterActivos: number;
}

// ---------------------------------------------------------------------------
// Aggregate counts for the sidebar/tab badges
// ---------------------------------------------------------------------------
export async function getLeadCounts(): Promise<LeadCounts> {
  await requireAuth();
  const [
    leads,
    leadsNuevas,
    cotizaciones,
    cotizacionesNuevas,
    mensajes,
    mensajesNuevos,
    corporativo,
    corporativoNuevos,
    postulaciones,
    postulacionesNuevas,
    newsletter,
    newsletterActivos,
  ] = await Promise.all([
    prisma.cotizacion.count({ where: { paqueteId: { not: null } } }),
    prisma.cotizacion.count({
      where: { paqueteId: { not: null }, estado: "NUEVO" },
    }),
    prisma.cotizacion.count({ where: { paqueteId: null } }),
    prisma.cotizacion.count({ where: { paqueteId: null, estado: "NUEVO" } }),
    prisma.mensajeContacto.count(),
    prisma.mensajeContacto.count({ where: { estado: "NUEVO" } }),
    prisma.contactoCorporativo.count(),
    prisma.contactoCorporativo.count({ where: { estado: "NUEVO" } }),
    prisma.postulacion.count(),
    prisma.postulacion.count({ where: { estado: "NUEVO" } }),
    prisma.suscripcionNewsletter.count(),
    prisma.suscripcionNewsletter.count({ where: { active: true } }),
  ]);
  return {
    leads,
    leadsNuevas,
    cotizaciones,
    cotizacionesNuevas,
    mensajes,
    mensajesNuevos,
    corporativo,
    corporativoNuevos,
    postulaciones,
    postulacionesNuevas,
    newsletter,
    newsletterActivos,
  };
}

// ---------------------------------------------------------------------------
// List queries (one per type)
// ---------------------------------------------------------------------------

/**
 * "Leads" — interesados que completaron el formulario DE UN PAQUETE. Son las
 * Cotizacion con paqueteId seteado. Trae el paquete con su primera foto para
 * poder mostrarlo de forma visual en el listado.
 */
export async function listLeadsPaquete() {
  await requireAuth();
  return prisma.cotizacion.findMany({
    where: { paqueteId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: {
      paquete: {
        select: {
          id: true,
          titulo: true,
          slug: true,
          destino: true,
          precioDesde: true,
          precioDesdeMoneda: true,
          fotos: {
            select: { url: true, alt: true },
            orderBy: { orden: "asc" },
            take: 1,
          },
        },
      },
    },
  });
}

/**
 * "Cotizaciones" — pedidos generales desde /cotizar, sin paquete asociado.
 * Los que SÍ tienen paquete viven en listLeadsPaquete() para no duplicarlos.
 */
export async function listCotizaciones() {
  await requireAuth();
  return prisma.cotizacion.findMany({
    where: { paqueteId: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMensajes() {
  await requireAuth();
  return prisma.mensajeContacto.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listContactosCorporativos() {
  await requireAuth();
  return prisma.contactoCorporativo.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function listPostulaciones() {
  await requireAuth();
  return prisma.postulacion.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listSuscripciones() {
  await requireAuth();
  return prisma.suscripcionNewsletter.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Revalida la vista del kind. Las Cotizacion se muestran en DOS rutas (Leads
 * con paquete y Cotizaciones standalone), así que refrescamos ambas.
 */
function revalidateLead(kind: LeadKind) {
  revalidatePath(`/backend/leads/${kind}`);
  if (kind === "cotizaciones") revalidatePath("/backend/leads/paquetes");
}

// ---------------------------------------------------------------------------
// Estado transitions — bulk no-op shape so the UI can call one function
// regardless of which table the row belongs to.
// ---------------------------------------------------------------------------

export async function updateLeadEstado(
  kind: Exclude<LeadKind, "newsletter">,
  id: string,
  estado: EstadoMensaje,
) {
  await requireCanEdit();
  const data = { estado };
  switch (kind) {
    case "cotizaciones":
      await prisma.cotizacion.update({ where: { id }, data });
      break;
    case "mensajes":
      await prisma.mensajeContacto.update({ where: { id }, data });
      break;
    case "corporativo":
      await prisma.contactoCorporativo.update({ where: { id }, data });
      break;
    case "postulaciones":
      await prisma.postulacion.update({ where: { id }, data });
      break;
  }
  revalidateLead(kind);
}

export async function deleteLead(
  kind: LeadKind,
  id: string,
): Promise<void> {
  await requireCanEdit();
  switch (kind) {
    case "cotizaciones":
      await prisma.cotizacion.delete({ where: { id } });
      break;
    case "mensajes":
      await prisma.mensajeContacto.delete({ where: { id } });
      break;
    case "corporativo":
      await prisma.contactoCorporativo.delete({ where: { id } });
      break;
    case "postulaciones":
      await prisma.postulacion.delete({ where: { id } });
      break;
    case "newsletter":
      await prisma.suscripcionNewsletter.delete({ where: { id } });
      break;
  }
  revalidateLead(kind);
}

export async function toggleNewsletterActive(id: string) {
  await requireCanEdit();
  const current = await prisma.suscripcionNewsletter.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!current) return;
  await prisma.suscripcionNewsletter.update({
    where: { id },
    data: {
      active: !current.active,
      unsubscribedAt: current.active ? new Date() : null,
    },
  });
  revalidatePath("/backend/leads/newsletter");
}

// ---------------------------------------------------------------------------
// Cotizacion assignment — pick the vendedor that owns the lead. Pass userId
// null to unassign. Only Cotizacion supports this for now (it's the only
// model with `asignadoAUserId` in the schema).
// ---------------------------------------------------------------------------
export async function listAssignableUsers() {
  await requireAuth();
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function assignCotizacion(
  cotizacionId: string,
  userId: string | null,
) {
  return assignLead("cotizaciones", cotizacionId, userId);
}

/**
 * Assign or unassign any non-newsletter lead. Newsletter subscribers don't
 * carry an assignee (operationally it's just an email list). For everything
 * else: pass userId=null to unassign.
 */
export async function assignLead(
  kind: Exclude<LeadKind, "newsletter">,
  id: string,
  userId: string | null,
) {
  await requireCanEdit();
  const data = { asignadoAUserId: userId };
  switch (kind) {
    case "cotizaciones":
      await prisma.cotizacion.update({ where: { id }, data });
      break;
    case "mensajes":
      await prisma.mensajeContacto.update({ where: { id }, data });
      break;
    case "corporativo":
      await prisma.contactoCorporativo.update({ where: { id }, data });
      break;
    case "postulaciones":
      await prisma.postulacion.update({ where: { id }, data });
      break;
  }
  revalidateLead(kind);
}

// ---------------------------------------------------------------------------
// Atribución de pauta — recorrido de navegación de un visitante anónimo
// (histórico de PaginaVista antes de convertir), para mostrar en el drawer
// de leads junto al snapshot first/last touch que ya quedó guardado en el
// propio lead (columnas atribFirst/atribLast/visitanteId).
// ---------------------------------------------------------------------------

export async function getRecorridoVisitante(
  visitanteId: string,
): Promise<{ url: string; createdAt: Date }[]> {
  await requireAuth();
  if (!visitanteId?.trim()) {
    throw new Error("Falta el id del visitante.");
  }
  // Traemos las últimas 100 en orden DESC (las más recientes) y las damos
  // vuelta: así quedan en orden cronológico sin perder las visitas más
  // nuevas. Un `orderBy: "asc"` literal traería las 100 MÁS VIEJAS del
  // historial — justo lo contrario de lo que le sirve al operador.
  const paginas = await prisma.paginaVista.findMany({
    where: { visitanteId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  paginas.reverse();
  return paginas.map((p) => ({ url: p.url, createdAt: p.createdAt }));
}

// ---------------------------------------------------------------------------
// CSV export — one server action for all 5 lead types. Joins related
// entities (paquete, asignado) so marketing gets readable names instead of
// CUIDs. UTF-8 + BOM so Excel auto-detects encoding on Windows.
//
// Separador ";" (no ","): Excel en español usa "," como separador decimal,
// así que su import de CSV espera ";" entre campos. Con "," todo queda
// apretado en la columna A. El BOM al inicio hace que Excel detecte UTF-8 y
// se vean bien los acentos ("Sí", "Fecha de baja").
// ---------------------------------------------------------------------------

const CSV_DELIMITER = ";";

// CSV injection (fórmulas): si una celda arranca con = + - @ o un tab/CR,
// Excel/Sheets pueden interpretarla como el inicio de una fórmula al abrir
// el archivo (ej. un utm_campaign="=cmd|'/c calc'!A1" ejecutando algo). Los
// valores que llegan acá vienen de forms públicos (y, desde la atribución
// de pauta, de una cookie) — input no confiable. El fix estándar (OWASP) es
// anteponer un apóstrofo: fuerza texto literal sin cambiar lo que se ve en
// la celda. Se evalúa sobre el string CRUDO (antes del strip de \r/\t de
// abajo) para no perder la señal cuando el trigger ES un tab o un CR.
const CSV_FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "boolean") {
    s = value ? "Sí" : "No";
  } else {
    s = String(value);
  }
  if (CSV_FORMULA_TRIGGER_RE.test(s)) s = `'${s}`;
  // Strip \r (confunde a Excel) y tabs, pero conservamos \n: si el valor
  // necesita salto de línea, se envuelve en comillas y Excel lo respeta
  // como una sola celda multilínea.
  s = s.replace(/\r/g, "").replace(/\t/g, " ").trim();
  if (s.includes(CSV_DELIMITER) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(headers: string[], rows: (unknown[])[]): string {
  const lines = [headers.map(csvEscape).join(CSV_DELIMITER)];
  for (const row of rows) lines.push(row.map(csvEscape).join(CSV_DELIMITER));
  // BOM so Excel detects UTF-8 (acentos, ñ).
  return "﻿" + lines.join("\r\n");
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Atribución de pauta en el CSV — 16 columnas (8 campos × entrada/último)
// compartidas por los 5 kinds que tienen cookie de atribución. El kind
// "newsletter" NO las suma (ver comentario en su propio case, más abajo):
// su export es un recorte deliberado a las columnas que lee marketing.
//
// `atribFirst`/`atribLast` llegan de Prisma como `Json?` (JsonValue): mismo
// nivel de confianza que la cookie en sí, así que se re-validan acá con el
// MISMO `touchSchema` de atribucion.ts antes de tocar el CSV — igual que el
// drawer (ver _components/atribucion-admin.ts, que hace este mismo re-parse
// para la UI; se repite acá en vez de importarlo para no cruzar la acción
// de servidor con una carpeta de componentes de una ruta).
// ---------------------------------------------------------------------------

function parseTouchJson(value: unknown): Touch | null {
  if (value === null || value === undefined) return null;
  const parsed = touchSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// Mismo orden de prioridad que usa el drawer de leads: el primer click ID
// presente entre Google Ads → Meta → Google (gad_source) gana.
function coalesceClickId(touch: Touch | null): { label: string; value: string } | null {
  if (!touch) return null;
  if (touch.gclid) return { label: "gclid", value: touch.gclid };
  if (touch.fbclid) return { label: "fbclid", value: touch.fbclid };
  if (touch.gad) return { label: "gad_source", value: touch.gad };
  return null;
}

const TOUCH_HEADERS = [
  "Pauta entrada — Fuente",
  "Pauta entrada — Medio",
  "Pauta entrada — Campaña",
  "Pauta entrada — Contenido",
  "Pauta entrada — Término",
  "Pauta entrada — Click ID",
  "Pauta entrada — Landing",
  "Pauta entrada — Fecha",
  "Pauta último — Fuente",
  "Pauta último — Medio",
  "Pauta último — Campaña",
  "Pauta último — Contenido",
  "Pauta último — Término",
  "Pauta último — Click ID",
  "Pauta último — Landing",
  "Pauta último — Fecha",
];

function touchCells(touch: Touch | null): unknown[] {
  const click = coalesceClickId(touch);
  return [
    touch?.src ?? "",
    touch?.med ?? "",
    touch?.cmp ?? "",
    touch?.cnt ?? "",
    touch?.trm ?? "",
    click ? `${click.label}: ${click.value}` : "",
    touch?.lp ?? "",
    touch ? new Date(touch.ts).toISOString() : "",
  ];
}

/** Fila de 16 columnas (TOUCH_HEADERS) a partir de los `Json` crudos de Prisma. */
function touchToRow(first: unknown, last: unknown): unknown[] {
  return [
    ...touchCells(parseTouchJson(first)),
    ...touchCells(parseTouchJson(last)),
  ];
}

export async function exportLeads(
  kind: ExportKind,
): Promise<{ filename: string; csv: string }> {
  await requireAuth();

  // Pre-fetch user map once so every row resolves asignado without N+1.
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const userLabel = (id: string | null) => {
    if (!id) return "";
    const u = userMap.get(id);
    return u ? `${u.name} <${u.email}>` : id;
  };

  switch (kind) {
    // Leads de paquete: incluyen las columnas del paquete que pidió el interesado.
    case "leads": {
      const rows = await prisma.cotizacion.findMany({
        where: { paqueteId: { not: null } },
        orderBy: { createdAt: "desc" },
        include: {
          paquete: { select: { titulo: true, slug: true, destino: true } },
        },
      });
      const headers = [
        "ID",
        "Fecha",
        "Estado",
        "Nombre",
        "Email",
        "Teléfono",
        "País (código)",
        "Paquete",
        "Destino",
        "Slug paquete",
        "Origen",
        "Fecha desde",
        "Fecha hasta",
        "Adultos",
        "Niños",
        "Infantes",
        "Total pax",
        "Preferencia contacto",
        "Acepta promociones",
        "Comentarios",
        "Asignado a",
        "Última actualización",
        ...TOUCH_HEADERS,
      ];
      const data = rows.map((r) => [
        r.id,
        r.createdAt,
        r.estado,
        r.nombre,
        r.email,
        r.telefono,
        r.paisCodigo,
        r.paquete?.titulo ?? "",
        r.paquete?.destino ?? "",
        r.paquete?.slug ?? "",
        r.origen,
        r.fechaDesde,
        r.fechaHasta,
        r.adultos,
        r.ninos,
        r.infantes,
        r.adultos + r.ninos + r.infantes,
        r.preferencia,
        r.aceptaPromos,
        r.comentarios,
        userLabel(r.asignadoAUserId),
        r.updatedAt,
        ...touchToRow(r.atribFirst, r.atribLast),
      ]);
      return {
        filename: `leads-paquete-${todayStamp()}.csv`,
        csv: buildCsv(headers, data),
      };
    }

    // Cotizaciones standalone (/cotizar): sin paquete, así que sin esas columnas.
    case "cotizaciones": {
      const rows = await prisma.cotizacion.findMany({
        where: { paqueteId: null },
        orderBy: { createdAt: "desc" },
      });
      const headers = [
        "ID",
        "Fecha",
        "Estado",
        "Nombre",
        "Email",
        "Teléfono",
        "País (código)",
        "Origen",
        "Fecha desde",
        "Fecha hasta",
        "Adultos",
        "Niños",
        "Infantes",
        "Total pax",
        "Preferencia contacto",
        "Acepta promociones",
        "Comentarios",
        "Asignado a",
        "Última actualización",
        ...TOUCH_HEADERS,
      ];
      const data = rows.map((r) => [
        r.id,
        r.createdAt,
        r.estado,
        r.nombre,
        r.email,
        r.telefono,
        r.paisCodigo,
        r.origen,
        r.fechaDesde,
        r.fechaHasta,
        r.adultos,
        r.ninos,
        r.infantes,
        r.adultos + r.ninos + r.infantes,
        r.preferencia,
        r.aceptaPromos,
        r.comentarios,
        userLabel(r.asignadoAUserId),
        r.updatedAt,
        ...touchToRow(r.atribFirst, r.atribLast),
      ]);
      return {
        filename: `cotizaciones-${todayStamp()}.csv`,
        csv: buildCsv(headers, data),
      };
    }

    case "mensajes": {
      const rows = await prisma.mensajeContacto.findMany({
        orderBy: { createdAt: "desc" },
      });
      const headers = [
        "ID",
        "Fecha",
        "Estado",
        "Nombre",
        "Email",
        "Teléfono",
        "Mensaje",
        "Asignado a",
        "Última actualización",
        ...TOUCH_HEADERS,
      ];
      const data = rows.map((r) => [
        r.id,
        r.createdAt,
        r.estado,
        r.nombre,
        r.email,
        r.telefono,
        r.comentarios,
        userLabel(r.asignadoAUserId),
        r.updatedAt,
        ...touchToRow(r.atribFirst, r.atribLast),
      ]);
      return {
        filename: `mensajes-${todayStamp()}.csv`,
        csv: buildCsv(headers, data),
      };
    }

    case "corporativo": {
      const rows = await prisma.contactoCorporativo.findMany({
        orderBy: { createdAt: "desc" },
      });
      const headers = [
        "ID",
        "Fecha",
        "Estado",
        "Empresa",
        "Nombre contacto",
        "Cargo",
        "Email",
        "Teléfono",
        "Comentarios",
        "Asignado a",
        "Última actualización",
        ...TOUCH_HEADERS,
      ];
      const data = rows.map((r) => [
        r.id,
        r.createdAt,
        r.estado,
        r.empresa,
        r.nombre,
        r.cargo,
        r.email,
        r.telefono,
        r.comentarios,
        userLabel(r.asignadoAUserId),
        r.updatedAt,
        ...touchToRow(r.atribFirst, r.atribLast),
      ]);
      return {
        filename: `corporativo-${todayStamp()}.csv`,
        csv: buildCsv(headers, data),
      };
    }

    case "postulaciones": {
      const rows = await prisma.postulacion.findMany({
        orderBy: { createdAt: "desc" },
      });
      const headers = [
        "ID",
        "Fecha",
        "Estado",
        "Nombre",
        "Email",
        "Teléfono",
        "Motivación",
        "CV (archivo)",
        "CV (URL)",
        "Asignado a",
        "Última actualización",
        ...TOUCH_HEADERS,
      ];
      const data = rows.map((r) => [
        r.id,
        r.createdAt,
        r.estado,
        r.nombre,
        r.email,
        r.telefono,
        r.motivacion,
        r.cvFilename,
        r.cvUrl,
        userLabel(r.asignadoAUserId),
        r.updatedAt,
        ...touchToRow(r.atribFirst, r.atribLast),
      ]);
      return {
        filename: `postulaciones-${todayStamp()}.csv`,
        csv: buildCsv(headers, data),
      };
    }

    case "newsletter": {
      const rows = await prisma.suscripcionNewsletter.findMany({
        orderBy: { createdAt: "desc" },
      });
      // Export pensado para marketing: solo columnas legibles. Se omiten campos
      // técnicos (ID interno, IP, User Agent, tokens, utm_*) que confunden y se
      // leen como "códigos de programación".
      const fecha = (d: Date | null) => (d ? d.toLocaleDateString("es-UY") : "");
      const headers = [
        "Email",
        "Fecha de alta",
        "Activo",
        "Confirmado",
        "Origen",
        "Fecha de baja",
      ];
      const data = rows.map((r) => [
        r.email,
        fecha(r.createdAt),
        r.active,
        Boolean(r.confirmedAt),
        r.source,
        fecha(r.unsubscribedAt),
      ]);
      return {
        filename: `newsletter-${todayStamp()}.csv`,
        csv: buildCsv(headers, data),
      };
    }
  }
}
