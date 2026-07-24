-- Revierte 20260724000000_destino_form_trabaja: el cliente confirmó que la
-- casilla correcta para "Trabajá con nosotros" es SOLO candidatoz@ (info@ se
-- había agregado por un malentendido). Editable en /backend/web/notificaciones.
UPDATE "SiteSetting"
SET "value" = 'candidatoz@traveloz.com.uy'
WHERE "key" = 'notificaciones_email_trabaja'
  AND "value" = 'info@traveloz.com.uy, candidatoz@traveloz.com.uy';
