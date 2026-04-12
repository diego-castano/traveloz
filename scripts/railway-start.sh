#!/bin/bash
set -e

echo "[railway-start] Resolving any failed migrations..."
# Try to mark the known failed migration as rolled-back so it re-runs.
# If it's already applied or not failed, this is a no-op (|| true).
npx prisma migrate resolve --rolled-back 20260410233047_add_notificacion 2>/dev/null || true

echo "[railway-start] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[railway-start] Running seed (idempotent with skipDuplicates)..."
npx tsx prisma/seed.ts || echo "[railway-start] Seed failed but continuing (non-critical)"

echo "[railway-start] Starting Next.js..."
exec next start -p ${PORT:-3000}
