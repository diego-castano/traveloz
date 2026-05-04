-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('NUEVO', 'LEIDO', 'RESPONDIDO', 'CERRADA');

-- CreateEnum
CREATE TYPE "CanalContacto" AS ENUM ('LLAMADA', 'EMAIL', 'WHATSAPP');

-- AlterTable
ALTER TABLE "Paquete" ADD COLUMN     "heroImage" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "precioDesde" DOUBLE PRECISION,
ADD COLUMN     "precioDesdeMoneda" TEXT DEFAULT 'USD',
ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "textoIncluye" TEXT;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "heroImage" TEXT;

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "label" TEXT,
    "group" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Testimonio" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT,
    "ubicacion" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "autor" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaDestacada" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "imagen" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaDestacada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteServicio" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "textoCustom" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaqueteServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "paisCodigo" TEXT,
    "fechaDesde" TIMESTAMP(3),
    "fechaHasta" TIMESTAMP(3),
    "adultos" INTEGER NOT NULL DEFAULT 0,
    "ninos" INTEGER NOT NULL DEFAULT 0,
    "infantes" INTEGER NOT NULL DEFAULT 0,
    "preferencia" "CanalContacto",
    "comentarios" TEXT,
    "origen" TEXT,
    "aceptaPromos" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'NUEVO',
    "asignadoAUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeContacto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "comentarios" TEXT NOT NULL,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'NUEVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensajeContacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactoCorporativo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "cargo" TEXT,
    "empresa" TEXT NOT NULL,
    "comentarios" TEXT,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'NUEVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactoCorporativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postulacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "motivacion" TEXT NOT NULL,
    "cvUrl" TEXT NOT NULL,
    "cvFilename" TEXT NOT NULL,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'NUEVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuscripcionNewsletter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "SuscripcionNewsletter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteSetting_group_idx" ON "SiteSetting"("group");

-- CreateIndex
CREATE INDEX "Testimonio_publicado_idx" ON "Testimonio"("publicado");

-- CreateIndex
CREATE INDEX "Testimonio_orden_idx" ON "Testimonio"("orden");

-- CreateIndex
CREATE INDEX "CategoriaDestacada_activa_idx" ON "CategoriaDestacada"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoServicio_nombre_key" ON "CatalogoServicio"("nombre");

-- CreateIndex
CREATE INDEX "CatalogoServicio_activo_idx" ON "CatalogoServicio"("activo");

-- CreateIndex
CREATE INDEX "PaqueteServicio_paqueteId_idx" ON "PaqueteServicio"("paqueteId");

-- CreateIndex
CREATE UNIQUE INDEX "PaqueteServicio_paqueteId_servicioId_key" ON "PaqueteServicio"("paqueteId", "servicioId");

-- CreateIndex
CREATE INDEX "Cotizacion_estado_idx" ON "Cotizacion"("estado");

-- CreateIndex
CREATE INDEX "Cotizacion_createdAt_idx" ON "Cotizacion"("createdAt");

-- CreateIndex
CREATE INDEX "MensajeContacto_estado_idx" ON "MensajeContacto"("estado");

-- CreateIndex
CREATE INDEX "ContactoCorporativo_estado_idx" ON "ContactoCorporativo"("estado");

-- CreateIndex
CREATE INDEX "Postulacion_estado_idx" ON "Postulacion"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "SuscripcionNewsletter_email_key" ON "SuscripcionNewsletter"("email");

-- CreateIndex
CREATE INDEX "SuscripcionNewsletter_active_idx" ON "SuscripcionNewsletter"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Paquete_slug_key" ON "Paquete"("slug");

-- CreateIndex
CREATE INDEX "Paquete_publicado_idx" ON "Paquete"("publicado");

-- AddForeignKey
ALTER TABLE "Testimonio" ADD CONSTRAINT "Testimonio_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteServicio" ADD CONSTRAINT "PaqueteServicio_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteServicio" ADD CONSTRAINT "PaqueteServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "CatalogoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

