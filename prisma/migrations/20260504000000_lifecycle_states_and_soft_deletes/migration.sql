-- Lifecycle states + soft-delete uniformity for price tables.
-- Adds:
--   * EstadoPaquete: EN_REVISION + ARCHIVADO (INACTIVO kept as legacy alias)
--   * deletedAt to PrecioAereo / PrecioAlojamiento / PrecioCircuito
--   * compound (servicio, periodoDesde, periodoHasta) indexes for faster lookups
--   * (deletedAt) indexes for soft-delete filtered queries
-- Backfills existing INACTIVO paquetes to ARCHIVADO so downstream code can
-- stop branching on the legacy value.

-- 1. Extend the EstadoPaquete enum.
ALTER TYPE "EstadoPaquete" ADD VALUE IF NOT EXISTS 'EN_REVISION';
ALTER TYPE "EstadoPaquete" ADD VALUE IF NOT EXISTS 'ARCHIVADO';

-- 2. PrecioAereo soft delete + indexes
ALTER TABLE "PrecioAereo" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "PrecioAereo_aereoId_periodoDesde_periodoHasta_idx"
  ON "PrecioAereo" ("aereoId", "periodoDesde", "periodoHasta");
CREATE INDEX IF NOT EXISTS "PrecioAereo_deletedAt_idx"
  ON "PrecioAereo" ("deletedAt");

-- 3. PrecioAlojamiento soft delete + indexes
ALTER TABLE "PrecioAlojamiento" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "PrecioAlojamiento_alojamientoId_periodoDesde_periodoHasta_idx"
  ON "PrecioAlojamiento" ("alojamientoId", "periodoDesde", "periodoHasta");
CREATE INDEX IF NOT EXISTS "PrecioAlojamiento_deletedAt_idx"
  ON "PrecioAlojamiento" ("deletedAt");

-- 4. PrecioCircuito soft delete + indexes
ALTER TABLE "PrecioCircuito" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "PrecioCircuito_circuitoId_periodoDesde_periodoHasta_idx"
  ON "PrecioCircuito" ("circuitoId", "periodoDesde", "periodoHasta");
CREATE INDEX IF NOT EXISTS "PrecioCircuito_deletedAt_idx"
  ON "PrecioCircuito" ("deletedAt");

-- 5. Backfill: convert legacy INACTIVO → ARCHIVADO. The enum value stays
-- defined so existing query strings keep parsing, but fresh writes from the
-- new server actions only use BORRADOR/EN_REVISION/ACTIVO/ARCHIVADO.
UPDATE "Paquete" SET "estado" = 'ARCHIVADO' WHERE "estado" = 'INACTIVO';
