-- Merge de los tipos de paquete duplicados "Luna de Miel" (singular) y
-- "Lunas de miel" (plural) en uno solo.
--
-- Canónico = el PLURAL ("Lunas de miel"), que es al que ya apunta la tarjeta
-- del home (CategoriaDestacada.link = "/destinos?tipo=lunas-de-miel").
--
-- NO destructivo: reasigna los paquetes del duplicado (singular) al canónico
-- (plural) y desactiva (activo=false) el duplicado. No se borra ninguna fila.
-- Idempotente y seguro: si los nombres no matchean, no toca nada (0 filas).
-- Único FK a TipoPaquete es Paquete.tipoPaqueteId, así que el merge es completo.

-- 1) Reasignar los paquetes del tipo singular al plural.
UPDATE "Paquete" AS p
SET "tipoPaqueteId" = canon."id",
    "updatedAt" = NOW()
FROM "TipoPaquete" AS canon, "TipoPaquete" AS dup
WHERE p."tipoPaqueteId" = dup."id"
  AND canon."brandId" = 'brand-1'
  AND dup."brandId" = 'brand-1'
  AND lower(btrim(regexp_replace(canon."nombre", '[[:space:]]+', ' ', 'g'))) = 'lunas de miel'
  AND lower(btrim(regexp_replace(dup."nombre", '[[:space:]]+', ' ', 'g'))) = 'luna de miel'
  AND canon."id" <> dup."id";

-- 2) Desactivar el tipo duplicado (singular). Solo si existe el canónico
--    (plural), para no dejar huérfanos por error. No se borra la fila.
UPDATE "TipoPaquete" AS dup
SET "activo" = false,
    "updatedAt" = NOW()
FROM "TipoPaquete" AS canon
WHERE dup."brandId" = 'brand-1'
  AND canon."brandId" = 'brand-1'
  AND lower(btrim(regexp_replace(dup."nombre", '[[:space:]]+', ' ', 'g'))) = 'luna de miel'
  AND lower(btrim(regexp_replace(canon."nombre", '[[:space:]]+', ' ', 'g'))) = 'lunas de miel'
  AND canon."id" <> dup."id";
