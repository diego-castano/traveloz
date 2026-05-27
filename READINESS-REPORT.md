# Audit pre-producción — Traveloz (2026-05-27)

Auditoría exhaustiva (3 sub-auditorías en paralelo + checks propios) de la app
Next.js 14 / Prisma / Postgres / Railway. Cubre **flujos públicos end-to-end**,
**completitud del admin** y **production readiness** (infra, seguridad, SEO,
observabilidad).

**Salud técnica baseline:**
- `npx tsc --noEmit` → 0 errores
- `next build` → exit 0
- `next lint` → no configurado (no corre en CI)
- 0 `TODO`/`FIXME`/`@ts-ignore` en `src/`
- 22 `console.*` en `src/` (varios deberían usar `logger`)

---

## 🔴 BLOCKERS — no se puede ir a producción sin esto

Ordenados por riesgo de incidente real, agrupados por dominio.

### Seguridad / secretos

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| B1 | **Rotar todos los secretos antes del go-live.** `.env.local` apunta al **Postgres de producción via proxy público** (comentario propio del archivo). Las credenciales que se usan en dev son las mismas de prod. | `.env.local`, `scripts/local-dev.sh` | Crear segundo proyecto Railway "staging"; mover prod a env vars del proyecto; rotar `NEXTAUTH_SECRET`, password Postgres, `AWS_ACCESS_KEY_ID/SECRET`. Borrar `DATABASE_PUBLIC_URL` del bundle local. |
| B2 | **Password default del admin protegido hardcodeado** `"Wired538"` si la env var no está seteada en Railway. | `scripts/ensure-protected-admin.mjs:33` | Setear `PROTECTED_ADMIN_PASSWORD` en envs de Railway y verificar antes del primer deploy. |
| B3 | **Sin `headers()` en `next.config.mjs`** → ausencia total de CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Clickjacking y MIME-sniffing abiertos. | `next.config.mjs` | Agregar `async headers()` con los 6 headers estándar. |
| B4 | **SSRF en `/api/upload/by-url`** — un admin (o XSS interno) puede pedir al server `fetch("http://169.254.169.254/...")` o cualquier host privado de Railway. | `src/app/api/upload/by-url/route.ts:55` | Resolver DNS, rechazar 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, `*.railway.internal`. |
| B5 | **CV de postulantes accesible sin auth** — `cvUrl` apunta a `/api/image/leads/cv/...` que es público. Cualquiera con el link baja el PDF. | `src/lib/storage.ts:103`, `src/app/api/image/[...path]/route.ts` | Agregar guard de sesión cuando `key.startsWith("leads/cv/")` o cambiar a presigned-GET on-demand. |
| B6 | **Sin allowlist MIME real en upload de CV** — usa `cv.type` declarado por cliente, sin sniff de magic bytes. Se puede subir `.exe` con MIME falsificado. | `src/actions/public-forms.actions.ts:115-130` | Pasar por `processAndUpload` (ya hace file-type + allowlist). |

### Funcionalidad incompleta visible al cliente

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| B7 | **Ningún lead público dispara notificación.** Los 5 forms (newsletter, cotizar, contacto, work-with-us, corporativo) guardan en DB pero no avisan a vendedores por email/Slack/dashboard. El comentario del propio archivo lo reconoce. La infra (`sendEmail` Resend-ready) existe. | `src/actions/public-forms.actions.ts:16,82,132,170,199,241` y `src/lib/email.ts` | Después de cada `prisma.X.create`, fire-and-forget `sendEmail({ to: process.env.LEADS_NOTIFY_TO, … }).catch(log)`. |
| B8 | **`/backend/notificaciones` "Notificar vendedores" no envía nada.** Solo inserta una fila en `Notificacion`. Subject/body se capturan en UI pero no se persisten. | `src/app/backend/notificaciones/page.tsx:247-269`, `src/actions/notificacion.actions.ts:13-32` | Resolver destinatarios (User con `role:'VENDEDOR'`), llamar `sendEmail` por cada uno, persistir `subject`/`body` (agregar columnas a `Notificacion`). |
| B9 | **RBAC server-side ausente en TODAS las mutaciones excepto `/users`.** VENDEDOR y MARKETING tienen `canEdit:false` en la UI, pero como las server actions usan solo `requireAuth()`, pueden invocar create/update/delete vía DevTools. | `src/lib/require-auth.ts:25`; afecta `package`/`service`/`catalog`/`catalogo-servicios`/`categorias-destacadas`/`site-settings`/`testimonios`/`cms-content`/`leads`/`notificacion`/`package-lifecycle` `.actions.ts` (~150 call sites) | Crear `requireCanEdit()` que rechace si `roleConfig[role].canEdit === false`; reemplazar `requireAuth()` por `requireCanEdit()` en todas las mutaciones. |
| B10 | **Audit log se escribe pero no se puede leer.** 40+ `prisma.auditLog.create` en código, 0 `findMany`. El cliente pagó esta feature en el commit `7fcb841` y no tiene cómo verla. | `grep prisma.auditLog.findMany src` → vacío | Crear `src/app/backend/perfiles/audit/page.tsx` con tabla paginada + filtros por user/action; agregar item al sidebar. |
| B11 | **Reportes son cosméticos, no transaccionales.** KPIs comerciales calculan `salesCount = revenue > 0 ? 1 : 0` desde `paquete.precioVenta`; funnel siempre muestra "—". El cliente puede creer que ve datos reales. | `src/app/backend/reportes/page.tsx:541,1023,1036-1054` | Banner amarillo *muy* explícito + deshabilitar export. Solución real: modelar `Venta`/`Reserva`. |

### Anti-spam / abuso / validación

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| B12 | **Sin rate-limit ni honeypot en los 5 forms públicos.** Un bot puede crear miles de cotizaciones/CVs en segundos, inflando el bucket S3 a costo del cliente. `rate-limit.ts` solo cubre login. | `src/actions/public-forms.actions.ts` (cero hits de `checkLoginRate`); `src/lib/rate-limit.ts:31` | Agregar campo oculto `name="website"` en cada `<form>` y rechazar si viene con valor; aplicar `checkPublicFormRate(ip)` (variante de `checkLoginRate`) al tope de cada action. |
| B13 | **Sin validación zod server-side.** Los 5 forms confían en `required` HTML + un helper `s(formData,...)`. Email sin validar, `comentarios` sin límite (`db.Text` ilimitado), `paisCodigo` libre. | `src/actions/public-forms.actions.ts:82,132,170,199,241` | `z.object({...}).safeParse(Object.fromEntries(formData))` al tope; tirar 400 con el primer error. |

---

## 🟠 MAJORS — graves pero no bloqueantes (arreglar antes del primer mes)

### Bugs funcionales encontrados

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| M1 | **Bug: `telefonoCodigo` se descarta en form sticky de detalle.** El select del prefijo país nunca llega a DB → lead pierde +598. | `src/app/(public)/destinos/[region]/[slug]/_components/QuoteSidebar.tsx:121` vs `src/actions/public-forms.actions.ts:247` | Renombrar `select` a `name="paisCodigo"` o aceptar ambos. |
| M2 | **Bug: `/cotizar` ignora el campo `destino` del form.** El campo principal del form standalone no se persiste. | `src/app/(public)/cotizar/_components/CotizarForm.tsx:24`, `submitQuoteForm` no lo lee | Agregar `destino: s(formData,"destino")` al `comentarios` (concatenar) o columna `destinoTexto` en `Cotizacion`. |
| M3 | **`paqueteId` no se valida antes del INSERT.** Si llega un ID inválido del cliente, Prisma tira P2003 y el lead **se pierde**. | `src/actions/public-forms.actions.ts:243` | `if (paqueteId && !(await prisma.paquete.findUnique({where:{id:paqueteId},select:{id:true}}))) paqueteId = null;` |
| M4 | **Newsletter sin double opt-in.** Cualquiera suscribe el email de un tercero → riesgo de spam complaints cuando se conecte Resend para campaigns. | `src/actions/public-forms.actions.ts:199` | Crear con `active:false` + token de confirmación + email "confirmá tu suscripción". |

### Datos / Prisma

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| M5 | **Faltan índices por `email` y `createdAt DESC`** en `Cotizacion`, `MensajeContacto`, `ContactoCorporativo`, `Postulacion`. El inbox `/backend/leads` filtra/busca por estos → fullscan a medida que crezca. | `prisma/schema.prisma:751-825` | `@@index([email])` + `@@index([createdAt(sort: Desc)])` en los 4 modelos. Migración + `migrate deploy`. |
| M6 | **Seeds dañinos sin guard de `NODE_ENV`.** `prisma/seed-fase9.ts`, `seed-from-json.ts`, `scripts/backfill-*.ts` pueden correr en prod si alguien se confunde. | varios | `if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) throw …` al tope de cada script. |

### Deploy / infra

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| M7 | **No hay `Dockerfile` ni `railway.json`.** Deploy depende de Nixpacks heurístico; un cambio de versión Node lo rompe sin warning. | repo root | Agregar `railway.json` + `"engines": { "node": "20.x" }` en `package.json`. |
| M8 | **No existe `.env.example`.** Onboarding de devs es por arqueología. ~16 envs en uso. | repo root | Crear `.env.example` con todas las keys documentadas + comentarios. Listado abajo. |

### SEO / metadata

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| M9 | **No hay `app/sitemap.ts` ni `app/robots.ts`.** Google no indexará destinos. | `src/app/` | Generar `sitemap.ts` desde `getPaquetesPublicados()` + regiones; `robots.ts` permitiendo `/` y bloqueando `/backend/`. |
| M10 | **Metadata estática "TravelOz Admin" hereda al sitio público** en rutas que no overridean. | `src/app/layout.tsx:8-11`; `/about`, `/contact`, `/faq`, `/terms`, `/work-with-us`, `/corporativo` heredan | Agregar `generateMetadata` por ruta + `metadataBase: new URL(process.env.APP_URL!)`. |
| M11 | **No existe `app/global-error.tsx`.** Si `RootLayout` crashea, pantalla en blanco. | `src/app/` | Crear con un mensaje genérico + link de soporte. |

### Observabilidad

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| M12 | **Sin Sentry / Logtail / Better Stack.** Errores se pierden en stdout de Railway sin alerting ni grouping. | toda la app | Instalar `@sentry/nextjs`; configurar DSN en env; `instrumentation.ts` lo inicializa. |
| M13 | **`error.tsx` muestra `error.message` literal al usuario** → potencial leak de PII / SQL fragments. | `src/app/error.tsx:26`, `src/app/backend/error.tsx:32` | Mensaje genérico + `error.digest` para soporte. |
| M14 | **`/api/image/[...path]/route.ts` devuelve `err.message` literal en 500** → leak de paths/keys S3. | `src/app/api/image/[...path]/route.ts:36` | Loggear el detalle, responder `"Internal error"` al cliente. |

### Nav / UX admin

| # | Issue | Evidencia | Fix |
|---|---|---|---|
| M15 | **`/backend/reportes` no está en el sidebar.** Solo accesible por deep-link. `roleConfig` dice que ADMIN+MARKETING lo ven, pero el nav no lo lista. | `src/components/layout/Sidebar.tsx:100-139` vs `src/lib/auth.ts:46,59` | Agregar item al grupo "Sistema" filtrado por `visibleModules`. |
| M16 | **Dashboard MARKETING usa la vista de VENDEDOR.** | `src/app/backend/dashboard/page.tsx:33` | O branch explícito `isMarketing` con vista propia, o redirigir a `/backend/reportes`. |
| M17 | **Dashboard ADMIN sin widget de leads nuevos.** Tiene que navegar manualmente para descubrir cotizaciones pendientes. También expone texto "Próximamente: insights de marketing" al cliente. | `src/app/backend/dashboard/_components/AdminDashboard.tsx:644-660` | Reemplazar placeholder por widget "Cotizaciones nuevas" usando `getLeadCounts()` (ya existe). |

---

## 🟡 MINORS — pulido (puede ir post-launch)

| # | Issue | Evidencia |
|---|---|---|
| N1 | Sin cookie banner (NextAuth setea cookie de sesión; Ley 18.331 UY + GDPR sugieren aviso) | — |
| N2 | Footer no linkea Política de Privacidad separada (solo `/terms`) | `src/components/public/Footer.tsx` |
| N3 | 20 `alt=""` en imágenes; algunas no decorativas (foto de testimonio) | `src/components/public/HomeTestimonios.tsx:45`, `HomeNewsletter.tsx:28,37`, `FaqContent.tsx:44` |
| N4 | 22 `<img>` raw vs 4 `next/image` — pierde optimización en hero/about/faq/terms | endémico |
| N5 | `/backend/reportes` First Load 329 kB (recharts no tree-shaken) | `next build` output |
| N6 | `next lint` no corre porque la config es interactiva | falta `.eslintrc.json` con `extends: next/core-web-vitals` |
| N7 | 22 `console.*` en `src/` (debería usar `src/lib/logger.ts`) | `src/lib/db.ts:23`, `src/app/api/upload/*` |
| N8 | Header NAV labels hardcodeados (no CMS-driven) — del audit anterior, sigue sin resolver | `src/components/public/Header.tsx:26-38` |
| N9 | Placeholder en seed: `general_whatsapp = wa.me/59899000000` y `footer_agencia_texto = "registrada Nº 1234"` — el cliente debe completarlos vía CMS | `prisma/seed-public.ts:74,122,153` |
| N10 | `contacto_mapa_embed` se rendea con `dangerouslySetInnerHTML` sin sanitización (solo admin lo edita, riesgo bajo) | `src/app/(public)/contact/page.tsx:131-140` |

---

## Plan de acción sugerido

### Sprint 1 — Seguridad y leads (3-5 días) ⇨ desbloquea go-live
- B1, B2 — rotar secretos + setear `PROTECTED_ADMIN_PASSWORD`
- B3 — `headers()` con CSP/HSTS/etc
- B5, B6 — proteger CV (auth + MIME real)
- B7, B8 — emails de leads a vendedores + notificaciones reales
- B12, B13 — honeypot + rate-limit + zod en públicos
- M8 — `.env.example`

### Sprint 2 — Permisos y bugs (3-4 días)
- B9 — `requireCanEdit()` en todas las mutaciones
- B10 — UI para audit log
- M1, M2, M3, M4 — bugs de forms
- M5 — índices Prisma

### Sprint 3 — SEO y observabilidad (2-3 días)
- M9, M10, M11 — sitemap / robots / global-error / metadata
- M12, M13, M14 — Sentry + sanear errores
- B11 — banner explícito en reportes

### Sprint 4 — UX admin (1-2 días)
- M15, M16, M17 — reportes en nav, dashboard marketing, widget leads
- M7 — `railway.json` + engines
- B4 — SSRF block en `/api/upload/by-url`

### Backlog (post-launch)
- Todo N1-N10
- Reportes transaccionales reales (modelar `Venta`)
- Newsletter double opt-in + integración Resend campaigns
- Migración progresiva a `next/image`

---

## Veredicto

**El proyecto NO está listo para producción tal como está.** Hay 13 blockers reales: 6 de seguridad (rotación de secretos, headers, CV, SSRF) y 7 de funcionalidad/compliance (leads no notifican, RBAC server-side ausente, audit log sin UI, reportes engañosos, sin anti-spam/validación zod).

**Estimación realista:** ~10-14 días de trabajo concentrado para llegar a producción de forma responsable. La buena noticia es que el corazón funciona — CRUDs reales, CMS sólido, leads se guardan, infra de email lista para enchufar, build limpio, TS estricto sin errores. Lo que falta es la "última milla" de seguridad + plumbing de notificaciones + observabilidad.

---

## Listado de envs a documentar en `.env.example`

```env
# Database
DATABASE_URL=
DIRECT_URL=
# (alias Postgres opcionales: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)

# Auth (NextAuth v5)
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Storage S3-compatible (Tigris / Railway / etc) — STORAGE_* preferido, AWS_* alias
STORAGE_ENDPOINT=
STORAGE_REGION=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_FORCE_PATH_STYLE=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=
LEADS_NOTIFY_TO=

# App
APP_URL=
LOG_LEVEL=

# Admin protegido (owner break-glass)
PROTECTED_ADMIN_EMAIL=
PROTECTED_ADMIN_NAME=
PROTECTED_ADMIN_PASSWORD=

# Pricing guards (opcionales con defaults)
MIN_MARKUP_FACTOR=
WARN_MARKUP_FACTOR=
```
