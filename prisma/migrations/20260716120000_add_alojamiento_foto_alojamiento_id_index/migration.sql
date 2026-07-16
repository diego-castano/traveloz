-- Performance: AlojamientoFoto has no index on its parent FK, but the wave-2
-- service fetch (getAllServiceData) runs
--   prisma.alojamientoFoto.findMany({ where: { alojamiento: { brandId, deletedAt: null } } })
-- which resolves through AlojamientoFoto.alojamientoId. Without this index the
-- planner falls back to a sequential scan on AlojamientoFoto. Additive index —
-- no data change.

CREATE INDEX IF NOT EXISTS "AlojamientoFoto_alojamientoId_idx"
  ON "AlojamientoFoto" ("alojamientoId");
