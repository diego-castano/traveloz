/**
 * Idempotent upsert for the permanent protected owner admin.
 *
 * Runs on every Railway boot (chained after `prisma migrate deploy` in
 * scripts/railway-start.sh) so prod always has a known break-glass admin
 * even if no one ran `db:seed`. Safe to re-run: uses upsert with re-asserted
 * fields (role / isProtected / isActive / passwordHash).
 *
 * Written as plain ESM JS (no tsx) so it works in production where
 * devDependencies may not be installed. Both `@prisma/client` and
 * `bcryptjs` are runtime deps in package.json.
 *
 * Credentials are read from env so the password isn't pinned to git:
 *   PROTECTED_ADMIN_EMAIL    (default: diegothx@me.com)
 *   PROTECTED_ADMIN_NAME     (default: "Diego (Owner)")
 *   PROTECTED_ADMIN_PASSWORD (default: "Wired538" — override in Railway)
 *
 * If DATABASE_URL is missing the script exits 0 with a warning instead of
 * crashing the boot — that's only the case for local CI shells, never prod.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[ensure-protected-admin] DATABASE_URL not set — skipping.");
    return;
  }

  const email = (process.env.PROTECTED_ADMIN_EMAIL || "diegothx@me.com").toLowerCase();
  const name = process.env.PROTECTED_ADMIN_NAME || "Diego (Owner)";
  const password = process.env.PROTECTED_ADMIN_PASSWORD || "Wired538";
  const passwordHash = bcrypt.hashSync(password, 10);

  const prisma = new PrismaClient();
  try {
    await prisma.user.upsert({
      where: { email },
      create: {
        id: "user-admin-protected",
        email,
        name,
        role: "ADMIN",
        brandId: "brand-1",
        passwordHash,
        isProtected: true,
        isActive: true,
      },
      update: {
        // Re-assert the load-bearing fields on every boot so a manual UI
        // toggle can't strand the break-glass account. We don't touch `name`
        // here so the user can edit it from "Mi perfil" without it being
        // overwritten on the next deploy.
        role: "ADMIN",
        isProtected: true,
        isActive: true,
        passwordHash,
      },
    });
    console.log(`[ensure-protected-admin] OK — ${email} is ADMIN + isProtected.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // Don't crash the boot — we still want the app to come up even if this
  // single row failed to upsert. Surface the error loudly in the logs.
  console.error("[ensure-protected-admin] FAILED:", err);
  process.exit(0);
});
