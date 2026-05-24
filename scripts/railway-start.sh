#!/bin/bash
set -e

echo "[railway-start] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[railway-start] Ensuring permanent protected admin..."
# Idempotent — upserts diegothx@me.com (or whatever PROTECTED_ADMIN_EMAIL is
# set to in Railway env) with isProtected=true so the UI can't strand it.
# Pure ESM JS so it works without devDependencies (tsx).
node scripts/ensure-protected-admin.mjs

echo "[railway-start] Starting Next.js..."
exec next start -p ${PORT:-3000}
