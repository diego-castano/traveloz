---
phase: 04-paquetes-module
plan: 03
subsystem: ui
tags: [react, tabs, modal, drag-drop, service-assignment, radix-ui, lucide-react]

# Dependency graph
requires:
  - phase: 04-02
    provides: "Detail page with tab layout, DatosTab, and create page"
  - phase: 03-05
    provides: "PackageProvider with usePaqueteServices, usePackageActions (assign/remove)"
  - phase: 03-04
    provides: "ServiceProvider with useAereos, useAlojamientos, useTraslados, useSeguros, useCircuitos"
provides:
  - "ServiciosTab component with grouped service display, remove, and drag-drop reorder"
  - "ServiceSelectorModal with 5 tabbed service type selectors and assign actions"
  - "Detail page integration rendering ServiciosTab in servicios tab"
affects: [04-04-precios-fotos, 04-05-publicacion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MapIcon alias for lucide-react Map icon to avoid global Map constructor shadowing"
    - "as const tuple assertion for Map constructor entries to satisfy TypeScript inference"
    - "layoutId='serviceSelectorTabs' on nested Tabs to prevent animated underline collision"

key-files:
  created:
    - "src/app/(admin)/paquetes/[slug]/_components/ServiciosTab.tsx"
    - "src/app/(admin)/paquetes/[slug]/_components/ServiceSelectorModal.tsx"
  modified:
    - "src/app/(admin)/paquetes/[slug]/page.tsx"

key-decisions:
  - "Used MapIcon instead of Map from lucide-react to avoid shadowing global Map constructor"
  - "HTML5 native drag-and-drop for reorder (consistent with 01-08 ImageUploader pattern, no extra dependency)"
  - "Set-based lookup for assigned service IDs for O(1) filtering in modal"

patterns-established:
  - "lucide-react icon aliasing: When an icon name conflicts with a JS global (Map, Set, etc.), import as {Name}Icon"
  - "Nested Tabs layoutId pattern: Parent page uses layoutId='paqueteDetailTab', modal uses layoutId='serviceSelectorTabs'"

requirements-completed: [PAQT-05, PAQT-12, PAQT-13, PAQT-14]

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 4 Plan 3: Servicios Tab and Service Selector Modal Summary

**ServiciosTab with grouped service display (aereos/alojamientos/traslados/seguros/circuitos), drag-drop reorder, remove actions, and ServiceSelectorModal with 5 tabbed service type selectors**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T16:34:39Z
- **Completed:** 2026-03-16T16:39:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- ServiciosTab renders all 5 service types grouped with entity detail lookups (ciudad names, star ratings, proveedor names)
- ServiceSelectorModal with 5 tabs filters out already-assigned services and provides one-click assignment with toast feedback
- VENDEDOR role guard hides add/remove/reorder controls via canEdit from AuthProvider
- Detail page servicios tab placeholder replaced with live ServiciosTab component

## Task Commits

Each task was committed atomically:

1. **Task 1: ServiciosTab with assigned service list and reorder** - `851e530` (feat)
2. **Task 2: ServiceSelectorModal with 5 tabbed service types and detail page integration** - `754a3c0` (feat)

## Files Created/Modified
- `src/app/(admin)/paquetes/[slug]/_components/ServiciosTab.tsx` - Assigned services list with grouped display, remove, drag-drop reorder (360 lines)
- `src/app/(admin)/paquetes/[slug]/_components/ServiceSelectorModal.tsx` - Modal with 5 tabbed service selectors and assign actions (425 lines)
- `src/app/(admin)/paquetes/[slug]/page.tsx` - Updated to render ServiciosTab in servicios TabsContent

## Decisions Made
- [04-03]: Used MapIcon instead of Map from lucide-react to avoid shadowing global Map constructor (TS compilation error)
- [04-03]: HTML5 native drag-and-drop for reorder -- consistent with 01-08 ImageUploader pattern, avoids adding @dnd-kit dependency
- [04-03]: Set-based lookup (new Set()) for assigned service IDs gives O(1) filtering performance in modal
- [04-03]: Nested Tabs use distinct layoutId values to prevent animated underline collision between page and modal tabs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] lucide-react Map icon shadows global Map constructor**
- **Found during:** Task 1 (ServiciosTab implementation)
- **Issue:** Importing `Map` from lucide-react shadowed the global `Map` constructor, causing TypeScript errors on `new Map<string, string>()` ("Expected 0 type arguments")
- **Fix:** Imported as `MapIcon` instead of `Map` from lucide-react
- **Files modified:** ServiciosTab.tsx, ServiceSelectorModal.tsx
- **Verification:** TypeScript compiles cleanly with zero errors
- **Committed in:** 851e530 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Icon name aliasing is a trivial fix. No scope creep.

## Issues Encountered
None beyond the Map icon shadowing addressed above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Servicios tab fully functional with add/remove/reorder workflow
- Ready for 04-04 (Precios tab, Fotos tab) which will extend the detail page further
- Junction assignment types (PaqueteAereo, etc.) include orden field ready for pricing tab integration

---
*Phase: 04-paquetes-module*
*Completed: 2026-03-16*
