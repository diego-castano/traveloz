-- Campos del formulario de cotización en CotizadorLead (espejo del form /cotizar).
ALTER TABLE "CotizadorLead" ADD COLUMN "destino" TEXT;
ALTER TABLE "CotizadorLead" ADD COLUMN "fechaDesde" TIMESTAMP(3);
ALTER TABLE "CotizadorLead" ADD COLUMN "fechaHasta" TIMESTAMP(3);
ALTER TABLE "CotizadorLead" ADD COLUMN "adultos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CotizadorLead" ADD COLUMN "ninos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CotizadorLead" ADD COLUMN "infantes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CotizadorLead" ADD COLUMN "preferencia" "CanalContacto";
