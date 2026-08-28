# Sesion: 2026-08-24 — El cotizador de vendedores pasa a producción

> **Fecha:** 2026-08-24 y 2026-08-25
> **Duracion:** 13 commits (12 el 24/08, 1 el 25/08)
> **Branch:** main
> **Estado:** completada

---

## Objetivo de la sesion

Sacar el cotizador del estado de mockup y ponerlo a funcionar dentro del panel:
persistencia real en la base, corte de permisos por vendedor, link público para
el pasajero, PDF generado por el servidor, envío por WhatsApp y email, y lector
de itinerarios con IA. Al cerrar, incorporar los ajustes que pidió Gero después
de ver la herramienta andando.

---

## Cambios realizados

### Base de datos

- Migración `20260824120000_presupuestos`: tablas `Presupuesto`,
  `PresupuestoEvento`, `PresupuestoLink`, `PresupuestoApertura`,
  `PlantillaPresupuesto`, `HotelFavorito`, `Aeropuerto` y `Aerolinea`; enum
  `EstadoPresupuesto`; columna `cargo` en `User`. Carga inicial de 18
  aeropuertos, 12 aerolíneas y 5 ajustes del grupo "cotizador". No borra ni
  modifica nada de lo que ya existía.

### Backend

- `presupuesto.actions.ts` maneja el ciclo de vida de la cotización: alta,
  autoguardado a los 1,5 segundos, duplicado, borrado y cambio de estado.
- `presupuesto/acceso.ts` aplica el corte por vendedor en cada acción del
  servidor. El administrador ve todo; el vendedor solo lo suyo, aunque conozca
  el número de otra cotización.
- `presupuesto/numero.ts` asigna `COT-2026-NNNN` en el primer guardado, así
  abrir y cerrar el editor sin tocar nada no gasta número.
- `presupuesto-publico.actions.ts` recibe la confirmación del pasajero, deja
  comentario en el negocio abierto de Bitrix cuando el contacto tiene uno, y
  dispara el aviso al vendedor.
- `presupuesto/derivados.ts` calcula el precio precargado desde un paquete con
  la misma fórmula del panel de paquetes (neto de aéreo, traslados, seguros y
  circuito, más noches de hotel al precio del período, dividido por el factor).
- `presupuesto/habiles.ts` cuenta la vigencia en horas hábiles resolviendo el
  día de la semana en hora de Montevideo, porque el server corre en UTC.
- `presupuesto-analytics.actions.ts` y `presupuesto/analytics.ts` arman el
  tablero por vendedor y por semana, con export a CSV.
- `alojamiento-rapido.actions.ts` da de alta un hotel en el catálogo desde el
  buscador del cotizador (nombre, ciudad, estrellas).

### PDF e IA

- `pdf.ts` renderiza la hoja con puppeteer-core sobre el Chromium que instala
  `nixpacks.toml`. Lanza con `--no-sandbox`, `--disable-setuid-sandbox` y
  `--disable-dev-shm-usage` porque el contenedor corre como root y tiene poco
  `/dev/shm`.
- `api/cotizador/pdf/salud/route.ts` da el chequeo post-deploy, solo para
  administradores.
- `gemini.ts` y `api/cotizador/leer-itinerario/route.ts` leen el código del GDS
  o una captura de pantalla. El parser local responde al instante y la IA
  completa fechas y tramos.
- Fuentes DM Sans, Playfair Display y JetBrains Mono servidas desde
  `public/fonts/cotizador` con licencia OFL. Google Fonts no llegaba al
  Chromium del servidor y el PDF salía con tipografía genérica.

### Frontend del panel

- El cotizador vive en `/backend/cotizador` y pide login. `/cotizador` redirige
  ahí. El módulo viejo "Cotizadores" pasó a llamarse "Landings por marca".
- El editor se partió en módulos bajo `_mockup/`: `editor.jsx`, `inicio.jsx`,
  `compartir.jsx`, `drawer.jsx`, `analytics.jsx`, `telefono.jsx`,
  `catalogo.js`, `adaptadores.js`, `contexto.js`, `tramos.js`.
- Semáforo de cuatro chips en el listado, "Para hoy" con datos reales, buscador
  de clientes sobre las cotizaciones anteriores del vendedor, y botón
  "Mis links" en el inicio y en el editor.
- Al entrar al cotizador el menú lateral se colapsa solo y vuelve a como estaba
  al salir. Los selectores largos (ciudad del traslado, ciudad del hotel nuevo,
  vendedor en "Ver como" y en Analytics, destino en los filtros) pasaron a ser
  buscadores.

### Página del pasajero

- `/c/<token>` con su propio marco: wordmark arriba, la cotización y un cierre
  con dirección, teléfono y web. El grupo de rutas `(cotizacion)` la separa del
  layout público, que le metía la barra violeta y el footer oscuro.
- Registro de lectura por `api/cotizador/apertura`: aperturas, dispositivo,
  demora hasta la primera apertura, tiempo de lectura y sección alcanzada.

### Infra

- `nixpacks.toml` nuevo: `chromium`, `dejavu_fonts` y `freefont_ttf` en la fase
  de setup. Suma unos 200 MB a la imagen.
- `next.config.mjs`: la política de seguridad del panel dejó de bloquear las
  tipografías cuando el vendedor entraba por el dashboard y después iba al
  cotizador.

---

## Archivos modificados

Los principales de las 120 rutas que tocó la sesión.

| Archivo | Tipo de cambio |
|---------|---------------|
| `prisma/migrations/20260824120000_presupuestos/migration.sql` | Creado |
| `prisma/schema.prisma` | Modificado |
| `nixpacks.toml` | Creado |
| `.env.example` | Modificado |
| `next.config.mjs` | Modificado |
| `src/actions/presupuesto.actions.ts` | Creado |
| `src/actions/presupuesto-publico.actions.ts` | Creado |
| `src/actions/presupuesto-analytics.actions.ts` | Creado |
| `src/actions/alojamiento-rapido.actions.ts` | Creado |
| `src/lib/presupuesto/acceso.ts` | Creado |
| `src/lib/presupuesto/analytics.ts` | Creado |
| `src/lib/presupuesto/derivados.ts` | Creado |
| `src/lib/presupuesto/habiles.ts` | Creado |
| `src/lib/presupuesto/itinerario.ts` | Creado |
| `src/lib/presupuesto/links.ts` | Creado |
| `src/lib/presupuesto/numero.ts` | Creado |
| `src/lib/presupuesto/publico.ts` | Creado |
| `src/lib/presupuesto/sanitizar.ts` | Creado |
| `src/lib/presupuesto/schema.ts` | Creado |
| `src/lib/presupuesto/secciones.ts` | Creado |
| `src/lib/presupuesto-email.ts` | Creado |
| `src/lib/pdf.ts` | Creado |
| `src/lib/gemini.ts` | Creado |
| `src/lib/telefono.ts` | Creado |
| `src/lib/request-ip.ts` | Creado |
| `src/app/backend/cotizador/page.tsx` | Creado |
| `src/app/backend/cotizador/tipos.ts` | Creado |
| `src/app/backend/cotizador/ajustes/page.tsx` | Creado |
| `src/app/backend/cotizador/_mockup/analytics.jsx` | Creado |
| `src/app/backend/cotizador/_mockup/catalogo.js` | Creado |
| `src/app/backend/cotizador/_mockup/adaptadores.js` | Creado |
| `src/app/backend/cotizador/_mockup/contexto.js` | Creado |
| `src/app/backend/cotizador/_mockup/mis-links.jsx` | Creado |
| `src/app/backend/cotizador/_mockup/tramos.js` | Creado |
| `src/app/backend/cotizador/_mockup/editor.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/compartir.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/drawer.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/inicio.jsx` | Modificado |
| `src/app/backend/cotizador/_mockup/telefono.jsx` | Modificado |
| `src/app/(cotizacion)/layout.tsx` | Creado |
| `src/app/(cotizacion)/c/[token]/page.tsx` | Creado |
| `src/app/(cotizacion)/c/[token]/CotizacionPublica.jsx` | Creado |
| `src/app/(cotizacion)/c/[token]/NoDisponible.tsx` | Creado |
| `src/app/api/cotizador/[id]/pdf/route.ts` | Creado |
| `src/app/api/cotizador/pdf/salud/route.ts` | Creado |
| `src/app/api/cotizador/apertura/route.ts` | Creado |
| `src/app/api/cotizador/leer-itinerario/route.ts` | Creado |
| `src/app/cotizador/page.tsx` | Modificado (redirige a `/backend/cotizador`) |
| `src/components/layout/Sidebar.tsx` | Modificado |
| `src/components/ui/data/PaquetesDelServicio.tsx` | Creado |
| `public/fonts/cotizador/*.woff2` | Creado (6 archivos + LICENSE) |
| `src/lib/precio-desde.ts` | Modificado |
| `src/lib/bitrix.ts` | Modificado |
| `src/actions/user.actions.ts` | Modificado (campo `cargo`) |

---

## Decisiones tomadas

| Decision | Razon |
|----------|-------|
| El precio de venta lo calcula el servidor y el panel no lo puede pisar | El autoguardado devolvía el paquete entero con el precio viejo en pantalla y lo restauraba. Un paquete mostraba 895 en el panel y 951 en la web |
| Chromium adentro del contenedor, no un servicio externo de PDF | Evita depender de un tercero para el entregable central del vendedor. El costo son ~200 MB de imagen. Si molesta, la salida es un microservicio aparte, no sacar el paquete |
| Fuentes self-hosteadas en `/fonts/cotizador` | El Chromium del servidor no alcanza Google Fonts y el PDF salía con tipografía genérica. De paso el panel dejó de necesitar excepciones de CSP para fuentes externas |
| Lector de itinerarios con Gemini en vez de renovar PNR Converter | 2 a 3 segundos por lectura, menos de US$ 5 por mes para las 4.000 cotizaciones de las dos agencias, y lee capturas de pantalla, que el servicio pago no hace |
| La vigencia se cuenta en horas hábiles, con el reloj de Montevideo | Una cotización mandada el viernes a las 15:00 vencía el domingo, cuando nadie de la agencia puede contestar. El server corre en UTC, así que `getDay()` no sirve |
| El corte por vendedor se aplica en el servidor, no solo en la UI | Un vendedor podía abrir la cotización de otro escribiendo el número en la URL |
| Eliminar un usuario con cotizaciones se bloquea en vez de borrar en cascada | Las cotizaciones son el registro comercial. El mensaje explica que hay que desactivar al usuario |
| El número `COT-2026-NNNN` se asigna en el primer guardado | Abrir y cerrar el editor sin escribir nada no debe gastar un número de la serie |

---

## Pendientes para proxima sesion

- [ ] Probar el lector de itinerarios con PNR complejos reales de Gero (multitramo, escalas largas, códigos poco frecuentes).
- [ ] Revisar la paginación del PDF con cotizaciones de más de tres opciones.
- [ ] Entregar credenciales al equipo y borrar `credenciales-equipo-traveloz.csv` de la raíz.
- [ ] Check-in en producción con Gero y Pablo.

---

## Notas

- Todo se trabajó contra la base de producción, sin operaciones destructivas.
- El envío por WhatsApp y email quedó vivo recién con el commit de la Ola 2
  (`a42be93`). El commit de las Olas 0 y 1 (`e5f1174`) dejó las pestañas
  visibles pero apagadas, con "Marcar como enviada" como puente.
- La ruta pública nació como `src/app/(formularios)/c/[token]` y el 25/08 se
  mudó a `src/app/(cotizacion)/c/[token]` para darle layout propio.
