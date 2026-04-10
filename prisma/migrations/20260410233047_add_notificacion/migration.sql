-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "etiquetaId" TEXT NOT NULL,
    "paqueteIds" TEXT[],
    "mensaje" TEXT,
    "enviadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacion_brandId_idx" ON "Notificacion"("brandId");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
