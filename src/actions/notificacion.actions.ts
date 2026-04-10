"use server";

import { prisma } from "@/lib/db";

// ──────────────────────────────────────────────
// Notificacion — History of sent notifications
// ──────────────────────────────────────────────

export async function createNotificacion(data: {
  brandId: string;
  etiquetaId: string;
  paqueteIds: string[];
  mensaje?: string | null;
}) {
  try {
    return await prisma.notificacion.create({ data });
  } catch (error) {
    console.error("Error creating notificacion:", error);
    throw new Error("No se pudo registrar la notificacion.");
  }
}

export async function getNotificaciones(brandId: string) {
  try {
    return await prisma.notificacion.findMany({
      where: { brandId },
      include: { etiqueta: true },
      orderBy: { enviadoAt: "desc" },
      take: 50,
    });
  } catch (error) {
    console.error("Error fetching notificaciones:", error);
    throw new Error("No se pudieron obtener las notificaciones.");
  }
}
