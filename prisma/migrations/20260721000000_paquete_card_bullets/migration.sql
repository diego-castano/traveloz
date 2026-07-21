-- Renglones custom de la tarjeta del paquete en grillas/listados. Array de
-- strings en JSONB; null/vacío → la UI los deriva automáticos de textoIncluye
-- via buildCardBullets (comportamiento actual intacto). Aditiva e idempotente
-- (molde: 20260720000000_atribucion_leads), pensada para correr contra la DB
-- de producción vía el `prisma migrate deploy` del boot sin depender del
-- estado previo.

-- AlterTable: Paquete
ALTER TABLE "Paquete" ADD COLUMN IF NOT EXISTS "cardBullets" JSONB;
