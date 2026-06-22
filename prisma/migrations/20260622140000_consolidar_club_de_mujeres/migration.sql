-- Consolidación de "Club de Mujeres" en un solo landing con URL /club-de-mujeres.
-- El viejo /club-de-mamis era un placeholder de esta misma marca: se da de baja
-- (soft-delete) y se publica el nuevo /club-de-mujeres (config completa).

UPDATE "CotizadorLanding"
SET "publicado" = true, "updatedAt" = now()
WHERE "slug" = 'club-de-mujeres' AND "deletedAt" IS NULL;

UPDATE "CotizadorLanding"
SET "deletedAt" = now(), "publicado" = false, "updatedAt" = now()
WHERE "slug" = 'club-de-mamis' AND "deletedAt" IS NULL;
