"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
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
  await requireAuth();
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
  await requireAuth();
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
  await requireAuth();
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
