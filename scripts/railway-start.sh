#!/bin/bash
set -e

echo "[railway-start] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[railway-start] Starting Next.js..."
exec next start -p ${PORT:-3000}
