/**
 * Next.js 14 instrumentation hook — fires once per server process at boot.
 *
 * We use it to pre-warm the Prisma connection pool with a single `SELECT 1`.
 * Without this, the FIRST request after a cold boot (or after a new deploy
 * on Railway) pays an extra 1-3 s while Prisma lazily opens its TCP
 * connection to Postgres through the Railway proxy. That delay stacks up
 * across the three parallel provider fetches (Catalog / Service / Package),
 * which is what users perceive as "el dashboard demora siglos la primera vez".
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    // eslint-disable-next-line no-console
    console.log("[instrumentation] Prisma connection warmed");
  } catch (err) {
    // Warm-up is best-effort. If the DB is unreachable we don't want to stop
    // the server — let the request-time error surface normally.
    // eslint-disable-next-line no-console
    console.warn(
      "[instrumentation] Prisma warm-up failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }
}
