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
  // Importing the Prisma singleton kicks off the self-warming query defined
  // in src/lib/db.ts. We don't need to await anything here — it's
  // fire-and-forget.
  // eslint-disable-next-line no-console
  console.log("[instrumentation] loading Prisma singleton…");
  await import("@/lib/db");
}
