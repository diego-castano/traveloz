-- Data fix: tilde en "Trabajá con nosotros" del link del footer.
-- El label vive en el setting footer_links_json (JSON de links editable en
-- /backend/web); el seed ya quedó corregido, esto arregla el dato existente.
UPDATE "SiteSetting"
SET "value" = REPLACE("value", 'Trabaja con nosotros', 'Trabajá con nosotros')
WHERE "key" = 'footer_links_json'
  AND "value" LIKE '%Trabaja con nosotros%';
