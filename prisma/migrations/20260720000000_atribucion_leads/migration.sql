-- Atribución de pauta: snapshot first/last touch (cookie tvz_attr) + id de
-- visitante anónimo en los 6 modelos de lead, más el historial de páginas
-- vistas (PaginaVista). Aditiva e idempotente (moldes: add_destinico_fields /
-- add_notificacion), pensada para correr contra la DB de producción vía el
-- `prisma migrate deploy` del boot sin depender del estado previo.

-- AlterTable: Cotizacion
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "atribFirst" JSONB;
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "atribLast" JSONB;
ALTER TABLE "Cotizacion" ADD COLUMN IF NOT EXISTS "visitanteId" TEXT;

-- AlterTable: MensajeContacto
ALTER TABLE "MensajeContacto" ADD COLUMN IF NOT EXISTS "atribFirst" JSONB;
ALTER TABLE "MensajeContacto" ADD COLUMN IF NOT EXISTS "atribLast" JSONB;
ALTER TABLE "MensajeContacto" ADD COLUMN IF NOT EXISTS "visitanteId" TEXT;

-- AlterTable: ContactoCorporativo
ALTER TABLE "ContactoCorporativo" ADD COLUMN IF NOT EXISTS "atribFirst" JSONB;
ALTER TABLE "ContactoCorporativo" ADD COLUMN IF NOT EXISTS "atribLast" JSONB;
ALTER TABLE "ContactoCorporativo" ADD COLUMN IF NOT EXISTS "visitanteId" TEXT;

-- AlterTable: Postulacion
ALTER TABLE "Postulacion" ADD COLUMN IF NOT EXISTS "atribFirst" JSONB;
ALTER TABLE "Postulacion" ADD COLUMN IF NOT EXISTS "atribLast" JSONB;
ALTER TABLE "Postulacion" ADD COLUMN IF NOT EXISTS "visitanteId" TEXT;

-- AlterTable: SuscripcionNewsletter
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN IF NOT EXISTS "atribFirst" JSONB;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN IF NOT EXISTS "atribLast" JSONB;
ALTER TABLE "SuscripcionNewsletter" ADD COLUMN IF NOT EXISTS "visitanteId" TEXT;

-- AlterTable: CotizadorLead
ALTER TABLE "CotizadorLead" ADD COLUMN IF NOT EXISTS "atribFirst" JSONB;
ALTER TABLE "CotizadorLead" ADD COLUMN IF NOT EXISTS "atribLast" JSONB;
ALTER TABLE "CotizadorLead" ADD COLUMN IF NOT EXISTS "visitanteId" TEXT;

-- CreateTable: PaginaVista (historial anónimo; retención 180 días vía prune)
CREATE TABLE IF NOT EXISTS "PaginaVista" (
    "id" TEXT NOT NULL,
    "visitanteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaginaVista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaginaVista_visitanteId_createdAt_idx" ON "PaginaVista"("visitanteId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaginaVista_createdAt_idx" ON "PaginaVista"("createdAt");
