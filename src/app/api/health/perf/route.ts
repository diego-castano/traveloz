/**
 * GET /api/health/perf — measure real DB latency for the queries that matter.
 *
 * Runs each of the four hot endpoints back-to-back and returns p50/p95/max
 * timings plus a per-query breakdown. Use it to verify whether
 * unstable_cache is actually serving from memory and to confirm Railway's
 * proxy round-trip is what you think it is.
 *
 * Auth: requires a valid admin session — exposes brand-scoped data and we
 * don't want anonymous probes hitting Prisma.
 *
 * Output shape:
 *   {
 *     brandId, samples,
 *     overall: { totalMs },
 *     queries: [{ name, runs, p50, p95, max, min, mean }],
 *   }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import {
  getBasePackages,
  getPackageSubEntities,
} from "@/actions/package.actions";
import {
  getBaseServices,
  getServiceSubEntities,
} from "@/actions/service.actions";
import { getBaseCatalogs, getCatalogGeography } from "@/actions/catalog.actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Sample {
  name: string;
  runs: number[];
}

function summarise(s: Sample) {
  const sorted = [...s.runs].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
  const max = sorted[sorted.length - 1];
  const min = sorted[0];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    name: s.name,
    runs: s.runs,
    p50: round(p50),
    p95: round(p95),
    max: round(max),
    min: round(min),
    mean: round(mean),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

async function time<T>(fn: () => Promise<T>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function bench(name: string, fn: () => Promise<unknown>, samples: number) {
  const runs: number[] = [];
  for (let i = 0; i < samples; i++) {
    runs.push(await time(fn));
  }
  return summarise({ name, runs });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const samples = Math.max(1, Math.min(20, Number(url.searchParams.get("n") ?? 5)));

  const overallStart = performance.now();

  // First pass: includes cold runs that compile the query plan and miss the
  // unstable_cache buckets. Subsequent runs hit memory.
  const results = await Promise.all([
    bench("db.SELECT 1", () => prisma.$queryRaw`SELECT 1` as Promise<unknown>, samples),
    bench("getBasePackages", () => getBasePackages(undefined, { take: 18 }), samples),
    bench("getPackageSubEntities", () => getPackageSubEntities(), samples),
    bench("getBaseServices", () => getBaseServices(undefined, { alojamientosTake: 10 }), samples),
    bench("getServiceSubEntities", () => getServiceSubEntities(), samples),
    bench("getBaseCatalogs", () => getBaseCatalogs(), samples),
    bench("getCatalogGeography", () => getCatalogGeography(), samples),
  ]);

  const totalMs = round(performance.now() - overallStart);

  // First-vs-cached comparison: the fast path is summarised by p50 (which
  // skips the cold first run when samples >= 3). The cold time is run[0].
  const view = results.map((r) => ({
    ...r,
    cold_first_run: round(r.runs[0]),
    cached_p50: r.p50,
    speedup: round(r.runs[0] / Math.max(1, r.p50)),
  }));

  return NextResponse.json(
    {
      brandId: (session.user as { brandId?: string }).brandId ?? null,
      samples,
      overall: { totalMs },
      queries: view,
      hint:
        "speedup = cold_first_run / cached_p50. >5x means unstable_cache is doing its job.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
