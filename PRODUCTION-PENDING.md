# Pendientes para producción — Traveloz

Documento vivo. Lista todo lo que falta cerrar antes (o poco después) del
go-live. Lo que ya quedó implementado se mueve al final, en "Hecho recientemente".

Última actualización: **2026-05-27**.

---

## 🟢 Acción inmediata del owner (un solo comando + seteo de envs)

### 1. Cargar las nuevas keys del CMS en la DB de producción

Acabamos de agregar al CMS los grupos **SEO** y **Robots**. El seed es
idempotente (`update: {}`), o sea **NO pisa lo que ya existe**, solo agrega
las keys nuevas.

```bash
# desde tu máquina, con las envs apuntando a la DB de producción:
npx tsx prisma/seed-public.ts
```

Después de esto vas a poder editar todo desde `/backend/web/seo` y
`/backend/web/robots`. Sin esto, las páginas funcionan igual pero con los
valores hardcoded en `seo.ts`.

### 2. Setear envs faltantes en Railway

Lista mínima para que el go-live no rompa nada:

```env
# Auth (obligatorio rotar el que está hoy)
NEXTAUTH_SECRET=         # generar nuevo: openssl rand -base64 32
NEXTAUTH_URL=https://traveloz.com.uy
APP_URL=https://traveloz.com.uy

# Owner admin (override del default hardcoded "Wired538")
PROTECTED_ADMIN_PASSWORD=

# Email — vamos a poder enviar notificaciones de leads cuando esté
RESEND_API_KEY=             # cuenta nueva en resend.com (free 100/día)
EMAIL_FROM="TravelOz <no-reply@traveloz.com.uy>"
LEADS_NOTIFY_TO=ventas@traveloz.com.uy

# Storage S3 (Tigris / Railway) — verificar que estén
STORAGE_ENDPOINT=
STORAGE_REGION=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
```

### 3. Rotar secretos que se usaron en dev (apuntan a prod)

- `NEXTAUTH_SECRET` — generar nuevo, descartar el actual
- Password del usuario Postgres de Railway
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — generar par nuevo

---

## 🔴 Bloqueante real — pendiente del cliente, no nuestro

### Acceso al dominio + cuenta Resend para notificaciones

**Por qué importa:** la infraestructura de envío de emails ya está hecha
(`src/lib/email.ts`, Resend-ready, modo "console" cuando falta la API key).
**Sin acceso al dominio**, no podemos:

- Configurar el registro DNS de Resend (`MX`, `TXT`, `DKIM`, `SPF`) en
  `traveloz.com.uy` que es lo que valida que somos quienes decimos ser.
- Crear el sender `no-reply@traveloz.com.uy` ni el `ventas@traveloz.com.uy`
  que recibe los leads.
- Probar que el deliverability no caiga en spam.

**Hasta que tengamos el dominio:** los 5 formularios públicos (newsletter,
cotizar, contacto, work-with-us, corporativo) y la sección
`/backend/notificaciones` siguen **guardando todo en DB pero no avisan a
nadie por email**. El admin sigue viendo los leads en `/backend/leads/*`,
pero nadie recibe un ping en su inbox.

**Qué necesitamos del cliente:**
- Acceso al panel del registrador del dominio (Antel, Datalogic, GoDaddy,
  donde sea que esté `traveloz.com.uy`) para agregar registros DNS, o que el
  cliente nos los agregue copiando los valores que le pasemos.
- Decisión sobre el `from`: `no-reply@traveloz.com.uy` o algo más cálido tipo
  `hola@traveloz.com.uy`.
- Decisión sobre el destinatario interno: a qué cuenta(s) llegan los leads
  nuevos. Recomiendo un alias tipo `ventas@traveloz.com.uy` que reenvíe a
  Geronimo + a quien él decida (puede manejarse desde el registrador).

**Estimación post-acceso:** ~3-4 hs implementar el wiring de las 6 notificaciones
(5 forms + admin notifications) + 1 hs de pruebas reales con Resend.

---

## 🟠 Seguridad (Sprint pre-launch)

Acumulado del audit del 26-may. Ordenado por riesgo.

| # | Issue | Evidencia | Estado |
|---|---|---|---|
| S1 | **Sin `headers()` en `next.config.mjs`** — falta CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. | `next.config.mjs` | Pendiente |
| S2 | **SSRF en `/api/upload/by-url`** — `fetch(userUrl)` sin blocklist; permite golpear `169.254.169.254/...` o `*.railway.internal`. | `src/app/api/upload/by-url/route.ts:55` | Pendiente |
| S3 | **CV de postulantes accesible sin auth** — `cvUrl` apunta a `/api/image/leads/cv/...` que es ruta pública. Cualquiera con el link descarga el PDF. | `src/lib/storage.ts:103`, `src/app/api/image/[...path]/route.ts` | Pendiente |
| S4 | **Upload de CV sin sniff de magic bytes** — confía en el `cv.type` declarado por el cliente. Se puede subir `.exe` con MIME `application/pdf`. | `src/actions/public-forms.actions.ts:115-130` | Pendiente |
| S5 | **`/api/image/[...path]` devuelve `err.message` literal en 500** → leak de paths/keys S3. | `src/app/api/image/[...path]/route.ts:36` | Pendiente |
| S6 | **`error.tsx` muestra `error.message` literal al usuario** — potencial leak de PII / SQL fragments. | `src/app/error.tsx:26`, `src/app/backend/error.tsx:32` | Pendiente |
| S7 | **No existe `app/global-error.tsx`** — pantalla en blanco si `RootLayout` crashea. | `src/app/` | Pendiente |
| S8 | **`contacto_mapa_embed` se rendea con `dangerouslySetInnerHTML` sin sanitizar** — solo admin lo edita pero defensa en profundidad: sanitizar a `<iframe>` whitelist. | `src/app/(public)/contact/page.tsx:131-140` | Pendiente |

---

## 🟡 Anti-spam (recomendado pre-launch)

Estrategia confirmada con el owner el 27-may:

1. **Honeypot field** — input invisible `name="website" hidden tabindex="-1"`
   en los 5 forms. Rechazo silencioso si viene con valor. Bloquea 80-90% de
   bots dumb sin fricción para humanos. **Costo: ~30 min de implementación.**
2. **Rate-limit por IP** — reusar el patrón de `src/lib/rate-limit.ts`
   (process-local Map, validado para login). Límite tipo 5 envíos/hora/IP.
   Tira HTTP 429 con mensaje amigable. **Costo: ~1 hs.**
3. **Cloudflare Turnstile** (fallback si 1+2 no alcanzan) — invisible, gratis,
   GDPR-friendly. Una línea de script + verify server-side. **Costo: ~2 hs +
   crear cuenta gratuita en Cloudflare.**

**No recomendado:** reCAPTCHA v2/v3 (fricción y privacidad), Akismet (overkill).

### Pendientes de validación en los forms públicos

Adicionalmente, agregar validación zod server-side al tope de cada server
action en `src/actions/public-forms.actions.ts`:
- email con formato válido
- `comentarios` con largo máximo razonable (~5000 chars)
- `paisCodigo` whitelisted
- `preferencia` whitelisted (cotizar ya lo hace)

---

## 🐛 Bugs funcionales conocidos

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| F1 | **`telefonoCodigo` se descarta en form sticky de detalle** — el select del prefijo país nunca llega a DB → lead pierde +598. | `src/app/(public)/destinos/[region]/[slug]/_components/QuoteSidebar.tsx:121` vs `src/actions/public-forms.actions.ts:247` | Renombrar select a `name="paisCodigo"` o aceptar ambos en el action. |
| F2 | **`/cotizar` standalone ignora el campo `destino`** — el campo principal del form no se persiste. | `src/app/(public)/cotizar/_components/CotizarForm.tsx:24`, `submitQuoteForm` no lo lee | Agregar `destino: s(formData,"destino")` al `comentarios` (concatenar) o columna `destinoTexto` en `Cotizacion`. |
| F3 | **`paqueteId` no se valida antes del INSERT** — si llega un ID inválido, Prisma tira P2003 y el lead se pierde. | `src/actions/public-forms.actions.ts:243` | Validar contra `prisma.paquete.findUnique` antes; si no existe, `paqueteId = null`. |
| F4 | **Newsletter sin double opt-in** — cualquiera suscribe email ajeno. Riesgo de spam complaints cuando enchufemos campaigns. | `src/actions/public-forms.actions.ts:199` | Crear con `active:false` + token + email "confirmá tu suscripción". |

---

## 🔐 Permisos / RBAC

| # | Issue | Evidencia | Estado |
|---|---|---|---|
| R1 | **RBAC server-side ausente en mutaciones de catálogo/paquetes/servicios/leads/notif**. VENDEDOR y MARKETING tienen `canEdit:false` en la UI, pero las server actions usan solo `requireAuth()` → pueden mutar todo vía DevTools. | `src/lib/require-auth.ts:25`; afecta ~150 call sites en `package`/`service`/`catalog`/`catalogo-servicios`/`categorias-destacadas`/`site-settings`/`testimonios`/`cms-content`/`leads`/`notificacion`/`package-lifecycle` `.actions.ts` | Pendiente |
| R2 | **Audit log se escribe pero no se puede leer** — 40+ `prisma.auditLog.create` en código, 0 `findMany`. El cliente pagó esta feature en el commit `7fcb841` y no tiene cómo verla. | `grep prisma.auditLog.findMany src` → vacío | Pendiente |
| R3 | **Dashboard de MARKETING usa la vista de VENDEDOR** — visualmente confuso para ese rol. | `src/app/backend/dashboard/page.tsx:33` | Pendiente |

---

## 📊 Reportes — comerciales todavía cosméticos

`/backend/reportes` calcula KPIs comerciales a partir del catálogo de paquetes,
no de transacciones reales. `salesCount = revenue > 0 ? 1 : 0`. El funnel
siempre muestra "—". **El cliente puede creer que ve datos reales.**

**Quick fix (pre-launch):** banner amarillo MUY explícito arriba del módulo +
deshabilitar export hasta que haya datos reales.

**Fix completo (post-launch, varios sprints):** modelar `Venta` / `Reserva` /
`PagoCliente` y reescribir el módulo de reportes alimentándose de ahí.

| Sub-item | Evidencia |
|---|---|
| `salesCount` proxy desde `paquete.precioVenta` | `src/app/backend/reportes/page.tsx:541` |
| Funnel hardcoded en "—" | `src/app/backend/reportes/page.tsx:1023,1036-1054` |
| Sección "Próximamente: insights de marketing" expuesta al cliente | `src/app/backend/dashboard/_components/AdminDashboard.tsx:644-660` |
| `/backend/reportes` no está en el sidebar (solo deep-link) | `src/components/layout/Sidebar.tsx:100-139` vs `src/lib/auth.ts:46,59` |
| Dashboard ADMIN sin widget de leads nuevos | `src/app/backend/dashboard/_components/AdminDashboard.tsx` |

---

## 🛠 Infra / deploy / observabilidad

| # | Issue | Estado |
|---|---|---|
| I1 | **No hay `.env.example`** documentando las ~20 envs. | Pendiente |
| I2 | **No hay `Dockerfile` ni `railway.json` ni `engines.node` en package.json** — deploy depende de Nixpacks heurístico. Un cambio de versión Node lo rompe sin warning. | Pendiente |
| I3 | **Sin Sentry / Logtail / Better Stack** — errores van a stdout de Railway sin alerting ni grouping. | **POST-LAUNCH** (decisión del owner) — engancharlo cuando estemos en prod. |
| I4 | **22 `console.*` en `src/` que deberían usar `src/lib/logger.ts`** — no quedan estructurados en agregadores. | Pendiente (menor) |
| I5 | **`next lint` no corre** porque la config es interactiva — falta `.eslintrc.json` con `extends: next/core-web-vitals`. | Pendiente (menor) |

---

## 📈 Datos / Prisma

| # | Issue | Estado |
|---|---|---|
| D1 | **Faltan índices por `email` y `createdAt DESC`** en `Cotizacion`, `MensajeContacto`, `ContactoCorporativo`, `Postulacion`. El inbox de leads filtra/busca por estos → fullscan a medida que crezca. | Pendiente — agregar `@@index([email])` + `@@index([createdAt(sort: Desc)])` y `prisma migrate dev`. |
| D2 | **Seeds dañinos sin guard de `NODE_ENV`** — `prisma/seed-fase9.ts`, `seed-from-json.ts`, `scripts/backfill-*.ts` pueden correr en prod si alguien se confunde. | Pendiente — `if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) throw …` al tope. |

---

## ♿ Cookies / legal / accesibilidad (post-launch)

| # | Issue | Estado |
|---|---|---|
| L1 | Sin cookie banner (Ley 18.331 UY + GDPR sugieren aviso). | Post-launch |
| L2 | Footer no linkea Política de Privacidad separada (solo `/terms`). | Post-launch |
| L3 | 20 `alt=""` en imágenes — algunas no decorativas (foto de testimonio). | Post-launch |
| L4 | 22 `<img>` raw vs 4 `next/image` — pierde optimización. | Post-launch |
| L5 | Placeholder `general_whatsapp = wa.me/59899000000` y `footer_agencia_texto = "registrada Nº 1234"` — el cliente los completa vía CMS. | El cliente los completa cuando pueda |

---

## ✅ Hecho recientemente (referencia)

Lista de lo que ya cerramos en los últimos dos sprints.

### Sprint UX/CMS (mejoras de edición del frontend desde el admin)

- **Live preview lado a lado** en todo `/backend/web/*` con toolbar
  desktop/mobile, refresh manual, dev keys toggle, abrir en pestaña.
  ([WebEditShell.tsx](src/app/backend/web/_components/WebEditShell.tsx))
- **Autosave debounce 1.5s** + status pill (5 estados) + **diff panel** con
  "Antes/Después" y "Descartar". Mismo patrón en `SettingsForm` y
  `CorporativoForm`. ([SettingsForm.tsx](src/app/backend/web/_components/SettingsForm.tsx))
- **Validación zod-light** por key (URL, email, ruta interna o externa) que
  bloquea el autosave y muestra error inline.
  ([key-validators.ts](src/app/backend/web/_components/key-validators.ts))
- **Dev keys toggle global** (persistido en localStorage) que muestra/oculta
  las SiteSetting keys al lado de cada label.
- **Hints de imagen** por key en `MediaPicker` (label arriba + warnings amber
  si el archivo no cumple dimensiones/peso). 20+ keys catalogadas.
  ([media-hints.ts](src/app/backend/web/_components/media-hints.ts))

### Sprint SEO (27-may)

- **`/sitemap.xml` autogenerado** desde DB en cada request (regiones +
  paquetes publicados + 9 rutas estáticas). 17 URLs servidas hoy.
  ([sitemap.ts](src/app/sitemap.ts))
- **`/robots.txt` editable desde CMS** — modo `open` / `maintenance` /
  `custom`, con extra-disallow opcional. ([robots.ts](src/app/robots.ts),
  [/backend/web/robots](src/app/backend/web/robots/page.tsx))
- **Meta tags por ruta editables desde CMS** — nuevo grupo `seo` con
  ~22 keys (defaults + override por ruta) + helper `buildSeoMetadata`.
  ([seo.ts](src/lib/seo.ts), [/backend/web/seo](src/app/backend/web/seo/page.tsx))
- **`generateMetadata` en 11 rutas públicas** (home, destinos, about, contact,
  corporativo, cotizar, faq, terms, work-with-us, destinos/[region],
  destinos/[region]/[slug]) — todas con `metadataBase`, OG y Twitter card.
- **Sidebar admin** ganó un grupo "SEO" con dos items (Meta tags + Robots).

### Sprint QA visual (24-26 may) — fixes ya aplicados

Detalles en `QA-REPORT.md`. Resumen:
- FAQ icons 404 (`/site/img/site/img/...` duplicado) → arreglado
- PackageCard text overlap (heredaba `image-box.style1` absolute title) → reescrito
- Mobile slider de categorías (fixed 3 cols) → responsive con `slidesToShowMobile`
- "Enviar" buttons low-contrast en `/cotizar` y `/work-with-us` → solid red
- `/work-with-us` dual file picker → arreglado con wrapper `.work-with-us`
- CatalogoServicio sin revalidate de `paquetes` tag → arreglado
- `home_categorias_title` orphan → wired al frontend
- Corporativo card icons no editables → expuestos en CMS

---

## Plan sugerido

**Esta semana (con dominio + envs del cliente):**
1. Cliente nos da acceso al dominio / agrega DNS de Resend
2. Wiring de notificaciones de leads (~4 hs)
3. Anti-spam: honeypot + rate-limit (~1.5 hs)
4. Validación zod en los 5 forms públicos (~1.5 hs)
5. Headers de seguridad + global-error + sanear `error.message` (~1.5 hs)
6. `.env.example` + `railway.json` + `engines.node` (~30 min)
7. Correr seed para activar las nuevas keys SEO/Robots (~1 min)

**Semana 2 (post first deploy):**
8. RBAC server-side (`requireCanEdit`) — ~6 hs
9. Audit log UI — ~3 hs
10. Bugs F1-F4 — ~3 hs
11. Índices Prisma D1 + migration — ~30 min
12. Banner explícito en `/backend/reportes` + sacarlo del sidebar marketing — ~1 hs

**Mes 1 post-launch:**
13. Sentry
14. Cookie banner + política de privacidad
15. Migración progresiva a `next/image`
16. Reportes transaccionales reales (depende de cuándo se modele Venta/Reserva)
