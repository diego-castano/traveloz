-- Estado del push de cada Cotizacion a Bitrix24. Hasta hoy el dealId sólo
-- quedaba en el log: para auditar si un lead llegó al CRM había que cruzar
-- Bitrix a mano. Ahora se guarda en la fila.
--
-- Aditiva e idempotente (molde: atribucion_leads), pensada para correr contra
-- producción vía el `prisma migrate deploy` del boot. `crmEstado` queda
-- NULLABLE y sin default a propósito: las cotizaciones que ya existen se
-- quedan en NULL = "anterior a esta instrumentación, no sabemos si llegó".

-- CreateEnum (condicional: si ya existe, seguimos)
DO $$ BEGIN
    CREATE TYPE "CrmEstado" AS ENUM ('PENDIENTE', 'OK', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Cotizacion
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "crmEstado" "CrmEstado";
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "crmDealId" TEXT;
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "crmContactId" TEXT;
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "crmModo" TEXT;
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "crmError" TEXT;
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "crmEnviadoEn" TIMESTAMP(3);
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "crmIntentos" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: pantalla de auditoría ("últimos N días con estado PENDIENTE o ERROR")
CREATE INDEX IF NOT EXISTS "Cotizacion_crmEstado_createdAt_idx" ON "Cotizacion"("crmEstado", "createdAt" DESC);
