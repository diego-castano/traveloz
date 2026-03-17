---
phase: 04-paquetes-module
plan: 02
subsystem: ui
tags: [next.js, react, tabs, forms, radix, url-sync, glass-ui]

# Dependency graph
requires:
  - phase: 01-foundation-design-system
    provides: "Tabs, Input, Select, Button, Card, Badge, PageHeader UI components"
  - phase: 03-data-layer-types
    provides: "PackageProvider (usePaqueteById, usePackageActions), CatalogProvider (useTemporadas, useTiposPaquete), AuthProvider (useAuth, canEdit), Paquete type"
provides:
  - "Paquete detail page shell with 5-tab layout and URL sync"
  - "DatosTab edit form for all Paquete scalar fields"
  - "/paquetes/nuevo create page with BORRADOR defaults"
  - "VENDEDOR read-only and redirect guards"
affects: [04-paquetes-module]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL-synced tabs via useSearchParams + router.replace"
    - "Glass textarea styling consistent with Input component"
    - "VENDEDOR guard pattern: useEffect redirect for create, readOnly for edit"

key-files:
  created:
    - src/app/(admin)/paquetes/[slug]/page.tsx
    - src/app/(admin)/paquetes/[slug]/_components/DatosTab.tsx
    - src/app/(admin)/paquetes/nuevo/page.tsx
  modified: []

key-decisions:
  - "Tab URL sync uses router.replace with scroll:false to avoid navigation history pollution"
  - "nuevo/ is a static sibling to [slug]/ for correct Next.js App Router route matching"
  - "DatosTab uses local useState initialized from paquete prop (not controlled by parent)"
  - "Textarea uses inline glass styling consistent with Input component pattern (no Textarea UI component)"
  - "VENDEDOR guard on /nuevo uses useEffect redirect; DatosTab uses readOnly prop"

patterns-established:
  - "URL-synced tab pattern: useSearchParams().get('tab') with router.replace for tab switching"
  - "Detail page shell pattern: PageHeader + Tabs with placeholder TabsContent for future plans"
  - "Form state pattern: useState initialized from entity prop with save handler calling provider action"
  - "VENDEDOR guard pattern: canEdit check with readOnly inputs + hidden save button (edit), useEffect redirect (create)"

requirements-completed: [PAQT-03, PAQT-04, PAQT-09, PAQT-13, PAQT-14]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 04 Plan 02: Detail Page, Datos Tab & Create Page Summary

**Paquete detail page with 5-tab URL-synced shell, Datos edit form with all scalar fields, and /nuevo create page with BORRADOR defaults**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T16:26:11Z
- **Completed:** 2026-03-16T16:30:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Detail page shell at /paquetes/[slug] with 5 tabs (Datos, Servicios, Precios, Fotos, Publicacion) synced to URL ?tab= parameter
- DatosTab form with all Paquete scalar fields (titulo, noches, salidas, temporada, tipo, descripcion, textoVisual) using glass-styled inputs
- /paquetes/nuevo create page with default values (7 noches, BORRADOR estado, 30% markup) that redirects to detail page after creation
- VENDEDOR role-based guards: read-only form on edit, redirect on create, no save button when !canEdit

## Task Commits

Each task was committed atomically:

1. **Task 1: Detail page shell with 5-tab layout and URL sync** - `9e6b537` (feat)
2. **Task 2: Datos tab form and /paquetes/nuevo create page** - `e14ec2e` (feat)

## Files Created/Modified
- `src/app/(admin)/paquetes/[slug]/page.tsx` - Detail page shell with 5-tab layout, estado badge, URL-synced tab navigation, and not-found state
- `src/app/(admin)/paquetes/[slug]/_components/DatosTab.tsx` - Edit form for all Paquete scalar fields with glass styling, read-only mode for VENDEDOR
- `src/app/(admin)/paquetes/nuevo/page.tsx` - Create page with empty/default values, VENDEDOR redirect guard, titulo validation

## Decisions Made
- Tab URL sync uses router.replace with scroll:false to avoid polluting browser history with each tab click
- nuevo/ placed as static sibling to [slug]/ directory so Next.js App Router correctly matches /paquetes/nuevo before the dynamic segment
- DatosTab uses local useState initialized from paquete prop rather than controlled inputs from parent, keeping form state encapsulated
- Textarea elements use inline glass styling consistent with the Input component pattern since no dedicated Textarea UI component exists
- VENDEDOR guard uses two patterns: readOnly prop on edit forms (DatosTab) and useEffect redirect on create page (nuevo)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `src/app/(admin)/paquetes/page.tsx` (readonly array in motion animate prop) -- out of scope, not caused by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Detail page shell ready for Plans 03-05 to replace tab placeholders with Servicios, Precios, Fotos, and Publicacion content
- DatosTab establishes the form state pattern for other tab components to follow
- URL-synced tab navigation is fully functional and will work seamlessly as new tab content is added

## Self-Check: PASSED

All 3 created files verified on disk. Both task commits (9e6b537, e14ec2e) found in git log.

---
*Phase: 04-paquetes-module*
*Completed: 2026-03-16*
