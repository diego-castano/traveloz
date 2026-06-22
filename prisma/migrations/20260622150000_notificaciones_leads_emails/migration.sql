-- Casillas internas que reciben los formularios públicos del sitio
-- (Contacto, Corporativo, Trabajá con nosotros, Cotización). Idempotente:
-- si la fila ya existe (por seed) no se toca su valor.
INSERT INTO "SiteSetting" ("key", "value", "type", "group", "label", "updatedAt")
VALUES (
  'notificaciones_leads_emails',
  '',
  'text',
  'notificaciones',
  'Emails que reciben los leads (separá varios con comas)',
  NOW()
)
ON CONFLICT ("key") DO NOTHING;
