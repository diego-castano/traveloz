-- Add HOTELES value to CategoriaServicio enum (idempotent via IF NOT EXISTS)
ALTER TYPE "CategoriaServicio" ADD VALUE IF NOT EXISTS 'HOTELES';

-- Add new columns to Paquete
ALTER TABLE "Paquete" ADD COLUMN IF NOT EXISTS "webId" TEXT;
ALTER TABLE "Paquete" ADD COLUMN IF NOT EXISTS "itinerarioAmadeus" TEXT;
ALTER TABLE "Paquete" ADD COLUMN IF NOT EXISTS "campana" TEXT;

-- Add new columns to Proveedor
ALTER TABLE "Proveedor" ADD COLUMN IF NOT EXISTS "ejecutivo" TEXT;
ALTER TABLE "Proveedor" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- Add proveedorId to OpcionHotelera
ALTER TABLE "OpcionHotelera" ADD COLUMN IF NOT EXISTS "proveedorId" TEXT;

-- Add foreign key (conditional: skip if already exists)
DO $$ BEGIN
    ALTER TABLE "OpcionHotelera" ADD CONSTRAINT "OpcionHotelera_proveedorId_fkey"
        FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
