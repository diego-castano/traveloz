-- Migration: drop legacy nights columns now that PaqueteDestino + OpcionHotel
-- are the canonical source. PR 3 of the refactor.
--
-- Columns dropped:
--   - Paquete.noches                       (use sum(PaqueteDestino.noches))
--   - PaqueteAlojamiento.nochesEnEste      (nights live on the destino, not the pool)
--   - OpcionHotelera.alojamientoIds        (hotels now tracked via OpcionHotel rows)
--   - OpcionHotelera.nochesPorAlojamiento  (split no longer supported)

ALTER TABLE "Paquete"            DROP COLUMN "noches";
ALTER TABLE "PaqueteAlojamiento" DROP COLUMN "nochesEnEste";
ALTER TABLE "OpcionHotelera"     DROP COLUMN "alojamientoIds";
ALTER TABLE "OpcionHotelera"     DROP COLUMN "nochesPorAlojamiento";
