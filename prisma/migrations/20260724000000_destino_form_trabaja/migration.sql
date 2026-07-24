-- Data fix: el aviso del formulario "Trabajá con nosotros" iba solo a
-- candidatoz@traveloz.com.uy (configurado 2026-07-14 en el panel) y el equipo
-- lo esperaba en info@. Queda info@ como principal y candidatoz@ se conserva.
-- Editable en /backend/web/notificaciones.
UPDATE "SiteSetting"
SET "value" = 'info@traveloz.com.uy, candidatoz@traveloz.com.uy'
WHERE "key" = 'notificaciones_email_trabaja'
  AND "value" = 'candidatoz@traveloz.com.uy';
