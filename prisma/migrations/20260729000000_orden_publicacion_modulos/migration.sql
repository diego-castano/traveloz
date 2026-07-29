-- Data fix: orden de los módulos de la pestaña Publicación de un paquete.
-- El orden es reordenable por drag & drop y se guarda en esta fila de
-- SiteSetting, así que el default en código no alcanza: la fila guardada lo
-- pisa. La fila traía el orden viejo (y sin "tarjeta", que se agregaba al
-- final). El cliente lo pidió así: 1 Qué incluye, 2 Slider de fotos,
-- 3 Renglones de la tarjeta, y el resto abajo.
-- Sigue siendo reordenable: el próximo drag del operador vuelve a mandar.
UPDATE "SiteSetting"
SET "value" = '["incluye","slider","tarjeta","estado","etiquetas","textos","condiciones","seo"]'
WHERE "key" = 'paquete_publicacion_modulos_orden';
