"use server";

/**
 * Dashboard / reports server-side metrics with built-in caching.
 *
 * Why this exists:
 *   • The previous AdminDashboard recomputed every metric in the browser by
 *     iterating the full PackageProvider state on each render. That works for
 *     hundreds of paquetes but stops scaling around 5–10k.
 *   • These functions push the aggregation into Postgres (`count`, `groupBy`,
 *     date ranges) so the response stays small even when the catalog grows.
 *   • Results are wrapped in `unstable_cache` keyed by brandId + range so
 *     the dashboard re-renders cheap; mutations call `revalidateDashboard()`
 *     to bust both the dashboard and reports tags in one shot.
 *
 * Time ranges:
 *   • "30d" / "90d" / "365d" / "ytd" / "all"
 *   • Each range produces a `current` window AND a `previous` window of equal
 *     length so the UI can show period-over-period deltas without a second
 *     round-trip.
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { logger } from "@/lib/logger";
import type { EstadoPaquete } from "@prisma/client";

const log = logger.child({ module: "dashboard.actions" });

export type RangeKey = "30d" | "90d" | "365d" | "ytd" | "all";

interface Window {
  from: Date | null;
  to: Date;
}

function rangeWindows(range: RangeKey): { current: Window; previous: Window | null } {
  const now = new Date();
  if (range === "all") {
    return { current: { from: null, to: now }, previous: null };
  }
  if (range === "ytd") {
    const start = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    );
    return {
      current: { from: start, to: now },
      previous: { from: lastYearStart, to: lastYearEnd },
    };
  }
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const ms = days * 86_400_000;
  const from = new Date(now.getTime() - ms);
  const previousFrom = new Date(from.getTime() - ms);
  return {
    current: { from, to: now },
    previous: { from: previousFrom, to: from },
  };
}

export interface DashboardMetrics {
  range: RangeKey;
  generatedAt: string;
  totalPaquetes: number;
  paquetesPorEstado: Record<EstadoPaquete, number>;
  current: {
    creados: number;
    publicados: number; // paquetes that became ACTIVO in this window
    porVencer14d: number; // ACTIVO with validezHasta in next 14 days
  };
  previous: {
    creados: number;
    publicados: number;
  } | null;
  delta: {
    creadosPct: number | null;
    publicadosPct: number | null;
  };
  topRegiones: Array<{ regionId: string | null; nombre: string; count: number }>;
}

function pctDelta(curr: number, prev: number | null): number | null {
  if (prev === null) return null;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

async function loadMetrics(brandId: string, range: RangeKey): Promise<DashboardMetrics> {
  const { current, previous } = rangeWindows(range);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const in14 = new Date(today.getTime() + 14 * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [total, byEstadoRaw, currentCreados, currentPublicados, prevCreados, prevPublicados, porVencer, regionGroups] =
    await Promise.all([
      prisma.paquete.count({ where: { brandId, deletedAt: null } }),
      prisma.paquete.groupBy({
        by: ["estado"],
        where: { brandId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.paquete.count({
        where: {
          brandId,
          deletedAt: null,
          createdAt: current.from ? { gte: current.from, lte: current.to } : { lte: current.to },
        },
      }),
      prisma.paquete.count({
        where: {
          brandId,
          deletedAt: null,
          estado: "ACTIVO",
          updatedAt: current.from ? { gte: current.from, lte: current.to } : { lte: current.to },
        },
      }),
      previous
        ? prisma.paquete.count({
            where: {
              brandId,
              deletedAt: null,
              createdAt: { gte: previous.from!, lte: previous.to },
            },
          })
        : Promise.resolve(0),
      previous
        ? prisma.paquete.count({
            where: {
              brandId,
              deletedAt: null,
              estado: "ACTIVO",
              updatedAt: { gte: previous.from!, lte: previous.to },
            },
          })
        : Promise.resolve(0),
      prisma.paquete.count({
        where: {
          brandId,
          deletedAt: null,
          estado: "ACTIVO",
          validezHasta: { gte: fmt(today), lte: fmt(in14) },
        },
      }),
      // Group by region via the País → Region chain. We do it as raw SQL
      // because Prisma's groupBy can't follow many-to-many through alojamiento
      // → pais → region in a single query.
      prisma.$queryRaw<Array<{ regionId: string | null; nombre: string | null; count: bigint }>>`
        SELECT r."id" AS "regionId", r."nombre" AS "nombre", COUNT(DISTINCT p."id")::bigint AS count
        FROM "Paquete" p
        JOIN "PaqueteAlojamiento" pa ON pa."paqueteId" = p."id"
        JOIN "Alojamiento" a ON a."id" = pa."alojamientoId"
        LEFT JOIN "Pais" pa2 ON pa2."id" = a."paisId"
        LEFT JOIN "Region" r ON r."id" = pa2."regionId"
        WHERE p."brandId" = ${brandId}
          AND p."deletedAt" IS NULL
        GROUP BY r."id", r."nombre"
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

  const paquetesPorEstado: Record<EstadoPaquete, number> = {
    BORRADOR: 0,
    EN_REVISION: 0,
    ACTIVO: 0,
    ARCHIVADO: 0,
  };
  for (const row of byEstadoRaw) paquetesPorEstado[row.estado] = row._count._all;

  return {
    range,
    generatedAt: new Date().toISOString(),
    totalPaquetes: total,
    paquetesPorEstado,
    current: {
      creados: currentCreados,
      publicados: currentPublicados,
      porVencer14d: porVencer,
    },
    previous: previous
      ? { creados: prevCreados, publicados: prevPublicados }
      : null,
    delta: {
      creadosPct: pctDelta(currentCreados, previous ? prevCreados : null),
      publicadosPct: pctDelta(currentPublicados, previous ? prevPublicados : null),
    },
    topRegiones: regionGroups.map((g) => ({
      regionId: g.regionId,
      nombre: g.nombre ?? "Sin región",
      count: Number(g.count),
    })),
  };
}

/**
 * Returns dashboard metrics for the active brand. Cached for 5 minutes per
 * (brand, range) tuple. Mutations should call `revalidateDashboard()` after
 * successful writes to invalidate this cache and the reports cache together.
 */
export async function getDashboardMetrics(range: RangeKey = "30d") {
  const { brandId } = await requireAuth();
  const cacheKey = `dashboard:${brandId}:${range}`;
  const cached = unstable_cache(
    () => loadMetrics(brandId, range),
    [cacheKey],
    { revalidate: 300, tags: [`dashboard:${brandId}`, `metrics:${brandId}`] },
  );
  try {
    return await cached();
  } catch (err) {
    log.error("dashboard metrics failed", err);
    throw new Error("No se pudieron calcular las métricas del dashboard.");
  }
}

/** Cache-busting helper for callers that mutate paquetes/services. */
export async function revalidateDashboard(brandId: string) {
  revalidateTag(`dashboard:${brandId}`);
  revalidateTag(`metrics:${brandId}`);
  revalidateTag(`reports:${brandId}`);
}

// ---------------------------------------------------------------------------
// Reports snapshot — a heavier aggregate used by /backend/reportes. Same
// caching pattern, longer TTL since it reads more rows.
// ---------------------------------------------------------------------------

export interface ReportSnapshot {
  brandId: string;
  generatedAt: string;
  totalPaquetes: number;
  totalServicios: {
    aereos: number;
    alojamientos: number;
    traslados: number;
    seguros: number;
    circuitos: number;
  };
  preciosVencidos: {
    aereos: number;
    alojamientos: number;
    circuitos: number;
  };
  paquetesPorTemporada: Array<{ temporadaId: string | null; nombre: string; count: number }>;
  paquetesPorTipo: Array<{ tipoPaqueteId: string | null; nombre: string; count: number }>;
}

async function loadReportSnapshot(brandId: string): Promise<ReportSnapshot> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const [
    totalPaquetes,
    aereos,
    alojamientos,
    traslados,
    seguros,
    circuitos,
    aereosVencidos,
    alojamientosVencidos,
    circuitosVencidos,
    porTemporada,
    porTipo,
  ] = await Promise.all([
    prisma.paquete.count({ where: { brandId, deletedAt: null } }),
    prisma.aereo.count({ where: { brandId, deletedAt: null } }),
    prisma.alojamiento.count({ where: { brandId, deletedAt: null } }),
    prisma.traslado.count({ where: { brandId, deletedAt: null } }),
    prisma.seguro.count({ where: { brandId, deletedAt: null } }),
    prisma.circuito.count({ where: { brandId, deletedAt: null } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT a."id")::bigint AS count
      FROM "Aereo" a
      WHERE a."brandId" = ${brandId} AND a."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "PrecioAereo" pa
          WHERE pa."aereoId" = a."id" AND (pa."deletedAt" IS NULL)
            AND pa."periodoHasta" >= ${todayStr}
        )
        AND EXISTS (SELECT 1 FROM "PrecioAereo" pa2 WHERE pa2."aereoId" = a."id")
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT al."id")::bigint AS count
      FROM "Alojamiento" al
      WHERE al."brandId" = ${brandId} AND al."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "PrecioAlojamiento" pa
          WHERE pa."alojamientoId" = al."id" AND (pa."deletedAt" IS NULL)
            AND pa."periodoHasta" >= ${todayStr}
        )
        AND EXISTS (SELECT 1 FROM "PrecioAlojamiento" pa2 WHERE pa2."alojamientoId" = al."id")
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT c."id")::bigint AS count
      FROM "Circuito" c
      WHERE c."brandId" = ${brandId} AND c."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "PrecioCircuito" pc
          WHERE pc."circuitoId" = c."id" AND (pc."deletedAt" IS NULL)
            AND pc."periodoHasta" >= ${todayStr}
        )
        AND EXISTS (SELECT 1 FROM "PrecioCircuito" pc2 WHERE pc2."circuitoId" = c."id")
    `,
    prisma.$queryRaw<Array<{ temporadaId: string | null; nombre: string | null; count: bigint }>>`
      SELECT t."id" AS "temporadaId", t."nombre" AS "nombre", COUNT(p."id")::bigint AS count
      FROM "Paquete" p
      LEFT JOIN "Temporada" t ON t."id" = p."temporadaId"
      WHERE p."brandId" = ${brandId} AND p."deletedAt" IS NULL
      GROUP BY t."id", t."nombre"
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ tipoPaqueteId: string | null; nombre: string | null; count: bigint }>>`
      SELECT t."id" AS "tipoPaqueteId", t."nombre" AS "nombre", COUNT(p."id")::bigint AS count
      FROM "Paquete" p
      LEFT JOIN "TipoPaquete" t ON t."id" = p."tipoPaqueteId"
      WHERE p."brandId" = ${brandId} AND p."deletedAt" IS NULL
      GROUP BY t."id", t."nombre"
      ORDER BY count DESC
    `,
  ]);

  return {
    brandId,
    generatedAt: new Date().toISOString(),
    totalPaquetes,
    totalServicios: { aereos, alojamientos, traslados, seguros, circuitos },
    preciosVencidos: {
      aereos: Number(aereosVencidos[0]?.count ?? BigInt(0)),
      alojamientos: Number(alojamientosVencidos[0]?.count ?? BigInt(0)),
      circuitos: Number(circuitosVencidos[0]?.count ?? BigInt(0)),
    },
    paquetesPorTemporada: porTemporada.map((r) => ({
      temporadaId: r.temporadaId,
      nombre: r.nombre ?? "Sin temporada",
      count: Number(r.count),
    })),
    paquetesPorTipo: porTipo.map((r) => ({
      tipoPaqueteId: r.tipoPaqueteId,
      nombre: r.nombre ?? "Sin tipo",
      count: Number(r.count),
    })),
  };
}

export async function getReportSnapshot() {
  const { brandId } = await requireAuth();
  const cached = unstable_cache(
    () => loadReportSnapshot(brandId),
    [`reports:${brandId}`],
    { revalidate: 600, tags: [`reports:${brandId}`] },
  );
  try {
    return await cached();
  } catch (err) {
    log.error("report snapshot failed", err);
    throw new Error("No se pudo generar el reporte.");
  }
}
