-- Índices únicos por nombre normalizado (geo_key), la red de la base detrás
-- de la guardia de catalog.actions.ts.
--
-- Región y País son PARCIALES a brand-1: la otra marca tiene "Estados Unidos"
-- dos veces y un índice completo no se podría crear. Ciudad es global porque
-- la marca ya va implícita en paisId (dos Cartagena en dos países siguen
-- siendo válidas).
--
-- Prisma no modela índices por expresión: no aparecen en schema.prisma (ver
-- los comentarios /// de Region, Pais y Ciudad) y `prisma migrate diff` los
-- muestra como drift esperado. Idempotente: se puede volver a aplicar.
CREATE UNIQUE INDEX IF NOT EXISTS "Region_brand1_geo_key_key"
  ON "Region" ("brandId", public.geo_key(nombre)) WHERE "brandId" = 'brand-1';
CREATE UNIQUE INDEX IF NOT EXISTS "Pais_brand1_geo_key_key"
  ON "Pais" ("brandId", public.geo_key(nombre)) WHERE "brandId" = 'brand-1';
CREATE UNIQUE INDEX IF NOT EXISTS "Ciudad_paisId_geo_key_key"
  ON "Ciudad" ("paisId", public.geo_key(nombre));
