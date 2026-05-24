-- Backfill + remove the legacy `INACTIVO` value from EstadoPaquete.
--
-- INACTIVO was the old "soft-unpublish" state from the prototype era. Since
-- the consolidation of publicado/estado (see PublicacionTab), the canonical
-- way to take a paquete off the public site is `publicado=false`, and the
-- lifecycle workflow is BORRADOR → EN_REVISION → ACTIVO → ARCHIVADO. INACTIVO
-- no longer maps to any meaningful state — every legacy row is reinterpreted
-- as ARCHIVADO (the operator can resurrect to BORRADOR if needed).
--
-- Postgres does not allow dropping an enum value while rows still use it,
-- so we backfill first, then rebuild the enum with the surviving values.

-- 1) Backfill all rows currently sitting on INACTIVO → ARCHIVADO. Also flip
--    publicado=false so the public site doesn't keep showing rows the operator
--    had quietly retired.
UPDATE "Paquete"
   SET "estado"    = 'ARCHIVADO',
       "publicado" = false
 WHERE "estado"::text = 'INACTIVO';

-- 2) Rebuild the enum without INACTIVO. The dance is:
--      a) rename the old enum out of the way
--      b) create a new enum without INACTIVO
--      c) swap the column over (cast through text — safe because step 1
--         removed every row that would fail)
--      d) drop the old enum
ALTER TYPE "EstadoPaquete" RENAME TO "EstadoPaquete_old";

CREATE TYPE "EstadoPaquete" AS ENUM (
    'BORRADOR',
    'EN_REVISION',
    'ACTIVO',
    'ARCHIVADO'
);

ALTER TABLE "Paquete"
    ALTER COLUMN "estado" DROP DEFAULT,
    ALTER COLUMN "estado" TYPE "EstadoPaquete"
        USING ("estado"::text::"EstadoPaquete"),
    ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';

DROP TYPE "EstadoPaquete_old";
