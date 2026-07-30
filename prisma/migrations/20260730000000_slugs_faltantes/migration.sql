-- Data fix: dos paquetes publicados quedaron sin slug, y sin slug la tarjeta
-- de las grillas se renderiza con href="#" (PackageCard), asi que al hacer
-- clic la pagina salta arriba en vez de abrir el paquete. Es lo que reporto el
-- cliente en /destinos/europa.
--
-- Los valores son los que genera slugify(titulo) en el panel. Verificado que
-- ninguno de los dos esta ocupado por otro paquete.
--
-- De aca en mas no deberia volver a pasar: el slug se autogenera en cada
-- guardado (ver src/lib/paquete-slug.ts) y dejo de ser un requisito que el
-- operador tenia que completar a mano.
UPDATE "Paquete" SET "slug" = 'aruba-07-noches'
WHERE "id" = '238' AND "slug" IS NULL;

UPDATE "Paquete" SET "slug" = 'roma-07-noches'
WHERE "id" = '281' AND "slug" IS NULL;
