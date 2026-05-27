# QA sweep — CMS ↔ frontend wiring + visual audit (2026-05-26)

Tested with Playwright (desktop 1440×900 + mobile 390×844) and a file-based
contract audit against every CMS section under `src/app/backend/web/*` and
its consumer route under `src/app/(public)/*`.

Login used `geronimo@traveloz.com.uy / 123456` (ADMIN). All 17 CMS sections
checked. Save → revalidate → public-render round-trip verified end-to-end
for `inicio` (subtitle, CTA text, `home_categorias_title`).

Reference screenshots in `audit/` (`*-desktop.jpeg` = before,
`*-desktop-fixed.jpeg` = after).

---

## Bugs found and fixed in this sweep

### HIGH

1. **Placeholder copy `CAMBIAR TEXTO` was the live hero CTA.**
   Seed value `home_hero_cta_text` had been overwritten via the CMS to a
   placeholder string and was visible on the home hero button. Restored to
   "Ver destinos" through the CMS (no code change needed).

2. **FAQ icons returned 404 on every topic card.**
   `FaqContent.tsx:44` was prepending `/site/img/` to `iconUrl`, but seed
   already stores the full path (e.g. `/site/img/faq-icon-1-blue.webp`),
   producing `/site/img/site/img/faq-icon-1-blue.webp`. Fixed by using
   the stored value directly and guarding null. (`src/app/(public)/faq/_components/FaqContent.tsx`,
   `src/app/(public)/faq/page.tsx`)

3. **PackageCard title overlapped its body.**
   `PackageCard` reused the `image-box style1` class whose CSS pins
   `.title` to `position:absolute; bottom:0; padding:30px` with white text
   — intended for the home category tiles, *not* for a card that also
   carries a body block. The package title rendered as a white overlay on
   the price/features row. Rewrote `PackageCard` with its own self-contained
   layout (image + content block, no class inheritance from the legacy
   slider styles). (`src/components/public/PackageCard.tsx`)

4. **CatalogoServicio edits never invalidated paquete-detail cache.**
   `createServicio / updateServicio / deleteServicio` only revalidated
   `tag:"servicios"`, but `getPaqueteBySlug` joins `serviciosIncluidos` and
   caches under `tag:"paquetes"`. A rename or icon swap took up to 60s
   (the unstable_cache revalidate window) to appear on package detail
   pages. Also revalidated the wrong CMS path (`/backend/catalogos/servicios`
   instead of `/backend/web/servicios-incluidos`). Both fixed.
   (`src/actions/catalogo-servicios.actions.ts`)

### MEDIUM

5. **Home categorías slider unusable on mobile.**
   `EmblaSlider` used a constant `slidesToShow` (3 for home cats), so on
   ≤390px the three category tiles shrank to ~110px squares with titles
   overflowing. Added `slidesToShowMobile` (default `1.1` so the next card
   peeks) and a `matchMedia('(max-width:767px)')` listener with
   `emblaApi.reInit()` on breakpoint flips.
   (`src/components/public/EmblaSlider.tsx`, `src/components/public/HomeCategorias.tsx`)

6. **"Enviar consulta" (cotizar) and "Enviar" (work-with-us) had near-invisible text.**
   `CotizarForm` used `.hero-btn` (white-on-translucent, designed for dark
   hero bgs) on a white form card. `WorkForm` used `.contact-btn` whose
   only rules are scoped to `.contact-form-wrapper`/`.content-box.style2`
   — neither parent existed, so the browser fell back to default styling.
   Replaced both with explicit inline styles (solid `#F43E55` rounded
   pill). (`src/app/(public)/cotizar/_components/CotizarForm.tsx`,
   `src/app/(public)/work-with-us/_components/WorkForm.tsx`)

7. **`/work-with-us` showed two file pickers stacked.**
   The styled `FileUploadField` requires a `.work-with-us` ancestor for its
   `opacity:0` + custom-Explorar styling (CSS scoped that way). The page
   was missing the class on its `<section>`, so the native file button
   was visible underneath the custom one. Added the class to the wrapper.
   (`src/app/(public)/work-with-us/page.tsx`)

8. **Orphan CMS field: `home_categorias_title`.**
   Editable in `/backend/web/inicio` but never read on the home page —
   admin edits were silently discarded. Wired it through to
   `HomeCategorias` and rendered above the slider when non-empty.
   Also added a guard: categorías with empty `imagen` are filtered out
   so the slider can't render a broken `<img src="">`.
   (`src/app/(public)/page.tsx`, `src/components/public/HomeCategorias.tsx`)

9. **Corporativo card icons not editable.**
   Public page reads `corporativo_valores_icon_1/2/3` from the seed, but
   the CMS form `CorporativoForm.tsx` only exposed título + texto per card.
   Admin had no way to change the three icons. Added an `image` field per
   card. (`src/app/backend/web/corporativo/CorporativoForm.tsx`)

---

## Issues confirmed but not auto-fixed (left to product team)

These are flagged for the client / require a content or scope decision —
not safe to auto-edit without confirmation.

- **Placeholder WhatsApp number `https://wa.me/59899000000`** in the seed
  (`prisma/seed-public.ts:74,122`) becomes the live WhatsApp button + the
  /contact link on a fresh DB. The CMS already exposes it under
  `/backend/web/general` and `/backend/web/contacto` — set the real number
  there before launch.
- **Placeholder agencia number** (`footer_agencia_texto` = "Agencia de
  viajes registrada Nº 1234" at `prisma/seed-public.ts:153`). Note: this
  seed key isn't currently read by `Footer.tsx`. Either delete the key
  or wire it into the footer modal — your call.
- **`contacto_mapa_embed`** is rendered via `dangerouslySetInnerHTML`
  with no validation (`src/app/(public)/contact/page.tsx`). Low risk
  because only admins can set it, but a sanitization pass would be
  safer for defense in depth.
- **Header NAV labels** (`DESTINOS / CORPORATIVO / NOSOTROS / CONTACTO`)
  are hardcoded in `Header.tsx` — not CMS-driven. Footer is fully
  CMS-driven; header could match if desired.
- **Widespread plain `<img>` (no next/image, no onError fallback)** —
  endemic in `Header`, `Footer`, `HomeCategorias`, `PackageCard`,
  `FormasDePago`, `HomeTestimonios`. A broken image URL ships a
  browser-default broken-image icon. Already mitigated for the
  newsletter background (it has an `onError` hide). Migrating to
  `next/image` is a larger refactor.

---

## CMS → frontend round-trips verified

| Section | Save in CMS … | Appears on public … | Status |
|---|---|---|---|
| inicio (hero subtitle) | `/backend/web/inicio` | `/` | ✅ |
| inicio (CTA text) | `/backend/web/inicio` | `/` | ✅ |
| inicio (categorias_title — new) | `/backend/web/inicio` | `/` above slider | ✅ |
| All other groups | `updateSettings` → `revalidateTag("site-settings")` | All `getSiteSettings(group)` consumers | ✅ (cache wiring inspected — covers every group in one tag) |
| categorias | `categorias-destacadas.actions` → `revalidateTag("categorias-destacadas")` | home slider | ✅ |
| testimonios | `testimonios.actions` → `revalidateTag("testimonios")` | home + paquete detail | ✅ |
| faq / terms | `cms-content.actions` → `revalidateTag("faq")`/`"terms"` | `/faq`, `/terms` | ✅ |
| equipo / clientes | `cms-content.actions` → `revalidateTag("equipo")`/`"clientes-corporativos"` | `/corporativo` | ✅ |
| servicios-incluidos | `catalogo-servicios.actions` → tags `servicios` + `paquetes` (FIXED) | paquete detail pages | ✅ after fix |
| destinos (region copy) | `region-frontend.actions` → `revalidateTag("regiones")` | `/destinos`, `/destinos/[region]` | ✅ |

---

## Public pages audited

Visited on desktop (1440×900) and mobile (390×844). Console errors only
counted (warnings ignored). Network 404s noted.

| Route | Desktop | Mobile | Console errors | Notes |
|---|---|---|---|---|
| `/` | ✅ | ✅ (after fix #5) | 0 | hero video, categorías slider, testimonios, newsletter all rendering |
| `/destinos` | ✅ | ✅ | 0 | region grid OK |
| `/destinos/caribe` | ✅ (after fix #3) | ✅ (after fix #3) | 0 | PackageCard was the only issue |
| `/destinos/caribe/punta-cana-premium-all-inclusive` | ✅ | ✅ | 0 | sticky form OK, formas de pago OK |
| `/about` | ✅ | n/a | 0 | clean |
| `/contact` | ✅ | n/a | 0 | map embed empty (no embed configured in CMS) |
| `/corporativo` | ✅ | n/a | 0 | clean — icons editable now |
| `/cotizar` | ✅ (after fix #6) | n/a | 0 | submit button restyled |
| `/faq` | ✅ (after fix #2) | n/a | **6 → 0** | icon URL duplication eliminated |
| `/terms` | ✅ | n/a | 0 | clean |
| `/work-with-us` | ✅ (after fixes #6, #7) | n/a | 0 | file picker fixed, submit button restyled |

---

## Files changed in this sweep

```
src/actions/catalogo-servicios.actions.ts        # +revalidate paquetes tag + correct path
src/app/(public)/cotizar/_components/CotizarForm.tsx   # submit button contrast
src/app/(public)/faq/_components/FaqContent.tsx        # remove /site/img/ prefix
src/app/(public)/faq/page.tsx                          # fallback handling
src/app/(public)/page.tsx                              # pass categorias title to component
src/app/(public)/work-with-us/_components/WorkForm.tsx # submit button contrast
src/app/(public)/work-with-us/page.tsx                 # add .work-with-us wrapper class
src/app/backend/web/corporativo/CorporativoForm.tsx    # icon fields for 3 cards
src/components/public/EmblaSlider.tsx                  # responsive slidesToShow
src/components/public/HomeCategorias.tsx               # render title + filter empty images
src/components/public/PackageCard.tsx                  # self-contained layout
```

No DB migrations needed. No new dependencies. Existing seed data continues
to satisfy all fields (`corporativo_valores_icon_1/2/3` were already
seeded; only the editor UI was missing).

Pre-existing uncommitted changes in `src/actions/package.actions.ts`,
`src/actions/package-lifecycle.actions.ts`, and
`src/app/backend/paquetes/[slug]/_components/AlojamientosTab.tsx` are NOT
mine and were left untouched.
