# Auditoría funcional completa — 2026-06-10 (pre-producción)

Auditoría de código sobre todas las áreas funcionales del sitio, previa a la
salida a producción. Cinco pasadas en paralelo: edición de paquetes, servicios
y catálogos, frontend público, backend/seguridad, y CMS + imágenes.

**Build status:** `tsc --noEmit` ✅ y `next build` ✅ sin errores (verificado hoy).

---

## Resumen ejecutivo

| Área | Estado | Detalle |
|------|--------|---------|
| Edición de paquetes | 🟢 ~90% funcional | 1 bug real (publish gate sin validar período de viaje), 2 menores |
| Servicios y catálogos | 🟢 Funcional | Faltan cache-busts en 4 deletes + chequeo "en uso" antes de borrar servicios |
| Frontend público | 🟢 Funcional | Bugs F1 y F2 (campos de forms que se pierden) **siguen vivos** |
| CMS textos + imágenes | 🟢 Completo | Sin bugs detectados; pipeline de upload sólido (sniffing, sharp, S3) |
| Backend / seguridad | 🔴 Bloqueantes | S1/S2/S3 + RBAC server-side siguen pendientes del audit de mayo |

**Veredicto:** la funcionalidad de operación diaria (paquetes, servicios, CMS,
imágenes) está completa y cableada de punta a punta. Lo que bloquea el go-live
es la lista de seguridad de `PRODUCTION-PENDING.md`, que sigue casi intacta
desde el 27-may (solo S4 se arregló).

---

## 1. Edición de paquetes — VERIFICADO ✅ con 3 hallazgos

Verificado completo (UI → action → DB → revalidate):
- CRUD: crear, editar (autosave), duplicar (3 variantes de clone), soft-delete.
- Lifecycle BORRADOR → EN_REVISION → ACTIVO → ARCHIVADO con matriz de
  transiciones validada y auto-despublicación al salir de ACTIVO. Bulk ops OK.
- Servicios dentro del paquete (aéreos/traslados/seguros/circuitos): assign,
  update, remove con `safePropagate()`, reorder drag-drop transaccional.
- Alojamientos: opciones hoteleras con recompute de precios, hotel por destino.
- Precios: neto fijo + factor/venta, margen mínimo enforced, bulk markup.
- Contenido frontend (commit ce604e9): textos ricos, fallback "Incluye",
  galería (add/remove/update/orden), slug con uniqueness, SEO, etiquetas.
- Itinerario de destinos con sincronización de noches y publish gate.
- Período del viaje (viajeDesde/viajeHasta) separado de validez, con banners.

Hallazgos:

| # | Severidad | Issue | Evidencia |
|---|-----------|-------|-----------|
| P1 | 🔴 Alta | El publish gate de `updatePaqueteFrontend` valida slug/título/destinos/foto/noches pero **no exige `viajeDesde`/`viajeHasta`** → se puede publicar y el resolver de precios cae a fallback (precios $0 posibles en el sitio). | `src/actions/paquete-frontend.actions.ts:184-226` |
| P2 | 🟡 Media | `recalcPaquetePrecioDesde()` está exportada pero **nadie la llama** → el "Desde $X" de listados puede quedar stale al cambiar opciones hoteleras. | `src/actions/paquete-frontend.actions.ts:346-371` |
| P3 | 🟢 Baja | Al auto-generar slug no se revalida `/backend/paquetes/[id]` (la URL del header se ve vieja hasta el próximo refresh). | `src/actions/paquete-frontend.actions.ts:86-95` |
| P4 | 🟢 Baja | `bulkClone()` es loop sin transacción: si falla a la mitad quedan clones parciales. | `src/actions/package-lifecycle.actions.ts:394-408` |

---

## 2. Servicios y catálogos — VERIFICADO ✅ con 2 patrones a corregir

Verificado completo:
- Aéreos con tarifas múltiples (filas inline, validación, modal de impacto de
  precio cuando el aéreo está en paquetes, recompute), clone, shortcuts.
- Alojamientos (fotos, tarifas por régimen, paginación en dos olas, estrellas),
  Traslados (REGULAR/PRIVADO), Circuitos (días + tarifas), Seguros.
- Catálogos: temporadas, tipos, etiquetas, regímenes, regiones→países→ciudades
  (cascade completo), proveedores, CatalogoServicio con íconos.
- Los catálogos SÍ protegen contra borrar elementos en uso (cuentan referencias).

Hallazgos:

| # | Severidad | Issue | Evidencia |
|---|-----------|-------|-----------|
| SV1 | 🟡 Media | Falta `bustServicesCacheGlobal()` después del soft-delete en `deleteAlojamiento`, `deleteTraslado`, `deleteSeguro`, `deleteCircuito` → el servicio borrado sigue visible hasta 60s. (`deleteAereo` revisar también.) | `src/actions/service.actions.ts:587,593,662,758` |
| SV2 | 🟡 Media | Los deletes de servicios **no chequean si el servicio está asignado a paquetes activos** (a diferencia de catalog.actions.ts que sí cuenta uso). Se puede borrar un aéreo en uso. | `src/actions/service.actions.ts` (deleteAereo/deleteAlojamiento/etc.) |
| SV3 | 🟢 Baja | `toUserError()` se usa en Traslados pero no en Aéreos/Alojamientos → mensajes de error inconsistentes. | `src/actions/service.actions.ts` |

---

## 3. Frontend público — VERIFICADO ✅ con 2 bugs confirmados

Verificado completo:
- 11 páginas públicas renderizan datos reales, manejan estados vacíos
  ("Próximamente…") y usan `notFound()` correcto en region/slug.
- Detalle de paquete: galería Embla, sidebar sticky, período de viaje visible,
  fallback de "Incluye" (manual → servicios estructurados → placeholder) OK.
- SEO: `generateMetadata` en todas las rutas, sitemap dinámico con fallback,
  robots con 3 modos. Sin links internos rotos. Imágenes siempre con fallback.
- 3 de 5 formularios (contacto, corporativo, work-with-us) guardan todos sus
  campos. `sanitizeRichHtml` con whitelist correcto.

Bugs confirmados (ya estaban en PRODUCTION-PENDING, siguen vivos):

| # | Severidad | Issue | Evidencia |
|---|-----------|-------|-----------|
| F1 | 🟡 Media | `telefonoCodigo` del sidebar de cotización se envía pero `submitQuoteForm` nunca lo lee → el lead pierde el prefijo de país. | `QuoteSidebar.tsx:121` vs `src/actions/public-forms.actions.ts` |
| F2 | 🟡 Media | El campo `destino` de `/cotizar` es **required** pero la action no lo lee → el admin no sabe a dónde quiere ir el lead. | `CotizarForm.tsx:24` |
| F5 | 🟢 Baja | `paqueteTitulo` (hidden input del sidebar) se envía y nunca se usa — ruido, eliminar. | `QuoteSidebar.tsx:71` |

---

## 4. CMS de textos e imágenes — VERIFICADO ✅ sin bugs

- SiteSettings: 126 keys en 14 grupos, todas seededas y todas las que lee el
  frontend existen — **sin keys huérfanas**. Autosave 1.5s + diff panel +
  validación por key + live preview desktop/mobile, revalidación correcta.
- SEO y Robots editables desde `/backend/web/*`.
- Upload de imágenes de punta a punta: compresión client-side → crop opcional →
  sniffing de magic bytes (`file-type`) → sharp (rotate, strip EXIF/GPS, WebP,
  max 4000×4000, 25MB) → S3 → servida vía `/api/image/[...path]` con cache
  inmutable. Fail-fast si faltan envs de storage.
- Galerías con dnd-kit (drag/teclado/touch), bulk delete, lightbox, alt editable.
- `media-hints.ts` cubre todas las keys de imagen editables.

---

## 5. Backend / seguridad — estado del checklist de mayo

Verificación item por item de `PRODUCTION-PENDING.md` (27-may). **Solo 1 de ~20
items se arregló desde entonces.**

| Item | Estado hoy | Evidencia |
|------|-----------|-----------|
| S1 headers de seguridad (CSP/HSTS/X-Frame…) | ❌ Pendiente | `next.config.mjs` sin headers; middleware solo auth |
| S2 SSRF en `/api/upload/by-url` | ❌ Pendiente | `route.ts:55` — `fetch(url)` sin blocklist de IPs internas |
| S3 CVs descargables sin auth | ❌ Pendiente | `/api/image/[...path]` GET público + `cvUrl` apunta ahí |
| S4 sniff de magic bytes en CV | ✅ **Arreglado** | `src/lib/file-pipeline.ts:85-91` usa `fileTypeFromBuffer` |
| S5 `err.message` en 500 de `/api/image` | ❌ Pendiente | `route.ts:36` (también en upload, by-url y presigned) |
| S6 `error.tsx` muestra `error.message` | ❌ Pendiente | `src/app/error.tsx:26`, `src/app/backend/error.tsx:32` |
| S7 falta `global-error.tsx` | ❌ Pendiente | no existe |
| S8 mapa embed sin sanitizar | ❌ Pendiente | `contact/page.tsx:137` |
| Honeypot + rate-limit en forms públicos | ❌ Pendiente | `rate-limit.ts` solo protege login |
| Validación zod en public-forms | ❌ Pendiente | solo trim/length manual |
| R1 RBAC server-side (`requireCanEdit`) | ❌ Pendiente | `require-auth.ts` solo tiene `requireAuth`/`requireAdmin`; VENDEDOR puede mutar vía DevTools |
| R2 audit log sin UI de lectura | ❌ Pendiente | 40+ `create`, 0 `findMany` |
| F3 `paqueteId` sin validar antes del INSERT | ❌ Pendiente | `public-forms.actions.ts:243` |
| F4 newsletter sin double opt-in | ❌ Pendiente | `active: true` directo |
| I1 `.env.example` | ❌ Pendiente | no existe |
| I2 `railway.json` / `engines.node` | ❌ Pendiente | no existen |
| I5 `.eslintrc.json` | ❌ Pendiente | no existe; `next lint` no corre |
| D1 índices de leads (email, createdAt) | ❌ Pendiente | schema.prisma sin esos índices |
| D2 guards NODE_ENV en seeds destructivos | ❌ Pendiente | `seed-from-json.ts` wipea DB sin guard |

Lo que sí está bien: login con rate-limit + lockout por usuario + reset de
password con token TTL + PIN 2FA opcional; middleware protege `/backend/*`;
auth inline en las rutas de upload; sanitización whitelist del contenido rico.

---

## Plan de cierre sugerido (orden de ataque)

**Bloqueantes do-not-ship (≈1 día):**
1. S2 — blocklist SSRF en by-url (IPs privadas, link-local, `*.railway.internal`).
2. S3 — auth para `/api/image/leads/**` (o presigned GET con TTL).
3. S1 — headers de seguridad en `next.config.mjs`.
4. R1 — `requireCanEdit()` en las actions de mutación.
5. P1 — publish gate: exigir período del viaje.

**Muy recomendado pre-launch (≈1 día):**
6. F1 + F2 + F3 — arreglar los 3 campos/validaciones de forms de leads.
7. Honeypot + rate-limit en los 5 forms + zod server-side.
8. S5/S6/S7 — sanear mensajes de error + global-error.tsx.
9. SV1 + SV2 — cache-busts y chequeo "en uso" en deletes de servicios.
10. P2 — llamar `recalcPaquetePrecioDesde()` donde corresponde.
11. I1/I2/I5 — `.env.example`, `engines.node`, `.eslintrc.json` (~30 min).
12. D1/D2 — índices de leads + guards de seeds (~30 min).

**Post-launch:** F4 (double opt-in), R2 (UI de audit log), Sentry, cookie
banner, migración a `next/image`, reportes transaccionales reales.
