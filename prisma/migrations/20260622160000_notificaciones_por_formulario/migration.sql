-- Reemplaza el destino único de leads (notificaciones_leads_emails) por un
-- destino por formulario. Prellena cada uno con el valor anterior (si existía)
-- para no perder la configuración ya cargada. Idempotente.
INSERT INTO "SiteSetting" ("key", "value", "type", "group", "label", "updatedAt")
SELECT
  k.key,
  COALESCE(old.value, ''),
  'text',
  'notificaciones',
  k.label,
  NOW()
FROM (VALUES
  ('notificaciones_email_contacto',    'Contacto general — emails que reciben /contact (separá varios con comas)'),
  ('notificaciones_email_corporativo', 'Corporativo — emails que reciben /corporativo'),
  ('notificaciones_email_cotizacion',  'Cotización — emails que reciben /cotizar y el formulario de paquetes'),
  ('notificaciones_email_trabaja',     'Trabajá con nosotros (RRHH) — emails que reciben /work-with-us')
) AS k(key, label)
LEFT JOIN "SiteSetting" old ON old.key = 'notificaciones_leads_emails'
ON CONFLICT ("key") DO NOTHING;

-- Saca la key vieja para que no quede un campo huérfano en el grupo.
DELETE FROM "SiteSetting" WHERE key = 'notificaciones_leads_emails';
