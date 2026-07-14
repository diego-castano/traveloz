-- Modalidad de armado del paquete: CLASICO (opciones hoteleras, comportamiento
-- histórico) o CIRCUITO (todo incluido, precio único por persona cargado en el
-- circuito). Sin backfill: los paquetes existentes quedan en CLASICO por default.

-- CreateEnum
CREATE TYPE "ModalidadPaquete" AS ENUM ('CLASICO', 'CIRCUITO');

-- AlterTable
ALTER TABLE "Paquete" ADD COLUMN     "modalidad" "ModalidadPaquete" NOT NULL DEFAULT 'CLASICO';
