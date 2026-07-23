-- Data fix: claves de icono del CatalogoServicio alineadas al set nuevo de
-- iconos Traveloz (auditoría 2026-07-23). Con las claves legacy, "Régimen"
-- caía al icono genérico de info, "Tasas e impuestos" mostraba el escudo de
-- seguro y "Traslados aeropuerto-hotel-aeropuerto" un bus en vez del auto.
-- El seed (prisma/seed-public.ts) ya usa estas claves canónicas.
UPDATE "CatalogoServicio" SET "icon" = 'traslado'
WHERE "nombre" = 'Traslados aeropuerto-hotel-aeropuerto' AND "icon" = 'bus';

UPDATE "CatalogoServicio" SET "icon" = 'comida'
WHERE "nombre" = 'Régimen' AND "icon" = 'exc';

UPDATE "CatalogoServicio" SET "icon" = 'impuestos'
WHERE "nombre" = 'Tasas e impuestos' AND "icon" = 'shield';
