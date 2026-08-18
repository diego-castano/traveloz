-- CreateEnum
CREATE TYPE "TipoFormularioDato" AS ENUM ('PASAJEROS', 'PAGO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fotoUrl" TEXT,
ADD COLUMN     "linkActivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "telefono" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "FormularioDato" (
    "id" TEXT NOT NULL,
    "tipo" "TipoFormularioDato" NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT,
    "campos" JSONB NOT NULL DEFAULT '[]',
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormularioDato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudDato" (
    "id" TEXT NOT NULL,
    "tipo" "TipoFormularioDato" NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "vendedorEmail" TEXT NOT NULL,
    "vendedorNombre" TEXT NOT NULL,
    "destinatarioEmail" TEXT NOT NULL,
    "destinatarioNombre" TEXT,
    "destino" TEXT,
    "referencia" TEXT,
    "token" TEXT NOT NULL,
    "enviadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "completadoAt" TIMESTAMP(3),

    CONSTRAINT "SolicitudDato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioPasajeros" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "vendedorEmail" TEXT NOT NULL,
    "solicitudId" TEXT,
    "destino" TEXT,
    "referencia" TEXT,
    "facturaRut" TEXT,
    "facturaRazonSocial" TEXT,
    "facturaEmail" TEXT,
    "facturaDireccion" TEXT,
    "vistoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "EnvioPasajeros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasajeroDato" (
    "id" TEXT NOT NULL,
    "envioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "documento" TEXT NOT NULL,
    "pasaporte" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT,
    "pais" TEXT,
    "ciudad" TEXT,
    "documentoArchivoUrl" TEXT,
    "pasaporteArchivoUrl" TEXT,
    "respuestas" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "PasajeroDato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatosPagoCifrado" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "vendedorEmail" TEXT NOT NULL,
    "solicitudId" TEXT,
    "titular" TEXT NOT NULL,
    "emisor" TEXT,
    "ultimos4" TEXT NOT NULL,
    "payload" BYTEA,
    "iv" BYTEA,
    "tag" BYTEA,
    "recordatorioResendId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "vistoAt" TIMESTAMP(3),
    "purgadoAt" TIMESTAMP(3),

    CONSTRAINT "DatosPagoCifrado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormularioDato_tipo_key" ON "FormularioDato"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudDato_token_key" ON "SolicitudDato"("token");

-- CreateIndex
CREATE INDEX "SolicitudDato_vendedorId_enviadoAt_idx" ON "SolicitudDato"("vendedorId", "enviadoAt" DESC);

-- CreateIndex
CREATE INDEX "EnvioPasajeros_vendedorId_createdAt_idx" ON "EnvioPasajeros"("vendedorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EnvioPasajeros_destino_idx" ON "EnvioPasajeros"("destino");

-- CreateIndex
CREATE INDEX "EnvioPasajeros_createdAt_idx" ON "EnvioPasajeros"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "PasajeroDato_envioId_idx" ON "PasajeroDato"("envioId");

-- CreateIndex
CREATE INDEX "PasajeroDato_email_idx" ON "PasajeroDato"("email");

-- CreateIndex
CREATE INDEX "DatosPagoCifrado_vendedorId_createdAt_idx" ON "DatosPagoCifrado"("vendedorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DatosPagoCifrado_expiraAt_idx" ON "DatosPagoCifrado"("expiraAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- AddForeignKey
ALTER TABLE "PasajeroDato" ADD CONSTRAINT "PasajeroDato_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "EnvioPasajeros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

