-- Todas las landings de marca mandan a Bitrix (pedido del cliente, 05/10/2026).

-- Desde cuándo cada landing manda. Las existentes arrancan hoy: sus envíos
-- viejos ya los trabajó el equipo por mail. Las nuevas, desde que se crean.
ALTER TABLE "CotizadorLanding" ADD COLUMN "bitrixDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Comunidad Mari Oneill sí ofrece sus envíos desde el primer día (2/10): nunca
-- se cargaron en Bitrix.
UPDATE "CotizadorLanding" SET "bitrixDesde" = "createdAt" WHERE "slug" = 'comunidad-mari-oneill';

-- Orígenes que el equipo ya tenía creados en Bitrix para cada landing
-- (crm.status.list del 05/10/2026).
UPDATE "CotizadorLanding" SET "bitrixSourceId" = '2' WHERE "slug" = 'club-de-mujeres' AND "bitrixSourceId" IS NULL;
UPDATE "CotizadorLanding" SET "bitrixSourceId" = '3' WHERE "slug" = 'beneficios-vaig' AND "bitrixSourceId" IS NULL;
UPDATE "CotizadorLanding" SET "bitrixSourceId" = 'UC_06Z1VS' WHERE "slug" = 'hospital-britanico' AND "bitrixSourceId" IS NULL;
