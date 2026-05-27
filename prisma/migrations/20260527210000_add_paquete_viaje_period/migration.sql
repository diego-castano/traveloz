-- Distinct from validez (which is the listing window in the public frontend),
-- viaje is the period when the customer actually travels. Services and their
-- period-based prices are matched against this range.
ALTER TABLE "Paquete" ADD COLUMN     "viajeDesde" TEXT;
ALTER TABLE "Paquete" ADD COLUMN     "viajeHasta" TEXT;
