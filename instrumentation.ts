/**
 * Next.js 14 instrumentation hook — fires once per server process at boot.
 *
 * Two phases:
 *
 * 1. **Connection warmup**: import the Prisma singleton, which fires its own
 *    `SELECT 1` to open the TCP connection through Railway's proxy. Without
 *    this the FIRST user request pays an extra 1-3 s handshake.
 *
 * 2. **Query warmup**: run a small set of representative queries so the
 *    Postgres planner caches their plans, the connection stays hot, and the
 *    Prisma engine compiles the query graph. The dashboard's three providers
 *    (Catalog / Service / Package) each fire ~1 query per table; warming
 *    those plans here means the cold dashboard load drops from "every plan
 *    compiled on first hit" to "all plans ready when user logs in".
 *
 * The warmup loop is scheduled with `setInterval` to also keep Railway's
 * idle TCP connection alive (Railway closes idle TCP after ~5 min, so we
 * ping every 4 min to dodge the silent reconnect).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // eslint-disable-next-line no-console
  console.log("[instrumentation] loading Prisma singleton…");
  const dbMod = await import("@/lib/db");
  const { prisma } = dbMod;

  // Phase 1: confirm connection. Already done inside src/lib/db.ts but we
  // also `await` here so the next phase doesn't race.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[instrumentation] connection probe failed:", err instanceof Error ? err.message : err);
    return;
  }

  // Phase 2: query plan warmup. Fire a representative count() against every
  // table the admin shell touches on first load. We swallow errors per table
  // so a missing/empty table never blocks the rest.
  // eslint-disable-next-line no-console
  console.log("[instrumentation] warming query plans…");
  const warmups: Array<Promise<unknown>> = [
    prisma.paquete.count().catch(() => null),
    prisma.aereo.count().catch(() => null),
    prisma.alojamiento.count().catch(() => null),
    prisma.traslado.count().catch(() => null),
    prisma.seguro.count().catch(() => null),
    prisma.circuito.count().catch(() => null),
    prisma.temporada.count().catch(() => null),
    prisma.tipoPaquete.count().catch(() => null),
    prisma.region.count().catch(() => null),
    prisma.pais.count().catch(() => null),
    prisma.proveedor.count().catch(() => null),
  ];
  void Promise.allSettled(warmups).then((results) => {
    const ok = results.filter((r) => r.status === "fulfilled").length;
    // eslint-disable-next-line no-console
    console.log(`[instrumentation] warmed ${ok}/${results.length} query plans`);
  });

  // Phase 3: keep-alive ping every 4 min to dodge Railway's idle-TCP cutoff.
  // 4 min < Railway's ~5 min idle window. Each ping is ~1 ms so the cost is
  // negligible compared to paying a 1-3 s reconnect on the first user
  // request after a quiet stretch.
  const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;
  setInterval(() => {
    void prisma.$queryRaw`SELECT 1`.catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[instrumentation] keepalive failed:", err instanceof Error ? err.message : err);
    });
  }, KEEPALIVE_INTERVAL_MS).unref?.();
}
