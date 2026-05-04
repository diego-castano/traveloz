-- Performance: compound indexes that match the hot query patterns of the
-- admin providers (every list query: WHERE brandId = $1 AND deletedAt IS NULL,
-- often ORDER BY createdAt DESC). Without these the planner can use the
-- single-column brandId index but still pay an extra filter step + sort.

-- Paquete: list endpoints filter by brand+deletedAt and sort newest first.
CREATE INDEX IF NOT EXISTS "Paquete_brandId_deletedAt_createdAt_idx"
  ON "Paquete" ("brandId", "deletedAt", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Paquete_brandId_deletedAt_idx"
  ON "Paquete" ("brandId", "deletedAt");

-- Service tables — wave 2 join queries constrain on the parent being live.
CREATE INDEX IF NOT EXISTS "Aereo_brandId_deletedAt_idx"
  ON "Aereo" ("brandId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Alojamiento_brandId_deletedAt_idx"
  ON "Alojamiento" ("brandId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Traslado_brandId_deletedAt_idx"
  ON "Traslado" ("brandId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Seguro_brandId_deletedAt_idx"
  ON "Seguro" ("brandId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Circuito_brandId_deletedAt_idx"
  ON "Circuito" ("brandId", "deletedAt");
