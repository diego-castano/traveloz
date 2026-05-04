# TravelOz — Plan de implementación del frontend público

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar el sitio público de TravelOz a 1:1 funcional con `html_inicial/`, conectado al backend Prisma para paquetes y a un módulo admin "Frontend institucional" para los textos editables.

**Architecture:** Next.js 14 App Router con dos route groups separados — `(public)` para el sitio público (CSS Bootstrap + custom de `html_inicial/`) y `backend/` para el panel admin (Tailwind + glassmorphism). Datos vía Prisma + Server Actions (no REST). Interactividad ported de jQuery/Slick/Litepicker a Embla + Radix + react-day-picker. Textos institucionales editables desde admin via models `SiteSetting`, `Testimonio`, `CategoriaDestacada`; cada `Paquete` tiene un tab "Frontend" para slug/SEO/heroImage/serviciosIncluidos.

**Tech Stack:**
- Next.js 14.2 App Router + TypeScript
- Prisma 6 (PostgreSQL en Railway)
- NextAuth 5 (admin auth)
- React 18 + Server Components + Server Actions
- Bootstrap 5 CSS (scopeado a `(public)` via `@import` en site.css)
- Embla Carousel (`embla-carousel-react`, `embla-carousel-autoplay`, `embla-carousel-ssr`)
- Radix UI (Accordion, Tabs, Dialog, Popover) — ya instalado
- react-day-picker — ya instalado
- cmdk (multi-select) — ya instalado
- Tailwind 3 (admin only)

**Estado al iniciar este plan:**
- Fase 1 ✅ admin movido a `/backend/*`, `/login` → `/backend/login`
- Fase 2 ✅ layout `(public)`, fonts Clarika+Rufina, Bootstrap scopeado, `public/site/` con assets
- Fase 3 ✅ 6 páginas estáticas: about, contact, work-with-us, corporativo, terms, faq
- Fase 4-6 → cubiertas por este plan

**Decisiones del usuario que afectan el plan:**
- Forms públicos persistencia: **deferred** (stubs siguen logueando hasta nueva orden)
- Multi-brand en modelos nuevos: **NO** (single tenant)
- Modal Agencia: mantener como está
- Imágenes: `<img>` plano (no `next/image` en este sitio)
- FontAwesome: clases inline (`<i className="fa-solid">`), CSS ya cargado
- Sub-estrategia CSS: A — site.css copiado tal cual con vendors `@imported`

---

## Context for resuming in a new session

> Esta sección existe para que una sesión nueva (sin historial de conversación) pueda retomar el trabajo. Léela completa antes de tocar nada.

### Quick start

```bash
cd /Users/Diegothx/Desktop/ProyectosDEV/travelos
npm install                           # idempotente
npm run dev                           # http://localhost:3000
# admin:   http://localhost:3000/backend/login  (creds en .env / pedir al user)
# público: http://localhost:3000/  (placeholder), /about, /contact, /faq, /terms, /work-with-us, /corporativo
```

Variables de entorno requeridas (`.env`): `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. El proyecto está deployado en Railway; `prisma migrate deploy` corre contra esa DB — coordinar con el usuario antes de migrar.

### Estado del repo al iniciar este plan

- Branch: `main` (work directo, no PRs para Fases 1-3 — comiteado por el user)
- Último commit: `82f07b7` — "feat: split admin under /backend, scaffold public site at /"
- Working tree clean (excepto `docs/planning/` untracked si este plan no se ha comiteado todavía)
- Production URL: deploy automático de `main` en Railway

### Memorias persistentes (`~/.claude/projects/-Users-Diegothx-Desktop-ProyectosDEV-travelos/memory/`)

Estas memorias se cargan automáticamente al inicio de cada sesión vía `MEMORY.md`. Si una sesión nueva necesita más contexto del que está en este plan, leerlas:

- **`public-site-content-architecture.md`** — split entre JSX hardcoded (about/terms/faq/contact info), admin-editable (home hero, testimonios, categorías, corporate copy, whatsapp number), DB-driven (todo `/destinos/*`). Spec completo del tab "Frontend" por paquete (slug, publicado, metaTitle, metaDescription, heroImage, textoIncluye, serviciosIncluidos via PaqueteServicio, precioDesde auto-calculado).
- **`pending-fase-4-interactivity.md`** — lista exacta de behaviors JS del HTML original que NO están portados (sticky header, hamburger, 7 sliders Slick, Litepicker, passenger counter, typewriter, file upload custom). Confirma que `embla-carousel-react`, `embla-carousel-autoplay`, `embla-carousel-ssr` son la elección verificada via context7.
- **`pending-public-forms.md`** — los 5 server actions en `src/actions/public-forms.actions.ts` son stubs que solo `console.log`. User decidió 2026-04-29 dejarlos así hasta nueva orden. Modelos Prisma (Cotizacion, MensajeContacto, ContactoCorporativo, Postulacion, SuscripcionNewsletter) están diseñados pero no migrados — se incluyen en Phase 5A.

### Archivos críticos del trabajo previo (Fases 1-3)

**Auth y routing:**
- [src/middleware.ts](../../src/middleware.ts) — protege `/backend/*` excepto `/backend/login`. NO toca rutas públicas.
- [src/lib/auth.config.ts](../../src/lib/auth.config.ts) — `signIn: "/backend/login"`.
- [src/app/backend/layout.tsx](../../src/app/backend/layout.tsx) — bypass de auth gate cuando `pathname === "/backend/login"` (renderiza `<div className="font-body antialiased">{children}</div>` directo). NO removerlo o el login se queda en blanco.
- [src/app/layout.tsx](../../src/app/layout.tsx) — root layout. `<body className="antialiased">` SIN `font-body` (la fuente la pone cada layout hijo: backend usa Tailwind `font-body`, public usa Clarika via site.css).

**Layout público:**
- [src/app/(public)/layout.tsx](../../src/app/(public)/layout.tsx) — wrap con Header/Footer/Modal/WhatsApp. Importa `./site.css`. Carga Bootstrap JS via `<Script src="/site/vendors/bootstrap/js/bootstrap.min.js" strategy="afterInteractive">` — **Fase 4 lo elimina** cuando Radix reemplace accordion+tabs.
- [src/app/(public)/site.css](../../src/app/(public)/site.css) — empieza con `@import` de fonts.css, bootstrap.min.css, fontawesome, slick. **NUNCA** mover esos imports a `<link>` JSX (terminan en `<body>` y pierden la cascade race con root layout). Cualquier vendor CSS nuevo va con `@import` aquí arriba.

**Componentes públicos existentes:**
- [src/components/public/Header.tsx](../../src/components/public/Header.tsx) — server component, menú estático. DESTINOS submenu apunta a `/destinos/[region]` (404 hasta Fase 6). El hamburger `#menu-toggle` está renderizado pero no hace nada — Fase 4.1.
- [src/components/public/Footer.tsx](../../src/components/public/Footer.tsx) — server component. Trigger del modal Agencia es un `<a data-agencia-modal-open>` (NO `onClick`, eso rompió antes — ver "Errores ya resueltos").
- [src/components/public/AgenciaModal.tsx](../../src/components/public/AgenciaModal.tsx) — client component. Escucha clicks en `[data-agencia-modal-open]` document-wide + ESC + click en overlay. Patrón a respetar para futuros triggers.
- [src/components/public/WhatsAppButton.tsx](../../src/components/public/WhatsAppButton.tsx) — número hardcoded; Fase 5D lo mueve a SiteSetting `whatsapp_number`.
- [src/components/public/AccordionStatic.tsx](../../src/components/public/AccordionStatic.tsx) — accordion compatible con Bootstrap JS (`data-bs-toggle="collapse"`). Usado por terms y faq mobile. Fase 4 lo reemplaza con Radix.
- [src/components/public/FormStatus.tsx](../../src/components/public/FormStatus.tsx) — mensaje inline bajo submit; usa `useFormStatus`.

**Páginas públicas estáticas (Fase 3) — referencia de patrón:**
- [src/app/(public)/about/page.tsx](../../src/app/(public)/about/page.tsx)
- [src/app/(public)/contact/page.tsx](../../src/app/(public)/contact/page.tsx)
- [src/app/(public)/work-with-us/page.tsx](../../src/app/(public)/work-with-us/page.tsx)
- [src/app/(public)/corporativo/page.tsx](../../src/app/(public)/corporativo/page.tsx) — **NO** tiene `"use client"` ni `export const metadata` juntos (rompió antes).
- [src/app/(public)/terms/page.tsx](../../src/app/(public)/terms/page.tsx) — array `TERMS` hardcoded.
- [src/app/(public)/faq/page.tsx](../../src/app/(public)/faq/page.tsx) — Bootstrap tabs (desktop) + AccordionStatic (mobile).

**Server actions stubs (NO TOCAR sin coordinar):**
- [src/actions/public-forms.actions.ts](../../src/actions/public-forms.actions.ts) — `submitContactForm`, `submitWorkWithUsForm`, `submitCorporateForm`, `submitNewsletterForm`, `submitQuoteForm`. Todos retornan `{ ok: true, message: ... }` después de un `console.log`. Phase 5A reemplaza el cuerpo, no la signature.

**Assets:**
- `public/site/` — copiados tal cual de `html_inicial/assets/` (img, fonts, vendors). Si falta una imagen para una página nueva, primero ver si existe acá.
- `html_inicial/` — sigue en el repo como referencia. **NO** hacer changes a estos archivos. Mirarlos para copiar markup/CSS/assets a la versión React.

### Errores ya resueltos (no repetir)

1. **`onClick` en server component** — Footer.tsx tenía `onClick={(e) => e.preventDefault()}` y rompió con "Event handlers cannot be passed to Client Component props". Fix: usar `data-*` attributes y un client component que escuche document-wide. Para cualquier interactividad nueva en server components, mismo patrón.

2. **`/backend/login` en blanco** — el layout admin tenía `if (status !== "authenticated") return null` que se aplicaba al propio login. Fix: bypass `isLoginRoute` (ya está). NO simplificar.

3. **Body con fuente Times/system-ui en público** — fonts.css y Bootstrap cargados via `<link>` JSX terminaban en `<body>`, perdían cascade race. Fix: `@import` al tope de site.css. Cualquier vendor CSS nuevo del público va por ahí.

4. **`metadata` export desde "use client"** — corporativo/page.tsx tenía ambos y rompió compile que cascadeó a otras páginas. Si una página necesita interactividad, separar en sub-componente client; el page.tsx queda server con `export const metadata`.

5. **Webpack cache corrupta tras cascade errors** — síntoma: páginas siguen en 500 después de haber arreglado el bug. Fix: `pkill -9 -f next && rm -rf .next node_modules/.cache && npm run dev`.

6. **CWD se cambia tras correr el playwright skill** — el skill hace `cd $SKILL_DIR`. Después prefijar comandos con `cd /Users/Diegothx/Desktop/ProyectosDEV/travelos &&` o usar paths absolutos.

7. **Playwright `networkidle` timeout en dev** — el HMR de Next manda keepalive y nunca llega a networkidle. Usar `waitUntil: 'load'` (no `networkidle`).

### Patrones a preservar

- **Modal trigger via data-attribute** (no onClick en server component) — ver AgenciaModal.tsx.
- **Vendor CSS via `@import` en site.css** (no `<link>` JSX, no `import "x.css"` en componentes públicos).
- **Public site usa Bootstrap classes + custom CSS de site.css** — NO Tailwind. Tailwind es solo para `/backend/*`.
- **Admin usa Tailwind + glassmorphism custom** — no mezclar con Bootstrap.
- **Server actions con `useFormState` + `useFormStatus`** — patrón en contact/work-with-us/corporativo. Mismo patrón en Fase 5/6.
- **`unstable_cache` + `revalidateTag` para queries Prisma públicas** — definido en Phase 6.
- **Single-tenant en modelos públicos** — `SiteSetting`, `Testimonio`, `CategoriaDestacada`, `Cotizacion`, etc. NO llevan `brandId`. El admin sí es multi-brand pero el sitio público no.
- **`<img>` plano, no `next/image`** — para mantener 1:1 con el HTML original. Migración futura está en "Fuera de scope".

### Cómo validar visualmente

Hay un skill de Playwright para tests visuales:

```bash
# Desde la raíz del proyecto:
node ~/.claude/skills/playwright-skill/run.js \
  --url http://localhost:3000/about \
  --waitUntil load
```

(verificar uso exacto del skill al primer call). Tomar screenshots a 1440x900 desktop y 375x812 mobile. Comparar contra `html_inicial/about.html` abierto local. Revisar consola del browser por errores JS y 404s de assets.

### Coordinación con el usuario

Cosas que requieren confirmación explícita antes de actuar:

1. **`prisma migrate deploy` a Railway** (Phase 5A.1 step 8) — afecta DB de producción.
2. **`git push` a `main`** — la rama va a deploy.
3. **Eliminar archivos en `html_inicial/`** — sigue siendo referencia.
4. **Activar persistencia de forms** — está deferred; el usuario va a indicar cuándo.
5. **Migrar `<img>` a `next/image`** — decisión actual es no hacerlo.

### TodoWrite list al iniciar

```
1. [completed] Fase 1: Mover admin de (admin)/* y /login a /backend/* y actualizar refs
2. [completed] Fase 2: Setup público — layout (public), fuentes locales, Bootstrap scopeado, copiar style.css, mover assets a /public/site
3. [completed] Fase 3: Páginas estáticas (about, contact, faq, terms, work-with-us, corporativo) con Header/Footer/Modal
4. [pending]   Fase 4: Componentes interactivos React (Embla Carousel, Radix Modal/Accordion/Tabs, react-day-picker, sticky header, mobile menu)
5. [pending]   Fase 5: Schema Prisma + MultiSelect catalog services + admin tab Contenido Web + Server Actions de forms
6. [pending]   Fase 6: Páginas con datos dinámicos (home, destinos, listing, detalle) + slugs en Region/Paquete
```

### Glosario rápido

- **html_inicial/** — directorio con el HTML+Bootstrap+jQuery+Slick original del cliente. Referencia visual y fuente de assets.
- **(public) / backend/** — route groups de Next. `(public)` es el sitio cliente; `backend/` es el panel admin.
- **SiteSetting** — modelo key-value para textos one-off (hero title, whatsapp number, newsletter copy).
- **Frontend institucional** — módulo admin nuevo en `/backend/contenido` (Phase 5D) con tabs Inicio/Testimonios/Categorías/General.
- **Tab "Frontend" del paquete** — sub-tab en `/backend/paquetes/[slug]?tab=frontend` (Phase 5C) para slug, SEO, heroImage, serviciosIncluidos.
- **Fase 1-3** — admin → /backend, layout público, 6 páginas estáticas. Comiteado y deployado.
- **Fase 4-6** — cubierto por este plan.

---

## File Structure

### Archivos nuevos a crear

```
prisma/
  migrations/
    YYYYMMDDHHMMSS_add_public_models/
      migration.sql                                        ← generada por prisma migrate

src/
  actions/
    site-settings.actions.ts                               ← CRUD de SiteSetting (server actions)
    testimonios.actions.ts                                 ← CRUD de Testimonio
    categorias-destacadas.actions.ts                       ← CRUD de CategoriaDestacada
    catalogo-servicios.actions.ts                          ← CRUD de CatalogoServicio
    paquete-frontend.actions.ts                            ← actualiza campos públicos del Paquete
    public-data.actions.ts                                 ← lee datos para SSR del sitio público

  app/
    (public)/
      destinos/
        page.tsx                                           ← grilla de regiones (Fase 6)
        [region]/
          page.tsx                                         ← listing de paquetes filtrados por región
          [slug]/
            page.tsx                                       ← detalle de paquete con tabs Incluye/Alojamientos
            _components/
              PackageHero.tsx                              ← galería + título + precio desde
              IncluyeTab.tsx                               ← lista de servicios incluidos con iconos
              AlojamientosTab.tsx                          ← hoteles con precios por temporada
              QuoteSidebar.tsx                             ← form sticky de cotización
              FormasDePago.tsx                             ← logos hardcoded
      cotizar/
        page.tsx                                           ← form standalone de cotización (Fase 6)
    backend/
      contenido/
        page.tsx                                           ← módulo "Frontend institucional" con tabs
        _components/
          InicioTab.tsx                                    ← edita SiteSetting hero_*, newsletter_*
          TestimoniosTab.tsx                               ← CRUD Testimonio
          CategoriasTab.tsx                                ← CRUD CategoriaDestacada (slider home)
          GeneralTab.tsx                                   ← whatsapp_number, social, hours
      catalogos/
        servicios/
          page.tsx                                         ← CRUD CatalogoServicio
      paquetes/
        [slug]/
          _components/
            FrontendTab.tsx                                ← nuevo tab en form del paquete

  components/
    public/
      EmblaSlider.tsx                                      ← carousel reusable (autoplay, dots, arrows)
      MobileMenu.tsx                                       ← drawer client-side reemplaza Bootstrap collapse
      StickyHeader.tsx                                     ← hook + wrapper hide-on-scroll
      Typewriter.tsx                                       ← efecto .anim-text
      PassengerCounter.tsx                                 ← +/- adultos/niños/infantes
      DateRangePicker.tsx                                  ← wrapper de react-day-picker estilado
      RadixAccordion.tsx                                   ← reemplazo de AccordionStatic con Radix
      FileUploadField.tsx                                  ← input file estilado (work-with-us)
      HomeHero.tsx                                         ← hero video + título + CTA (datos de SiteSetting)
      HomeCategorias.tsx                                   ← slider de CategoriaDestacada
      HomeTestimonios.tsx                                  ← slider de Testimonio
      HomeNewsletter.tsx                                   ← form newsletter
      DestinosGrid.tsx                                     ← grilla de regiones
      PackageCard.tsx                                      ← card de paquete en listing
      PackageListingFilters.tsx                            ← filtros de búsqueda + ordenamiento
    ui/
      MultiSelectCombobox.tsx                              ← multi-select reusable (cmdk + Radix Popover)

  lib/
    public-data.ts                                         ← queries Prisma cacheadas para sitio público

docs/planning/
  frontend.md                                              ← este documento
```

### Archivos existentes a modificar

```
prisma/schema.prisma                                       ← +9 modelos, +9 campos en Paquete, +2 en Region
src/app/(public)/page.tsx                                  ← reemplazar placeholder por home real (Fase 6)
src/app/(public)/layout.tsx                                ← quitar Script Bootstrap cuando Radix esté listo
src/app/(public)/site.css                                  ← agregar override CSS para react-day-picker
src/components/public/Header.tsx                           ← usar StickyHeader + MobileMenu wrappers
src/components/public/AccordionStatic.tsx                  ← deprecar, redirige a RadixAccordion
src/app/(public)/terms/page.tsx                            ← migrar a RadixAccordion
src/app/(public)/faq/page.tsx                              ← migrar a Radix Tabs + Accordion
src/app/(public)/corporativo/page.tsx                      ← reemplazar Slick por EmblaSlider mobile
src/app/(public)/contact/page.tsx                          ← (sin cambios — form ya OK)
src/app/(public)/work-with-us/page.tsx                     ← reemplazar input file por FileUploadField
src/components/layout/Sidebar.tsx                          ← agregar item "Contenido" + "Servicios" en catálogos
package.json                                               ← agregar embla-carousel-* deps
```

---

## Phase 4 — Interactividad pública (sin DB)

**Objetivo:** Que el sitio "viva" como el HTML original — sliders moviendo, header sticky con hide/show, mobile menu, animaciones — sin tocar la base de datos. Reemplazo paulatino de Bootstrap JS y Slick por React equivalents.

**Por qué primero:** Da impacto visual inmediato sin riesgo en la DB. Las páginas ya existen estáticas; agregamos comportamiento.

### Task 4.1: Instalar dependencias de Embla Carousel

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar paquetes**

```bash
npm install embla-carousel-react@^8.6.0 embla-carousel-autoplay@^8.6.0 embla-carousel-ssr@^8.6.0
```

- [ ] **Step 2: Verificar instalación**

```bash
npm ls embla-carousel-react
```

Expected: `embla-carousel-react@8.6.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add embla-carousel for public-site sliders"
```

---

### Task 4.2: Componente `<EmblaSlider>` reusable

**Files:**
- Create: `src/components/public/EmblaSlider.tsx`

- [ ] **Step 1: Escribir el componente**

```tsx
"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Breakpoint = {
  /** CSS media query, e.g. "(min-width: 991px)" */
  query: string;
  /** Slides visible in viewport at this breakpoint */
  slidesToShow: number;
};

type Props = {
  children: ReactNode[];
  /** Default slides shown at smallest breakpoint */
  slidesToShow?: number;
  breakpoints?: Breakpoint[];
  autoplay?: boolean;
  autoplayDelay?: number;
  showDots?: boolean;
  showArrows?: boolean;
  loop?: boolean;
  /** Extra classes for the .embla wrapper (used to scope original Slick CSS) */
  className?: string;
};

export function EmblaSlider({
  children,
  slidesToShow = 1,
  breakpoints = [],
  autoplay = true,
  autoplayDelay = 3000,
  showDots = false,
  showArrows = true,
  loop = true,
  className = "",
}: Props) {
  const plugins = autoplay
    ? [Autoplay({ delay: autoplayDelay, stopOnInteraction: false })]
    : [];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop, align: "start" },
    plugins,
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Compute slide width % from current breakpoint match
  const slideStyle = {
    flex: `0 0 ${100 / slidesToShow}%`,
  };

  return (
    <div className={`embla ${className}`}>
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container" style={{ display: "flex" }}>
          {children.map((child, i) => (
            <div className="embla__slide slide" style={slideStyle} key={i}>
              {child}
            </div>
          ))}
        </div>
      </div>
      {showArrows && (
        <>
          <button
            className="slick-prev slick-arrow"
            type="button"
            onClick={scrollPrev}
            aria-label="Previous"
          >
            <span>&#8249;</span>
          </button>
          <button
            className="slick-next slick-arrow"
            type="button"
            onClick={scrollNext}
            aria-label="Next"
          >
            <span>&#8250;</span>
          </button>
        </>
      )}
      {showDots && (
        <div className="slick-dots">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              className={i === selectedIndex ? "slick-active" : ""}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Reusar las clases CSS de Slick existentes**

`site.css` ya tiene reglas para `.slick-prev`, `.slick-next`, `.slick-dots`, `.slick-active`. El componente las reusa. No tocar CSS.

- [ ] **Step 3: Smoke test inline**

Abrir `src/app/(public)/corporativo/page.tsx`, reemplazar el `<div className="logo-slider">` mobile con:

```tsx
<EmblaSlider slidesToShow={3} autoplay autoplayDelay={3000} loop showArrows={false}>
  {CLIENT_LOGOS.map((logo) => (
    <a href="#" key={logo}>
      <img src={`/site/img/${logo}.webp`} alt={logo} />
    </a>
  ))}
</EmblaSlider>
```

- [ ] **Step 4: Verificar visualmente**

```bash
npm run dev
# abrir http://localhost:3000/corporativo en mobile viewport (375px)
# verificar que los logos roten
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: empty output.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/EmblaSlider.tsx src/app/\(public\)/corporativo/page.tsx
git commit -m "feat(public): add EmblaSlider component, replace Slick logo slider on /corporativo"
```

---

### Task 4.3: StickyHeader con hide-on-scroll

**Files:**
- Create: `src/components/public/StickyHeader.tsx`
- Modify: `src/components/public/Header.tsx`

- [ ] **Step 1: Crear el wrapper**

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps the public Header. Adds .scrolled when window.scrollY > 100,
 * .hidden when scrolling down past 400px (hides on scroll-down, shows
 * on scroll-up). 1:1 with main.js sticky header logic from html_inicial.
 */
export function StickyHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;

    let lastY = window.scrollY;
    let ticking = false;
    const headerHeight = wrapper.offsetHeight;

    const update = () => {
      const y = window.scrollY;
      const isDesktop = window.innerWidth > 991;

      if (y > 100 && isDesktop) {
        if (!wrapper.classList.contains("scrolled")) {
          wrapper.classList.add("scrolled");
          document.body.style.paddingTop = `${headerHeight}px`;
        }
      } else {
        if (wrapper.classList.contains("scrolled")) {
          wrapper.classList.remove("scrolled");
          document.body.style.paddingTop = "0";
        }
      }

      if (y > 400 && isDesktop) {
        if (y > lastY) {
          wrapper.classList.add("hidden");
        } else {
          wrapper.classList.remove("hidden");
        }
      } else {
        wrapper.classList.remove("hidden");
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.body.style.paddingTop = "0";
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
```

- [ ] **Step 2: Envolver Header**

```tsx
// src/components/public/Header.tsx — cambiar el <header> root
import { StickyHeader } from "./StickyHeader";

export function Header() {
  return (
    <StickyHeader>
      <header className="header-area">
        {/* … existing markup unchanged … */}
      </header>
    </StickyHeader>
  );
}
```

- [ ] **Step 3: Smoke test**

```bash
# scroll en cualquier página pública: header debe colapsar a versión scrolled
# scroll down rápido: header se oculta. scroll up: vuelve a aparecer
```

- [ ] **Step 4: Commit**

```bash
git add src/components/public/StickyHeader.tsx src/components/public/Header.tsx
git commit -m "feat(public): port sticky header hide-on-scroll behavior"
```

---

### Task 4.4: MobileMenu drawer

**Files:**
- Create: `src/components/public/MobileMenu.tsx`
- Modify: `src/components/public/Header.tsx`

- [ ] **Step 1: Crear el componente client**

```tsx
"use client";

import { useState, useEffect } from "react";

type SubItem = { href: string; label: string };
type Item = { href: string; label: string; submenu?: SubItem[] };

type Props = { items: Item[] };

export function MobileMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  // Lock body scroll when drawer open (matches original main.js)
  useEffect(() => {
    document.body.classList.toggle("active", open);
    return () => {
      document.body.classList.remove("active");
    };
  }, [open]);

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div
        id="menu-toggle"
        className={open ? "active" : ""}
        onClick={() => setOpen(!open)}
        role="button"
        aria-label="Menú"
        aria-expanded={open}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      <nav id="menu" className={open ? "active" : ""}>
        <ul>
          {items.map((item) => {
            const hasSub = !!item.submenu?.length;
            const isOpen = openSubmenu === item.label;
            return (
              <li
                key={item.label}
                className={
                  hasSub ? `has-submenu ${isOpen ? "active" : ""}` : ""
                }
              >
                {hasSub && (
                  <span
                    onClick={() =>
                      setOpenSubmenu(isOpen ? null : item.label)
                    }
                  />
                )}
                <a href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
                {hasSub && (
                  <ul className={isOpen ? "active" : ""}>
                    {item.submenu!.map((s) => (
                      <li key={s.href}>
                        <a href={s.href} onClick={() => setOpen(false)}>
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Reemplazar el menú estático en Header**

Actualizar `src/components/public/Header.tsx`:

```tsx
import { MobileMenu } from "./MobileMenu";

const NAV = [
  {
    href: "/destinos",
    label: "DESTINOS",
    submenu: [
      { href: "/destinos/africa", label: "África" },
      { href: "/destinos/america-del-sur", label: "América del Sur" },
      { href: "/destinos/america-del-norte", label: "América del Norte" },
      { href: "/destinos/asia", label: "Asia" },
      { href: "/destinos/europa", label: "Europa" },
      { href: "/destinos/caribe-y-centroamerica", label: "Caribe y Centroamérica" },
    ],
  },
  { href: "/corporativo", label: "CORPORATIVO" },
  { href: "/about", label: "NOSOTROS" },
  { href: "/contact", label: "CONTACTO" },
];
```

Reemplazar el `<div className="mainmenu">…</div>` y `#menu-toggle` por `<MobileMenu items={NAV} />`. Mantener el wrapper `<div className="header-menu">`.

- [ ] **Step 3: Smoke test**

```bash
# resize browser a <991px width
# click en hamburger → drawer abre
# click en DESTINOS → submenu expande/colapsa
# click en cualquier link → drawer cierra y navega
# Esc → drawer cierra
```

- [ ] **Step 4: Commit**

```bash
git add src/components/public/MobileMenu.tsx src/components/public/Header.tsx
git commit -m "feat(public): port mobile hamburger menu with submenu support"
```

---

### Task 4.5: Migrar accordion a Radix

**Files:**
- Create: `src/components/public/RadixAccordion.tsx`
- Modify: `src/components/public/AccordionStatic.tsx` (deprecation alias)
- Modify: `src/app/(public)/terms/page.tsx`

- [ ] **Step 1: Crear el componente con Radix**

```tsx
"use client";

import * as Accordion from "@radix-ui/react-accordion";

export type AccordionItem = {
  id: string;
  title: string;
  bodyHtml: string;
};

type Props = {
  items: AccordionItem[];
  /** Allow multiple open at once (default: false = single) */
  multiple?: boolean;
};

export function RadixAccordion({ items, multiple = false }: Props) {
  const Root: any = Accordion.Root;
  return (
    <div className="faq-accordion style2">
      <Root
        type={multiple ? "multiple" : "single"}
        collapsible={!multiple}
        className="accordion"
      >
        {items.map((item) => (
          <Accordion.Item
            key={item.id}
            value={item.id}
            className="accordion-item"
          >
            <Accordion.Header className="accordion-header">
              <Accordion.Trigger className="accordion-button collapsed">
                {item.title}
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordion-collapse">
              <div
                className="accordion-body"
                dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
              />
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Root>
    </div>
  );
}
```

- [ ] **Step 2: Hacer alias en AccordionStatic**

Reemplazar el contenido de `src/components/public/AccordionStatic.tsx`:

```tsx
export { RadixAccordion as AccordionStatic } from "./RadixAccordion";
export type { AccordionItem } from "./RadixAccordion";
```

(Mantiene compatibilidad con imports existentes en terms/faq pages.)

- [ ] **Step 3: Verificar terms y faq abren bien**

```bash
npm run dev
# /terms: click en cada accordion item → expande/colapsa con animación
# /faq mobile (375px width): mismo comportamiento
```

- [ ] **Step 4: Quitar Bootstrap JS del layout (ya no necesario)**

En `src/app/(public)/layout.tsx`, eliminar el `<Script src="/site/vendors/bootstrap/js/bootstrap.min.js">` y el `import Script from "next/script"`.

- [ ] **Step 5: Verificar que /faq tabs siguen funcionando**

`/faq` desktop usa Bootstrap tabs. Después de quitar Bootstrap JS, las tabs no funcionan. Pasar a Task 4.6.

- [ ] **Step 6: Commit (sólo si Task 4.6 está hecha o tabs siguen siendo Bootstrap)**

```bash
git add src/components/public/RadixAccordion.tsx src/components/public/AccordionStatic.tsx
git commit -m "feat(public): replace Bootstrap accordion with Radix Accordion"
```

---

### Task 4.6: Migrar tabs a Radix en /faq

**Files:**
- Modify: `src/app/(public)/faq/page.tsx`

- [ ] **Step 1: Reescribir desktop tabs con Radix**

Reemplazar el bloque `<div className="d-none d-md-block">` con:

```tsx
"use client";
import * as Tabs from "@radix-ui/react-tabs";

// … TOPICS array unchanged …

const TabsRoot: any = Tabs.Root;

export default function FaqPage() {
  return (
    <>
      {/* banner unchanged */}
      <section className="faq-area">
        <div className="container">
          <div className="d-none d-md-block">
            <TabsRoot defaultValue={TOPICS[0].id} orientation="vertical">
              <div className="row">
                <div className="col-md-4">
                  <div className="faq-tabs">
                    <Tabs.List asChild>
                      <ul id="myTab">
                        {TOPICS.map((t) => (
                          <Tabs.Trigger key={t.id} value={t.id} asChild>
                            <li className="nav-item">
                              <button className="nav-link" type="button">
                                {t.label}{" "}
                                <img src={`/site/img/${t.iconBlue}`} alt="" />
                              </button>
                            </li>
                          </Tabs.Trigger>
                        ))}
                      </ul>
                    </Tabs.List>
                  </div>
                </div>
                <div className="col-md-8">
                  <div className="faq-tab-content">
                    <div className="tab-content">
                      {TOPICS.map((t) => (
                        <Tabs.Content key={t.id} value={t.id}>
                          <div
                            className="plain-content"
                            dangerouslySetInnerHTML={{ __html: t.bodyHtml }}
                          />
                        </Tabs.Content>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsRoot>
          </div>
          {/* mobile accordion unchanged - already RadixAccordion via Task 4.5 */}
        </div>
      </section>
    </>
  );
}
```

Nota: la página debe convertirse a `"use client"` o sacar el `metadata` export.

- [ ] **Step 2: Override CSS para que Radix Tabs renderee como Bootstrap**

Radix Tabs renders divs con `[data-state="active"]` en lugar de las clases `.active`/`.show`. Agregar al final de `site.css`:

```css
/* Radix Tabs adapter for the Bootstrap-styled .nav-link in /faq */
.faq-tabs [data-state="active"] .nav-link {
  /* same rules as original .nav-link.active */
  /* Inspect existing CSS for .faq-tabs .nav-link.active and copy here */
}
```

(Inspeccionar las reglas existentes en site.css buscando `.faq-tabs` o `.nav-link.active` y duplicar bajo el selector `[data-state="active"]`.)

- [ ] **Step 3: Smoke test**

```bash
# /faq desktop: click en cada tab del sidebar → contenido cambia con highlight rojo
```

- [ ] **Step 4: Commit (junto con Task 4.5)**

```bash
git add src/app/\(public\)/faq/page.tsx src/app/\(public\)/site.css src/app/\(public\)/layout.tsx
git commit -m "feat(public): replace Bootstrap tabs with Radix on /faq, drop Bootstrap JS"
```

---

### Task 4.7: Typewriter para `.anim-text`

**Files:**
- Create: `src/components/public/Typewriter.tsx`
- Modify: `src/app/(public)/corporativo/page.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  speedMs?: number;
  className?: string;
  /** HTML tag to render — defaults to span */
  as?: keyof JSX.IntrinsicElements;
};

export function Typewriter({
  text,
  speedMs = 80,
  className = "",
  as: Tag = "span",
}: Props) {
  const [shown, setShown] = useState("");
  const idxRef = useRef(0);

  useEffect(() => {
    setShown("");
    idxRef.current = 0;
    const id = setInterval(() => {
      idxRef.current += 1;
      setShown(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  // @ts-expect-error - dynamic tag with className
  return <Tag className={className}>{shown}</Tag>;
}
```

- [ ] **Step 2: Usar en corporativo**

En `src/app/(public)/corporativo/page.tsx`, reemplazar:

```tsx
<h1 className="hero-text anim-text">
  Viajes que impulsan negocios.
</h1>
```

por:

```tsx
<Typewriter
  as="h1"
  className="hero-text"
  text="Viajes que impulsan negocios."
  speedMs={80}
/>
```

- [ ] **Step 3: Smoke test**

`/corporativo` → el hero text aparece letra por letra.

- [ ] **Step 4: Commit**

```bash
git add src/components/public/Typewriter.tsx src/app/\(public\)/corporativo/page.tsx
git commit -m "feat(public): add Typewriter effect on /corporativo hero"
```

---

### Task 4.8: PassengerCounter

**Files:**
- Create: `src/components/public/PassengerCounter.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

type Counts = { adultos: number; ninos: number; infantes: number };

type Props = {
  /** Hidden field name -- value submitted as "adultos:N|ninos:N|infantes:N" */
  name?: string;
  initial?: Counts;
};

export function PassengerCounter({
  name = "pasajeros",
  initial = { adultos: 1, ninos: 0, infantes: 0 },
}: Props) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>(initial);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const total = counts.adultos + counts.ninos + counts.infantes;
  const adjust = (k: keyof Counts, delta: number) =>
    setCounts((c) => ({ ...c, [k]: Math.max(0, c[k] + delta) }));

  const serialized = `adultos:${counts.adultos}|ninos:${counts.ninos}|infantes:${counts.infantes}`;

  return (
    <div className="passenger-select" ref={ref}>
      <input type="hidden" name={name} value={serialized} />
      <div className="passenger-input" onClick={() => setOpen(!open)}>
        <span>{total > 0 ? `${total} Pasajeros` : "0 Pasajeros"}</span>
      </div>
      {open && (
        <div className="passenger-dropdown" style={{ display: "block" }}>
          {(
            [
              ["adultos", "Adultos"],
              ["ninos", "Niños (>2)"],
              ["infantes", "Menores (<2)"],
            ] as const
          ).map(([k, label]) => (
            <div className="counter" key={k}>
              <span>{label}</span>
              <button
                type="button"
                onClick={() => adjust(k, -1)}
                aria-label={`menos ${label}`}
              >
                −
              </button>
              <span className={`${k}Count`}>{counts[k]}</span>
              <button
                type="button"
                onClick={() => adjust(k, 1)}
                aria-label={`más ${label}`}
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Reservado para usar en /cotizar y QuoteSidebar (Fase 6)**

No usar en este paso — solo crear el componente.

- [ ] **Step 3: Commit**

```bash
git add src/components/public/PassengerCounter.tsx
git commit -m "feat(public): add PassengerCounter component (used in Fase 6 quote forms)"
```

---

### Task 4.9: DateRangePicker

**Files:**
- Create: `src/components/public/DateRangePicker.tsx`
- Modify: `src/app/(public)/site.css` — agregar estilos

- [ ] **Step 1: Crear el componente**

```tsx
"use client";

import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

type Props = {
  /** Hidden form fields written as ISO strings */
  nameFrom?: string;
  nameTo?: string;
  placeholder?: string;
};

export function DateRangePicker({
  nameFrom = "fechaDesde",
  nameTo = "fechaHasta",
  placeholder = "Seleccioná las fechas",
}: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  const display =
    range?.from && range?.to
      ? `${format(range.from, "dd MMM yyyy", { locale: es })} - ${format(range.to, "dd MMM yyyy", { locale: es })}`
      : range?.from
        ? `${format(range.from, "dd MMM yyyy", { locale: es })} - …`
        : placeholder;

  return (
    <div className="date-range-picker" style={{ position: "relative" }}>
      <input type="hidden" name={nameFrom} value={range?.from?.toISOString() ?? ""} />
      <input type="hidden" name={nameTo} value={range?.to?.toISOString() ?? ""} />
      <input
        type="text"
        readOnly
        value={display}
        onClick={() => setOpen(!open)}
        placeholder={placeholder}
        className="date-range-display"
      />
      {open && (
        <div className="date-range-popup">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            locale={es}
            numberOfMonths={1}
          />
          <div style={{ textAlign: "right", padding: 8 }}>
            <button type="button" onClick={() => setOpen(false)}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Estilar para que coincida con Litepicker**

Apender al final de `src/app/(public)/site.css`:

```css
/* react-day-picker — visual parity with original Litepicker styling.
   Only override the few selectors that differ; the lib's default CSS
   already covers most of it. */
.date-range-picker .date-range-popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.rdp {
  --rdp-accent-color: #785AE5;
  --rdp-background-color: rgba(120, 90, 229, 0.1);
}
```

- [ ] **Step 3: Reservado para uso en Fase 6** (QuoteSidebar y /cotizar)

- [ ] **Step 4: Commit**

```bash
git add src/components/public/DateRangePicker.tsx src/app/\(public\)/site.css
git commit -m "feat(public): add DateRangePicker (react-day-picker) — used in Fase 6 quote forms"
```

---

### Task 4.10: FileUploadField estilizado

**Files:**
- Create: `src/components/public/FileUploadField.tsx`
- Modify: `src/app/(public)/work-with-us/page.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";

import { useRef, useState } from "react";

type Props = {
  name: string;
  accept?: string;
  required?: boolean;
  iconSrc?: string;
  placeholderTitle?: string;
  defaultLabel?: string;
};

export function FileUploadField({
  name,
  accept = ".pdf,.doc,.docx",
  required,
  iconSrc = "/site/img/file-cv.svg",
  placeholderTitle = "Adjuntá tu CV *",
  defaultLabel = "Explorar",
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="file-up">
      <input
        ref={ref}
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      <span className="placeholder-title">{placeholderTitle}</span>
      <div className="inner">
        <img src={iconSrc} alt="" />
        <span className="file-label">{fileName ?? defaultLabel}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Usar en work-with-us**

Reemplazar el bloque `<div className="file-up">…</div>` actual por:

```tsx
<FileUploadField name="cv" required />
```

Eliminar el `useRef` + `useState` del componente padre que ya no se usan.

- [ ] **Step 3: Commit**

```bash
git add src/components/public/FileUploadField.tsx src/app/\(public\)/work-with-us/page.tsx
git commit -m "refactor(public): extract FileUploadField from work-with-us"
```

---

### Task 4.11: Verificación final Phase 4

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: empty output.

- [ ] **Step 2: Smoke test todas las páginas**

```bash
npm run dev
# /, /about, /contact, /work-with-us, /corporativo, /terms, /faq, /backend/login
# verificar:
# - sticky header sticky/hide funciona
# - mobile menu abre/cierra (375px viewport)
# - /corporativo: typewriter en hero, slider de logos en mobile
# - /terms: accordion abre/cierra
# - /faq desktop: tabs cambian; mobile: accordion
# - /work-with-us: file upload muestra nombre del archivo elegido
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

**Phase 4 done.** Sitio público se siente idéntico al HTML original. La DB no se tocó.

---

## Phase 5A — Schema Prisma (modelos públicos)

**Objetivo:** Agregar todos los modelos necesarios para el contenido editable y los datos públicos del paquete. Una sola migration aplicada a Railway.

### Task 5A.1: Editar prisma/schema.prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar enums (después de los existentes en líneas 14-40)**

```prisma
enum EstadoMensaje {
  NUEVO
  LEIDO
  RESPONDIDO
  CERRADA
}

enum CanalContacto {
  LLAMADA
  EMAIL
  WHATSAPP
}
```

- [ ] **Step 2: Agregar campos públicos al model Paquete**

Modificar `model Paquete {}` para agregar (después de `campana String?`):

```prisma
  slug              String?
  publicado         Boolean       @default(false)
  metaTitle         String?
  metaDescription   String?       @db.Text
  heroImage         String?
  textoIncluye      String?       @db.Text
  precioDesde       Float?
  precioDesdeMoneda String?       @default("USD")
```

Y al final de las `relations` agregar:

```prisma
  serviciosIncluidos PaqueteServicio[]
  testimonios        Testimonio[]
  cotizaciones       Cotizacion[]
```

Y agregar el unique index:

```prisma
  @@unique([slug])
```

- [ ] **Step 3: Agregar campos públicos a Region**

```prisma
model Region {
  // … existing fields …
  heroImage   String?
  descripcion String?  @db.Text
  // …
}
```

- [ ] **Step 4: Agregar models nuevos al final del archivo (antes del IdCounter)**

```prisma
// ──────────────────────────────────────────────
// Public site editable content
// ──────────────────────────────────────────────

model SiteSetting {
  key       String   @id
  value     String   @db.Text
  type      String   @default("text")  // "text" | "textarea" | "image_url" | "number" | "url"
  label     String?
  group     String?  // "home" | "general" | "corporativo" | etc.
  updatedAt DateTime @updatedAt
}

model Testimonio {
  id        String   @id @default(cuid())
  paqueteId String?
  ubicacion String
  titulo    String
  texto     String   @db.Text
  rating    Int      @default(5)
  autor     String
  imageUrl  String?
  publicado Boolean  @default(true)
  orden     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  paquete   Paquete? @relation(fields: [paqueteId], references: [id])
  @@index([publicado])
  @@index([orden])
}

model CategoriaDestacada {
  id        String   @id @default(cuid())
  titulo    String
  imagen    String   // /site/img/slider-N.webp or external URL
  link      String   // e.g. "/destinos?tipo=lunas-de-miel"
  orden     Int      @default(0)
  activa    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([activa])
}

model CatalogoServicio {
  id          String   @id @default(cuid())
  nombre      String   @unique
  icon        String   // "flight" | "bag" | "bus" | "bed" | "exc" | "shield" | …
  descripcion String?
  orden       Int      @default(0)
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  paquetes    PaqueteServicio[]
  @@index([activo])
}

model PaqueteServicio {
  id          String  @id @default(cuid())
  paqueteId   String
  servicioId  String
  textoCustom String?
  orden       Int     @default(0)
  paquete     Paquete          @relation(fields: [paqueteId], references: [id], onDelete: Cascade)
  servicio    CatalogoServicio @relation(fields: [servicioId], references: [id])
  @@unique([paqueteId, servicioId])
  @@index([paqueteId])
}

// ──────────────────────────────────────────────
// Public form submissions (deferred — only models exist; actions still stub)
// ──────────────────────────────────────────────

model Cotizacion {
  id              String         @id @default(cuid())
  paqueteId       String?
  nombre          String
  email           String
  telefono        String?
  paisCodigo      String?
  fechaDesde      DateTime?
  fechaHasta      DateTime?
  adultos         Int            @default(0)
  ninos           Int            @default(0)
  infantes        Int            @default(0)
  preferencia     CanalContacto?
  comentarios     String?        @db.Text
  origen          String?
  aceptaPromos    Boolean        @default(false)
  estado          EstadoMensaje  @default(NUEVO)
  asignadoAUserId String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  paquete         Paquete?       @relation(fields: [paqueteId], references: [id])
  @@index([estado])
  @@index([createdAt])
}

model MensajeContacto {
  id          String        @id @default(cuid())
  nombre      String
  email       String
  telefono    String?
  comentarios String        @db.Text
  estado      EstadoMensaje @default(NUEVO)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@index([estado])
}

model ContactoCorporativo {
  id          String        @id @default(cuid())
  nombre      String
  email       String
  telefono    String?
  cargo       String?
  empresa     String
  comentarios String?       @db.Text
  estado      EstadoMensaje @default(NUEVO)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@index([estado])
}

model Postulacion {
  id         String        @id @default(cuid())
  nombre     String
  email      String
  telefono   String?
  motivacion String        @db.Text
  cvUrl      String
  cvFilename String
  estado     EstadoMensaje @default(NUEVO)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  @@index([estado])
}

model SuscripcionNewsletter {
  id             String    @id @default(cuid())
  email          String    @unique
  source         String?
  active         Boolean   @default(true)
  createdAt      DateTime  @default(now())
  unsubscribedAt DateTime?
  @@index([active])
}
```

- [ ] **Step 5: Generar Prisma Client**

```bash
npx prisma generate
```

Expected: "✔ Generated Prisma Client"

- [ ] **Step 6: Crear migration (revisión SQL antes de aplicar)**

```bash
npx prisma migrate dev --name add_public_models --create-only
```

Esto crea `prisma/migrations/<timestamp>_add_public_models/migration.sql` SIN aplicar a la DB.

- [ ] **Step 7: Revisar el SQL generado**

```bash
cat prisma/migrations/*_add_public_models/migration.sql
```

Verificar que solo hay `CREATE TABLE`, `ALTER TABLE … ADD COLUMN`, `CREATE INDEX` (operaciones aditivas, no destructivas).

- [ ] **Step 8: Aplicar a la DB de Railway (con confirmación del user)**

⚠️ **PUNTO DE COORDINACIÓN CON USUARIO** — ejecutar solo con su OK explícito.

```bash
npx prisma migrate deploy
```

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add public-site models (SiteSetting, Testimonio, CategoriaDestacada, CatalogoServicio, PaqueteServicio, Cotizacion, MensajeContacto, ContactoCorporativo, Postulacion, SuscripcionNewsletter) and Paquete public-copy fields"
```

---

### Task 5A.2: Seed inicial de SiteSetting + CategoriaDestacada + CatalogoServicio

**Files:**
- Create: `prisma/seed-public.ts`
- Modify: `package.json` (script)

- [ ] **Step 1: Crear el seeder**

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SETTINGS: Array<{ key: string; value: string; type?: string; group?: string; label?: string }> = [
  { key: "home_hero_title", value: "Diseñamos tu viaje, creamos tu historia.", group: "home", label: "Título principal del hero" },
  { key: "home_hero_subtitle", value: "Experiencias únicas hechas a tu medida.", group: "home", label: "Subtítulo del hero" },
  { key: "home_hero_cta_text", value: "Ver más", group: "home", label: "Texto del botón CTA" },
  { key: "home_hero_cta_link", value: "/destinos", group: "home", label: "Link del botón CTA" },
  { key: "home_hero_video", value: "/site/video/video-banner-traveloz.mp4", type: "url", group: "home", label: "Video del hero (URL)" },
  { key: "home_categorias_title", value: "", group: "home", label: "Título sobre el slider de categorías" },
  { key: "home_testimonios_title", value: "Relatos de nuestros viajeros", group: "home", label: "Título de la sección de testimonios" },
  { key: "home_newsletter_label", value: "Unite al newsletter", group: "home", label: "Placeholder del input newsletter" },
  { key: "home_newsletter_button", value: "Suscribirse", group: "home", label: "Texto del botón newsletter" },
  { key: "general_whatsapp", value: "https://wa.me/59899000000", type: "url", group: "general", label: "Link de WhatsApp" },
  { key: "general_email", value: "info@traveloz.com.uy", group: "general", label: "Email principal" },
  { key: "general_phone", value: "+598 2628 1717", group: "general", label: "Teléfono" },
  { key: "general_address", value: "Av. Dr. Luis Alberto de Herrera 1343 Of. 301 - Edificio Trade Plaza", group: "general", label: "Dirección" },
  { key: "general_hours", value: "09:30 AM - 18:30 PM", group: "general", label: "Horario" },
];

const CATEGORIAS = [
  { titulo: "Lunas de miel", imagen: "/site/img/slider-1.webp", link: "/destinos?tipo=lunas-de-miel", orden: 1 },
  { titulo: "Salidas grupales", imagen: "/site/img/slider-2.webp", link: "/destinos?tipo=salidas-grupales", orden: 2 },
  { titulo: "Cruceros", imagen: "/site/img/slider-3.webp", link: "/destinos?tipo=cruceros", orden: 3 },
];

const SERVICIOS = [
  { nombre: "Pasaje aéreo", icon: "flight", orden: 1 },
  { nombre: "Carry on", icon: "bag", orden: 2 },
  { nombre: "Equipaje en bodega", icon: "bag", orden: 3 },
  { nombre: "Traslados aeropuerto-hotel-aeropuerto", icon: "bus", orden: 4 },
  { nombre: "Alojamiento", icon: "bed", orden: 5 },
  { nombre: "Régimen", icon: "exc", orden: 6 },
  { nombre: "Tasas e impuestos", icon: "shield", orden: 7 },
];

async function main() {
  for (const s of SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value, type: s.type ?? "text", group: s.group, label: s.label },
    });
  }
  console.log(`✔ ${SETTINGS.length} SiteSetting upserted`);

  for (const c of CATEGORIAS) {
    await prisma.categoriaDestacada.upsert({
      where: { id: `seed-${c.orden}` },
      update: {},
      create: { id: `seed-${c.orden}`, ...c },
    });
  }
  console.log(`✔ ${CATEGORIAS.length} CategoriaDestacada upserted`);

  for (const s of SERVICIOS) {
    const existing = await prisma.catalogoServicio.findUnique({ where: { nombre: s.nombre } });
    if (!existing) await prisma.catalogoServicio.create({ data: s });
  }
  console.log(`✔ ${SERVICIOS.length} CatalogoServicio upserted`);
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Agregar script en package.json**

En la sección `scripts`:

```json
"seed:public": "tsx prisma/seed-public.ts"
```

- [ ] **Step 3: Ejecutar seed**

```bash
npm run seed:public
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed-public.ts package.json
git commit -m "feat(prisma): seed initial public-site settings, categorias destacadas, catalogo servicios"
```

---

## Phase 5B — Catálogo de Servicios (admin)

**Objetivo:** Pantalla admin `/backend/catalogos/servicios` con CRUD del CatalogoServicio.

### Task 5B.1: Server actions para CatalogoServicio

**Files:**
- Create: `src/actions/catalogo-servicios.actions.ts`

- [ ] **Step 1: Implementar las acciones**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

const ICONS = ["flight", "bag", "bus", "bed", "exc", "shield", "food", "tax"] as const;
export type ServicioIcon = typeof ICONS[number];
export const AVAILABLE_ICONS = ICONS;

export async function listServicios() {
  return prisma.catalogoServicio.findMany({ orderBy: { orden: "asc" } });
}

export async function createServicio(input: {
  nombre: string;
  icon: string;
  descripcion?: string | null;
  orden?: number;
}) {
  await requireAuth();
  const created = await prisma.catalogoServicio.create({ data: input });
  revalidatePath("/backend/catalogos/servicios");
  return created;
}

export async function updateServicio(
  id: string,
  input: Partial<{ nombre: string; icon: string; descripcion: string | null; orden: number; activo: boolean }>,
) {
  await requireAuth();
  const updated = await prisma.catalogoServicio.update({ where: { id }, data: input });
  revalidatePath("/backend/catalogos/servicios");
  return updated;
}

export async function deleteServicio(id: string) {
  await requireAuth();
  await prisma.catalogoServicio.delete({ where: { id } });
  revalidatePath("/backend/catalogos/servicios");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/catalogo-servicios.actions.ts
git commit -m "feat(actions): add catalogo-servicios server actions"
```

---

### Task 5B.2: Pantalla `/backend/catalogos/servicios`

**Files:**
- Create: `src/app/backend/catalogos/servicios/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx` (agregar item)

- [ ] **Step 1: Crear la página**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listServicios,
  createServicio,
  updateServicio,
  deleteServicio,
  AVAILABLE_ICONS,
} from "@/actions/catalogo-servicios.actions";

type Row = Awaited<ReturnType<typeof listServicios>>[number];

export default function ServiciosCatalogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isPending, start] = useTransition();
  const [draft, setDraft] = useState({ nombre: "", icon: "flight", descripcion: "" });

  const refresh = () => listServicios().then(setRows);
  useEffect(() => { refresh(); }, []);

  const onCreate = () => {
    if (!draft.nombre.trim()) return;
    start(async () => {
      await createServicio(draft);
      setDraft({ nombre: "", icon: "flight", descripcion: "" });
      await refresh();
    });
  };

  const onToggle = (r: Row) =>
    start(async () => {
      await updateServicio(r.id, { activo: !r.activo });
      await refresh();
    });

  const onDelete = (id: string) =>
    start(async () => {
      if (!confirm("¿Eliminar este servicio?")) return;
      await deleteServicio(id);
      await refresh();
    });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Catálogo de servicios incluidos</h1>
      <p className="text-sm text-neutral-500">
        Estos son los servicios que se asignan a cada paquete desde el tab "Frontend".
      </p>

      {/* Create row */}
      <div className="flex gap-3 items-end p-4 bg-white rounded-glass shadow-glass">
        <div className="flex-1">
          <label className="text-label">Nombre</label>
          <input
            value={draft.nombre}
            onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="ej. Pasaje aéreo Mvd-GIG"
          />
        </div>
        <div>
          <label className="text-label">Icono</label>
          <select
            value={draft.icon}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            className="border rounded px-3 py-2"
          >
            {AVAILABLE_ICONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onCreate}
          disabled={isPending || !draft.nombre.trim()}
          className="px-4 py-2 bg-brand-violet-600 text-white rounded"
        >
          + Agregar
        </button>
      </div>

      {/* List */}
      <table className="w-full bg-white rounded-glass shadow-glass overflow-hidden">
        <thead className="bg-neutral-50">
          <tr>
            <th className="text-left px-4 py-2">Icono</th>
            <th className="text-left px-4 py-2">Nombre</th>
            <th className="text-left px-4 py-2">Estado</th>
            <th className="text-right px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-4 py-2">
                <img
                  src={`/site/img/p-${r.icon}-icon.png`}
                  alt={r.icon}
                  className="w-6 h-6"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </td>
              <td className="px-4 py-2">{r.nombre}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onToggle(r)}
                  className={`px-2 py-1 text-xs rounded ${r.activo ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-500"}`}
                >
                  {r.activo ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onDelete(r.id)} className="text-red-600 text-sm">
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Agregar item en Sidebar**

En `src/components/layout/Sidebar.tsx`, dentro del array de items debajo de Catálogos, agregar:

```ts
{ id: "servicios", label: "Servicios", icon: ListChecks, href: "/backend/catalogos/servicios" },
```

(Importar `ListChecks` desde lucide-react si no está.)

- [ ] **Step 3: Smoke test**

```bash
npm run dev
# login en /backend/login con un ADMIN
# ir a /backend/catalogos/servicios
# crear/editar/eliminar funciona; los íconos se renderean cuando existen en /site/img/p-{icon}-icon.png
```

- [ ] **Step 4: Commit**

```bash
git add src/app/backend/catalogos/servicios/page.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(admin): add Servicios catalog CRUD page"
```

---

## Phase 5C — MultiSelectCombobox + Tab "Frontend" en Paquete

**Objetivo:** Componente reusable `<MultiSelectCombobox>` (cmdk + Radix Popover, patrón shadcn/ui) y nuevo tab en el form del paquete admin para editar la copy pública.

### Task 5C.1: MultiSelectCombobox

**Files:**
- Create: `src/components/ui/MultiSelectCombobox.tsx`

- [ ] **Step 1: Implementar el componente**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "cmdk";
import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";

export type Option = { value: string; label: string; icon?: ReactNode };

type Props = {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  /** Optional inline create — called when user types a name that doesn't exist and presses Enter */
  onCreate?: (name: string) => Promise<Option> | Option;
};

export function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar…",
  emptyText = "No se encontraron resultados.",
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.filter((o) => value.includes(o.value));
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="multi-select">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="border rounded px-2 py-1 min-h-[42px] w-full text-left flex flex-wrap gap-1 items-center"
          >
            {selected.length === 0 && (
              <span className="text-neutral-400">{placeholder}</span>
            )}
            {selected.map((s) => (
              <span
                key={s.value}
                className="inline-flex items-center gap-1 bg-brand-violet-50 text-brand-violet-700 text-xs rounded px-2 py-0.5"
              >
                {s.icon}
                {s.label}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(s.value);
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            className="z-[100] bg-white rounded shadow-elevation-16 border w-[var(--radix-popover-trigger-width)]"
          >
            <Command shouldFilter>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar…"
                className="w-full px-3 py-2 border-b outline-none"
              />
              <CommandList className="max-h-72 overflow-y-auto">
                <CommandEmpty className="px-3 py-2 text-sm text-neutral-500">
                  {emptyText}
                </CommandEmpty>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => toggle(o.value)}
                    className="px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-neutral-50 aria-selected:bg-neutral-100"
                  >
                    <input type="checkbox" checked={value.includes(o.value)} readOnly />
                    {o.icon}
                    <span>{o.label}</span>
                  </CommandItem>
                ))}
                {onCreate && query.trim() && !exactMatch && (
                  <CommandItem
                    value={`__create__${query}`}
                    onSelect={async () => {
                      const created = await onCreate(query.trim());
                      onChange([...value, created.value]);
                      setQuery("");
                    }}
                    className="px-3 py-2 cursor-pointer text-brand-violet-600 hover:bg-brand-violet-50 border-t"
                  >
                    + Crear "{query}"
                  </CommandItem>
                )}
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
```

- [ ] **Step 2: Smoke test inline**

Crear `src/app/backend/_test-multiselect/page.tsx` temporal:

```tsx
"use client";
import { useState } from "react";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";

export default function Test() {
  const [v, setV] = useState<string[]>([]);
  return (
    <div className="p-10">
      <MultiSelectCombobox
        options={[
          { value: "a", label: "Opción A" },
          { value: "b", label: "Opción B" },
          { value: "c", label: "Opción C" },
        ]}
        value={v}
        onChange={setV}
      />
    </div>
  );
}
```

Visitar `/backend/_test-multiselect`, verificar selección + búsqueda. Eliminar el folder al confirmar.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/MultiSelectCombobox.tsx
git commit -m "feat(ui): add MultiSelectCombobox component (cmdk + Radix Popover)"
```

---

### Task 5C.2: Server actions del tab Frontend del Paquete

**Files:**
- Create: `src/actions/paquete-frontend.actions.ts`

- [ ] **Step 1: Implementar**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

export async function getPaqueteFrontendData(paqueteId: string) {
  return prisma.paquete.findUnique({
    where: { id: paqueteId },
    select: {
      id: true,
      titulo: true,
      slug: true,
      publicado: true,
      metaTitle: true,
      metaDescription: true,
      heroImage: true,
      textoIncluye: true,
      precioDesde: true,
      precioDesdeMoneda: true,
      fotos: { select: { url: true, alt: true, orden: true }, orderBy: { orden: "asc" } },
      serviciosIncluidos: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          textoCustom: true,
          orden: true,
          servicio: { select: { id: true, nombre: true, icon: true } },
        },
      },
    },
  });
}

export async function updatePaqueteFrontend(
  paqueteId: string,
  data: {
    slug?: string | null;
    publicado?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
    heroImage?: string | null;
    textoIncluye?: string | null;
  },
) {
  await requireAuth();
  const updated = await prisma.paquete.update({ where: { id: paqueteId }, data });
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  return updated;
}

export async function setPaqueteServicios(
  paqueteId: string,
  servicios: Array<{ servicioId: string; textoCustom?: string | null; orden: number }>,
) {
  await requireAuth();
  await prisma.$transaction([
    prisma.paqueteServicio.deleteMany({ where: { paqueteId } }),
    prisma.paqueteServicio.createMany({
      data: servicios.map((s) => ({
        paqueteId,
        servicioId: s.servicioId,
        textoCustom: s.textoCustom ?? null,
        orden: s.orden,
      })),
    }),
  ]);
  revalidatePath(`/backend/paquetes/${paqueteId}`);
}

/**
 * Recalculates Paquete.precioDesde from min(OpcionHotel × PrecioAlojamiento).
 * Call this from package edit save flows that touch hotels or prices.
 */
export async function recalcPaquetePrecioDesde(paqueteId: string) {
  await requireAuth();
  const opciones = await prisma.opcionHotel.findMany({
    where: { destino: { paqueteId } },
    include: {
      alojamiento: {
        include: {
          precios: { select: { precioPorNoche: true } },
        },
      },
    },
  });
  const allPrices = opciones.flatMap((o) =>
    o.alojamiento.precios.map((p) => p.precioPorNoche),
  );
  const min = allPrices.length > 0 ? Math.min(...allPrices) : null;
  await prisma.paquete.update({
    where: { id: paqueteId },
    data: { precioDesde: min },
  });
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  return min;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/paquete-frontend.actions.ts
git commit -m "feat(actions): paquete frontend (slug/SEO/heroImage/servicios) actions"
```

---

### Task 5C.3: Tab "Frontend" en el form del Paquete

**Files:**
- Create: `src/app/backend/paquetes/[slug]/_components/FrontendTab.tsx`
- Modify: `src/app/backend/paquetes/[slug]/page.tsx` (agregar tab a la nav)

- [ ] **Step 1: Crear el FrontendTab**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { MultiSelectCombobox, type Option } from "@/components/ui/MultiSelectCombobox";
import {
  getPaqueteFrontendData,
  updatePaqueteFrontend,
  setPaqueteServicios,
} from "@/actions/paquete-frontend.actions";
import { listServicios, createServicio } from "@/actions/catalogo-servicios.actions";

type Servicio = { id: string; nombre: string; icon: string };

export function FrontendTab({ paqueteId }: { paqueteId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getPaqueteFrontendData>> | null>(null);
  const [catalog, setCatalog] = useState<Servicio[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({
    slug: "",
    publicado: false,
    metaTitle: "",
    metaDescription: "",
    heroImage: "",
    textoIncluye: "",
  });

  useEffect(() => {
    Promise.all([getPaqueteFrontendData(paqueteId), listServicios()]).then(
      ([d, s]) => {
        if (d) {
          setData(d);
          setForm({
            slug: d.slug ?? "",
            publicado: d.publicado,
            metaTitle: d.metaTitle ?? "",
            metaDescription: d.metaDescription ?? "",
            heroImage: d.heroImage ?? "",
            textoIncluye: d.textoIncluye ?? "",
          });
          setSelected(d.serviciosIncluidos.map((x) => x.servicio.id));
        }
        setCatalog(s);
      },
    );
  }, [paqueteId]);

  const options: Option[] = catalog
    .filter((s: any) => s.activo !== false)
    .map((s) => ({
      value: s.id,
      label: s.nombre,
      icon: <img src={`/site/img/p-${s.icon}-icon.png`} alt="" className="w-4 h-4" />,
    }));

  const onSave = () =>
    start(async () => {
      await updatePaqueteFrontend(paqueteId, form);
      await setPaqueteServicios(
        paqueteId,
        selected.map((id, i) => ({ servicioId: id, orden: i })),
      );
      alert("Cambios guardados");
    });

  if (!data) return <div className="p-6">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold">Contenido público (Frontend)</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-label">URL pública (slug)</label>
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="ej. buzios-7-noches"
            className="w-full border rounded px-3 py-2"
          />
          <p className="text-xs text-neutral-500 mt-1">/destinos/[region]/{form.slug || "<slug>"}</p>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="publicado"
            checked={form.publicado}
            onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
          />
          <label htmlFor="publicado">Visible en el sitio público</label>
        </div>
      </div>

      <div>
        <label className="text-label">Meta title (SEO)</label>
        <input
          value={form.metaTitle}
          onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
          className="w-full border rounded px-3 py-2"
          maxLength={60}
        />
      </div>

      <div>
        <label className="text-label">Meta description (SEO)</label>
        <textarea
          value={form.metaDescription}
          onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows={2}
          maxLength={160}
        />
      </div>

      <div>
        <label className="text-label">Hero image (URL)</label>
        <select
          value={form.heroImage}
          onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">— Seleccionar de la galería —</option>
          {data.fotos.map((f) => (
            <option key={f.url} value={f.url}>{f.alt || f.url}</option>
          ))}
        </select>
        {form.heroImage && (
          <img src={form.heroImage} alt="" className="mt-2 max-h-48 rounded" />
        )}
      </div>

      <div>
        <label className="text-label">Texto introductorio "Incluye"</label>
        <textarea
          value={form.textoIncluye}
          onChange={(e) => setForm({ ...form, textoIncluye: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      <div>
        <label className="text-label">Servicios incluidos</label>
        <MultiSelectCombobox
          options={options}
          value={selected}
          onChange={setSelected}
          placeholder="Agregar servicios…"
          onCreate={async (name) => {
            const created = await createServicio({ nombre: name, icon: "flight" });
            setCatalog((c) => [...c, { id: created.id, nombre: created.nombre, icon: created.icon }]);
            return {
              value: created.id,
              label: created.nombre,
              icon: <img src={`/site/img/p-${created.icon}-icon.png`} alt="" className="w-4 h-4" />,
            };
          }}
        />
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onSave}
          disabled={isPending}
          className="px-6 py-2 bg-brand-violet-600 text-white rounded"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Conectar al tab system del paquete page**

En `src/app/backend/paquetes/[slug]/page.tsx`, donde están las tabs (Datos, Servicios, Alojamientos, Precios, Fotos, Publicación), agregar una nueva entry "Frontend":

```tsx
import { FrontendTab } from "./_components/FrontendTab";

// dentro del switch/case de tabs:
{tab === "frontend" && <FrontendTab paqueteId={paquete.id} />}
```

Y agregar la pestaña al array de tabs con label "Frontend" → query string `?tab=frontend`.

- [ ] **Step 3: Smoke test**

```bash
npm run dev
# /backend/paquetes/[algun-slug]?tab=frontend
# editar slug, marcar publicado, agregar 3-4 servicios, guardar
# verificar en DB: SELECT * FROM "Paquete" WHERE id = '...';
# verificar PaqueteServicio rows
```

- [ ] **Step 4: Commit**

```bash
git add src/app/backend/paquetes/\[slug\]/_components/FrontendTab.tsx src/app/backend/paquetes/\[slug\]/page.tsx
git commit -m "feat(admin): Frontend tab on Paquete edit page (slug/SEO/heroImage/servicios)"
```

---

## Phase 5D — Módulo "Frontend institucional" admin

**Objetivo:** Pantalla `/backend/contenido` con tabs para editar SiteSetting (textos), Testimonios y CategoriaDestacada.

### Task 5D.1: Server actions

**Files:**
- Create: `src/actions/site-settings.actions.ts`
- Create: `src/actions/testimonios.actions.ts`
- Create: `src/actions/categorias-destacadas.actions.ts`

- [ ] **Step 1: site-settings.actions.ts**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

export async function getSettingsByGroup(group: string) {
  const list = await prisma.siteSetting.findMany({ where: { group }, orderBy: { key: "asc" } });
  return list;
}

export async function getSetting(key: string) {
  return prisma.siteSetting.findUnique({ where: { key } });
}

export async function updateSettings(updates: Array<{ key: string; value: string }>) {
  await requireAuth();
  await prisma.$transaction(
    updates.map((u) =>
      prisma.siteSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      }),
    ),
  );
  revalidatePath("/backend/contenido");
  revalidatePath("/", "layout"); // bust public site cache
}
```

- [ ] **Step 2: testimonios.actions.ts**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

export async function listTestimonios() {
  return prisma.testimonio.findMany({ orderBy: { orden: "asc" } });
}

export async function createTestimonio(input: {
  ubicacion: string;
  titulo: string;
  texto: string;
  autor: string;
  rating?: number;
  imageUrl?: string | null;
}) {
  await requireAuth();
  const created = await prisma.testimonio.create({ data: input });
  revalidatePath("/backend/contenido");
  revalidatePath("/", "layout");
  return created;
}

export async function updateTestimonio(
  id: string,
  input: Partial<{ ubicacion: string; titulo: string; texto: string; autor: string; rating: number; imageUrl: string | null; publicado: boolean; orden: number }>,
) {
  await requireAuth();
  const updated = await prisma.testimonio.update({ where: { id }, data: input });
  revalidatePath("/backend/contenido");
  revalidatePath("/", "layout");
  return updated;
}

export async function deleteTestimonio(id: string) {
  await requireAuth();
  await prisma.testimonio.delete({ where: { id } });
  revalidatePath("/backend/contenido");
  revalidatePath("/", "layout");
}
```

- [ ] **Step 3: categorias-destacadas.actions.ts**

(Estructura idéntica a testimonios pero con campos `titulo`, `imagen`, `link`, `orden`, `activa`.)

- [ ] **Step 4: Commit**

```bash
git add src/actions/site-settings.actions.ts src/actions/testimonios.actions.ts src/actions/categorias-destacadas.actions.ts
git commit -m "feat(actions): site-settings, testimonios, categorias-destacadas CRUD actions"
```

---

### Task 5D.2: Página `/backend/contenido` con tabs

**Files:**
- Create: `src/app/backend/contenido/page.tsx`
- Create: `src/app/backend/contenido/_components/InicioTab.tsx`
- Create: `src/app/backend/contenido/_components/TestimoniosTab.tsx`
- Create: `src/app/backend/contenido/_components/CategoriasTab.tsx`
- Create: `src/app/backend/contenido/_components/GeneralTab.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Page con Radix Tabs**

```tsx
"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { InicioTab } from "./_components/InicioTab";
import { TestimoniosTab } from "./_components/TestimoniosTab";
import { CategoriasTab } from "./_components/CategoriasTab";
import { GeneralTab } from "./_components/GeneralTab";

const TABS = [
  { id: "inicio", label: "Inicio", Component: InicioTab },
  { id: "testimonios", label: "Testimonios", Component: TestimoniosTab },
  { id: "categorias", label: "Categorías destacadas", Component: CategoriasTab },
  { id: "general", label: "General", Component: GeneralTab },
];

const TabsRoot: any = Tabs.Root;

export default function ContenidoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Frontend institucional</h1>
      <p className="text-sm text-neutral-500">
        Acá editás los textos y contenidos del sitio público que no son paquetes.
      </p>

      <TabsRoot defaultValue="inicio">
        <Tabs.List className="flex gap-2 border-b">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-brand-violet-600 data-[state=active]:text-brand-violet-700"
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {TABS.map((t) => (
          <Tabs.Content key={t.id} value={t.id} className="pt-6">
            <t.Component />
          </Tabs.Content>
        ))}
      </TabsRoot>
    </div>
  );
}
```

- [ ] **Step 2: InicioTab — form de SiteSetting con group="home"**

```tsx
"use client";
import { useEffect, useState, useTransition } from "react";
import { getSettingsByGroup, updateSettings } from "@/actions/site-settings.actions";

type Setting = Awaited<ReturnType<typeof getSettingsByGroup>>[number];

export function InicioTab() {
  const [items, setItems] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isPending, start] = useTransition();

  useEffect(() => {
    getSettingsByGroup("home").then(setItems);
  }, []);

  const onSave = () =>
    start(async () => {
      await updateSettings(Object.entries(edits).map(([key, value]) => ({ key, value })));
      setEdits({});
      const fresh = await getSettingsByGroup("home");
      setItems(fresh);
    });

  return (
    <div className="space-y-4 max-w-2xl">
      {items.map((it) => {
        const current = edits[it.key] ?? it.value;
        const isTextarea = it.type === "textarea" || it.value.length > 80;
        return (
          <div key={it.key}>
            <label className="text-label">{it.label ?? it.key}</label>
            {isTextarea ? (
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={3}
                value={current}
                onChange={(e) => setEdits({ ...edits, [it.key]: e.target.value })}
              />
            ) : (
              <input
                className="w-full border rounded px-3 py-2"
                value={current}
                onChange={(e) => setEdits({ ...edits, [it.key]: e.target.value })}
              />
            )}
          </div>
        );
      })}
      <button
        onClick={onSave}
        disabled={isPending || Object.keys(edits).length === 0}
        className="px-6 py-2 bg-brand-violet-600 text-white rounded disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: TestimoniosTab — tabla CRUD**

(Copy-paste pattern de Catalogo Servicios but with fields ubicacion/titulo/texto/autor/rating/imageUrl/publicado/orden. Use a modal or inline form for new/edit. Reuse server actions from Step 1.)

```tsx
"use client";
import { useEffect, useState, useTransition } from "react";
import {
  listTestimonios,
  createTestimonio,
  updateTestimonio,
  deleteTestimonio,
} from "@/actions/testimonios.actions";

type Row = Awaited<ReturnType<typeof listTestimonios>>[number];

export function TestimoniosTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [, start] = useTransition();
  const [draft, setDraft] = useState({
    ubicacion: "",
    titulo: "",
    texto: "",
    autor: "",
    rating: 5,
    imageUrl: "",
  });

  const refresh = () => listTestimonios().then(setRows);
  useEffect(() => { refresh(); }, []);

  const onSubmit = () =>
    start(async () => {
      if (editing) {
        await updateTestimonio(editing.id, draft);
      } else {
        await createTestimonio(draft);
      }
      setShowForm(false);
      setEditing(null);
      setDraft({ ubicacion: "", titulo: "", texto: "", autor: "", rating: 5, imageUrl: "" });
      await refresh();
    });

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="px-4 py-2 bg-brand-violet-600 text-white rounded"
      >
        + Nuevo testimonio
      </button>

      {showForm && (
        <div className="bg-white rounded shadow p-4 space-y-3">
          <input
            placeholder="Ubicación (ej. Punta Cana)"
            value={draft.ubicacion}
            onChange={(e) => setDraft({ ...draft, ubicacion: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <input
            placeholder="Título"
            value={draft.titulo}
            onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            placeholder="Texto"
            value={draft.texto}
            onChange={(e) => setDraft({ ...draft, texto: e.target.value })}
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
          <input
            placeholder="Autor"
            value={draft.autor}
            onChange={(e) => setDraft({ ...draft, autor: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="number"
            min={1}
            max={5}
            value={draft.rating}
            onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
            className="w-32 border rounded px-3 py-2"
          />
          <input
            placeholder="Imagen URL (opcional)"
            value={draft.imageUrl}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <div className="flex gap-2">
            <button onClick={onSubmit} className="px-4 py-2 bg-brand-violet-600 text-white rounded">
              {editing ? "Actualizar" : "Crear"}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-neutral-200 rounded">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <table className="w-full bg-white rounded">
        <thead className="bg-neutral-50">
          <tr>
            <th className="text-left px-3 py-2">Ubicación</th>
            <th className="text-left px-3 py-2">Título</th>
            <th className="text-left px-3 py-2">Autor</th>
            <th className="text-left px-3 py-2">★</th>
            <th className="text-left px-3 py-2">Estado</th>
            <th className="text-right px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.ubicacion}</td>
              <td className="px-3 py-2">{r.titulo}</td>
              <td className="px-3 py-2">{r.autor}</td>
              <td className="px-3 py-2">{r.rating}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => start(async () => { await updateTestimonio(r.id, { publicado: !r.publicado }); await refresh(); })}
                  className={`px-2 py-1 text-xs rounded ${r.publicado ? "bg-green-100 text-green-700" : "bg-neutral-200"}`}
                >
                  {r.publicado ? "Publicado" : "Borrador"}
                </button>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => {
                    setEditing(r);
                    setDraft({
                      ubicacion: r.ubicacion,
                      titulo: r.titulo,
                      texto: r.texto,
                      autor: r.autor,
                      rating: r.rating,
                      imageUrl: r.imageUrl ?? "",
                    });
                    setShowForm(true);
                  }}
                  className="text-blue-600 text-sm mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => start(async () => { if (confirm("¿Eliminar?")) { await deleteTestimonio(r.id); await refresh(); } })}
                  className="text-red-600 text-sm"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: CategoriasTab** — copia exacta del patrón de TestimoniosTab pero con campos `titulo`, `imagen`, `link`, `orden`, `activa`. Reusar pattern.

- [ ] **Step 5: GeneralTab** — idéntico a InicioTab pero `getSettingsByGroup("general")`.

- [ ] **Step 6: Agregar item Sidebar**

```ts
{ id: "contenido", label: "Frontend Web", icon: Globe, href: "/backend/contenido" },
```

- [ ] **Step 7: Smoke test**

`/backend/contenido` con cada tab. Editar settings, agregar testimonio, marcar/despublicar. Verificar en DB.

- [ ] **Step 8: Commit**

```bash
git add src/app/backend/contenido/ src/components/layout/Sidebar.tsx
git commit -m "feat(admin): Frontend institucional module (Inicio/Testimonios/Categorias/General tabs)"
```

---

## Phase 6 — Páginas dinámicas (consume Prisma)

**Objetivo:** Las 4 páginas del sitio público que dependen de DB: home (`/`), regiones (`/destinos`), listing por región (`/destinos/[region]`), detalle de paquete (`/destinos/[region]/[slug]`).

### Task 6.1: Helper de queries cacheadas

**Files:**
- Create: `src/lib/public-data.ts`

- [ ] **Step 1: Implementar**

```ts
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export const getSiteSettings = unstable_cache(
  async (group: string) => {
    const list = await prisma.siteSetting.findMany({ where: { group } });
    return Object.fromEntries(list.map((s) => [s.key, s.value]));
  },
  ["site-settings"],
  { revalidate: 60, tags: ["site-settings"] },
);

export const getCategoriasDestacadas = unstable_cache(
  async () => prisma.categoriaDestacada.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
  ["categorias-destacadas"],
  { revalidate: 60, tags: ["categorias-destacadas"] },
);

export const getTestimoniosPublicados = unstable_cache(
  async () => prisma.testimonio.findMany({ where: { publicado: true }, orderBy: { orden: "asc" } }),
  ["testimonios"],
  { revalidate: 60, tags: ["testimonios"] },
);

export const getRegionesPublicas = unstable_cache(
  async () => prisma.region.findMany({ orderBy: { orden: "asc" } }),
  ["regiones"],
  { revalidate: 300, tags: ["regiones"] },
);

export const getRegionBySlug = unstable_cache(
  async (slug: string) =>
    prisma.region.findFirst({
      where: { slug },
      include: {
        paises: {
          include: { ciudades: true },
        },
      },
    }),
  ["region-by-slug"],
  { revalidate: 300, tags: ["regiones"] },
);

export const getPaquetesByRegion = unstable_cache(
  async (regionId: string) =>
    prisma.paquete.findMany({
      where: {
        publicado: true,
        deletedAt: null,
        destinos: {
          some: {
            ciudad: { pais: { regionId } },
          },
        },
      },
      orderBy: { precioDesde: "asc" },
      include: {
        fotos: { take: 1, orderBy: { orden: "asc" } },
        destinos: {
          orderBy: { orden: "asc" },
          include: { ciudad: true },
        },
      },
    }),
  ["paquetes-by-region"],
  { revalidate: 60, tags: ["paquetes"] },
);

export const getPaqueteBySlug = unstable_cache(
  async (slug: string) =>
    prisma.paquete.findUnique({
      where: { slug },
      include: {
        fotos: { orderBy: { orden: "asc" } },
        serviciosIncluidos: {
          orderBy: { orden: "asc" },
          include: { servicio: true },
        },
        destinos: {
          orderBy: { orden: "asc" },
          include: { ciudad: { include: { pais: { include: { region: true } } } } },
        },
        opcionesHoteleras: {
          include: {
            hoteles: {
              include: {
                alojamiento: {
                  include: {
                    fotos: { orderBy: { orden: "asc" } },
                    precios: { include: { regimen: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ["paquete-by-slug"],
  { revalidate: 60, tags: ["paquetes"] },
);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/public-data.ts
git commit -m "feat(lib): cached Prisma queries for public site"
```

---

### Task 6.2: Home (`/`) — hero + categorias + testimonios + newsletter

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Create: `src/components/public/HomeHero.tsx`
- Create: `src/components/public/HomeCategorias.tsx`
- Create: `src/components/public/HomeTestimonios.tsx`
- Create: `src/components/public/HomeNewsletter.tsx`

- [ ] **Step 1: Reescribir home page como Server Component**

```tsx
import { getSiteSettings, getCategoriasDestacadas, getTestimoniosPublicados } from "@/lib/public-data";
import { HomeHero } from "@/components/public/HomeHero";
import { HomeCategorias } from "@/components/public/HomeCategorias";
import { HomeTestimonios } from "@/components/public/HomeTestimonios";
import { HomeNewsletter } from "@/components/public/HomeNewsletter";

export const metadata = {
  title: "TravelOz — Diseñamos tu viaje, creamos tu historia",
  description:
    "Agencia de viajes en Uruguay. Lunas de miel, salidas grupales, cruceros y más.",
};

export default async function HomePage() {
  const [settings, categorias, testimonios] = await Promise.all([
    getSiteSettings("home"),
    getCategoriasDestacadas(),
    getTestimoniosPublicados(),
  ]);

  return (
    <>
      <HomeHero
        title={settings.home_hero_title ?? "Diseñamos tu viaje, creamos tu historia."}
        subtitle={settings.home_hero_subtitle ?? "Experiencias únicas hechas a tu medida."}
        ctaText={settings.home_hero_cta_text ?? "Ver más"}
        ctaLink={settings.home_hero_cta_link ?? "/destinos"}
        videoUrl={settings.home_hero_video ?? "/site/video/video-banner-traveloz.mp4"}
      />
      <HomeCategorias items={categorias} />
      <HomeTestimonios
        title={settings.home_testimonios_title ?? "Relatos de nuestros viajeros"}
        items={testimonios}
      />
      <HomeNewsletter
        label={settings.home_newsletter_label ?? "Unite al newsletter"}
        button={settings.home_newsletter_button ?? "Suscribirse"}
      />
    </>
  );
}
```

- [ ] **Step 2: HomeHero** (Server Component, JSX 1:1 con `index.html`)

```tsx
type Props = { title: string; subtitle: string; ctaText: string; ctaLink: string; videoUrl: string };

export function HomeHero({ title, subtitle, ctaText, ctaLink, videoUrl }: Props) {
  return (
    <section className="hero-area relative">
      <video className="hero-video" autoPlay muted loop playsInline preload="auto">
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div className="container z-99">
        <div className="hero-inner text-sm-center text-start p_150">
          <h1 className="hero-text">{title}</h1>
          <h3 className="hero-sub-title">{subtitle}</h3>
          <a className="hero-btn" href={ctaLink}>{ctaText}</a>
        </div>
      </div>
    </section>
  );
}
```

Nota: `home page.tsx` también necesita un `<MainWrapperHasHero>` wrapper class para activar los estilos `.has-hero` originales — agregar `className="main-wrapper has-hero"` en `(public)/layout.tsx` solo cuando es la home. Solución: la home agrega `<style>{".main-wrapper { /* override */}"}</style>` o se mueve la clase has-hero al body via setData attribute. Más simple: agregar al final del layout root:

```tsx
// en (public)/layout.tsx, dentro del <div className="main-wrapper has-hero">
// y dejar que la home lo use libremente. Las pages sin hero ya tienen padding correcto.
```

- [ ] **Step 3: HomeCategorias** (client por el slider)

```tsx
"use client";
import { EmblaSlider } from "./EmblaSlider";

type Cat = { id: string; titulo: string; imagen: string; link: string };

export function HomeCategorias({ items }: { items: Cat[] }) {
  return (
    <section className="content-area bg_gray">
      <div className="container wide">
        <EmblaSlider slidesToShow={3} autoplay autoplayDelay={3000} loop className="image-box-slider">
          {items.map((c) => (
            <a href={c.link} className="image-box style1" key={c.id}>
              <img src={c.imagen} alt={c.titulo} />
              <h3 className="title">{c.titulo}</h3>
            </a>
          ))}
        </EmblaSlider>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: HomeTestimonios**

```tsx
"use client";
import { EmblaSlider } from "./EmblaSlider";

type T = { id: string; ubicacion: string; titulo: string; texto: string; autor: string; rating: number; imageUrl: string | null };

export function HomeTestimonios({ title, items }: { title: string; items: T[] }) {
  if (items.length === 0) return null;
  return (
    <section className="content-area">
      <div className="container smalls">
        <div className="text-center">
          <h2 className="section-heading mb_50">{title}</h2>
        </div>
        <EmblaSlider slidesToShow={1} autoplay autoplayDelay={5000} loop className="image-text-slider">
          {items.map((t) => (
            <div key={t.id}>
              <div className="row align-items-center">
                <div className="col-lg-6">
                  <div className="content-image">
                    <img src={t.imageUrl ?? "/site/img/slider-4.webp"} alt="" />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="content-text style1 ps-lg-5">
                    <span className="loacation">
                      <img src="/site/img/map-marker.webp" alt="" />
                      {t.ubicacion}
                    </span>
                    <h3 className="title">{t.titulo}</h3>
                    <div className="expand-wrapper">
                      <div className="expand-content"><p>{t.texto}</p></div>
                    </div>
                    <div className="meta">
                      <ul>
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <li key={i}><i className="fa-solid fa-star"></i></li>
                        ))}
                      </ul>
                      <span className="name">{t.autor}.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </EmblaSlider>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: HomeNewsletter**

```tsx
"use client";
import { useFormState } from "react-dom";
import { submitNewsletterForm } from "@/actions/public-forms.actions";
import { FormStatus } from "./FormStatus";

export function HomeNewsletter({ label, button }: { label: string; button: string }) {
  const [result, action] = useFormState(submitNewsletterForm, null);
  return (
    <section className="content-area relative cta-area">
      <img className="footer-cta-bg" src="/site/img/cta-bg.webp" alt="" />
      <div className="container z-99">
        <div className="site-form style1">
          <form action={action}>
            <label htmlFor="newsletter-email">
              <img src="/site/img/newsletter-icon.svg" alt="" />
            </label>
            <input id="newsletter-email" name="email" type="email" placeholder={label} required />
            <button type="submit">{button}</button>
          </form>
          <FormStatus result={result} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Smoke test**

```bash
npm run dev
# / debe verse 1:1 con html_inicial/index.html
# Hero video corriendo, slider de categorías rotando, testimonios rotando, newsletter form
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(public\)/page.tsx src/components/public/Home*.tsx
git commit -m "feat(public): home page with hero/categorias/testimonios/newsletter from DB"
```

---

### Task 6.3: `/destinos` — grilla de regiones

**Files:**
- Create: `src/app/(public)/destinos/page.tsx`
- Create: `src/components/public/DestinosGrid.tsx`

- [ ] **Step 1: Crear página**

```tsx
import { getRegionesPublicas } from "@/lib/public-data";
import { DestinosGrid } from "@/components/public/DestinosGrid";

export const metadata = {
  title: "Destinos | TravelOz",
  description: "Descubrí todos nuestros destinos por región.",
};

export default async function DestinosPage() {
  const regiones = await getRegionesPublicas();
  return <DestinosGrid regiones={regiones} />;
}
```

- [ ] **Step 2: Componente Grid**

```tsx
type Region = { id: string; slug: string; nombre: string; heroImage: string | null };

export function DestinosGrid({ regiones }: { regiones: Region[] }) {
  return (
    <section className="content-area">
      <div className="container">
        <div className="text-center mb_50">
          <h1 className="section-heading">Nuestros destinos</h1>
        </div>
        <div className="row">
          {regiones.map((r) => (
            <div className="col-lg-4 col-sm-6" key={r.id}>
              <a href={`/destinos/${r.slug}`} className="image-box style1">
                <img src={r.heroImage ?? "/site/img/region-placeholder.webp"} alt={r.nombre} />
                <h3 className="title">{r.nombre}</h3>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/destinos/page.tsx src/components/public/DestinosGrid.tsx
git commit -m "feat(public): /destinos grid of regions"
```

---

### Task 6.4: `/destinos/[region]` — listing de paquetes

**Files:**
- Create: `src/app/(public)/destinos/[region]/page.tsx`
- Create: `src/components/public/PackageCard.tsx`

- [ ] **Step 1: Crear página**

```tsx
import { notFound } from "next/navigation";
import { getRegionBySlug, getPaquetesByRegion } from "@/lib/public-data";
import { PackageCard } from "@/components/public/PackageCard";

export async function generateMetadata({ params }: { params: { region: string } }) {
  const region = await getRegionBySlug(params.region);
  if (!region) return { title: "TravelOz" };
  return {
    title: `${region.nombre} | TravelOz`,
    description: region.descripcion ?? `Paquetes de viaje a ${region.nombre}.`,
  };
}

export default async function RegionListingPage({ params }: { params: { region: string } }) {
  const region = await getRegionBySlug(params.region);
  if (!region) notFound();
  const paquetes = await getPaquetesByRegion(region.id);

  return (
    <section className="content-area">
      <div className="container">
        <div className="banner-text mb_50">
          <h1 className="h1">{region.nombre}</h1>
          {region.descripcion && <p>{region.descripcion}</p>}
        </div>
        {paquetes.length === 0 ? (
          <p className="text-center py-12">Próximamente más destinos en esta región.</p>
        ) : (
          <div className="row">
            {paquetes.map((p) => (
              <div className="col-lg-4 col-md-6" key={p.id}>
                <PackageCard paquete={p} regionSlug={region.slug} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: PackageCard**

```tsx
type P = {
  id: string;
  slug: string | null;
  titulo: string;
  destino: string;
  noches: number;
  salidas: string | null;
  precioDesde: number | null;
  precioDesdeMoneda: string | null;
  heroImage: string | null;
  fotos: { url: string; alt: string }[];
  destinos: { ciudad: { nombre: string } }[];
};

export function PackageCard({ paquete, regionSlug }: { paquete: P; regionSlug: string }) {
  const img = paquete.heroImage ?? paquete.fotos[0]?.url ?? "/site/img/package-placeholder.webp";
  const href = paquete.slug ? `/destinos/${regionSlug}/${paquete.slug}` : "#";
  const ciudades = paquete.destinos.map((d) => d.ciudad.nombre).join(" · ");

  return (
    <a href={href} className="package-card">
      <img src={img} alt={paquete.titulo} />
      <h3 className="title">{paquete.titulo}</h3>
      {ciudades && <p className="ciudades">{ciudades}</p>}
      {paquete.salidas && <p className="salidas">{paquete.salidas}</p>}
      <ul className="incluye-mini">
        <li>Pasaje</li>
        <li>{paquete.noches} noches</li>
        <li>Régimen</li>
      </ul>
      {paquete.precioDesde !== null && (
        <p className="price">
          Desde <strong>{paquete.precioDesdeMoneda} {paquete.precioDesde}</strong>
        </p>
      )}
    </a>
  );
}
```

(Estilos `.package-card` ya existen en site.css o agregar los necesarios mirando `destination-listing.html`.)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/destinos/\[region\]/page.tsx src/components/public/PackageCard.tsx
git commit -m "feat(public): region listing page with package cards"
```

---

### Task 6.5: `/destinos/[region]/[slug]` — detalle del paquete

**Files:**
- Create: `src/app/(public)/destinos/[region]/[slug]/page.tsx`
- Create: `src/app/(public)/destinos/[region]/[slug]/_components/PackageHero.tsx`
- Create: `src/app/(public)/destinos/[region]/[slug]/_components/IncluyeTab.tsx`
- Create: `src/app/(public)/destinos/[region]/[slug]/_components/AlojamientosTab.tsx`
- Create: `src/app/(public)/destinos/[region]/[slug]/_components/QuoteSidebar.tsx`
- Create: `src/app/(public)/destinos/[region]/[slug]/_components/FormasDePago.tsx`

- [ ] **Step 1: Page principal**

```tsx
import { notFound } from "next/navigation";
import { getPaqueteBySlug } from "@/lib/public-data";
import { PackageHero } from "./_components/PackageHero";
import { IncluyeTab } from "./_components/IncluyeTab";
import { AlojamientosTab } from "./_components/AlojamientosTab";
import { QuoteSidebar } from "./_components/QuoteSidebar";
import { FormasDePago } from "./_components/FormasDePago";

export async function generateMetadata({ params }: { params: { region: string; slug: string } }) {
  const p = await getPaqueteBySlug(params.slug);
  if (!p) return { title: "TravelOz" };
  return {
    title: p.metaTitle ?? `${p.titulo} | TravelOz`,
    description: p.metaDescription ?? `Conocé ${p.titulo}, ${p.noches} noches.`,
  };
}

export default async function PackageDetailPage({ params }: { params: { region: string; slug: string } }) {
  const paquete = await getPaqueteBySlug(params.slug);
  if (!paquete || !paquete.publicado) notFound();

  return (
    <>
      <PackageHero paquete={paquete} />
      <section className="content-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="package-tabs">
                <IncluyeTab
                  textoIncluye={paquete.textoIncluye}
                  servicios={paquete.serviciosIncluidos}
                />
                <AlojamientosTab opciones={paquete.opcionesHoteleras} />
              </div>
              <FormasDePago />
            </div>
            <div className="col-lg-4">
              <QuoteSidebar paqueteId={paquete.id} paqueteTitulo={paquete.titulo} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: PackageHero — galería con EmblaSlider**

```tsx
"use client";
import { EmblaSlider } from "@/components/public/EmblaSlider";

type Props = {
  paquete: {
    titulo: string;
    salidas: string | null;
    precioDesde: number | null;
    precioDesdeMoneda: string | null;
    fotos: { url: string; alt: string }[];
    heroImage: string | null;
  };
};

export function PackageHero({ paquete }: Props) {
  const fotos = paquete.heroImage
    ? [{ url: paquete.heroImage, alt: paquete.titulo }, ...paquete.fotos]
    : paquete.fotos;

  return (
    <section className="package-hero">
      <div className="container">
        <div className="package-hero-grid">
          <EmblaSlider slidesToShow={1} autoplay={false} showArrows showDots className="image-slider style3">
            {fotos.map((f) => (
              <img src={f.url} alt={f.alt} key={f.url} />
            ))}
          </EmblaSlider>
          <div className="package-summary">
            <h1>{paquete.titulo}</h1>
            {paquete.salidas && <p>{paquete.salidas}</p>}
            {paquete.precioDesde !== null && (
              <p className="price">
                Desde <strong>{paquete.precioDesdeMoneda} {paquete.precioDesde}</strong>
                <span className="price-note">Por persona en base doble</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: IncluyeTab**

```tsx
type Servicio = {
  id: string;
  textoCustom: string | null;
  servicio: { nombre: string; icon: string };
};

export function IncluyeTab({
  textoIncluye,
  servicios,
}: {
  textoIncluye: string | null;
  servicios: Servicio[];
}) {
  return (
    <div className="tab-pane fade show active">
      <h2>Incluye</h2>
      {textoIncluye && <p>{textoIncluye}</p>}
      <ul className="incluye-list">
        {servicios.map((s) => (
          <li key={s.id}>
            <img src={`/site/img/p-${s.servicio.icon}-icon.png`} alt="" />
            {s.textoCustom ?? s.servicio.nombre}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: AlojamientosTab**

```tsx
type Opciones = Array<{
  id: string;
  nombre: string;
  hoteles: Array<{
    id: string;
    alojamiento: {
      nombre: string;
      categoria: number | null;
      precios: Array<{
        precioPorNoche: number;
        periodoDesde: string;
        periodoHasta: string;
        regimen: { nombre: string; abrev: string } | null;
      }>;
    };
  }>;
}>;

export function AlojamientosTab({ opciones }: { opciones: Opciones }) {
  return (
    <div>
      <h2>Alojamientos</h2>
      {opciones.map((opt) => (
        <div key={opt.id} className="alojamiento-opcion">
          <h3>{opt.nombre}</h3>
          {opt.hoteles.map((h) => (
            <div key={h.id} className="text-box style1">
              <h4>{h.alojamiento.nombre}</h4>
              {h.alojamiento.categoria && (
                <span className="stars">{"★".repeat(h.alojamiento.categoria)}</span>
              )}
              <ul>
                {h.alojamiento.precios.map((p, i) => (
                  <li key={i}>
                    {p.regimen?.nombre ?? "Régimen"} ·{" "}
                    {p.periodoDesde} a {p.periodoHasta} · USD {p.precioPorNoche}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: QuoteSidebar — form sticky con DateRangePicker + PassengerCounter**

```tsx
"use client";
import { useFormState } from "react-dom";
import { submitQuoteForm } from "@/actions/public-forms.actions";
import { DateRangePicker } from "@/components/public/DateRangePicker";
import { PassengerCounter } from "@/components/public/PassengerCounter";
import { FormStatus } from "@/components/public/FormStatus";

export function QuoteSidebar({ paqueteId, paqueteTitulo }: { paqueteId: string; paqueteTitulo: string }) {
  const [result, action] = useFormState(submitQuoteForm, null);
  return (
    <aside className="quote-sidebar sticky-top">
      <h3>Contactate con nosotros</h3>
      <p>Cotización personalizada para {paqueteTitulo}</p>
      <form action={action}>
        <input type="hidden" name="paqueteId" value={paqueteId} />
        <DateRangePicker nameFrom="fechaDesde" nameTo="fechaHasta" placeholder="Fecha del viaje" />
        <PassengerCounter />
        <input name="nombre" placeholder="Nombre *" required />
        <select name="preferencia">
          <option value="">Preferencia de contacto</option>
          <option value="LLAMADA">Llamada</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        <input type="email" name="email" placeholder="Email *" required />
        <input name="telefono" placeholder="Teléfono" />
        <textarea name="comentarios" placeholder="Comentarios" rows={3} />
        <button type="submit" className="contact-btn">Enviar consulta</button>
        <FormStatus result={result} />
      </form>
    </aside>
  );
}
```

- [ ] **Step 6: FormasDePago — hardcoded**

```tsx
export function FormasDePago() {
  return (
    <div className="formas-pago">
      <h3>Formas de pago</h3>
      <ul className="payment-logos">
        {["visa", "mastercard", "amex", "diners"].map((c) => (
          <li key={c}>
            <img src={`/site/img/payment-${c}.webp`} alt={c} />
          </li>
        ))}
      </ul>
      <ul className="bank-logos">
        {["santander", "itau", "bbva", "banco-uruguay"].map((b) => (
          <li key={b}>
            <img src={`/site/img/bank-${b}.webp`} alt={b} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Smoke test**

```bash
# 1. Marcar un paquete con publicado=true en admin /backend/paquetes/[slug]?tab=frontend
# 2. Asignarle un slug (ej. "buzios-7-noches")
# 3. Asignarle servicios
# 4. Visitar /destinos/america-del-sur/buzios-7-noches
# 5. Verificar: hero con galería, tabs Incluye/Alojamientos, sidebar de cotización funciona, formas de pago al final
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(public\)/destinos/\[region\]/\[slug\]/
git commit -m "feat(public): package detail page with hero/incluye/alojamientos/quote-sidebar"
```

---

### Task 6.6: Cotización standalone `/cotizar`

**Files:**
- Create: `src/app/(public)/cotizar/page.tsx`

- [ ] **Step 1: Crear página**

Usar el mismo `<QuoteSidebar>` pattern pero como página completa, sin `paqueteId`. Permitir input de "ciudad de destino" libre. Reusar el server action `submitQuoteForm`.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(public\)/cotizar/page.tsx
git commit -m "feat(public): standalone /cotizar page"
```

---

### Task 6.7: Verificación final + push

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 2: Smoke test completo**

```bash
npm run dev
# /
# /destinos
# /destinos/america-del-sur
# /destinos/america-del-sur/[slug-de-test]
# /cotizar
# /backend/contenido (todas las tabs)
# /backend/catalogos/servicios
# /backend/paquetes/[slug]?tab=frontend
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

**Phase 6 done.** Sitio público completo + admin manageable.

---

## Pendientes deferidos (NO en este plan)

Estos quedaron explícitamente fuera de scope por decisión del usuario:

1. **Persistencia real de forms públicos** — los 5 server actions siguen siendo stubs que solo loggean. Para activarlos: rewrite cada función para insertar en su tabla Prisma respectiva (modelos ya existen tras Phase 5A) + admin pantallas para listar/responder. Memoria: [pending-public-forms.md](.claude/projects/.../memory/pending-public-forms.md).

2. **Email transaccional** — envío de notificación al admin cuando llega una cotización/contacto. Usar Resend o similar. Sin definir aún.

3. **Captcha / antispam** — Cloudflare Turnstile o hCaptcha. Implementar cuando aparezcan los primeros bots.

4. **Multi-brand para sitio público** — el admin es multi-brand; el público es single-tenant TravelOz. Si se quiere abrir destinoicono.com con la misma codebase, agregar `brandId` al schema público + middleware que detecte hostname.

5. **Imágenes optimizadas con next/image** — decisión actual: `<img>` plano para 1:1 con HTML. Si se quiere optimizar después, migrar uno a uno.

---

## Self-review

**Spec coverage:**
- ✅ Phase 4 cubre Embla, sticky header, mobile menu, Radix accordion+tabs, typewriter, passenger counter, date picker, file upload
- ✅ Phase 5A schema con todos los modelos discutidos en conversación
- ✅ Phase 5B catálogo servicios admin
- ✅ Phase 5C MultiSelect + tab Frontend en paquete
- ✅ Phase 5D módulo Frontend institucional con tabs Inicio/Testimonios/Categorias/General
- ✅ Phase 6 home, destinos, listing por región, detalle de paquete, cotizar standalone
- ✅ Forms persistencia deferida explícitamente
- ✅ Memorias referenciadas

**Placeholder scan:**
- ✅ No "TBD", no "TODO", no "fill in details" sin código concreto
- ✅ Cada step tiene comando exacto, código exacto o file path exacto
- Step 4 de Task 4.6 (CSS override de Radix Tabs): dice "inspeccionar las reglas existentes y duplicar bajo `[data-state=active]`" — esto es porque el CSS específico depende del archivo del usuario; instrucción operacional clara
- Task 5D.2 step 4 (CategoriasTab): dice "copia exacta del patrón de TestimoniosTab" — el patrón está completo en step 3, copiar literalmente cambiando los nombres de campos

**Type consistency:**
- ✅ `Paquete.precioDesde` consistente en schema, query, hero component
- ✅ `CatalogoServicio.icon` referenciado consistentemente como path `/site/img/p-${icon}-icon.png`
- ✅ Server action signatures coinciden entre callers

**Riesgos conocidos:**
- Phase 5A.1 step 8 (`prisma migrate deploy` a Railway) requiere coordinación con usuario antes de ejecutar.
- Phase 4.6 (CSS override de Radix Tabs) requiere que el dev inspeccione el CSS existente — si el override no replica todas las reglas, los tabs se verán mal.
- Phase 6.5 (PackageHero, PackageCard, FormasDePago, etc.) asume que existen ciertas imágenes en `/site/img/` (payment-visa.webp, bank-santander.webp, package-placeholder.webp). Si no existen, los `<img>` 404. Verificar contenido actual de `/public/site/img/` y agregar las que falten o ajustar paths.

---

## Execution Handoff

Plan guardado en `docs/planning/frontend.md`. Dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — dispatcho un subagente fresco por task, reviso entre tasks, iteración rápida
2. **Inline Execution** — ejecuto tasks en esta sesión con checkpoints para revisión

**¿Cuál preferís?**
