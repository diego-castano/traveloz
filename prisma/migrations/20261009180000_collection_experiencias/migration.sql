-- CreateEnum
CREATE TYPE "ColTipoExperiencia" AS ENUM ('VIAJE', 'HOTEL', 'CRUCERO', 'TREN');

-- CreateEnum
CREATE TYPE "ColEstadoExperiencia" AS ENUM ('BORRADOR', 'EN_REVISION', 'PUBLICADA', 'PAUSADA', 'ARCHIVADA');

-- CreateEnum
CREATE TYPE "ColEstadoDestino" AS ENUM ('BORRADOR', 'PUBLICADO', 'PROXIMAMENTE', 'ARCHIVADO');

-- CreateTable
CREATE TABLE "ColDestino" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "bajada" TEXT NOT NULL DEFAULT '',
    "relato" TEXT NOT NULL DEFAULT '',
    "portadaId" TEXT,
    "estado" "ColEstadoDestino" NOT NULL DEFAULT 'BORRADOR',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "seoTitulo" TEXT NOT NULL DEFAULT '',
    "seoDescripcion" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColDestino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColDestinoPais" (
    "destinoId" TEXT NOT NULL,
    "paisId" TEXT NOT NULL,

    CONSTRAINT "ColDestinoPais_pkey" PRIMARY KEY ("destinoId","paisId")
);

-- CreateTable
CREATE TABLE "ColEspecialista" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nombre" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "frase" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "idiomas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retratoId" TEXT,
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColEspecialista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColExperiencia" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "titulo" TEXT NOT NULL DEFAULT '',
    "bajada" TEXT NOT NULL DEFAULT '',
    "tipo" "ColTipoExperiencia" NOT NULL DEFAULT 'VIAJE',
    "estado" "ColEstadoExperiencia" NOT NULL DEFAULT 'BORRADOR',
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "especialistaId" TEXT,
    "proveedorId" TEXT,
    "portadaId" TEXT,
    "ogImagenId" TEXT,
    "mostrarPrecio" BOOLEAN NOT NULL DEFAULT false,
    "precioDesde" DOUBLE PRECISION,
    "precioMoneda" TEXT NOT NULL DEFAULT 'USD',
    "seoTitulo" TEXT NOT NULL DEFAULT '',
    "seoDescripcion" TEXT NOT NULL DEFAULT '',
    "contenido" JSONB NOT NULL DEFAULT '{}',
    "noches" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "publicado" JSONB,
    "publicadoRevision" INTEGER,
    "publicadaEn" TIMESTAMP(3),
    "creadaPorId" TEXT,
    "actualizadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColExperiencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColExperienciaDestino" (
    "experienciaId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ColExperienciaDestino_pkey" PRIMARY KEY ("experienciaId","destinoId")
);

-- CreateTable
CREATE TABLE "ColExperienciaHotel" (
    "experienciaId" TEXT NOT NULL,
    "alojamientoId" TEXT NOT NULL,

    CONSTRAINT "ColExperienciaHotel_pkey" PRIMARY KEY ("experienciaId","alojamientoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColDestino_slug_key" ON "ColDestino"("slug");

-- CreateIndex
CREATE INDEX "ColDestino_estado_orden_idx" ON "ColDestino"("estado", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "ColEspecialista_userId_key" ON "ColEspecialista"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ColExperiencia_slug_key" ON "ColExperiencia"("slug");

-- CreateIndex
CREATE INDEX "ColExperiencia_estado_orden_idx" ON "ColExperiencia"("estado", "orden");

-- CreateIndex
CREATE INDEX "ColExperienciaHotel_alojamientoId_idx" ON "ColExperienciaHotel"("alojamientoId");

-- AddForeignKey
ALTER TABLE "ColDestino" ADD CONSTRAINT "ColDestino_portadaId_fkey" FOREIGN KEY ("portadaId") REFERENCES "ColMedio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColDestinoPais" ADD CONSTRAINT "ColDestinoPais_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "ColDestino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColDestinoPais" ADD CONSTRAINT "ColDestinoPais_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColEspecialista" ADD CONSTRAINT "ColEspecialista_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColEspecialista" ADD CONSTRAINT "ColEspecialista_retratoId_fkey" FOREIGN KEY ("retratoId") REFERENCES "ColMedio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperiencia" ADD CONSTRAINT "ColExperiencia_especialistaId_fkey" FOREIGN KEY ("especialistaId") REFERENCES "ColEspecialista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperiencia" ADD CONSTRAINT "ColExperiencia_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperiencia" ADD CONSTRAINT "ColExperiencia_portadaId_fkey" FOREIGN KEY ("portadaId") REFERENCES "ColMedio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperiencia" ADD CONSTRAINT "ColExperiencia_ogImagenId_fkey" FOREIGN KEY ("ogImagenId") REFERENCES "ColMedio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperienciaDestino" ADD CONSTRAINT "ColExperienciaDestino_experienciaId_fkey" FOREIGN KEY ("experienciaId") REFERENCES "ColExperiencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperienciaDestino" ADD CONSTRAINT "ColExperienciaDestino_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "ColDestino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperienciaHotel" ADD CONSTRAINT "ColExperienciaHotel_experienciaId_fkey" FOREIGN KEY ("experienciaId") REFERENCES "ColExperiencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColExperienciaHotel" ADD CONSTRAINT "ColExperienciaHotel_alojamientoId_fkey" FOREIGN KEY ("alojamientoId") REFERENCES "Alojamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

