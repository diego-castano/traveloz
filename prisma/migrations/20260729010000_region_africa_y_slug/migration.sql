-- Data fix pedido por el cliente:
--   1) Crear la región África (no existía) para la marca pública.
--   2) Anclar ahí "Kenia, Tanzania & Zanzibar", que estaba sin destino y por
--      eso no aparecía en ninguna región. Se completa el breadcrumb `destino`
--      igual que lo escribe el panel (Región › País), que es de donde el sitio
--      deduce la región de los paquetes CIRCUITO (ver src/lib/region-paquete.ts).
--   3) Generar el slug faltante de "Salvador de Bahia & Praia do Forte": sin
--      slug la tarjeta se mostraba sin link y el paquete no entraba al sitemap.
--      El valor es el mismo que produce slugify(titulo) en el panel.
-- Solo toca la marca pública (brand-1). No se toca ninguna fila de brand-2.

INSERT INTO "Region" ("id", "brandId", "nombre", "slug", "orden", "createdAt", "updatedAt")
VALUES ('region-15', 'brand-1', 'África', 'africa', 8, NOW(), NOW())
ON CONFLICT ("brandId", "slug") DO NOTHING;

UPDATE "Paquete"
SET "destino" = 'África › Kenia'
WHERE "id" = '287' AND ("destino" IS NULL OR "destino" = '');

UPDATE "Paquete"
SET "slug" = 'salvador-de-bahia-praia-do-forte-salida-grupal-07-noches'
WHERE "id" = '290' AND "slug" IS NULL;
