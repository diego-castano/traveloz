-- Punto focal + zoom por foto de paquete, para reencuadrar el hero/slider sin
-- redimensionar el archivo. Aditivo y no destructivo: backfillea las filas
-- existentes con el centro (50/50) y zoom 1 (sin cambios visuales).
ALTER TABLE "PaqueteFoto" ADD COLUMN "posX" DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "PaqueteFoto" ADD COLUMN "posY" DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "PaqueteFoto" ADD COLUMN "zoom" DOUBLE PRECISION NOT NULL DEFAULT 1;
