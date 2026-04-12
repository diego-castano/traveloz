"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

// ──────────────────────────────────────────────
// Notificacion — History of sent notifications
// ──────────────────────────────────────────────

export async function createNotificacion(data: {
  etiquetaId: string;
  paqueteIds: string[];
  mensaje?: string | null;
}) {
  try {
    const { brandId } = await requireAuth();

    const schema = z.object({
      etiquetaId: z.string().min(1),
      paqueteIds: z.array(z.string().min(1)),
    });
    schema.parse(data);

    return await prisma.notificacion.create({ data: { ...data, brandId } });
  } catch (error) {
    console.error("Error creating notificacion:", error);
    throw new Error("No se pudo registrar la notificacion.");
  }
}

export async function getNotificaciones(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);

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
