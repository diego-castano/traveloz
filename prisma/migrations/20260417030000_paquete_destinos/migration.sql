-- Migration: introduce PaqueteDestino + OpcionHotel.
--
-- Fase aditiva: se crean las dos tablas nuevas y se backfilean desde los datos
-- vigentes en PaqueteAlojamiento y OpcionHotelera. Los campos legacy
-- (Paquete.noches, PaqueteAlojamiento.nochesEnEste, OpcionHotelera.alojamientoIds
-- y .nochesPorAlojamiento) se MANTIENEN para que la UI vieja siga funcionando.
-- PR 3 los elimina una vez validada la nueva UI en producción.

-- ──────────────────────────────────────────────
-- 1. Tabla PaqueteDestino
-- ──────────────────────────────────────────────

CREATE TABLE "PaqueteDestino" (
  "id"        TEXT NOT NULL,
  "paqueteId" TEXT NOT NULL,
  "ciudadId"  TEXT NOT NULL,
  "noches"    INTEGER NOT NULL,
  "orden"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PaqueteDestino_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaqueteDestino_paqueteId_ciudadId_orden_key"
  ON "PaqueteDestino" ("paqueteId", "ciudadId", "orden");

CREATE INDEX "PaqueteDestino_paqueteId_idx" ON "PaqueteDestino" ("paqueteId");

ALTER TABLE "PaqueteDestino"
  ADD CONSTRAINT "PaqueteDestino_paqueteId_fkey"
  FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaqueteDestino"
  ADD CONSTRAINT "PaqueteDestino_ciudadId_fkey"
  FOREIGN KEY ("ciudadId") REFERENCES "Ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- 2. Tabla OpcionHotel
-- ──────────────────────────────────────────────

CREATE TABLE "OpcionHotel" (
  "id"               TEXT NOT NULL,
  "opcionHoteleraId" TEXT NOT NULL,
  "destinoId"        TEXT NOT NULL,
  "alojamientoId"    TEXT NOT NULL,
  "orden"            INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OpcionHotel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpcionHotel_opcionHoteleraId_destinoId_key"
  ON "OpcionHotel" ("opcionHoteleraId", "destinoId");

CREATE INDEX "OpcionHotel_opcionHoteleraId_idx" ON "OpcionHotel" ("opcionHoteleraId");
CREATE INDEX "OpcionHotel_destinoId_idx"        ON "OpcionHotel" ("destinoId");

ALTER TABLE "OpcionHotel"
  ADD CONSTRAINT "OpcionHotel_opcionHoteleraId_fkey"
  FOREIGN KEY ("opcionHoteleraId") REFERENCES "OpcionHotelera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpcionHotel"
  ADD CONSTRAINT "OpcionHotel_destinoId_fkey"
  FOREIGN KEY ("destinoId") REFERENCES "PaqueteDestino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpcionHotel"
  ADD CONSTRAINT "OpcionHotel_alojamientoId_fkey"
  FOREIGN KEY ("alojamientoId") REFERENCES "Alojamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- 3. Backfill PaqueteDestino desde PaqueteAlojamiento + Alojamiento
-- ──────────────────────────────────────────────
--
-- Regla: por cada paquete, se listan los (ciudadId) distintos que aparecen
-- entre sus alojamientos del pool, ordenados por el menor orden de
-- PaqueteAlojamiento para esa ciudad (así preserva el orden visual actual).
-- Las noches del destino son:
--   - paquete.noches entero si el paquete es single-destino (una sola ciudad)
--   - el MAX(nochesEnEste) entre los PaqueteAlojamiento de esa ciudad en
--     multi-destino; si todos eran NULL se usa FLOOR(paquete.noches / N_ciudades)
--
-- La fila se inserta solo si (paqueteId, ciudadId, orden=0) todavía no existe
-- (re-run safety).

WITH ciudades_por_paquete AS (
  SELECT
    p.id AS "paqueteId",
    p.noches AS "paqueteNoches",
    a."ciudadId",
    MIN(pa."orden") AS "minOrden",
    MAX(pa."nochesEnEste") AS "maxNoches",
    COUNT(*) OVER (PARTITION BY p.id) AS "totalAsignaciones"
  FROM "Paquete" p
  JOIN "PaqueteAlojamiento" pa ON pa."paqueteId" = p.id
  JOIN "Alojamiento" a ON a.id = pa."alojamientoId"
  WHERE p."deletedAt" IS NULL
    AND a."ciudadId" IS NOT NULL
  GROUP BY p.id, p.noches, a."ciudadId"
),
destinos_ordenados AS (
  SELECT
    "paqueteId",
    "paqueteNoches",
    "ciudadId",
    "minOrden",
    "maxNoches",
    ROW_NUMBER() OVER (PARTITION BY "paqueteId" ORDER BY "minOrden", "ciudadId") - 1 AS "ordenDestino",
    COUNT(*) OVER (PARTITION BY "paqueteId") AS "nCiudades"
  FROM ciudades_por_paquete
)
INSERT INTO "PaqueteDestino" ("id", "paqueteId", "ciudadId", "noches", "orden")
SELECT
  -- generar cuid-ish: cuid() solo existe via Prisma; en SQL usamos md5+timestamp para unicidad
  'pd_' || substr(md5(random()::text || "paqueteId" || "ciudadId"), 1, 22),
  "paqueteId",
  "ciudadId",
  CASE
    WHEN "nCiudades" = 1 THEN "paqueteNoches"
    WHEN "maxNoches" IS NOT NULL AND "maxNoches" > 0 THEN "maxNoches"
    ELSE GREATEST(1, FLOOR("paqueteNoches"::numeric / "nCiudades")::int)
  END,
  "ordenDestino"
FROM destinos_ordenados
ON CONFLICT ("paqueteId", "ciudadId", "orden") DO NOTHING;

-- ──────────────────────────────────────────────
-- 4. Backfill OpcionHotel desde OpcionHotelera.alojamientoIds
-- ──────────────────────────────────────────────
--
-- Por cada (opcionHotelera, alojamientoId del array), buscamos el destino del
-- paquete cuya ciudad coincide con la ciudad del alojamiento. Si hay dos
-- hoteles en la misma opción para la misma ciudad, nos quedamos con el
-- primero (menor índice en el array) — los demás se descartan (no hay split).
-- El ON CONFLICT (opcionHoteleraId, destinoId) hace cumplir la regla
-- "un solo hotel por destino dentro de una opción".

WITH expandido AS (
  SELECT
    oh.id AS "opcionHoteleraId",
    oh."paqueteId",
    a."ciudadId",
    alojId AS "alojamientoId",
    idx AS "arrayIdx"
  FROM "OpcionHotelera" oh
  CROSS JOIN LATERAL unnest(oh."alojamientoIds") WITH ORDINALITY AS u(alojId, idx)
  JOIN "Alojamiento" a ON a.id = u.alojId
  WHERE a."ciudadId" IS NOT NULL
),
con_destino AS (
  SELECT
    e."opcionHoteleraId",
    d.id AS "destinoId",
    e."alojamientoId",
    e."arrayIdx",
    ROW_NUMBER() OVER (
      PARTITION BY e."opcionHoteleraId", d.id
      ORDER BY e."arrayIdx"
    ) AS "rank"
  FROM expandido e
  JOIN "PaqueteDestino" d
    ON d."paqueteId" = e."paqueteId"
   AND d."ciudadId"  = e."ciudadId"
)
INSERT INTO "OpcionHotel" ("id", "opcionHoteleraId", "destinoId", "alojamientoId", "orden")
SELECT
  'oh_' || substr(md5(random()::text || "opcionHoteleraId" || "destinoId"), 1, 22),
  "opcionHoteleraId",
  "destinoId",
  "alojamientoId",
  0
FROM con_destino
WHERE "rank" = 1
ON CONFLICT ("opcionHoteleraId", "destinoId") DO NOTHING;
