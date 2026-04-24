import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaWarmed: boolean | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Pre-warm the connection pool the first time this module is loaded in a given
// server process. Railway's metro.proxy.rlwy.net hop adds a 1-3 s handshake on
// the first query; without this, every cold container makes the first user
// request wait for that handshake. The warm-up is fire-and-forget — if it
// fails, request-time errors still surface normally.
if (!globalForPrisma.prismaWarmed) {
  globalForPrisma.prismaWarmed = true;
  prisma
    .$queryRaw`SELECT 1`
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('[db] Prisma connection pool warmed');
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        '[db] Prisma warm-up failed (non-fatal):',
        err instanceof Error ? err.message : err,
      );
    });
}
