-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_brandId_slug_key" ON "Etiqueta"("brandId", "slug");

-- CreateIndex
CREATE INDEX "OpcionHotelera_paqueteId_idx" ON "OpcionHotelera"("paqueteId");

-- CreateIndex
CREATE INDEX "Paquete_estado_idx" ON "Paquete"("estado");

-- CreateIndex
CREATE INDEX "Paquete_deletedAt_idx" ON "Paquete"("deletedAt");

-- CreateIndex
CREATE INDEX "Paquete_temporadaId_idx" ON "Paquete"("temporadaId");

-- CreateIndex
CREATE INDEX "Paquete_tipoPaqueteId_idx" ON "Paquete"("tipoPaqueteId");

-- CreateIndex
CREATE INDEX "PaqueteFoto_paqueteId_idx" ON "PaqueteFoto"("paqueteId");

-- CreateIndex
CREATE UNIQUE INDEX "Regimen_brandId_nombre_key" ON "Regimen"("brandId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Temporada_brandId_nombre_key" ON "Temporada"("brandId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoPaquete_brandId_nombre_key" ON "TipoPaquete"("brandId", "nombre");
