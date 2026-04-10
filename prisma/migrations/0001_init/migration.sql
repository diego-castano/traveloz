-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoPaquete" AS ENUM ('BORRADOR', 'ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoTraslado" AS ENUM ('REGULAR', 'PRIVADO');

-- CreateEnum
CREATE TYPE "CategoriaServicio" AS ENUM ('TRASLADOS', 'SEGUROS', 'CIRCUITOS');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDEDOR', 'MARKETING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VENDEDOR',
    "brandId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paquete" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "descripcion" TEXT,
    "textoVisual" TEXT,
    "noches" INTEGER NOT NULL,
    "salidas" TEXT,
    "temporadaId" TEXT,
    "tipoPaqueteId" TEXT,
    "validezDesde" TEXT,
    "validezHasta" TEXT,
    "estado" "EstadoPaquete" NOT NULL DEFAULT 'BORRADOR',
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "netoCalculado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precioVenta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "ordenServicios" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Paquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aereo" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "aerolinea" TEXT,
    "equipaje" TEXT,
    "itinerario" TEXT,
    "escalas" INTEGER NOT NULL DEFAULT 0,
    "codigoVueloIda" TEXT,
    "codigoVueloVuelta" TEXT,
    "duracionIda" TEXT,
    "duracionVuelta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Aereo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioAereo" (
    "id" TEXT NOT NULL,
    "aereoId" TEXT NOT NULL,
    "periodoDesde" TEXT NOT NULL,
    "periodoHasta" TEXT NOT NULL,
    "precioAdulto" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecioAereo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alojamiento" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudadId" TEXT,
    "paisId" TEXT,
    "categoria" INTEGER,
    "sitioWeb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Alojamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioAlojamiento" (
    "id" TEXT NOT NULL,
    "alojamientoId" TEXT NOT NULL,
    "periodoDesde" TEXT NOT NULL,
    "periodoHasta" TEXT NOT NULL,
    "precioPorNoche" DOUBLE PRECISION NOT NULL,
    "regimenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecioAlojamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlojamientoFoto" (
    "id" TEXT NOT NULL,
    "alojamientoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AlojamientoFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traslado" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoTraslado" NOT NULL DEFAULT 'REGULAR',
    "ciudadId" TEXT,
    "paisId" TEXT,
    "proveedorId" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Traslado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seguro" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "plan" TEXT NOT NULL,
    "cobertura" TEXT,
    "costoPorDia" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Seguro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circuito" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "noches" INTEGER NOT NULL,
    "proveedorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Circuito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircuitoDia" (
    "id" TEXT NOT NULL,
    "circuitoId" TEXT NOT NULL,
    "numeroDia" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CircuitoDia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioCircuito" (
    "id" TEXT NOT NULL,
    "circuitoId" TEXT NOT NULL,
    "periodoDesde" TEXT NOT NULL,
    "periodoHasta" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecioCircuito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "notas" TEXT,
    "servicio" "CategoriaServicio" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Temporada" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Temporada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoPaquete" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoPaquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pais" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ciudad" (
    "id" TEXT NOT NULL,
    "paisId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ciudad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regimen" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "abrev" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regimen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteAereo" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "aereoId" TEXT NOT NULL,
    "textoDisplay" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaqueteAereo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteAlojamiento" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "alojamientoId" TEXT NOT NULL,
    "nochesEnEste" INTEGER,
    "textoDisplay" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaqueteAlojamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteTraslado" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "trasladoId" TEXT NOT NULL,
    "textoDisplay" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaqueteTraslado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteSeguro" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "seguroId" TEXT NOT NULL,
    "diasCobertura" INTEGER,
    "textoDisplay" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaqueteSeguro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteCircuito" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "circuitoId" TEXT NOT NULL,
    "textoDisplay" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaqueteCircuito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteFoto" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaqueteFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaqueteEtiqueta" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "etiquetaId" TEXT NOT NULL,

    CONSTRAINT "PaqueteEtiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcionHotelera" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "alojamientoIds" TEXT[],
    "factor" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OpcionHotelera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_brandId_idx" ON "User"("brandId");

-- CreateIndex
CREATE INDEX "Paquete_brandId_idx" ON "Paquete"("brandId");

-- CreateIndex
CREATE INDEX "Aereo_brandId_idx" ON "Aereo"("brandId");

-- CreateIndex
CREATE INDEX "Alojamiento_brandId_idx" ON "Alojamiento"("brandId");

-- CreateIndex
CREATE INDEX "Traslado_brandId_idx" ON "Traslado"("brandId");

-- CreateIndex
CREATE INDEX "Seguro_brandId_idx" ON "Seguro"("brandId");

-- CreateIndex
CREATE INDEX "Circuito_brandId_idx" ON "Circuito"("brandId");

-- CreateIndex
CREATE INDEX "Proveedor_brandId_idx" ON "Proveedor"("brandId");

-- CreateIndex
CREATE INDEX "Temporada_brandId_idx" ON "Temporada"("brandId");

-- CreateIndex
CREATE INDEX "TipoPaquete_brandId_idx" ON "TipoPaquete"("brandId");

-- CreateIndex
CREATE INDEX "Etiqueta_brandId_idx" ON "Etiqueta"("brandId");

-- CreateIndex
CREATE INDEX "Pais_brandId_idx" ON "Pais"("brandId");

-- CreateIndex
CREATE INDEX "Regimen_brandId_idx" ON "Regimen"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "PaqueteAereo_paqueteId_aereoId_key" ON "PaqueteAereo"("paqueteId", "aereoId");

-- CreateIndex
CREATE UNIQUE INDEX "PaqueteAlojamiento_paqueteId_alojamientoId_key" ON "PaqueteAlojamiento"("paqueteId", "alojamientoId");

-- CreateIndex
CREATE UNIQUE INDEX "PaqueteTraslado_paqueteId_trasladoId_key" ON "PaqueteTraslado"("paqueteId", "trasladoId");

-- CreateIndex
CREATE UNIQUE INDEX "PaqueteSeguro_paqueteId_seguroId_key" ON "PaqueteSeguro"("paqueteId", "seguroId");

-- CreateIndex
CREATE UNIQUE INDEX "PaqueteCircuito_paqueteId_circuitoId_key" ON "PaqueteCircuito"("paqueteId", "circuitoId");

-- CreateIndex
CREATE UNIQUE INDEX "PaqueteEtiqueta_paqueteId_etiquetaId_key" ON "PaqueteEtiqueta"("paqueteId", "etiquetaId");

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_tipoPaqueteId_fkey" FOREIGN KEY ("tipoPaqueteId") REFERENCES "TipoPaquete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioAereo" ADD CONSTRAINT "PrecioAereo_aereoId_fkey" FOREIGN KEY ("aereoId") REFERENCES "Aereo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alojamiento" ADD CONSTRAINT "Alojamiento_ciudadId_fkey" FOREIGN KEY ("ciudadId") REFERENCES "Ciudad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alojamiento" ADD CONSTRAINT "Alojamiento_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioAlojamiento" ADD CONSTRAINT "PrecioAlojamiento_alojamientoId_fkey" FOREIGN KEY ("alojamientoId") REFERENCES "Alojamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioAlojamiento" ADD CONSTRAINT "PrecioAlojamiento_regimenId_fkey" FOREIGN KEY ("regimenId") REFERENCES "Regimen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlojamientoFoto" ADD CONSTRAINT "AlojamientoFoto_alojamientoId_fkey" FOREIGN KEY ("alojamientoId") REFERENCES "Alojamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_ciudadId_fkey" FOREIGN KEY ("ciudadId") REFERENCES "Ciudad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguro" ADD CONSTRAINT "Seguro_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circuito" ADD CONSTRAINT "Circuito_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircuitoDia" ADD CONSTRAINT "CircuitoDia_circuitoId_fkey" FOREIGN KEY ("circuitoId") REFERENCES "Circuito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioCircuito" ADD CONSTRAINT "PrecioCircuito_circuitoId_fkey" FOREIGN KEY ("circuitoId") REFERENCES "Circuito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ciudad" ADD CONSTRAINT "Ciudad_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteAereo" ADD CONSTRAINT "PaqueteAereo_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteAereo" ADD CONSTRAINT "PaqueteAereo_aereoId_fkey" FOREIGN KEY ("aereoId") REFERENCES "Aereo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteAlojamiento" ADD CONSTRAINT "PaqueteAlojamiento_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteAlojamiento" ADD CONSTRAINT "PaqueteAlojamiento_alojamientoId_fkey" FOREIGN KEY ("alojamientoId") REFERENCES "Alojamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteTraslado" ADD CONSTRAINT "PaqueteTraslado_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteTraslado" ADD CONSTRAINT "PaqueteTraslado_trasladoId_fkey" FOREIGN KEY ("trasladoId") REFERENCES "Traslado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteSeguro" ADD CONSTRAINT "PaqueteSeguro_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteSeguro" ADD CONSTRAINT "PaqueteSeguro_seguroId_fkey" FOREIGN KEY ("seguroId") REFERENCES "Seguro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteCircuito" ADD CONSTRAINT "PaqueteCircuito_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteCircuito" ADD CONSTRAINT "PaqueteCircuito_circuitoId_fkey" FOREIGN KEY ("circuitoId") REFERENCES "Circuito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteFoto" ADD CONSTRAINT "PaqueteFoto_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteEtiqueta" ADD CONSTRAINT "PaqueteEtiqueta_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteEtiqueta" ADD CONSTRAINT "PaqueteEtiqueta_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcionHotelera" ADD CONSTRAINT "OpcionHotelera_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

