---
phase: 04-paquetes-module
plan: 01
subsystem: ui
tags: [react, next.js, glass-table, search-filter, pagination, crud, motion]

# Dependency graph
requires:
  - phase: 03-data-layer-types
    provides: PackageProvider CRUD hooks, CatalogProvider selector hooks, ServiceProvider aereo hooks, entity types, seed data
provides:
  - Paquetes list page with glass table, instant search, filter chips, clone, delete, pagination, VENDEDOR restrictions
affects: [04-02, 04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [list-page-pattern with provider hooks and filter chips, destino lookup via paqueteAereos junction, readonly-to-mutable animation spread]

key-files:
  created: []
  modified:
    - src/app/(admin)/paquetes/page.tsx

key-decisions:
  - "ModalHeader uses title prop with null children (ModalHeader requires children but delete modal has no extra header content)"
  - "Destino derived from first assigned aereo via paqueteAereos junction and aereo lookup map"
  - "Spread readonly deleteShake.animate.x into mutable array to satisfy motion/react TS types"
  - "useEffect resets currentPage on search/filter change rather than inline computation"

patterns-established:
  - "List page pattern: PageHeader + SearchFilter + Table + Pagination + delete Modal with shake animation"
  - "Filter chip namespacing: 'category:value' format for multi-category OR/AND filtering"
  - "Destino map pattern: pre-compute derived lookups via useMemo from junction tables"

requirements-completed: [PAQT-01, PAQT-02, PAQT-10, PAQT-11, PAQT-12, PAQT-13, PAQT-14]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 4 Plan 01: Paquetes List Page Summary

**Glass table list page with instant search, namespaced filter chips (temporada/estado/tipo), clone-to-borrador, shake-animated delete modal, and VENDEDOR role restrictions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T16:26:21Z
- **Completed:** 2026-03-16T16:28:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Full paquetes list page replacing the placeholder with glass table displaying ID, titulo, destino, temporada, noches, estado, neto, markup, precio venta, and acciones columns
- Instant search filtering by titulo and descripcion with filter chips for temporada, estado, and tipo using OR within category, AND across categories
- Clone action dispatches CLONE_PAQUETE and shows success toast, delete modal with shake animation soft-deletes via DELETE_PAQUETE
- VENDEDOR role hides Nuevo Paquete button, action column, neto column, and markup column via canEdit/canSeePricing guards
- Pagination at 10 items per page with empty state showing centered Package icon and message

## Task Commits

Each task was committed atomically:

1. **Task 1: Paquetes list page with glass table, search, and filter chips** - `1a0fc3e` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/app/(admin)/paquetes/page.tsx` - Full paquetes list page with table, search, filters, clone, delete, pagination, role restrictions (~280 lines)

## Decisions Made
- ModalHeader requires both `title` prop and `children` -- passed `{null}` as children for the delete modal which has no extra header content
- Destino is derived by looking up the first paqueteAereo junction record's aereoId in the aereos list, pre-computed as a `destinoMap` via useMemo
- The `interactions.deleteShake.animate.x` readonly tuple was spread into a mutable array `[...interactions.deleteShake.animate.x]` to satisfy motion/react TypeScript constraints
- Page reset on filter change uses useEffect rather than embedding reset logic in each handler for cleaner separation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed readonly tuple incompatibility with motion/react animate prop**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** `interactions.deleteShake.animate` has readonly tuple `readonly [0, -4, 4, -2, 2, 0]` which motion/react's `animate` prop rejects as incompatible with mutable `ValueKeyframesDefinition`
- **Fix:** Spread the readonly array into a mutable one: `{ x: [...interactions.deleteShake.animate.x] }`
- **Files modified:** src/app/(admin)/paquetes/page.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 1a0fc3e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TS type compatibility fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Paquetes list page complete, ready for 04-02 (detail page shell with 5-tab URL sync)
- Row click navigates to `/paquetes/{id}` (detail page to be built in 04-02)
- Edit button navigates to `/paquetes/{id}?tab=datos` (tab sync to be built in 04-02)
- Nuevo Paquete navigates to `/paquetes/nuevo` (create page to be built in 04-02)

---
*Phase: 04-paquetes-module*
*Completed: 2026-03-16*
