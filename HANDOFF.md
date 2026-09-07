# Handoff — Traveloz

Documento para que una sesión nueva arranque sin contexto previo y pueda
trabajar sola. Leé también `CLAUDE.md` (reglas del repo, sobre todo el
aislamiento de Destinico) y el índice de memoria del proyecto.

Última actualización: 2026-09-02.

---

## Goal

Resolver feedback del cliente (TravelOz) sobre el panel de administración, el
sitio público y el cotizador. Llega por WhatsApp, casi siempre con capturas.
Diego actúa como director: relaya el pedido, revisa y decide. El trabajo típico
es: diagnosticar la causa real, arreglar, verificar contra producción, commit y
push, y devolverle a Diego un texto listo para reenviar al cliente.

---

## Cómo se opera la plataforma

### Deploy

Railway con auto-deploy: **todo push a `main` deploya**. No hay staging.

`scripts/railway-start.sh` corre en cada arranque, en este orden:

1. `npx prisma migrate deploy` — las migraciones se aplican solas
2. `node scripts/ensure-protected-admin.mjs`
3. `next start`

Consecuencia importante: si una migración falla, **el contenedor no arranca**.
Antes de agregar una migración de enum verificá la versión de Postgres
(hoy 18.6, así que `ALTER TYPE ... ADD VALUE` dentro de transacción funciona).

### Consultar Railway por API

La API GraphQL es `https://backboard.railway.com/graphql/v2` y acepta el token
del proyecto **solo** con el header `Project-Access-Token`. Con
`Authorization: Bearer` responde `Not Authorized`, que engaña porque parece
token vencido.

- projectId: `9fa78d1c-f251-4bfc-9dc8-511d75f22276`
- environmentId: `64ea1ef4-2ea3-41e4-bba3-705bbed2c2b7`

El token lo pasa Diego al empezar la sesión. **No lo escribas en ningún archivo
del repo.**

Último deploy y contra qué commit corrió:

```bash
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Project-Access-Token: $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query { deployments(first: 1, input: { projectId: \"9fa78d1c-f251-4bfc-9dc8-511d75f22276\", environmentId: \"64ea1ef4-2ea3-41e4-bba3-705bbed2c2b7\" }) { edges { node { status meta } } } }"}'
```

`meta` trae `commitHash` y `commitMessage`, así que sirve para confirmar que lo
que se pusheó es lo que está arriba. Estados: `BUILDING` → `SUCCESS` / `FAILED`
/ `CRASHED`.

Para esperar sin quemar turnos, un `until` en background:

```bash
until curl -s ... | grep -qE '"status":"(SUCCESS|FAILED|CRASHED)"'; do sleep 15; done
```

### Git

- Repo: `github.com/diego-castano/traveloz`, rama `main`.
- **Diego trabaja en paralelo en otras sesiones.** Hacé `git pull --rebase
  origin main` antes de empezar y otra vez antes de pushear.
- Ya pasó dos veces que la otra sesión **reescribiera la historia** y mis SHAs
  desaparecieran del log. Si eso pasa, no entres en pánico: verificá que el
  contenido sobrevivió con `git diff <mi-sha> HEAD -- <archivos que tocaste>`.
  Si sale vacío, no se perdió nada.
- Commits en español, estilo conventional (`fix(cotizador): ...`). El cuerpo
  explica **la causa real**, no lo que se tocó. Miralos con `git log` para
  agarrar el tono.

### Base de datos

`.env.local` **apunta a producción**. No hay base local. O sea:

- Cualquier script de Prisma que corras lee y escribe datos reales.
- **Prohibido** todo lo destructivo. Nada de `deleteMany`, `migrate reset`,
  `db push --force-reset`.
- Para leer, escribí scripts `.mts` en `scripts/` (top-level await necesita
  `.mts`) y corrélos con:
  ```bash
  set -a && source .env.local && set +a && npx tsx scripts/_diag-loquesea.mts
  ```
  Prefijalos con `_diag-` y **borralos antes de commitear**.
- Ojo con la interop CJS al importar código del repo desde un script:
  ```ts
  const M: any = await import("../src/lib/format-paquete");
  const { buildCardBullets } = M.default ?? M;
  ```
- El clasificador de permisos **bloquea escrituras a la DB de producción**, y
  está bien que lo haga. Si una necesita hacerse, pedísela a Diego indicando la
  pantalla exacta del admin donde se cambia.

Datos de escala útiles (2026-09): 115 paquetes publicados, 1286 alojamientos,
275 ciudades (163 de `brand-1`), 76 aéreos, 28 proveedores. El `brandId` de
Traveloz es `brand-1` (`brand-2` es la otra marca en la misma base: no la toques).

**Geografía, nunca por nombre sin marca:** `Region` y `Pais` tienen `brandId`;
`Ciudad` no, se resuelve por `Pais.brandId`. Hay dos filas "Europa"/"Sudamérica"
(una por marca) y países repetidos entre marcas (p.ej. "Estados Unidos"):
cualquier script que arme un `Map` por nombre sin filtrar `brandId` primero se
queda con la fila de la marca equivocada y cuelga geografía nueva del árbol
ajeno — eso fue lo que dejó a Países Bajos y Reino Unido (brand-1) colgando de
la Europa de brand-2. Toda lectura de Region, Pais o Ciudad desde un script
filtra por `brandId = 'brand-1'` antes de indexar por nombre (incluida la de
Region para resolver el `regionId` de un país nuevo), y compara nombres con
`ciudadKey` de `src/lib/ciudad-nombre.ts` (accent/case-insensitive), no con el
string crudo. Ningún script de geografía recorre los `brandIds` descubiertos en
la base sin filtrarlos antes a `['brand-1']`; `prisma/seed-catalogs-and-link.ts`
en particular es multi-marca por diseño pero solo debe *escribir* en la propia.

**Registro 07/09 (geografía):** en producción se fusionaron las dos "Holbox" de
México (sobrevive `cmrdyrtw50016qx4wwal5sxbe`; el Traslado 251 se reapuntó y se
borró `cmrdzgcdk001gqx4wmsamfayq`) y Países Bajos / Reino Unido pasaron de
region-8 (Europa de brand-2) a region-1. Los SQL, con sus asserts y el modo
`-v ensayo=1` (ROLLBACK), están en `scripts/fixes/2026-09-07-*.sql`. La foto
previa está en `~/backups/traveloz/2026-09-07-geo`: CSV completo de las 8
tablas (Region, Pais, Ciudad, Alojamiento, Traslado, PaqueteDestino,
OpcionHotel, Paquete), `*.sql` de pg_dump 18 con `ON CONFLICT DO NOTHING`,
`rows.*.tsv` con md5 por fila y `fingerprints*.txt` con huellas por marca.
Restaurar: cargar el CSV en una TEMP (`CREATE TEMP TABLE f (LIKE "Ciudad");
\copy f FROM 'Ciudad.csv' CSV HEADER`) e insertar o actualizar por id literal
desde ahí, en orden de FK (Region, Pais, Ciudad, Alojamiento, Traslado,
PaqueteDestino, OpcionHotel). Nunca `\copy` directo sobre la tabla viva, nunca
TRUNCATE ni DELETE previo. Una restauración por SQL no bustea el caché del
panel (5 min) ni el del sitio (60 s).

Después del re-anclaje, Catálogos > Europa muestra "Reino Unido / LONDRES"
(`cmod6f63a0007y38ioxx5kfpy`, 13 hoteles) junto a "Inglaterra / Londres"
(`cmtbw6fyl001kp84wi5928oej`) y "Escoacia": países distintos con una ciudad
homónima. El índice único de Ciudad va por (paisId, nombre) y no las frena. No
se fusionan por nombre; unificar Reino Unido / Inglaterra / Escocia es decisión
del cliente.

La otra marca (brand-2) tiene "Estados Unidos" dos veces (`pais-11` y
`cmo0cbhq9006ky35ivp399o9g`, region-9). No se toca desde este repo; por eso los
índices únicos de Region y Pais (migración `20260907200100_geo_unique_indexes`)
son parciales a brand-1, y el de Ciudad es global porque la marca va implícita
en paisId. `geo_key()` (migración `20260907200000_geo_key`) es el espejo SQL de
`ciudadKey`, verificado sobre los 360 nombres. Prisma no modela índices por
expresión: `prisma migrate diff` los muestra como drift esperado y `migrate
dev` querría borrarlos.

Invariante para correr antes y después de tocar geografía (solo lectura, por
`DIRECT_URL`): `~/backups/traveloz/2026-09-07-geo/huellas.sql` (huellas por
marca) y `baseline.sql` (conteos, cruces de marca, duplicados por clave).
Esperado al 07/09: brand-2 Region 7 / Pais 30 / Ciudad 112 con los hashes de
`fingerprints-post.txt`; cruces País/Región 0; duplicados de Ciudad por
(paisId, geo_key) 0; ningún país brand-1 fuera de una región brand-1.

### Correr y verificar local

```bash
set -a && source .env.local && set +a && npx next dev -p 3002
```

Puerto **3002**: el 3001 lo ocupa otro proyecto de Diego.

Build de producción antes de pushear, siempre:

```bash
set -a && source .env.local && set +a && npx next build
```

Más `npx tsc --noEmit` y `npx next lint --file <archivos>`. Si lint tira
warnings, verificá que sean preexistentes (`git stash`, lint, `git stash pop`)
antes de darles bola.

**No corras `prettier`**: el repo no tiene config y reformatea todo lo que toca.
Una vez metió 1044 líneas de ruido y hubo que revertir a mano.

### Verificación en navegador

Playwright MCP. Login en el backend: botón "PIN rápido", el PIN lo pasa Diego.
Se puede hacer todo desde un `browser_evaluate`:

```js
document.querySelectorAll('button').forEach(b => { if (b.textContent.includes('PIN rápido')) b.click(); });
// esperar, setear el input con el native setter, disparar 'input', clickear "Ingresar con PIN"
```

Para inputs de React hay que usar el setter nativo, si no el estado no se entera:

```js
const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
setter.call(input, 'texto');
input.dispatchEvent(new Event('input', { bubbles: true }));
```

Cuidado con **tocar formularios del admin**: tienen autosave y escriben en
producción. Ya pasó una vez que un dato de prueba quedó guardado en un paquete
real. Mirá y no toques, salvo que el cambio sea el objetivo.

Cuando Playwright está caído (pasa), se compensa con `curl` sobre las páginas
públicas y probando la lógica pura con `node -e`.

---

## Current Progress

Todo lo de abajo está **en producción y verificado**. Del más nuevo al más viejo:

| Commit | Qué resolvió |
| --- | --- |
| `cb539ae` | El alta de hotel del cotizador se quedaba sin ciudades |
| `d1b4024` | Los seis buscadores del cotizador ignoraban tildes |
| `e25372f` | La plantilla original salió de `public/` a `docs/`; robots ordenado |
| `7a4ab5d` | `noindex` en mockups y presentación |
| `b176747` | Régimen por opción y cabina/equipaje en cotización de solo vuelo |
| `71f82eb` | El traslado muestra su proveedor en el módulo de vendedores |
| `cbe42dc` | Proveedores: categorías Paseos, Autos y Otros (+ migración de enum) |
| `1131069` | El bullet del vuelo dice "Vuelos"; Salidas sin año |
| `ed47319` | Buscar hoteles funciona apenas abre el listado |
| `e57300a` | Las tarifas cargadas dejaban de desaparecer del panel |

### El patrón que apareció tres veces

Vale la pena tenerlo presente porque es el bug de fondo más recurrente del
proyecto. Los providers cargan en **olas**: primero las entidades base, después
las sub-entidades pesadas. En tres lugares distintos la acción que guardaba la
primera ola **vaciaba** lo que ya había en memoria de la segunda:

- `ServiceProvider` → los precios desaparecían (`e57300a`)
- `ServiceProvider` → los alojamientos se recortaban a 10 (`ed47319`)
- `CatalogProvider` → países y ciudades quedaban vacíos (`cb539ae`)

Síntoma típico del cliente: *"no encuentro algo que sé que está cargado"*, casi
siempre a los pocos segundos de entrar o de volver a la pestaña (hay un refresh
por foco de ventana que dispara todo de nuevo).

Si aparece un cuarto síntoma así, **empezá por ahí**: buscá un `SET_*` en el
reducer del provider correspondiente que pise datos que llegan en otra ola.
También revisá el `catch`: en dos de los tres casos, si la segunda ola fallaba
los datos quedaban vacíos de forma permanente hasta recargar.

---

## What Worked

- **Auditar el catálogo entero antes y después de un cambio.** Para los bullets
  de las tarjetas escribí un script que corría `buildCardBullets` sobre los 115
  paquetes publicados, guardé la salida, hice el cambio y diffeé. Reveló que
  dos mapeos que parecían obvios (el ícono de bus y el de crucero) metían ruido:
  "Ferrys" se convertía en "Crucero" y "Traslados" en "Bus". Sin el diff los
  hubiera shippeado.
- **Instrumentar con `console.log` temporal y leer la consola de Playwright.**
  Es lo que probó los tres bugs de olas, con timestamps reales. Se saca después.
- **Medir contra la base antes de teorizar.** "La ola de hoteles tarda 3,4 s" y
  "el chunk inicial son 10" convirtieron una queja difusa en un bug concreto.
- **Verificar el diagnóstico antes de tocar código.** Dos pedidos resultaron ya
  estar resueltos (las noches en la ficha, y los íconos de la tabla de tarifas
  que había arreglado la otra sesión). Reportarlo con la prueba vale más que
  un cambio innecesario.
- **Separar en commits por área**, con el cuerpo explicando la causa. Diego los
  usa para el changelog y para contarle al cliente.

## What Didn't Work

- **Correr `prettier`.** Ver arriba. No.
- **Tocar formularios del admin en producción para "probar".** Autosave escribe.
- **Suponer que `Disallow` en robots.txt saca algo de Google.** Es al revés:
  impide rastrear, entonces Google nunca ve el `noindex` y la URL se queda en el
  índice con un título inventado. Para sacar algo va `noindex` con rastreo
  **permitido**, o un 404.
- **Confiar en que un fix del generador automático se ve en la web.** Los 115
  paquetes tienen `cardBullets` personalizados guardados, y lo personalizado le
  gana al automático. El fix solo se nota cuando el operador aprieta "Volver a
  automáticos".
- **Escribir en la DB de producción desde un script.** El clasificador lo
  bloquea. No lo intentes por otro camino: pedíselo a Diego.
- **`git rebase` con el árbol sucio.** Diego suele tener archivos sin commitear
  de sus propias sesiones. Verificá `git status` y, si `HEAD^ == origin/main`,
  pushá sin rebasear en vez de forzar.

---

## Next Steps

Pendientes reales, esperando decisión de Diego (los dos se los pasé y no los
respondió todavía):

1. **Tres paquetes muestran la ruta en vez de "Vuelos".** Son 235 (Cancún All
   Inclusive), 236 (Puerto Plata) y 371 (Riviera Maya). Tienen "Montevideo
   Cancun" guardado como renglón personalizado, y lo personalizado le gana al
   automático que ya está arreglado. Se resuelve con un clic en "Volver a
   automáticos" en cada uno. No los toqué porque es contenido curado por el
   cliente.

2. **Google todavía muestra los sitelinks viejos** ("Logo", "Nosotros
   Cotización Paquetes"). Las páginas ya dan 404 y robots quedó limpio, pero
   Google tarda días en recrawlear. Si quieren acelerarlo, la herramienta de
   retiro de URLs de Search Console las saca en horas. Requiere que entren
   ellos a Search Console.

Cosas menores anotadas, sin pedido formal:

3. **"Mendoza en Bus | Turismo"** no muestra las noches en la ficha pública
   porque tiene `noches = 0` y ningún destino con noches. Es dato faltante, no
   código: se lo cargan y aparece.
4. **Microsoft Clarity.** Amparo preguntó si pueden ver comportamiento en la
   web. Hoy el sitio mide con GA4 + Meta Pixel + Metricool vía GTM
   (`GTM-NLVNKHRK`). Clarity se instala desde el mismo GTM, pero necesita una
   línea en la CSP de `next.config.mjs` (`script-src` no incluye
   `clarity.ms`). Falta que creen el proyecto y pasen el ID.
5. **Ciudad libre en el cotizador.** El campo de destino acepta texto libre,
   así que un vendedor puede escribir una ciudad que no está en el catálogo, y
   entonces el alta rápida de hotel le va a pedir elegir una de la lista igual.
   Se arregla agregando la ciudad en Catálogos. Dejar que el cotizador cree
   ciudades es posible pero mete geografía sin país asociado: decisión de Diego.

---

## Dónde mirar según el tema

| Tema | Archivos |
| --- | --- |
| Bullets de tarjeta, noches, salidas | `src/lib/format-paquete.ts`, `src/lib/paquete-listing.ts` |
| Precio "desde" del sitio público | `src/lib/precio-desde.ts`, `src/lib/public-data.ts` |
| Ficha pública de paquete | `src/app/(public)/destinos/[region]/[slug]/` |
| Carga de servicios en el panel (olas) | `src/components/providers/ServiceProvider.tsx` |
| Catálogos y geografía (olas) | `src/components/providers/CatalogProvider.tsx` |
| Cotizador: editor | `src/app/backend/cotizador/_mockup/editor.jsx` |
| Cotizador: hoja del pasajero | `src/app/backend/cotizador/_mockup/telefono.jsx` |
| Cotizador: pantalla inicial y buscadores | `src/app/backend/cotizador/_mockup/inicio.jsx` |
| Cotizador: primitivas de UI, buscador de hotel | `src/app/backend/cotizador/_mockup/ui.jsx` |
| Cotizador: helpers compartidos (`norm`, formatos) | `src/app/backend/cotizador/_mockup/data.js` |
| Módulo de vendedores | `src/app/backend/dashboard/_components/VendedorDashboard.tsx` |
| Tablas de tarifas del admin | `src/components/ui/form/InlineEditTable.tsx` |
| SEO, CSP, headers | `next.config.mjs`, `src/app/robots.ts` |
| Plantilla original (referencia de diseño) | `docs/html_inicial/` — **no se sirve, es documentación** |

Helper de normalización de texto: hay uno canónico en `src/lib/search.ts`
(`matchesSearch`, `normalizeSearchValue`) para el panel y el sitio, y otro
propio del cotizador (`norm` en `_mockup/data.js`). Usá el que corresponda al
área que estés tocando, no mezcles.
