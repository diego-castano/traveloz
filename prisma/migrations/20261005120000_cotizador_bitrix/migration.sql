-- Envío de los leads de las landings de marca a Bitrix24.
ALTER TABLE "CotizadorLanding" ADD COLUMN "bitrixSourceId" TEXT;

ALTER TABLE "CotizadorLead"
  ADD COLUMN "crmEstado" "CrmEstado",
  ADD COLUMN "crmDealId" TEXT,
  ADD COLUMN "crmContactId" TEXT,
  ADD COLUMN "crmModo" TEXT,
  ADD COLUMN "crmError" TEXT,
  ADD COLUMN "crmEnviadoEn" TIMESTAMP(3),
  ADD COLUMN "crmIntentos" INTEGER NOT NULL DEFAULT 0;

-- Comunidad Mari Oneill entra con el origen "Influencer - Marina Oneill"
-- (STATUS_ID 4, leído de crm.status.list el 05/10/2026). Pedido del cliente.
UPDATE "CotizadorLanding" SET "bitrixSourceId" = '4' WHERE "slug" = 'comunidad-mari-oneill';
