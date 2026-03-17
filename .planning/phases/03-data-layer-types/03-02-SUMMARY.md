---
phase: 03-data-layer-types
plan: 02
subsystem: database
tags: [typescript, seed-data, travel-market, spanish, in-memory-data]

# Dependency graph
requires:
  - phase: 03-data-layer-types
    provides: "22 TypeScript entity interfaces in src/lib/types.ts"
provides:
  - "Temporada, TipoPaquete, Etiqueta, Pais, Ciudad, Regimen seed arrays"
  - "Proveedor seed array with Uruguayan supplier data"
  - "Aereo and PrecioAereo seed arrays (12 routes, 27 price periods)"
  - "Alojamiento, PrecioAlojamiento, AlojamientoFoto seed arrays (14 hotels, 28 prices, 28 photos)"
  - "Traslado seed array (10 transfers with USD pricing)"
  - "Seguro seed array (8 insurance plans)"
  - "Circuito, CircuitoDia, PrecioCircuito seed arrays (2 circuits, 20 itinerary days)"
affects: [03-data-layer-types, 04-crud-modules, 05-package-builder]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Seed data files import typed interfaces from types.ts and export const arrays", "Dual-brand seed data with consistent ID conventions ({entity}-{N})", "Ciudades inherit brand scope through parent Pais (no brandId on Ciudad)", "Cross-file ID references verified programmatically"]

key-files:
  created: [src/lib/data/catalogos.ts, src/lib/data/proveedores.ts, src/lib/data/aereos.ts, src/lib/data/alojamientos.ts, src/lib/data/traslados.ts, src/lib/data/seguros.ts, src/lib/data/circuitos.ts]
  modified: []

key-decisions:
  - "Paises and reference data duplicated per brand (pais-1..6 for brand-1, pais-7..12 for brand-2) so selector hooks filter correctly by activeBrandId"
  - "Ciudades duplicated per brand's paises to maintain consistent parent-child brand scoping"
  - "CX Max seguro mapped to Universal Assistance proveedor (CX has no dedicated proveedor entity in seed data)"
  - "Circuitos split 1 per brand to ensure both brands have circuit demo data"

patterns-established:
  - "Seed data pattern: const SEED_XXX: Type[] with explicit type annotation and fixed createdAt/updatedAt"
  - "Price period constants (BAJA_DESDE/HASTA, ALTA_DESDE/HASTA) shared across service files"
  - "Unsplash direct URLs with ?w=800&h=600&fit=crop for hotel placeholder photos"
  - "Brand distribution convention: ~60% brand-1 (TravelOz), ~40% brand-2 (DestinoIcono)"

requirements-completed: [DATA-02, DATA-03]

# Metrics
duration: 7min
completed: 2026-03-16
---

# Phase 3 Plan 02: Catalog & Service Seed Data Summary

**7 seed data files with 91 primary entities, 79 sub-entities, and 28 photos covering realistic Uruguayan travel market data in Spanish across dual brands**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-16T15:20:55Z
- **Completed:** 2026-03-16T15:28:00Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments
- Complete catalog reference data: 7 temporadas, 8 tipos paquete, 10 regimenes, 12 paises, 31 ciudades, 13 etiquetas
- 10 proveedores with realistic Uruguayan phone/email contact info
- 5 service entity files: 12 aereos (27 prices), 14 alojamientos (28 prices, 28 photos), 10 traslados, 8 seguros, 2 circuitos (20 day-by-day itinerary entries, 4 prices)
- All cross-file ID references verified programmatically -- zero invalid foreign keys
- Brand distribution verified: ~58% brand-1, ~42% brand-2 across all entity types

## Task Commits

Each task was committed atomically:

1. **Task 1: Create catalog and provider seed data** - `18607fa` (feat)
2. **Task 2: Create service seed data** - `a65822d` (feat)

## Files Created/Modified
- `src/lib/data/catalogos.ts` - Temporada, TipoPaquete, Regimen, Pais, Ciudad, Etiqueta seed arrays (335 lines)
- `src/lib/data/proveedores.ts` - Proveedor seed array with 10 suppliers (113 lines)
- `src/lib/data/aereos.ts` - Aereo and PrecioAereo seed arrays, MVD-based routes (166 lines)
- `src/lib/data/alojamientos.ts` - Alojamiento, PrecioAlojamiento, AlojamientoFoto seed arrays (280 lines)
- `src/lib/data/traslados.ts` - Traslado seed array with REGULAR/PRIVADO types (128 lines)
- `src/lib/data/seguros.ts` - Seguro seed array with real provider plans (102 lines)
- `src/lib/data/circuitos.ts` - Circuito, CircuitoDia, PrecioCircuito seed arrays (229 lines)

## Decisions Made
- Paises duplicated per brand (pais-1..6 for brand-1, pais-7..12 for brand-2) since selector hooks filter by activeBrandId -- shared reference data needs brand-specific entries
- Ciudades also duplicated per brand's parent paises (31 total: 19 brand-1, 12 brand-2) to maintain consistent parent-child scoping
- CX Max seguro mapped to Universal Assistance proveedor since CX has no dedicated proveedor entity
- Circuitos split 1 per brand (Portugal Magnifico for brand-1, Turquia Clasica for brand-2) to ensure both brands have demo circuit data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 seed data files ready for import by context providers (Plans 03-03 through 03-05)
- Consistent ID conventions enable reliable cross-entity lookups in context reducers
- Brand distribution supports meaningful demo when switching between TravelOz and DestinoIcono
- No blockers for subsequent plans

## Self-Check: PASSED

- FOUND: src/lib/data/catalogos.ts
- FOUND: src/lib/data/proveedores.ts
- FOUND: src/lib/data/aereos.ts
- FOUND: src/lib/data/alojamientos.ts
- FOUND: src/lib/data/traslados.ts
- FOUND: src/lib/data/seguros.ts
- FOUND: src/lib/data/circuitos.ts
- FOUND: 03-02-SUMMARY.md
- FOUND: commit 18607fa
- FOUND: commit a65822d

---
*Phase: 03-data-layer-types*
*Completed: 2026-03-16*
