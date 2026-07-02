-- Galería de imágenes para Traslados (mismo patrón que Aereo.itinerarioImagenes).
-- Aditivo y no destructivo: agrega la columna con default vacío y backfillea las
-- filas existentes con un array vacío.
ALTER TABLE "Traslado" ADD COLUMN "imagenes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
