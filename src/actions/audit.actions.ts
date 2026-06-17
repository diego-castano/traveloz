"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "audit.actions" });

export interface AuditLogRow {
  id: string;
  userEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface GetAuditLogsResult {
  rows: AuditLogRow[];
  total: number;
  actions: string[];
}

/**
 * Lectura del audit log (R2). Append-only: 40+ call sites escriben acá pero no
 * había forma de leerlo desde la UI. Solo ADMIN. Paginado, con filtro opcional
 * por `action` (prefijo de namespace, e.g. "login", "user") y búsqueda por
 * email del actor.
 */
export async function getAuditLogs(opts?: {
  skip?: number;
  take?: number;
  action?: string;
  q?: string;
}): Promise<GetAuditLogsResult> {
  try {
    await requireAdmin();
    const skip = Math.max(0, opts?.skip ?? 0);
    const take = Math.min(100, Math.max(1, opts?.take ?? 50));

    const where: Record<string, unknown> = {};
    if (opts?.action) where.action = { startsWith: opts.action };
    if (opts?.q?.trim()) {
      where.userEmail = { contains: opts.q.trim(), mode: "insensitive" };
    }

    const [rows, total, distinctActions] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          userEmail: true,
          action: true,
          targetType: true,
          targetId: true,
          ipAddress: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
      // Namespaces de primer nivel para poblar el filtro (login, user, …).
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ["action"],
        orderBy: { action: "asc" },
        take: 200,
      }),
    ]);

    const actions = Array.from(
      new Set(distinctActions.map((a) => a.action.split(".")[0])),
    ).sort();

    return { rows, total, actions };
  } catch (error) {
    log.error("fetching audit logs", error);
    throw new Error("No se pudo obtener el registro de auditoría.");
  }
}
