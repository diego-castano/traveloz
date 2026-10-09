-- CreateEnum
CREATE TYPE "ColEstadoConsulta" AS ENUM ('NUEVA', 'EN_CURSO', 'CERRADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "ColEstadoSuscriptor" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'BAJA');

-- CreateTable
CREATE TABLE "ColConsulta" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "experienciaId" TEXT,
    "especialistaId" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL DEFAULT '',
    "paisCodigo" TEXT,
    "ocasion" TEXT NOT NULL DEFAULT '',
    "destinos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estilo" TEXT NOT NULL DEFAULT '',
    "fechaTipo" TEXT NOT NULL DEFAULT '',
    "fechaDesde" TIMESTAMP(3),
    "fechaHasta" TIMESTAMP(3),
    "mesAproximado" TEXT NOT NULL DEFAULT '',
    "noches" INTEGER,
    "adultos" INTEGER NOT NULL DEFAULT 2,
    "ninos" INTEGER NOT NULL DEFAULT 0,
    "edadesNinos" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "inversion" TEXT NOT NULL DEFAULT '',
    "canal" TEXT NOT NULL DEFAULT '',
    "comentarios" TEXT NOT NULL DEFAULT '',
    "aceptaNovedades" BOOLEAN NOT NULL DEFAULT false,
    "origenUrl" TEXT NOT NULL DEFAULT '',
    "atribFirst" JSONB,
    "atribLast" JSONB,
    "visitanteId" TEXT,
    "estado" "ColEstadoConsulta" NOT NULL DEFAULT 'NUEVA',
    "notaInterna" TEXT NOT NULL DEFAULT '',
    "crmEstado" "CrmEstado",
    "crmDealId" TEXT,
    "crmContactId" TEXT,
    "crmModo" TEXT,
    "crmError" TEXT,
    "crmEnviadoEn" TIMESTAMP(3),
    "crmIntentos" INTEGER NOT NULL DEFAULT 0,
    "avisoEnviado" BOOLEAN NOT NULL DEFAULT false,
    "confirmacionEnviada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColConsulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColSuscriptor" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "estado" "ColEstadoSuscriptor" NOT NULL DEFAULT 'PENDIENTE',
    "token" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEn" TIMESTAMP(3),
    "bajaEn" TIMESTAMP(3),

    CONSTRAINT "ColSuscriptor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColConsulta_numero_key" ON "ColConsulta"("numero");

-- CreateIndex
CREATE INDEX "ColConsulta_createdAt_idx" ON "ColConsulta"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ColConsulta_estado_idx" ON "ColConsulta"("estado");

-- CreateIndex
CREATE INDEX "ColConsulta_experienciaId_idx" ON "ColConsulta"("experienciaId");

-- CreateIndex
CREATE INDEX "ColConsulta_especialistaId_idx" ON "ColConsulta"("especialistaId");

-- CreateIndex
CREATE UNIQUE INDEX "ColSuscriptor_email_key" ON "ColSuscriptor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ColSuscriptor_token_key" ON "ColSuscriptor"("token");

-- AddForeignKey
ALTER TABLE "ColConsulta" ADD CONSTRAINT "ColConsulta_experienciaId_fkey" FOREIGN KEY ("experienciaId") REFERENCES "ColExperiencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColConsulta" ADD CONSTRAINT "ColConsulta_especialistaId_fkey" FOREIGN KEY ("especialistaId") REFERENCES "ColEspecialista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

