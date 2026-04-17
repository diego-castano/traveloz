-- Add per-opcion nights override map.
-- Stored as a Postgres jsonb column: { "<alojamientoId>": <noches>, ... }
ALTER TABLE "OpcionHotelera"
  ADD COLUMN "nochesPorAlojamiento" JSONB;
