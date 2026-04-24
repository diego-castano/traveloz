-- Reintroduce the base noches field on Paquete.
-- Used as the starting value in the lean "Nuevo paquete" flow and as a
-- fallback while the itinerary is still empty.

ALTER TABLE "Paquete"
  ADD COLUMN "noches" INTEGER NOT NULL DEFAULT 0;
