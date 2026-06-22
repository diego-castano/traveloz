-- Cotizadores de cliente listos para usar (idempotente por slug). Se crean como
-- BORRADOR (publicado=false); se publican desde el panel. Fuente de la config:
-- prisma/cotizadores-data.ts. Re-deploy re-sincroniza la definición de campos
-- sin pisar el estado de publicado.

-- Club de Mujeres
INSERT INTO "CotizadorLanding" ("id", "slug", "nombreMarca", "tituloHero", "textoInstitucional", "campos", "publicado", "updatedAt")
VALUES (
  'seed-club-de-mujeres',
  'club-de-mujeres',
  'Club de Mujeres',
  '¡Bienvenidas a su próximo viaje Club de Mujeres!',
  'Completá el formulario y recibí tu presupuesto en menos de 24 horas.',
  '[{"id":"telefono","tipo":"telefono","etiqueta":"Teléfono","requerido":true},{"id":"destino","tipo":"texto","etiqueta":"Ciudad de destino","placeholder":"¿A dónde querés viajar?","requerido":true},{"id":"fechas","tipo":"rango_fechas","etiqueta":"Fechas (salida y regreso)","requerido":false},{"id":"adultos","tipo":"numero","etiqueta":"Adultos","ayuda":"Mayores de 18","requerido":false},{"id":"ninos","tipo":"numero","etiqueta":"Niños","ayuda":"Mayores de 2 años","requerido":false},{"id":"infantes","tipo":"numero","etiqueta":"Menores de 2 años","requerido":false},{"id":"tipo_compra","tipo":"seleccion","etiqueta":"Tipo de compra","requerido":true,"opciones":[{"id":"1ra","label":"1ra compra"},{"id":"2da","label":"2da compra"}]},{"id":"beneficio","tipo":"seleccion","etiqueta":"Elegí tu beneficio de bienvenida","ayuda":"Podés elegir una sola opción.","requerido":false,"mostrarSi":{"campoId":"tipo_compra","igualA":"1ra"},"opciones":[{"id":"equipaje","label":"Equipaje en bodega"},{"id":"salavip","label":"Sala VIP en Aeropuerto de Carrasco"},{"id":"traslado","label":"Traslado privado IN/OUT en destino"},{"id":"seguro","label":"Seguro de Asistencia al Viajero"}]},{"id":"voucher","tipo":"nota","etiqueta":"Voucher de regalo","contenido":"Voucher obsequio de USD 50: aplica a paquetes de hasta USD 1500.\nVoucher de USD 100: aplica a paquetes que superen los USD 1500 por pasajero.","requerido":false,"mostrarSi":{"campoId":"tipo_compra","igualA":"2da"}},{"id":"observaciones","tipo":"parrafo","etiqueta":"Observaciones","placeholder":"Flexibilidad de fechas, otros destinos a cotizar, etc.","requerido":false},{"id":"promos","tipo":"casilla","etiqueta":"Deseo recibir promociones y ofertas","requerido":false}]'::jsonb,
  false,
  now()
)
ON CONFLICT ("slug") DO UPDATE SET
  "nombreMarca" = EXCLUDED."nombreMarca",
  "tituloHero" = EXCLUDED."tituloHero",
  "textoInstitucional" = EXCLUDED."textoInstitucional",
  "campos" = EXCLUDED."campos",
  "deletedAt" = NULL,
  "updatedAt" = now();

-- Hospital Británico
INSERT INTO "CotizadorLanding" ("id", "slug", "nombreMarca", "tituloHero", "textoInstitucional", "campos", "publicado", "updatedAt")
VALUES (
  'seed-hospital-britanico',
  'hospital-britanico',
  'Hospital Británico',
  'Cotizá tu viaje',
  'Completá el formulario y recibí tu presupuesto en menos de 24 horas.',
  '[{"id":"soy","tipo":"seleccion","etiqueta":"Soy","requerido":true,"opciones":[{"id":"empleado","label":"Empleado del Hospital Británico"},{"id":"socio","label":"Socio del Hospital Británico"}]},{"id":"telefono","tipo":"telefono","etiqueta":"Teléfono","requerido":true},{"id":"destino","tipo":"texto","etiqueta":"Ciudad de destino","placeholder":"¿A dónde querés viajar?","requerido":true},{"id":"fechas","tipo":"rango_fechas","etiqueta":"Fechas (salida y regreso)","requerido":false},{"id":"adultos","tipo":"numero","etiqueta":"Adultos","ayuda":"Mayores de 18","requerido":false},{"id":"ninos","tipo":"numero","etiqueta":"Niños","ayuda":"Mayores de 2 años","requerido":false},{"id":"infantes","tipo":"numero","etiqueta":"Menores de 2 años","requerido":false},{"id":"observaciones","tipo":"parrafo","etiqueta":"Observaciones","placeholder":"Flexibilidad de fechas, otros destinos a cotizar, etc.","requerido":false},{"id":"promos","tipo":"casilla","etiqueta":"Deseo recibir promociones y ofertas","requerido":false}]'::jsonb,
  false,
  now()
)
ON CONFLICT ("slug") DO UPDATE SET
  "nombreMarca" = EXCLUDED."nombreMarca",
  "tituloHero" = EXCLUDED."tituloHero",
  "textoInstitucional" = EXCLUDED."textoInstitucional",
  "campos" = EXCLUDED."campos",
  "deletedAt" = NULL,
  "updatedAt" = now();
