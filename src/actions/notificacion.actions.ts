"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, requireCanEdit } from "@/lib/require-auth";
import { logger } from "@/lib/logger";
const log = logger.child({ module: "notificacion.actions" });

// ──────────────────────────────────────────────
// Notificacion — History of sent notifications
// ──────────────────────────────────────────────

export async function createNotificacion(data: {
  etiquetaId: string;
  paqueteIds: string[];
  mensaje?: string | null;
}) {
  try {
    const { brandId } = await requireCanEdit();

    const schema = z.object({
      etiquetaId: z.string().min(1),
      paqueteIds: z.array(z.string().min(1)),
    });
    schema.parse(data);

    return await prisma.notificacion.create({ data: { ...data, brandId } });
  } catch (error) {
    log.error("creating notificacion", error);
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
    log.error("fetching notificaciones", error);
    throw new Error("No se pudieron obtener las notificaciones.");
  }
}
