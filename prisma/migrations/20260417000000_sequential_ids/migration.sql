-- Migration: renumber Paquete / Aereo / Alojamiento / Traslado / Seguro / Circuito
-- to zero-padded sequential string IDs ("001", "002", ...) and propagate
-- the new IDs to every foreign key that references them. Deletes do not
-- reuse numbers: the IdCounter table tracks the last issued value.

-- ──────────────────────────────────────────────
-- 1. IdCounter table
-- ──────────────────────────────────────────────

CREATE TABLE "IdCounter" (
  "entity"    TEXT NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdCounter_pkey" PRIMARY KEY ("entity")
);

-- ──────────────────────────────────────────────
-- 2. Helper: pad value to 3 digits (001..999) or raw number beyond.
--    Implemented inline via LPAD + CASE below.
-- ──────────────────────────────────────────────

-- Generic renumber block. For each of the 6 entities:
--   a) build mapping (oldId -> newId) ordered by createdAt, then id
--   b) update the entity row and every FK that references it
--
-- All statements are wrapped in a single implicit transaction by Prisma.

-- ──────────────────────────────────────────────
-- 3. PAQUETE
-- ──────────────────────────────────────────────

CREATE TEMP TABLE "_paquete_map" AS
SELECT
  id AS "oldId",
  CASE
    WHEN row_number() OVER (ORDER BY "createdAt", id) < 1000
      THEN lpad((row_number() OVER (ORDER BY "createdAt", id))::text, 3, '0')
    ELSE (row_number() OVER (ORDER BY "createdAt", id))::text
  END AS "newId",
  row_number() OVER (ORDER BY "createdAt", id) AS "seq"
FROM "Paquete";

-- Update FKs first (they'll point to the new ids after the Paquete update below)
UPDATE "PaqueteAereo" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";
UPDATE "PaqueteAlojamiento" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";
UPDATE "PaqueteTraslado" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";
UPDATE "PaqueteSeguro" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";
UPDATE "PaqueteCircuito" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";
UPDATE "PaqueteFoto" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";
UPDATE "PaqueteEtiqueta" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";
UPDATE "OpcionHotelera" x SET "paqueteId" = m."newId" FROM "_paquete_map" m WHERE x."paqueteId" = m."oldId";

-- Notificacion stores paqueteIds as a TEXT[] — remap each element.
UPDATE "Notificacion" n
SET "paqueteIds" = (
  SELECT array_agg(COALESCE(m."newId", p))
  FROM unnest(n."paqueteIds") AS p
  LEFT JOIN "_paquete_map" m ON m."oldId" = p
);

-- Two-step id update to avoid unique-violation when swapping.
UPDATE "Paquete" p SET id = '__tmp__' || m."seq" FROM "_paquete_map" m WHERE p.id = m."oldId";
UPDATE "Paquete" p SET id = m."newId" FROM "_paquete_map" m WHERE p.id = '__tmp__' || m."seq";

INSERT INTO "IdCounter" ("entity", "lastValue", "updatedAt")
SELECT 'paquete', COALESCE(MAX("seq"), 0), CURRENT_TIMESTAMP FROM "_paquete_map";

DROP TABLE "_paquete_map";

-- ──────────────────────────────────────────────
-- 4. AEREO
-- ──────────────────────────────────────────────

CREATE TEMP TABLE "_aereo_map" AS
SELECT
  id AS "oldId",
  CASE
    WHEN row_number() OVER (ORDER BY "createdAt", id) < 1000
      THEN lpad((row_number() OVER (ORDER BY "createdAt", id))::text, 3, '0')
    ELSE (row_number() OVER (ORDER BY "createdAt", id))::text
  END AS "newId",
  row_number() OVER (ORDER BY "createdAt", id) AS "seq"
FROM "Aereo";

UPDATE "PrecioAereo" x SET "aereoId" = m."newId" FROM "_aereo_map" m WHERE x."aereoId" = m."oldId";
UPDATE "PaqueteAereo" x SET "aereoId" = m."newId" FROM "_aereo_map" m WHERE x."aereoId" = m."oldId";

UPDATE "Aereo" a SET id = '__tmp__' || m."seq" FROM "_aereo_map" m WHERE a.id = m."oldId";
UPDATE "Aereo" a SET id = m."newId" FROM "_aereo_map" m WHERE a.id = '__tmp__' || m."seq";

INSERT INTO "IdCounter" ("entity", "lastValue", "updatedAt")
SELECT 'aereo', COALESCE(MAX("seq"), 0), CURRENT_TIMESTAMP FROM "_aereo_map";

DROP TABLE "_aereo_map";

-- ──────────────────────────────────────────────
-- 5. ALOJAMIENTO
-- ──────────────────────────────────────────────

CREATE TEMP TABLE "_alojamiento_map" AS
SELECT
  id AS "oldId",
  CASE
    WHEN row_number() OVER (ORDER BY "createdAt", id) < 1000
      THEN lpad((row_number() OVER (ORDER BY "createdAt", id))::text, 3, '0')
    ELSE (row_number() OVER (ORDER BY "createdAt", id))::text
  END AS "newId",
  row_number() OVER (ORDER BY "createdAt", id) AS "seq"
FROM "Alojamiento";

UPDATE "PrecioAlojamiento" x SET "alojamientoId" = m."newId" FROM "_alojamiento_map" m WHERE x."alojamientoId" = m."oldId";
UPDATE "AlojamientoFoto" x SET "alojamientoId" = m."newId" FROM "_alojamiento_map" m WHERE x."alojamientoId" = m."oldId";
UPDATE "PaqueteAlojamiento" x SET "alojamientoId" = m."newId" FROM "_alojamiento_map" m WHERE x."alojamientoId" = m."oldId";

-- OpcionHotelera stores alojamientoIds as TEXT[] — remap each element.
UPDATE "OpcionHotelera" o
SET "alojamientoIds" = (
  SELECT array_agg(COALESCE(m."newId", a))
  FROM unnest(o."alojamientoIds") AS a
  LEFT JOIN "_alojamiento_map" m ON m."oldId" = a
);

UPDATE "Alojamiento" a SET id = '__tmp__' || m."seq" FROM "_alojamiento_map" m WHERE a.id = m."oldId";
UPDATE "Alojamiento" a SET id = m."newId" FROM "_alojamiento_map" m WHERE a.id = '__tmp__' || m."seq";

INSERT INTO "IdCounter" ("entity", "lastValue", "updatedAt")
SELECT 'alojamiento', COALESCE(MAX("seq"), 0), CURRENT_TIMESTAMP FROM "_alojamiento_map";

DROP TABLE "_alojamiento_map";

-- ──────────────────────────────────────────────
-- 6. TRASLADO
-- ──────────────────────────────────────────────

CREATE TEMP TABLE "_traslado_map" AS
SELECT
  id AS "oldId",
  CASE
    WHEN row_number() OVER (ORDER BY "createdAt", id) < 1000
      THEN lpad((row_number() OVER (ORDER BY "createdAt", id))::text, 3, '0')
    ELSE (row_number() OVER (ORDER BY "createdAt", id))::text
  END AS "newId",
  row_number() OVER (ORDER BY "createdAt", id) AS "seq"
FROM "Traslado";

UPDATE "PaqueteTraslado" x SET "trasladoId" = m."newId" FROM "_traslado_map" m WHERE x."trasladoId" = m."oldId";

UPDATE "Traslado" t SET id = '__tmp__' || m."seq" FROM "_traslado_map" m WHERE t.id = m."oldId";
UPDATE "Traslado" t SET id = m."newId" FROM "_traslado_map" m WHERE t.id = '__tmp__' || m."seq";

INSERT INTO "IdCounter" ("entity", "lastValue", "updatedAt")
SELECT 'traslado', COALESCE(MAX("seq"), 0), CURRENT_TIMESTAMP FROM "_traslado_map";

DROP TABLE "_traslado_map";

-- ──────────────────────────────────────────────
-- 7. SEGURO
-- ──────────────────────────────────────────────

CREATE TEMP TABLE "_seguro_map" AS
SELECT
  id AS "oldId",
  CASE
    WHEN row_number() OVER (ORDER BY "createdAt", id) < 1000
      THEN lpad((row_number() OVER (ORDER BY "createdAt", id))::text, 3, '0')
    ELSE (row_number() OVER (ORDER BY "createdAt", id))::text
  END AS "newId",
  row_number() OVER (ORDER BY "createdAt", id) AS "seq"
FROM "Seguro";

UPDATE "PaqueteSeguro" x SET "seguroId" = m."newId" FROM "_seguro_map" m WHERE x."seguroId" = m."oldId";

UPDATE "Seguro" s SET id = '__tmp__' || m."seq" FROM "_seguro_map" m WHERE s.id = m."oldId";
UPDATE "Seguro" s SET id = m."newId" FROM "_seguro_map" m WHERE s.id = '__tmp__' || m."seq";

INSERT INTO "IdCounter" ("entity", "lastValue", "updatedAt")
SELECT 'seguro', COALESCE(MAX("seq"), 0), CURRENT_TIMESTAMP FROM "_seguro_map";

DROP TABLE "_seguro_map";

-- ──────────────────────────────────────────────
-- 8. CIRCUITO
-- ──────────────────────────────────────────────

CREATE TEMP TABLE "_circuito_map" AS
SELECT
  id AS "oldId",
  CASE
    WHEN row_number() OVER (ORDER BY "createdAt", id) < 1000
      THEN lpad((row_number() OVER (ORDER BY "createdAt", id))::text, 3, '0')
    ELSE (row_number() OVER (ORDER BY "createdAt", id))::text
  END AS "newId",
  row_number() OVER (ORDER BY "createdAt", id) AS "seq"
FROM "Circuito";

UPDATE "CircuitoDia" x SET "circuitoId" = m."newId" FROM "_circuito_map" m WHERE x."circuitoId" = m."oldId";
UPDATE "PrecioCircuito" x SET "circuitoId" = m."newId" FROM "_circuito_map" m WHERE x."circuitoId" = m."oldId";
UPDATE "PaqueteCircuito" x SET "circuitoId" = m."newId" FROM "_circuito_map" m WHERE x."circuitoId" = m."oldId";

UPDATE "Circuito" c SET id = '__tmp__' || m."seq" FROM "_circuito_map" m WHERE c.id = m."oldId";
UPDATE "Circuito" c SET id = m."newId" FROM "_circuito_map" m WHERE c.id = '__tmp__' || m."seq";

INSERT INTO "IdCounter" ("entity", "lastValue", "updatedAt")
SELECT 'circuito', COALESCE(MAX("seq"), 0), CURRENT_TIMESTAMP FROM "_circuito_map";

DROP TABLE "_circuito_map";
