"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireCanEdit } from "@/lib/require-auth";
import type { EstadoMensaje } from "@prisma/client";

// ---------------------------------------------------------------------------
// Lead admin server actions — list/detail/transition for the 5 form
// submission tables. Each list returns rows ordered newest-first with the
// fields the table view needs; detail returns the full row for the drawer.
// ---------------------------------------------------------------------------

export type LeadKind =
  | "cotizaciones"
  | "mensajes"
  | "corporativo"
  | "postulaciones"
  | "newsletter";

export interface LeadCounts {
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
    prisma.cotizacion.count(),
    prisma.cotizacion.count({ where: { estado: "NUEVO" } }),
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

export async function listCotizaciones() {
  await requireAuth();
  return prisma.cotizacion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      paquete: { select: { id: true, titulo: true, slug: true } },
    },
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
  revalidatePath(`/backend/leads/${kind}`);
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
  revalidatePath(`/backend/leads/${kind}`);
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
  revalidatePath(`/backend/leads/${kind}`);
}

// ---------------------------------------------------------------------------
// CSV export — one server action for all 5 lead types. Joins related
// entities (paquete, asignado) so marketing gets readable names instead of
// CUIDs. UTF-8 + BOM so Excel auto-detects encoding on Windows.
// ---------------------------------------------------------------------------

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
  // Strip control chars (including \r) that confuse Excel, normalize newlines
  // inside a field to a literal space — multiline cells render fine but the
  // first CSV reader the marketing team uses likely won't quote-aware-parse.
  s = s.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\t/g, " ").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(headers: string[], rows: (unknown[])[]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  // BOM so Excel detects UTF-8 (acentos, ñ).
  return "﻿" + lines.join("\r\n");
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function exportLeads(
  kind: LeadKind,
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
    case "cotizaciones": {
      const rows = await prisma.cotizacion.findMany({
        orderBy: { createdAt: "desc" },
        include: { paquete: { select: { titulo: true, slug: true } } },
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
      ];
      const data = rows.map((r) => [
        r.id,
        r.createdAt,
        r.estado,
        r.nombre,
        r.email,
        r.telefono,
        r.paisCodigo,
        r.paquete?.titulo ?? "(standalone)",
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
      const headers = [
        "ID",
        "Fecha alta",
        "Email",
        "Activo",
        "Origen",
        "Confirmado",
        "Fecha baja",
        "IP",
        "User Agent",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
      ];
      const data = rows.map((r) => [
        r.id,
        r.createdAt,
        r.email,
        r.active,
        r.source,
        r.confirmedAt,
        r.unsubscribedAt,
        r.consentIp,
        r.consentUserAgent,
        r.utmSource,
        r.utmMedium,
        r.utmCampaign,
        r.utmContent,
        r.utmTerm,
      ]);
      return {
        filename: `newsletter-${todayStamp()}.csv`,
        csv: buildCsv(headers, data),
      };
    }
  }
}
