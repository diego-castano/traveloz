# Sesion: 2026-08-26 — Check-in del cotizador en producción con el cliente

> **Fecha:** 2026-08-26 y 2026-08-27
> **Duracion:** 14 commits (12 el 26/08, 2 el 27/08)
> **Branch:** main
> **Estado:** completada

---

## Objetivo de la sesion

Bajar a código la ronda de feedback que dejaron Gero y Pablo el 26/08 usando el
cotizador y los formularios de pasajeros en producción, y cerrar al día
siguiente los dos avisos de Gero sobre el panel de paquetes y la ficha de hotel.

---

## Cambios realizados

### Pasajeros y pagos

- Formulario de pasajeros más corto: se fue el bloque de datos del viaje. Por
  pasajero quedan cinco campos obligatorios (nombre y apellido en un solo
  campo, documento de viaje, fecha de nacimiento, email y teléfono). Ciudad,
  país y dirección aparecen solo cuando la factura lleva RUT. Un único "Foto
  del documento" y un "Adjuntar archivo", los dos opcionales.
- Formulario de tarjeta reordenado: arriba el pasajero que viaja, abajo la
  tarjeta (titular tal cual figura, número, vencimiento, código y cuotas de 1 a
  6). Las tarjetas se listan por el nombre del pasajero. El botón y el aviso
  pasaron de rojo a violeta.
- La bóveda guarda 96 horas en vez de 72. El número vive en
  `datos-constantes.ts` porque siete pantallas lo dicen y una sola que quede
  desactualizada rompe la promesa que lee el pasajero.
- "Enviar a ADM" al lado de "Ver datos": pide el número de file, manda los
  datos a la casilla de administración (`notificaciones_email_adm`, editable en
  Web → Notificaciones) y sella `enviadoAdmAt`. Abrir "Ver datos" también queda
  en el registro de accesos.

### Cotizador

- Elegir un cliente del historial carga solo sus datos, nunca la cotización
  anterior.
- El régimen del encabezado cambia todos los hoteles; el modo "Régimen
  detallado" deja cada hotel a mano y escribe "según régimen detallado" en
  servicios.
- Fecha de check-in editable por destino, para vuelos nocturnos.
- "Agregar habitación" vive dentro de cada opción y replica la habitación en
  las demás. El selector de personas llega a 5 y después ofrece "Más…"
  editable.
- El título de la cotización lleva solo el destino final: "Caribe › Jamaica ›
  Jamaica, Noviembre 2026" queda en "Jamaica, Noviembre 2026". Aplica en la
  hoja del pasajero, el editor, WhatsApp, el email, el listado con su filtro de
  destinos y analytics, y también al renderizar cotizaciones ya guardadas. Un
  título escrito a mano por el vendedor no se toca.
- La línea de aéreo que viene de un paquete web sale sin aerolínea: la agencia
  cotiza por ruta y se reserva cambiar de compañía manteniendo el precio.
- El seguro se cotiza como "Seguro de asistencia al viajero", sin el nombre del
  plan del operador.
- Vigencia por defecto de 96 horas hábiles (antes 48). El modal de compartir
  ofrece 24 / 48 / 72 / 96 y el valor inicial se edita en Ajustes.
- Los atajos de teclado dejaron de actuar mientras se escribe en un campo: en
  Mac con teclado español, Alt+número se comía el Option+2 del arroba.
- Se retiró el selector celular/tablet/escritorio del panel "Lo que ve el
  pasajero"; "Vista previa" sigue abriendo la previsualización completa.

### PDF

- Membrete: logo centrado arriba sobre el blanco de la hoja, número de
  cotización a la izquierda, banda de marca más baja con el título y los datos
  del viaje. Condiciones a dos columnas, logos de pago sin recuadros, firma
  sobre blanco y pie "TravelOz · Cotización COT-… · Página N". La misma
  cotización de tres opciones pasó de 4 a 3 hojas.
- Más aire: cada servicio de "Tu viaje incluye" en su propia ficha, con borde
  fino y fondo apenas tintado, en dos columnas. Los títulos de sección se
  separaron del bloque anterior, que era lo que hacía leer la hoja toda pegada.
- Paginación por tramo: cada tramo de vuelo y cada opción de alojamiento van
  enteros, y el itinerario se corta entre páginas solo en las escalas.
- 89 aeropuertos nuevos, para que el itinerario muestre el nombre y no solo el
  código.
- Se quitó la línea de validez del PDF y de la página del pasajero. Las notas
  aparecen solo si hay notas.
- La página web del pasajero no cambió.

### Panel de paquetes y alojamientos (27/08)

- "Paquetes por vencer" del dashboard abre el listado filtrado: solo los
  activos con validez entre hoy y 14 días, ordenados por lo que vence antes,
  con la pastilla "Vence 3 sep · en 6 días" en cada uno (roja si vence hoy o
  mañana). El KPI "Por vencer (próximos 14 d)" también es link.
- La tabla "Precios por periodo" del hotel entra en pantalla: tenía un ancho
  mínimo de 980 px y en una laptop los botones de editar y eliminar quedaban
  fuera de la vista. La fila en edición muestra "Guardar tarifa" y "Cancelar"
  en vez de un ícono escondido. La tabla de precios de circuitos heredó el
  mismo arreglo.

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `prisma/migrations/20260826200000_pago_pasajero_y_envio_adm/migration.sql` | Creado |
| `prisma/migrations/20260826230000_aeropuertos_mas/migration.sql` | Creado |
| `prisma/schema.prisma` | Modificado |
| `src/lib/datos-constantes.ts` | Creado |
| `src/lib/datos-nombre.ts` | Creado |
| `src/lib/slug-usuario.ts` | Creado |
| `src/lib/presupuesto/destino.ts` | Creado |
| `src/lib/datos-cifrado.ts` | Modificado |
| `src/lib/datos-form.ts` | Modificado |
| `src/lib/datos-purga.ts` | Modificado |
| `src/lib/datos-email.ts` | Modificado |
| `src/lib/presupuesto/analytics.ts` | Modificado |
| `src/lib/presupuesto/derivados.ts` | Modificado |
| `src/lib/presupuesto/habiles.ts` | Modificado |
| `src/lib/presupuesto/publico.ts` | Modificado |
| `src/lib/presupuesto/schema.ts` | Modificado |
| `src/lib/presupuesto-email.ts` | Modificado |
| `src/lib/site-settings-bootstrap.ts` | Modificado |
| `src/lib/date.ts` | Modificado |
| `src/lib/email.ts` | Modificado |
| `src/actions/datos-admin.actions.ts` | Modificado |
| `src/actions/datos-boveda.actions.ts` | Modificado |
| `src/actions/datos-publico.actions.ts` | Modificado |
| `src/actions/datos-vendedor.actions.ts` | Modificado |
| `src/actions/user.actions.ts` | Modificado |
| `src/app/(formularios)/_components/PasajerosForm.tsx` | Modificado |
| `src/app/(formularios)/_components/PagoForm.tsx` | Modificado |
| `src/app/(formularios)/_components/AdjuntoField.tsx` | Modificado |
| `src/app/(formularios)/_components/ui.tsx` | Modificado |
| `src/app/(formularios)/formularios.css` | Modificado |
| `src/app/(cotizacion)/c/[token]/page.tsx` | Modificado |
| `src/app/backend/cotizador/CotizadorMockup.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/editor.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/telefono.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/compartir.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/adaptadores.js` | Modificado |
| `src/app/backend/cotizador/_mockup/catalogo.js` | Modificado |
| `src/app/backend/cotizador/_mockup/contexto.js` | Modificado |
| `src/app/backend/cotizador/_mockup/data.js` | Modificado |
| `src/app/backend/cotizador/_mockup/drawer.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/inicio.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/styles.js` | Modificado |
| `src/app/backend/dashboard/_components/datos/EnviarAdmModal.tsx` | Creado |
| `src/app/backend/dashboard/_components/datos/RevelarModal.tsx` | Modificado |
| `src/app/backend/dashboard/_components/datos/PagosTab.tsx` | Modificado |
| `src/app/backend/dashboard/_components/datos/PasajerosTab.tsx` | Modificado |
| `src/app/backend/dashboard/_components/datos/LinkModal.tsx` | Modificado |
| `src/app/backend/dashboard/_components/AdminDashboard.tsx` | Modificado |
| `src/app/backend/datos/_components/EnvioDetalleView.tsx` | Modificado |
| `src/app/backend/datos/_components/EnvioDrawer.tsx` | Modificado |
| `src/app/backend/datos/_components/EnviosBandeja.tsx` | Modificado |
| `src/app/backend/datos/_components/FormulariosEditor.tsx` | Modificado |
| `src/app/backend/datos/_components/PagosTabla.tsx` | Modificado |
| `src/app/backend/paquetes/_components/VencimientoBadge.tsx` | Creado |
| `src/app/backend/paquetes/_components/PaqueteGridCard.tsx` | Modificado |
| `src/app/backend/paquetes/page.tsx` | Modificado |
| `src/app/backend/paquetes/searchParams.ts` | Modificado |
| `src/app/backend/alojamientos/[id]/page.tsx` | Modificado |
| `src/app/backend/web/_components/key-validators.ts` | Modificado |
| `src/components/ui/form/InlineEditTable.tsx` | Modificado |

---

## Decisiones tomadas

| Decision | Razon |
|----------|-------|
| La bóveda pasa de 72 a 96 horas | 72 horas no cubren un fin de semana: una tarjeta cargada el viernes se purgaba antes de que Administración volviera el lunes |
| El plazo de la bóveda vive en una constante compartida | Siete pantallas dicen el número. Con literales sueltos, cambiarlo obligaba a acordarse de las siete y la que se olvidara mentía |
| El vendedor recibe solo el aviso de que entró una tarjeta | Los datos completos quedan en la bóveda del sistema y salen a Administración con el número de file desde "Enviar a ADM". Confirmado con el cliente en el check-in |
| El título de la cotización lleva solo el destino final | "Caribe › Jamaica › Jamaica" repetía el camino del catálogo, que al pasajero no le dice nada. El destino final es lo que el cliente reconoce |
| Las cotizaciones guardadas se muestran con el título limpio, sin migrar datos | El título original queda intacto en la base; la limpieza es de render. Un título escrito a mano por el vendedor se respeta como está |
| La aerolínea sale de la línea de aéreo de los paquetes | La agencia cotiza el aéreo por ruta y se reserva cambiar de compañía manteniendo el precio. Es lo mismo que muestra la ficha pública del paquete |
| El seguro se cotiza sin nombre de plan | "Master" es un nombre interno del operador; el pasajero no lo entiende y genera preguntas |
| La vigencia por defecto sube a 96 horas hábiles | Coincide con la vida de la bóveda y le da al pasajero un fin de semana entero para decidir |
| El flujo de tarjeta rechazada queda manual | Decisión del cliente en el check-in: el vendedor rehace el pedido a mano cuando la tarjeta no pasa |

---

## Pendientes para proxima sesion

- [ ] Probar el lector de itinerarios con PNR complejos reales de Gero.
- [ ] Entregar credenciales al equipo y borrar `credenciales-equipo-traveloz.csv` de la raíz.
- [ ] Revisar el rol de Amparo Schelotto: figura como ADMIN y cotiza como vendedora (verificar).
- [ ] Piloto con el equipo el 31/08.

---

## Notas

- Las líneas de servicios de cuatro cotizaciones anteriores se corrigieron a
  mano desde el editor: COT-2026-0006, 0018 y 0026 (aéreo sin aerolínea) y
  COT-2026-0025 (seguro sin plan).
- El usuario QA con PIN de prueba queda activo durante el piloto.
- El commit del seguro sin plan (`515214b`) tiene fecha de autor 2026-08-28,
  aunque el `CHANGELOG.md` de la raíz lo agrupa bajo el 27 de agosto.
