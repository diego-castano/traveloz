-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoPaquete" ADD VALUE 'EN_REVISION';
ALTER TYPE "EstadoPaquete" ADD VALUE 'ARCHIVADO';

-- AlterTable
ALTER TABLE "Paquete" ADD COLUMN     "itinerarioPublico" TEXT,
ADD COLUMN     "textoCondiciones" TEXT,
ADD COLUMN     "textoIntro" TEXT,
ADD COLUMN     "textoNoIncluye" TEXT;

-- AlterTable
ALTER TABLE "PrecioAereo" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PrecioAlojamiento" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PrecioCircuito" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FaqTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iconUrl" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermSection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteCorporativo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "link" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteCorporativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaContacto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "photoUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaContacto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaqTopic_slug_key" ON "FaqTopic"("slug");

-- CreateIndex
CREATE INDEX "FaqTopic_activo_idx" ON "FaqTopic"("activo");

-- CreateIndex
CREATE INDEX "FaqTopic_orden_idx" ON "FaqTopic"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "TermSection_slug_key" ON "TermSection"("slug");

-- CreateIndex
CREATE INDEX "TermSection_activo_idx" ON "TermSection"("activo");

-- CreateIndex
CREATE INDEX "TermSection_orden_idx" ON "TermSection"("orden");

-- CreateIndex
CREATE INDEX "ClienteCorporativo_activo_idx" ON "ClienteCorporativo"("activo");

-- CreateIndex
CREATE INDEX "ClienteCorporativo_orden_idx" ON "ClienteCorporativo"("orden");

-- CreateIndex
CREATE INDEX "PersonaContacto_activo_idx" ON "PersonaContacto"("activo");

-- CreateIndex
CREATE INDEX "PersonaContacto_orden_idx" ON "PersonaContacto"("orden");

-- CreateIndex
CREATE INDEX "Aereo_brandId_deletedAt_idx" ON "Aereo"("brandId", "deletedAt");

-- CreateIndex
CREATE INDEX "Alojamiento_brandId_deletedAt_idx" ON "Alojamiento"("brandId", "deletedAt");

-- CreateIndex
CREATE INDEX "Circuito_brandId_deletedAt_idx" ON "Circuito"("brandId", "deletedAt");

-- CreateIndex
CREATE INDEX "Paquete_brandId_deletedAt_createdAt_idx" ON "Paquete"("brandId", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Paquete_brandId_deletedAt_idx" ON "Paquete"("brandId", "deletedAt");

-- CreateIndex
CREATE INDEX "PrecioAereo_aereoId_periodoDesde_periodoHasta_idx" ON "PrecioAereo"("aereoId", "periodoDesde", "periodoHasta");

-- CreateIndex
CREATE INDEX "PrecioAereo_deletedAt_idx" ON "PrecioAereo"("deletedAt");

-- CreateIndex
CREATE INDEX "PrecioAlojamiento_alojamientoId_periodoDesde_periodoHasta_idx" ON "PrecioAlojamiento"("alojamientoId", "periodoDesde", "periodoHasta");

-- CreateIndex
CREATE INDEX "PrecioAlojamiento_deletedAt_idx" ON "PrecioAlojamiento"("deletedAt");

-- CreateIndex
CREATE INDEX "PrecioCircuito_circuitoId_periodoDesde_periodoHasta_idx" ON "PrecioCircuito"("circuitoId", "periodoDesde", "periodoHasta");

-- CreateIndex
CREATE INDEX "PrecioCircuito_deletedAt_idx" ON "PrecioCircuito"("deletedAt");

-- CreateIndex
CREATE INDEX "Seguro_brandId_deletedAt_idx" ON "Seguro"("brandId", "deletedAt");

-- CreateIndex
CREATE INDEX "Traslado_brandId_deletedAt_idx" ON "Traslado"("brandId", "deletedAt");

