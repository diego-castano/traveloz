-- Constructor de formularios por marca: definición de campos configurable en el
-- landing y respuestas dinámicas en cada lead.
ALTER TABLE "CotizadorLanding" ADD COLUMN "campos" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "CotizadorLead" ADD COLUMN "respuestas" JSONB NOT NULL DEFAULT '[]';

-- Backfill: las landings existentes arrancaban con el formulario de cotización
-- fijo. Sembramos esos mismos campos (ids estables = los del form anterior) para
-- que no pierdan nada al pasar al constructor dinámico.
UPDATE "CotizadorLanding"
SET "campos" = '[
  {"id":"destino","tipo":"texto","etiqueta":"¿A dónde querés ir?","placeholder":"Ej. Caribe, Europa, Brasil…","requerido":true},
  {"id":"fechas","tipo":"rango_fechas","etiqueta":"Fechas del viaje","requerido":false},
  {"id":"adultos","tipo":"numero","etiqueta":"Adultos","requerido":false},
  {"id":"ninos","tipo":"numero","etiqueta":"Niños","ayuda":"2 a 11 años","requerido":false},
  {"id":"telefono","tipo":"telefono","etiqueta":"Teléfono / WhatsApp","requerido":false},
  {"id":"preferencia","tipo":"seleccion","etiqueta":"¿Cómo preferís que te contactemos?","requerido":false,"opciones":[{"id":"whatsapp","label":"WhatsApp"},{"id":"llamada","label":"Llamada"},{"id":"email","label":"Email"}]},
  {"id":"comentarios","tipo":"parrafo","etiqueta":"Contanos más sobre tu viaje","placeholder":"Presupuesto, intereses, fechas flexibles…","requerido":false}
]'::jsonb
WHERE "campos" = '[]'::jsonb;
