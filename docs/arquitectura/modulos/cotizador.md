# Módulo: Cotizador de vendedores

> **Ruta del panel:** `/backend/cotizador` · **Ruta pública:** `/c/<token>`
> **Entró a producción:** 24 de agosto de 2026 (migración `20260824120000_presupuestos`).
> **Última ronda de cambios documentada:** 27 de agosto de 2026.
> **Complementa:** [modulos-backend.md](../modulos-backend.md) · [cotizador-especificacion-v1.md](../../especificaciones/cotizador-especificacion-v1.md) · [cotizador-checkin-2026-08-26.md](../../especificaciones/cotizador-checkin-2026-08-26.md)

---

## 1. Propósito

El vendedor arma la cotización de un viaje, la comparte con el pasajero por
WhatsApp o email, y sigue qué pasó con ella. La cotización vive en la base:
tiene número correlativo, link público con vigencia, PDF generado en el
servidor, registro de aperturas y confirmación desde el link.

El módulo reemplaza al cotizador viejo de la agencia. Las metas de la
[especificación funcional](../../especificaciones/cotizador-especificacion-v1.md)
son 60 segundos para una cotización que arranca desde un paquete y 4 minutos
para una de dos destinos con tres opciones hoteleras armada de cero.

Tres piezas de vocabulario que conviene fijar antes de leer el resto:

| En la UI | En el código | Por qué |
|---|---|---|
| Cotización | `Presupuesto` | `Cotizacion` ya es el lead del sitio público |
| Opción | `opciones[]` dentro de `contenido` | Cada combinación de hoteles con su precio |
| Ficha del pasajero | `_mockup/telefono.jsx` | El mismo componente dibuja pantalla, previa y PDF |

---

## 2. Modelos Prisma

Todos viven al final de [prisma/schema.prisma](../../../prisma/schema.prisma),
bajo el encabezado "Cotizador del vendedor — persistencia híbrida".

### 2.1 `Presupuesto`

La cotización entera vive en `contenido Json`, validado con Zod en
[src/lib/presupuesto/schema.ts](../../../src/lib/presupuesto/schema.ts). Las
columnas del modelo son un **espejo derivado** de ese JSON: existen para
listar, filtrar y ordenar sin abrir el blob. Se recalculan en cada guardado
con `columnasDesdeContenido()` de
[derivados.ts](../../../src/lib/presupuesto/derivados.ts).

| Grupo | Columnas | Notas |
|---|---|---|
| Identidad | `id`, `numero` (`@unique`), `brandId`, `vendedorId` | `numero` es `COT-2026-0148` |
| Idempotencia | `claveEdicion` (`@unique`, nullable) | UUID que genera el editor por cotización nueva |
| Estado | `estado` (`EstadoPresupuesto`, default `BORRADOR`), `estadoManual` | El estado "vencida automática" no se persiste |
| Cliente | `clienteNombre`, `clienteApellido`, `clienteEmail`, `clienteTelefono`, `clienteTelefonoDigitos` | Los dígitos sueltos hacen que `+598 99 123 456` y `99123456` matcheen |
| Viaje | `destino`, `mes`, `anio`, `fechaSalida` (`@db.Date`), `soloVuelos` | |
| Precio | `montoPrincipal`, `moneda` (default `USD`) | Primera tarifa de la primera habitación de la primera opción |
| Origen | `origenTipo`, `origenRef` | paquete, plantilla, duplicada o consulta IA |
| Contenido | `contenido Json`, `notasInternas` (`@db.Text`) | |
| Link y lectura | `vigenciaHoras` (default 48), `enviadaAt`, `expiraAt`, `confirmadaAt`, `confirmadaOpcion`, `confirmadaVia`, `aperturas`, `primeraAperturaAt`, `ultimaAperturaAt` | |
| Métrica | `tiempoArmadoSeg` | Cuánto tardó el vendedor en armarla |
| Ciclo | `createdAt`, `updatedAt`, `deletedAt` | Borrado lógico |

Índices: `[brandId, vendedorId, deletedAt]`, `[brandId, estado]`, `[numero]`,
`[clienteTelefonoDigitos]`. La relación con `User` va con
`onDelete: Restrict`: borrar un vendedor con cotizaciones falla a propósito y
la UI pide desactivarlo.

El default de columna `vigenciaHoras` sigue en 48 aunque la vigencia efectiva
por defecto ya sea 96. El valor que se aplica sale de `VIGENCIA_DEFAULT` y del
ajuste `cotizador_vigencia_default`, nunca del default de Postgres.

```prisma
enum EstadoPresupuesto {
  BORRADOR
  ENVIADA
  ABIERTA
  VENCIDA
  CONFIRMADA
}
```

### 2.2 `PresupuestoEvento`

Bitácora append-only que dibuja la línea de tiempo del drawer. `tipo` es un
string libre por convención: `creada`, `guardada`, `enviada`, `abierta`,
`recordatorio`, `vigencia_extendida`, `reactivada`, `estado_manual`,
`confirmada`, `revision_solicitada`, `duplicada`, `eliminada`. `actorTipo`
distingue `vendedor`, `pasajero` y `sistema`. Cascada desde `Presupuesto`.

### 2.3 `PresupuestoLink`

Un link por envío. `token` único, `canal` (`whatsapp`, `email`, `pdf`,
`manual`), `vigenciaHoras`, `emitidoAt`, `expiraAt`, `revocadoAt`. La
invariante es **un solo link vivo por cotización**: `emitirORenovar()` reusa el
que existe corriendo el vencimiento, y si no hay ninguno revoca los restos
antes de crear uno nuevo.

### 2.4 `PresupuestoApertura`

Una fila por apertura del link: `abiertaAt`, `userAgent`, `dispositivo`, `ip`,
`seccionMax`, `segundos`. Alimentan el embudo de lectura ("llegó hasta Formas
de pago, 2 m 40 s"). Cascada desde `PresupuestoLink`.

### 2.5 `PlantillaPresupuesto`

Cotización guardada como punto de partida. `vendedorId` en null significa
plantilla global del equipo; con id, privada de quien la creó. Lleva `usos` y
`ultimoUsoAt`.

### 2.6 `HotelFavorito`

Clave compuesta `[vendedorId, alojamientoId]`. Los hoteles con estrella suben
primero en el buscador del editor.

### 2.7 `Aeropuerto` y `Aerolinea`

Catálogo IATA mínimo. `Aeropuerto` tiene `codigo` (3 letras) como id, más
`ciudad`, `nombre` y `terminal` opcional. `Aerolinea` tiene `codigo` (2
caracteres) y `nombre`. El parser de PNR devuelve códigos y estas dos tablas
los traducen a texto legible. Si un código no está cargado, la ficha muestra
solo el código.

### 2.8 Migraciones

| Migración | Qué hace |
|---|---|
| [20260824120000_presupuestos](../../../prisma/migrations/20260824120000_presupuestos/) | Crea las ocho tablas del módulo, agrega `cargo` a `User`, carga 18 aeropuertos, 12 aerolíneas y 5 ajustes del grupo `cotizador`. No borra ni modifica nada existente |
| [20260826200000_pago_pasajero_y_envio_adm](../../../prisma/migrations/20260826200000_pago_pasajero_y_envio_adm/) | Del módulo de pagos. Toca al cotizador solo de refilón: el índice `AuditLog_targetType_targetId_createdAt_idx` que usan los accesos de la bóveda |
| [20260826230000_aeropuertos_mas](../../../prisma/migrations/20260826230000_aeropuertos_mas/) | Suma 89 códigos IATA (Montego Bay, Kingston, Orlando, Nueva York, Ámsterdam, Londres). Aditiva y repetible: solo `INSERT ... ON CONFLICT DO NOTHING` |

---

## 3. Arquitectura

### 3.1 Página server y contexto

[src/app/backend/cotizador/page.tsx](../../../src/app/backend/cotizador/page.tsx)
es un server component que llama a `getContextoCotizador()`
([presupuesto.actions.ts](../../../src/actions/presupuesto.actions.ts)) y monta
el editor. El contexto trae quién soy, el equipo de vendedores, los textos del
máster (mensaje, condiciones, vigencia, factor, casilla de copia), mis
favoritos y los catálogos de aeropuertos y aerolíneas, todo en un solo
`Promise.all`. A un VENDEDOR la lista de vendedores le llega con una sola
entrada, la suya; el ADMIN recibe el equipo activo de la marca.

El shell del panel apaga su chrome para esta ruta: `esRutaCotizador()` en
[tipos.ts](../../../src/app/backend/cotizador/tipos.ts) compara la ruta exacta
más el separador, para que `/backend/cotizadores` (el módulo de landings) no
dé falso positivo.

### 3.2 El editor

[CotizadorMockup.jsx](../../../src/app/backend/cotizador/CotizadorMockup.jsx)
es el componente raíz. El resto vive en `_mockup/`, nombre heredado de cuando
el cotizador era una maqueta sin base de datos:

| Archivo | Contenido |
|---|---|
| [inicio.jsx](../../../src/app/backend/cotizador/_mockup/inicio.jsx) | Pantalla de entrada: listado de seguimiento, cola del día, chips del semáforo, entradas "Desde un paquete", "Desde una plantilla" y consulta pegada |
| [editor.jsx](../../../src/app/backend/cotizador/_mockup/editor.jsx) | El armado: encabezado, cliente, vuelos, destinos, opciones con habitaciones y tarifas, servicios, notas |
| [drawer.jsx](../../../src/app/backend/cotizador/_mockup/drawer.jsx) | Panel lateral de una cotización: línea de tiempo, embudo de lectura, datos del pasajero devueltos, acciones |
| [compartir.jsx](../../../src/app/backend/cotizador/_mockup/compartir.jsx) | Modal con las pestañas WhatsApp, Email, PDF y "Datos del pasajero" |
| [telefono.jsx](../../../src/app/backend/cotizador/_mockup/telefono.jsx) | La ficha del pasajero. El mismo componente dibuja la previa del editor, la página pública y la hoja impresa (`modo="print"`) |
| [analytics.jsx](../../../src/app/backend/cotizador/_mockup/analytics.jsx) | Tablero del admin. Pide los números al server, no los calcula sobre la grilla |
| [mis-links.jsx](../../../src/app/backend/cotizador/_mockup/mis-links.jsx) | Los dos links personales del vendedor con copiar y WhatsApp, en la barra del inicio y en el header del editor |
| [catalogo.js](../../../src/app/backend/cotizador/_mockup/catalogo.js) | Puente con el catálogo del panel: paquetes, alojamientos, favoritos, hoteles propios |
| [adaptadores.js](../../../src/app/backend/cotizador/_mockup/adaptadores.js) | Traduce la fila que devuelve el server a la forma que dibuja la UI |
| [tramos.js](../../../src/app/backend/cotizador/_mockup/tramos.js) | Helper puro que calcula ciudad, noches, check-in y check-out de cada tramo |
| [data.js](../../../src/app/backend/cotizador/_mockup/data.js) | Vocabulario cerrado (regímenes, cabinas, ocupaciones), estados, semáforo, parser de PNR local, helpers de formato |
| [contexto.js](../../../src/app/backend/cotizador/_mockup/contexto.js) | Contexto de React y catálogo vacío. Vive separado de `catalogo.js` para que el bundle público de `/c/<token>` no arrastre los providers del panel |
| [ui.jsx](../../../src/app/backend/cotizador/_mockup/ui.jsx) · [styles.js](../../../src/app/backend/cotizador/_mockup/styles.js) · [styles-ui.js](../../../src/app/backend/cotizador/_mockup/styles-ui.js) | Controles compartidos y las dos hojas de estilo |

### 3.3 Persistencia híbrida y autosave

`contenido` es la fuente de verdad; las columnas son espejo. Nada de normalizar
opciones ni tarifas en tablas: cambian todo el tiempo y el vendedor las arma
libres.

El ciclo del autoguardado en `CotizadorMockup.jsx`:

1. Cualquier cambio en `q` (el contenido) programa un guardado a los **1.500
   ms**.
2. La primera vez llama a `crearPresupuesto`, que sella el número que devuelve
   la base. Después llama a `guardarPresupuesto`.
3. Nunca hay dos llamadas en vuelo: la segunda queda pendiente y sale cuando
   termina la primera.
4. `ultimoGuardadoRef` guarda el contenido ya persistido serializado. Comparar
   contra ese string evita el bucle cuando el guardado escribe el número
   dentro de `q`.
5. Si falla, reintenta solo a los 5 segundos, hasta cinco veces. Después queda
   el indicador en rojo y se reintenta a mano tocándolo.

Cuatro mecanismos sostienen esto:

- **`claveEdicion`.** El editor genera un UUID por cotización nueva y lo manda
  en cada intento de creación. El `@unique` hace que un reintento devuelva la
  fila que ya existe en vez de duplicarla y quemar otro número.
- **Época (`epocaRef`).** `abrir()` la incrementa. Un guardado que salió con la
  cotización anterior y vuelve después del cambio se descarta: no puede pisar
  el id ni el número de la nueva.
- **`flush()`.** Al salir del editor espera al guardado en vuelo antes de
  decidir si queda algo pendiente. Sin eso, "salir" recargaba la grilla
  mientras la fila se estaba escribiendo.
- **Concurrencia por `updatedAt`.** El cliente manda `updatedAtEsperado`. Si no
  coincide, la action devuelve el código `CONFLICTO` y el editor recarga la
  versión fresca con el aviso "Esta cotización se modificó en otra pestaña".

La demo del PDF (`?imprimir=demo`) no guarda: `demoRef` apaga el autoguardado
entero, porque cada corrida dejaba un borrador nuevo con número quemado.

El `bodySizeLimit` de server actions está en **2 MB** en
[next.config.mjs](../../../next.config.mjs): con el default de 1 MB una
cotización larga rebotaba y el editor quedaba sin guardar.

### 3.4 Alcance por vendedor

[src/lib/presupuesto/acceso.ts](../../../src/lib/presupuesto/acceso.ts) tiene
las tres piezas del control de acceso:

- `scopeVendedor(vendedorId?)` exige sesión, rechaza cualquier rol que no sea
  ADMIN o VENDEDOR, y devuelve un `Scope`. Para un VENDEDOR, `targetId` queda
  clavado en su propio id y el `vendedorId` que venga de afuera se ignora. Un
  ADMIN filtra por quien quiera, o no filtra.
- `cargarPropia(id, scope)` trae la cotización comprobando la marca y el dueño.
  A un ajeno le responde lo mismo que a una inexistente: no confirma que
  exista.
- `emitirORenovar()` y `linkVivo()` manejan el link público.

Un VENDEDOR llega al panel con `canEdit:false`, que es sobre el catálogo
(paquetes, hoteles, precios). El cotizador es su herramienta de trabajo: acá
escribe. Lo que lo encierra es el scope, no el permiso de edición.

### 3.5 Página pública del pasajero

[page.tsx de `/c/[token]`](../../../src/app/%28cotizacion%29/c/%5Btoken%5D/page.tsx)
resuelve el token contra `PresupuestoLink`, y si el link venció o fue revocado
muestra [NoDisponible.tsx](../../../src/app/%28cotizacion%29/c/%5Btoken%5D/NoDisponible.tsx)
con el WhatsApp del vendedor. La página va con `robots: index:false,
follow:false, nocache:true`.

El token tiene 8 caracteres de un alfabeto de 32 símbolos sin `i`, `l`, `1`,
`o` ni `0` ([links.ts](../../../src/lib/presupuesto/links.ts)). El rate limit es
particular: la página **lee** el contador con `peekFormRate` y solo lo consume
cuando el token no resuelve, así el pasajero recarga cuanto quiera y el render
del PDF, que entra por la IP de salida de Railway, nunca se queda sin turno.

No reusa `getContextoCotizador`: esa action exige sesión. `ajustesPublicos()`
lee solo `cotizador_condiciones` y `cotizador_vigencia_default`, y **filtra la
línea de condiciones que contenga `{vigencia}`**: el documento que el pasajero
lee y el PDF que se guarda no llevan fecha de vencimiento impresa. El catálogo
que baja es el mínimo, solo los alojamientos y aeropuertos que la cotización
nombra.

Lo que cruza al navegador del pasajero lo arma `contenidoPublico()` en
[src/lib/presupuesto/publico.ts](../../../src/lib/presupuesto/publico.ts), **por
lista blanca, campo por campo**. La razón está escrita en el archivo: si se le
pasa `contenido` entero a un componente cliente, Next lo serializa completo
dentro del payload RSC del HTML, y alcanza con "ver código fuente" para leer
los netos. `contenidoSchema` es `looseObject` a propósito porque el editor
agrega campos casi todas las semanas: con lista negra, el campo nuevo de mañana
viaja solo y nadie se entera.

Lo que llega al pasajero:

| Llega | No llega |
|---|---|
| Número, título (solo destino final), fecha de salida | Netos y factores de markup |
| Mensaje del vendedor y notas para el cliente, saneadas | Notas internas y el bloc `notasLibres` |
| Vuelos, cabina, equipaje, destinos, servicios | El PNR crudo y lo que entendió la IA |
| Opciones con hoteles, habitaciones y tarifas **con `venta` ya resuelta** | Costos fijos internos |
| Solo el `nombre` del cliente | Email y teléfono del cliente |

El precio llega calculado con la misma aritmética de `derivados.ts` y el mismo
redondeo de `money()`, así que el pasajero ve exactamente el número que el
vendedor aprobó. El HTML libre pasa por `sanitizarHtmlNotas()`
([sanitizar.ts](../../../src/lib/presupuesto/sanitizar.ts)) también al leer, no
solo al guardar, porque lo que ya está en la base viene de antes de que
existiera el saneo. Un bloc vaciado en el editor queda en `<div><br></div>`;
`soloMarcado()` lo devuelve como cadena vacía para que la sección "Notas" no
aparezca vacía en pantalla ni en el PDF.

**CSP propia.** [next.config.mjs](../../../next.config.mjs) sirve `/c/:path*`
con `cspPublicoCotizacion`, que le **resta** a la CSP del sitio los orígenes de
medición: Google Tag Manager, Google Analytics, Facebook Pixel y Metricool.
Además cierra `frame-src` en `'none'` y `form-action` en `'self'`. El
argumento del comentario: la hoja del pasajero no mide nada (las aperturas las
registra el beacon propio `/api/cotizador/apertura`) y ahí hay nombre,
itinerario y precio de una persona, así que no tiene por qué pasar por un
tercero.

Hasta agosto de 2026 existía además una CSP propia para `/backend/*` que abría
`fonts.googleapis.com` y `fonts.gstatic.com`. Las tres familias ahora se sirven
desde `public/fonts/cotizador`, así que `'self'` alcanza.

### 3.6 PDF server-side

[src/lib/pdf.ts](../../../src/lib/pdf.ts) levanta un Chromium headless, carga
`/c/<token>?print=1` y lo imprime. La hoja no se dibuja ahí: la dibuja la misma
página que abre el pasajero. Una sola definición para la pantalla, el papel y
el adjunto del email.

**Por dónde entra el navegador.** `baseDeRenderPdf()` resuelve la base en tres
pasos: `COTIZADOR_PDF_BASE_URL` si está, si no loopback
`http://127.0.0.1:$PORT` en producción, si no `SITE_BASE_URL` en desarrollo.
Antes entraba por la URL pública y el contenedor salía a Internet para pedirse
a sí mismo, pasando por Cloudflare. Un headless sin cookies ni JS de challenge
es justo lo que ese proxy retiene, y los renders morían en el techo del `goto`.

**El navegador.** Chromium entra a la imagen de Railway por
[nixpacks.toml](../../../nixpacks.toml) (`chromium`, `dejavu_fonts`,
`freefont_ttf`; suma unos 200 MB). `resolverChromium()` busca
`PUPPETEER_EXECUTABLE_PATH`, después `which chromium` / `chromium-browser` /
`google-chrome`, y solo en desarrollo cae al Chromium de Playwright. Se lanza
con `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage` porque
corre como root, sin namespaces de usuario, y el `/dev/shm` del contenedor es
chico.

**Reglas de operación.** Un navegador por render, cerrado siempre en `finally`.
Máximo 2 renders simultáneos (`MAX_CONCURRENTES`); el tercero espera 30 s y sale
con `OCUPADO`, que la ruta traduce a HTTP 429. Techo duro de 45 s por render.
`COTIZADOR_PDF_OFF=1` lo apaga sin deploy (el email sale con el link, sin
adjunto).

**Las animaciones se congelan antes de imprimir.** Ese Chromium no dibuja
fotogramas, así que el reloj de las animaciones no avanza nunca: el PDF salía
sin el hotel ni las tarifas y el vendedor lo mandaba por email sin enterarse.
`congelarAnimaciones()` las neutraliza antes del `page.pdf()`.

**Diagnóstico.** El render está partido en etapas (`lanzar`, `goto`, `hoja`,
`fuentes`, `imagenes`, `pdf`) y cada error sale con su código
(`SIN_CHROMIUM`, `TIMEOUT`, `PAGINA_INVALIDA`, `OCUPADO`, `NAVEGACION`,
`DESCONOCIDO`) y su etapa. Nada de lo que se loguea incluye el contenido de la
cotización, y la URL se loguea con el token tapado. `GET
/api/cotizador/pdf/salud` (solo admin) es el chequeo post-deploy.

**Fuentes.** DM Sans, Playfair Display y JetBrains Mono se sirven desde
[public/fonts/cotizador](../../../public/fonts/cotizador/) con licencia OFL.
Antes venían de Google Fonts, que la red del contenedor no alcanza: el PDF
salía en DejaVu. Los archivos llevan la versión de gstatic en el nombre, así
que `/fonts/:path*` va con `Cache-Control: max-age=31536000, immutable`.

**Reglas `@page`** en [styles.js](../../../src/app/backend/cotizador/_mockup/styles.js):
márgenes `10mm 12mm 13mm`, y una margin box `@bottom-right` con
`content: var(--ctz-pie, "TravelOz") " · Página " counter(page)` a 9 pt. La
primera hoja va sin pie (`@page :first`). Las margin boxes con `counter(page)`
las dibuja Chromium 131 o más nuevo; en un motor viejo el PDF sale sin numerar
pero entero.

**Paginación** en [telefono.jsx](../../../src/app/backend/cotizador/_mockup/telefono.jsx):
el componente modela el alto real de la hoja (703 px de ancho útil, A4 menos
12 mm por lado) y decide dónde cortar. Cada tramo de vuelo va entero, cada
opción de alojamiento va entera, y el itinerario se reparte entre páginas solo
en las escalas. Si la hoja no entra en una carilla, las opciones arrancan en
página nueva (`data-print-corte="pagina"`). Los títulos de sección llevan
`break-after:avoid` para no quedar huérfanos al pie.

### 3.7 Envío por WhatsApp y email

[src/lib/presupuesto-email.ts](../../../src/lib/presupuesto-email.ts) arma tres
plantillas: `cotizacionEmail()`, `confirmacionEmail()` y `revisionEmail()`. El
remitente es `TravelOz <notificaciones@app.traveloz.com.uy>` (`COTIZADOR_FROM`).

`enviarPorEmail()` manda el email al pasajero con copia a la casilla del ajuste
`cotizador_email_copia`, destinatarios extra si el vendedor los agregó,
`replyTo` puesto al email del vendedor y el PDF adjunto.

**`sendEmail` nunca lanza.** Devuelve `{ delivered, provider, error }`. La
action chequea el valor a mano:

```ts
if (!envio.delivered && envio.provider === "resend") {
  log.error("presupuesto.email.fail", { id: row.id, error: envio.error });
  fallar("No pudimos mandar el email. Revisá la dirección y probá de nuevo.");
}
```

Sin ese chequeo, un rebote de Resend se leía como envío exitoso y la cotización
quedaba marcada como enviada. En desarrollo, sin `RESEND_API_KEY`, el proveedor
es `console` y el flujo sigue: solo un rechazo real de Resend impide sellar el
envío.

El PDF se adjunta best-effort. Si el render falla, el email sale igual con el
link y el evento de la bitácora anota `sin PDF adjunto: <código>`
(`APAGADO`, `SIN_CHROMIUM`, `TIMEOUT`, `OCUPADO`, lo que haya sido).

El WhatsApp no manda nada desde el servidor: arma el texto con el link y abre
`wa.me/<numero>`. El número se compone con código de país; antes fallaba con
celulares uruguayos escritos sin el 598.

### 3.8 Lector de itinerarios con Gemini

`POST /api/cotizador/leer-itinerario`
([route.ts](../../../src/app/api/cotizador/leer-itinerario/route.ts)) recibe el
pegado del GDS y/o una captura de la reserva, y devuelve el itinerario listo
para el editor. Reemplaza a PNR Converter. Requiere sesión del panel; la API
key nunca sale del servidor.

| Límite | Valor |
|---|---|
| Texto | 20.000 caracteres |
| Imagen | 6 MB, `image/png` · `image/jpeg` · `image/webp` |
| Rate limit | 30 lecturas por minuto por usuario + IP, en memoria del proceso |

[src/lib/gemini.ts](../../../src/lib/gemini.ts) es un cliente REST mínimo,
sin SDK: una llamada a `generateContent` con `responseSchema`. Modelo por
defecto `gemini-3.1-flash-lite`, cambiable con `GEMINI_MODELO`. Timeout de
20 s y un solo reintento ante 5xx o 429. Errores tipados: `SIN_API_KEY`,
`TIMEOUT`, `RESPUESTA_INVALIDA`, `CUOTA`, `FALLA_API`. `COTIZADOR_IA_OFF=1`
apaga el lector. El prompt y el schema salen de la POC
`scripts/poc-lector-itinerarios.mjs`.

El parser local de [data.js](../../../src/app/backend/cotizador/_mockup/data.js)
(`parsePNR`) sigue respondiendo al instante; la IA completa fechas y tramos.
Los casos de prueba viven en [docs/pnr-ejemplos/](../../pnr-ejemplos/):
`copa-amadeus.txt`, `copa-ndc-replica.png`, `esperado.json` y
`referencia-gero.html`.

Costo estimado en el CHANGELOG del 24/08: menos de US$ 5 por mes.

### 3.9 Vigencia en horas hábiles

[src/lib/presupuesto/habiles.ts](../../../src/lib/presupuesto/habiles.ts)
cuenta la vigencia del link en **horas hábiles**: sábado y domingo no corren.
Una cotización mandada el viernes a las 15:00 con 48 h vence el martes a las
15:00, no el domingo a la tarde cuando nadie de la agencia puede contestar.

El día de la semana se resuelve siempre en `America/Montevideo`
(`ZONA_NEGOCIO`) con `Intl.DateTimeFormat`: el server corre en UTC y el
navegador del vendedor en la zona que tenga la máquina. Con `getDay()` pelado,
un envío del viernes 22:00 uruguayo caería en sábado para el server.

El archivo no importa nada, a propósito: lo levanta el server (actions, email)
y también el bundle público del pasajero.

El vencimiento que manda para el pasajero es el del **link**: la página pública
mira `PresupuestoLink.expiraAt`, no la columna del presupuesto.

Valores: `VIGENCIA_DEFAULT = 96` en
[schema.ts](../../../src/lib/presupuesto/schema.ts), acotado siempre entre
`VIGENCIA_MIN` y `VIGENCIA_MAX` (1 hora y 30 días) por `acotarVigencia()`. El
modal de compartir ofrece 24 / 48 / 72 / 96. El valor inicial lo edita el
admin en el SiteSetting `cotizador_vigencia_default`.

### 3.10 Analytics por vendedor

[src/actions/presupuesto-analytics.actions.ts](../../../src/actions/presupuesto-analytics.actions.ts)
tiene una sola action, `analyticsCotizador({ desde, hasta, vendedorId })`, y
arranca con `requireAdmin()`: **solo ADMIN**. Rango por defecto, los últimos 90
días por `createdAt`.

Dos queries fijas con el mismo `WHERE` (si divergen, el embudo deja de
corresponderse con las filas de arriba) y una tercera chica para los nombres.
Topes: 5.000 cotizaciones y 20.000 aperturas, estas últimas ordenadas por
`abiertaAt` descendente para que el recorte se quede con las recientes. Las
cuentas las hace `agregarAnalytics()` en
[src/lib/presupuesto/analytics.ts](../../../src/lib/presupuesto/analytics.ts),
en memoria, en una pasada.

### 3.11 Catálogo de paquetes web hacia cotización

[catalogo.js](../../../src/app/backend/cotizador/_mockup/catalogo.js) precarga
una cotización desde un paquete del panel: destinos, noches, servicios, régimen
por hotel y una tarifa por adulto en base doble. El neto se calcula con la
misma fórmula del panel de paquetes (aéreo + traslados + seguros + circuito,
más las noches de hotel al precio del período) dividido por el factor de la
opción.

Tres reglas de armado que salieron del cliente:

- **La línea de aéreo va sin aerolínea.** La agencia cotiza el aéreo por ruta y
  se reserva cambiar de compañía manteniendo el precio. Queda solo la ruta, lo
  mismo que muestra la ficha pública del paquete (Gero, 26/08).
- **El seguro va sin plan.** El catálogo guarda el plan (`Master`, `Total`,
  `Platinum`), que es un nombre interno del operador. La línea dice `Seguro de
  asistencia al viajero`, salvo que el paquete tenga un texto propio para el
  pasajero (27/08).
- **El título lleva solo el destino final.** `destinoFinal()` en
  [destino.ts](../../../src/lib/presupuesto/destino.ts) recorta
  `Caribe › Jamaica › Jamaica` a `Jamaica`. Tolera el `>` de cargas viejas
  además del `›` que usa el panel. Sin separador devuelve el texto tal cual,
  así que un título escrito a mano no se recorta. `catalogo.js` la llama a
  través de `destinoLimpio()` de `data.js`; el email, la ficha pública, el
  espejo en columnas y analytics la usan directo. Las tarjetas de paquetes del
  inicio conservan el camino completo.

Los hoteles escritos a mano quedan guardados como "propios" para la próxima
cotización, y
[alojamiento-rapido.actions.ts](../../../src/actions/alojamiento-rapido.actions.ts)
(`crearAlojamientoRapido`) da de alta un alojamiento en el catálogo sin salir
del editor.

### 3.12 Integración con Pasajeros y pagos

`VendedorCotizador` en
[tipos.ts](../../../src/app/backend/cotizador/tipos.ts) lleva `linkDatos` y
`linkPago`, los dos links públicos permanentes del vendedor. Quedan en `null`
si el usuario no tiene slug o apagó `linkActivo`.

- **"Mis links"** ([mis-links.jsx](../../../src/app/backend/cotizador/_mockup/mis-links.jsx))
  los muestra con copiar y WhatsApp, en la barra del inicio y en el header del
  editor. Antes vivían tres clicks abajo, dentro del modal Compartir y solo con
  la cotización ya guardada.
- **Pestaña "Datos del pasajero"** en Compartir: los mismos dos links, más
  `pedirDatosDelPasajero()`, que llama a `crearSolicitud` de
  [datos-vendedor.actions.ts](../../../src/actions/datos-vendedor.actions.ts)
  con el número de cotización y el destino ya cargados.
- **`datosDelPasajero(id)`** devuelve al drawer lo que volvió: solicitudes
  vigentes, envíos de pasajeros y tarjetas en la bóveda.
- **`cotizacionesPorReferencia()`** hace el camino inverso: desde la bandeja de
  pasajeros, la referencia abre la cotización.

Detalle en [pasajeros-pagos.md](./pasajeros-pagos.md).

---

## 4. Reglas de negocio

### 4.1 Qué ve el pasajero

- Ve precios de venta, nunca netos ni factores. Ve el mensaje del vendedor y
  las notas para el cliente. No ve notas internas.
- Ve un solo destino en el título, el final del camino.
- No ve la línea de validez: se sacó del PDF y de la página el 26/08. La
  vigencia sigue funcionando por dentro y el email la menciona.
- Confirma una opción desde el link. La confirmación registra fecha, IP y
  dispositivo, y vale como firma. Dispara email al vendedor, comentario en el
  negocio abierto de Bitrix si el contacto tiene uno, y le muestra al pasajero
  los botones para cargar datos de pasajeros y de pago.
- "Solicitar una revisión" avisa al vendedor por email sin confirmar nada.
- Con el link vencido ve un aviso con el WhatsApp del vendedor.

### 4.2 Quién ve qué

| | ADMIN | VENDEDOR | MARKETING |
|---|---|---|---|
| Entrar al cotizador | Sí | Sí | No |
| Ver cotizaciones | Todas de la marca | Solo las suyas | — |
| Editar, duplicar, borrar | Cualquiera | Solo las suyas | — |
| Filtro "Ver como" | Sí | No | — |
| Analytics | Sí | No | — |
| Ajustes (`/backend/cotizador/ajustes`) | Sí | No | — |

El servidor aplica el corte en cada action, no solo en la UI: un vendedor no
puede abrir, editar ni borrar una cotización ajena aunque conozca el número.
Un ajeno recibe la misma respuesta que si la cotización no existiera.

### 4.3 Numeración

`COT-AAAA-NNNN`, correlativo de cuatro dígitos que se reinicia por año.
[numero.ts](../../../src/lib/presupuesto/numero.ts) usa un upsert atómico sobre
`IdCounter` con entidad `presupuesto:2026`, así que dos vendedores guardando al
mismo tiempo no se pisan. El número se asigna en el **primer guardado**: abrir
y cerrar sin tocar nada no gasta número.

### 4.4 Estados

Cinco estados en `ESTADOS_UI` / `EstadoPresupuesto`:

| Estado | Cuándo |
|---|---|
| `BORRADOR` | Todavía no se compartió |
| `ENVIADA` | Se emitió el link (WhatsApp, email, PDF o "Marcar como enviada") |
| `ABIERTA` | El pasajero entró al link al menos una vez |
| `VENCIDA` | Se cumplió la vigencia |
| `CONFIRMADA` | El pasajero confirmó una opción desde el link |

La vencida automática **no se persiste**: se calcula contra `expiraAt`, con la
misma regla en el cliente (`estadoEfectivo` en `data.js`) y en el servidor
(`estadoEfectivoDe` en `presupuesto.actions.ts`). Una `ABIERTA` también vence:
desde que existe el link público, "abierta" quiere decir que el pasajero entró,
no que el link siga sirviendo. `estadoManual` pisa todo cuando el vendedor fija
el estado a mano.

### 4.5 Semáforo del listado

`semaforo(fila)` en [data.js](../../../src/app/backend/cotizador/_mockup/data.js)
devuelve color, etiqueta y una explicación en castellano:

| Etiqueta | Condición |
|---|---|
| Borrador | Todavía no se envió |
| Confirmada | Confirmada |
| Abierta | El pasajero la abrió al menos una vez |
| Vencida | Estado vencido, con o sin aperturas |
| Link vencido | La vigencia se cumplió y nadie la abrió |
| En ventana | Enviada hace menos de 24 h hábiles, sin abrir |
| Sin abrir +24 h | Más de 24 h hábiles sin apertura (el fin de semana no cuenta) |

`bucketSemaforo()` reparte las filas en los chips del resumen: `roja` (vencida
sin abrir), `amarilla` (sin abrir hace 24 h hábiles o más), `verde` (abierta o
confirmada), `borrador`. Tiene que dar el mismo reparto que `resumenSemaforo()`
en el servidor; si se separan, el badge del shell dice un número y la pantalla
muestra otro.

### 4.6 Plantillas

`crearPlantilla` guarda el contenido de una cotización como punto de partida.
Sin `vendedorId` es global del equipo; con `vendedorId` es privada. `usarPlantilla`
incrementa `usos` y sella `ultimoUsoAt`. Un ADMIN puede crear y borrar
plantillas globales.

### 4.7 Borrado

`eliminarPresupuesto` hace borrado lógico (`deletedAt`), nunca físico. Las
cotizaciones no se borran en cascada al eliminar un usuario: la relación va con
`onDelete: Restrict` y la UI explica que hay que desactivar al vendedor.

---

## 5. Rutas, acciones y permisos

### 5.1 Páginas

| Ruta | Quién | Qué |
|---|---|---|
| `/backend/cotizador` | ADMIN, VENDEDOR | Editor y seguimiento |
| `/backend/cotizador/ajustes` | ADMIN | Mensaje, condiciones, vigencia, casilla de copia, factor |
| `/cotizador` | — | Redirect a `/backend/cotizador` |
| `/c/<token>` | Público | Ficha del pasajero. `?print=1` para la hoja de impresión |

### 5.2 Endpoints HTTP

| Método y ruta | Quién | Qué |
|---|---|---|
| `GET /api/cotizador/[id]/pdf` | ADMIN, VENDEDOR (mismo scope que las actions) | Descarga el PDF. `?inline=1` lo abre en la pestaña |
| `POST /api/cotizador/apertura` | Público | Beacon de lectura del pasajero (sección y segundos) |
| `POST /api/cotizador/leer-itinerario` | Sesión del panel | Lector de itinerarios con Gemini |
| `GET /api/cotizador/pdf/salud` | ADMIN | Chequeo post-deploy de Chromium |

La ruta del PDF responde 401 sin sesión, 403 a MARKETING, 404 a una cotización
ajena o borrada (lo mismo que a una inexistente), 429 con los dos slots
ocupados, 503 sin Chromium o con `COTIZADOR_PDF_OFF=1`, y 504 pasado el techo
de 45 s. Bajar el PDF no sella el envío: el estado y el reloj de la vigencia no
se tocan, aunque sí puede renovar el vencimiento de un link ya vencido, porque
sin link vivo no hay página que imprimir.

El beacon de apertura no cuenta la vista de impresión (`?print=1`) ni el render
del PDF (header `x-cotizador-pdf`). La primera llamada crea la fila y pasa la
cotización de `ENVIADA` a `ABIERTA`; las siguientes salen cada 15 s por
`navigator.sendBeacon` y actualizan sección y segundos.

### 5.3 Server actions

Todas devuelven `Resultado<T> = { ok: true, data } | { ok: false, error }`.
Ninguna lanza: el envoltorio `ejecutar()` traduce cualquier excepción. Los
mensajes de negocio se levantan con `fallar()` y llegan tal cual al vendedor; el
resto sale genérico y el detalle queda en los logs.

**[presupuesto.actions.ts](../../../src/actions/presupuesto.actions.ts)** (scope
por `scopeVendedor`, salvo donde se aclare):

| Action | Qué hace |
|---|---|
| `getContextoCotizador` | Yo, el equipo, los ajustes del máster, mis links |
| `listarPresupuestos` | Grilla de seguimiento (tope 500, default 200) |
| `resumenSemaforo` | Los contadores de los chips |
| `obtenerPresupuesto` | Detalle con bitácora (100 eventos) y aperturas (20) |
| `crearPresupuesto` | Alta idempotente por `claveEdicion`; asigna el número |
| `guardarPresupuesto` | Autosave con control de concurrencia por `updatedAt` |
| `duplicarPresupuesto` · `eliminarPresupuesto` | Copia y borrado lógico |
| `setEstadoManual` · `setNotasInternas` | Estado pisado a mano, bloc interno |
| `marcarEnviada` | Sella el envío sin mandar nada (WhatsApp, PDF a mano) |
| `emitirLink` · `obtenerLinkActivo` | Link público |
| `enviarPorEmail` | Email al pasajero con PDF adjunto |
| `reactivarPresupuesto` · `extenderVigencia` | Revive (revoca el link y pone las aperturas en cero) o corre el vencimiento |
| `registrarConfirmacion` | Confirmación cargada por el vendedor |
| `listarPlantillas` · `crearPlantilla` · `eliminarPlantilla` · `leerPlantilla` · `usarPlantilla` | Plantillas |
| `toggleFavorito` | Estrella de un hotel |
| `buscarEnHistorial` | Clientes de cotizaciones anteriores (8 resultados) |
| `datosDelPasajero` · `pedirDatosDelPasajero` | Puente con Pasajeros y pagos. Pedir por email exige ser el vendedor que firma |
| `cotizacionesPorReferencia` | Camino inverso, desde la bandeja de datos |

**[presupuesto-publico.actions.ts](../../../src/actions/presupuesto-publico.actions.ts)**
(sin sesión, entra por token):

| Action | Qué hace |
|---|---|
| `confirmarDesdeLink` | Confirma una opción. Registra fecha, IP y dispositivo, avisa al vendedor, comenta en Bitrix |
| `solicitarRevisionDesdeLink` | Pide cambios sin confirmar |

**[presupuesto-analytics.actions.ts](../../../src/actions/presupuesto-analytics.actions.ts)**:
`analyticsCotizador` con `requireAdmin()`.

**[alojamiento-rapido.actions.ts](../../../src/actions/alojamiento-rapido.actions.ts)**:
`crearAlojamientoRapido` da de alta un hotel del catálogo desde el editor.

### 5.4 Ajustes editables (`SiteSetting`, grupo `cotizador`)

Definidos en
[src/lib/site-settings-bootstrap.ts](../../../src/lib/site-settings-bootstrap.ts)
como `COTIZADOR_SETTINGS`, editables en `/backend/cotizador/ajustes`:

| Key | Default | Para qué |
|---|---|---|
| `cotizador_plantilla_mensaje` | Texto con `{nombre}` y `{link}` | Mensaje que acompaña toda cotización |
| `cotizador_condiciones` | Cuatro líneas con `{vigencia}` | Condiciones al pie |
| `cotizador_vigencia_default` | `96` | Vigencia del link, en horas hábiles |
| `cotizador_email_copia` | `cotizaciones@traveloz.com.uy` | Casilla que recibe copia |
| `cotizador_factor_default` | `0.88` | Factor de venta (venta = neto ÷ factor) |

### 5.5 Variables de entorno

| Variable | Efecto |
|---|---|
| `COTIZADOR_PDF_OFF=1` | Apaga el PDF. El email sale con el link, sin adjunto |
| `COTIZADOR_PDF_BASE_URL` | Fuerza la base del render (escotilla para volver a la URL pública) |
| `PUPPETEER_EXECUTABLE_PATH` | Fuerza la ruta de Chromium |
| `COTIZADOR_IA_OFF=1` | Apaga el lector de itinerarios |
| `GEMINI_MODELO` | Cambia el modelo (default `gemini-3.1-flash-lite`) |
| `GEMINI_API_KEY` | Clave del lector |

Todas opcionales salvo `GEMINI_API_KEY`, que sin ella el lector devuelve
`SIN_API_KEY`.

---

## 6. Riesgos y decisiones técnicas

**pgbouncer sin transacciones interactivas.** La base va por pgbouncer con
`connection_limit=1`. Un `$transaction` interactivo con un callback largo se
come la única conexión y bloquea al resto. Todas las actions escriben
operaciones sueltas y tolerantes, y la bitácora es best-effort: si el evento no
se graba, la cotización se guarda igual. Detalle en
[pgbouncer-setup.md](../../pgbouncer-setup.md).

**Cloudflare bloquea el Chromium headless.** Por eso el render entra por
loopback y no por el dominio público. Un headless sin cookies ni JS de
challenge es exactamente lo que el proxy retiene. Lo que se pierde es poco: los
assets de la hoja son relativos y resuelven contra el mismo Next. El middleware
no toca `/c/*` (su matcher es `/backend/:path*`) y el redirect por host solo
mira `app.traveloz.com.uy`, así que una request con `Host: 127.0.0.1:PORT`
llega derecho a la página.

**`requestAnimationFrame` no tickea en ese headless.** Sin GPU y sin ventana, el
rAF de la página no corre. El default de `waitForFunction` en puppeteer es
`requestAnimationFrame`, así que la condición se evaluaba una sola vez y después
esperaba un frame que nunca llegaba. La espera de imágenes usa reloj propio cada
100 ms. En el mismo paso, todas las `<img>` pasan a `loading="eager"`: el
navegador no baja lo que está fuera de la ventana y acá nadie scrollea.

**Los errores de server actions se devuelven como valor.** En producción Next
enmascara el mensaje de una excepción de server action y el usuario termina
viendo "Error" a secas (está escrito en
[datos-vendedor.actions.ts](../../../src/actions/datos-vendedor.actions.ts) y
en [datos-boveda.actions.ts](../../../src/actions/datos-boveda.actions.ts)). Por
eso ninguna action del cotizador tira: todas devuelven `{ ok: false, error }`,
con el texto ya escrito para el vendedor cuando es un error de negocio. Un
autosave que explota no puede tumbar la pantalla.

**El JSON puede crecer más que el límite de server actions.** El autosave manda
la cotización entera en cada guardado. `bodySizeLimit` está en 2 MB y las
imágenes ya no viajan adentro: van a `/api/upload` y queda la URL.

**Chromium suma unos 200 MB a la imagen.** Es el precio de no depender de un
servicio externo de PDF. Si algún día molesta, la salida es un microservicio
aparte, no sacar el paquete de `nixpacks.toml`.

**El semáforo está implementado dos veces**, en el cliente (`bucketSemaforo`) y
en el servidor (`resumenSemaforo`). Está anotado en el código: si se separan,
el badge del shell y la pantalla muestran números distintos.
