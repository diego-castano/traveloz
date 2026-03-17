---
phase: 06-supporting-services
plan: "03"
subsystem: circuitos
tags: [circuitos, glass-table, drag-and-drop, deep-clone, inline-edit, 4-state-edit]
dependency_graph:
  requires:
    - ServiceProvider (useCircuitos, useServiceState, useServiceActions)
    - CatalogProvider (useProveedores)
    - AuthProvider (useAuth/canEdit)
    - ui/Table, ui/Modal, ui/Card, ui/Button, ui/Input, ui/Select, ui/SearchFilter, ui/Pagination, ui/Toast
    - components/lib/animations (interactions.deleteShake)
    - components/lib/cn
    - lib/utils (formatCurrency)
  provides:
    - /circuitos — glass table list with deep-clone and soft-delete
    - /circuitos/nuevo — create form with VENDEDOR guard
    - /circuitos/[id] — detail page (header form + itinerary editor + price table)
  affects:
    - ServiceProvider state (circuitos, circuitoDias, preciosCircuito)
tech_stack:
  added: []
  patterns:
    - HTML5 native drag-and-drop for itinerary reorder (consistent with 01-08 and 04-03 pattern)
    - Deep clone spanning three entity types (Circuito + CircuitoDia + PrecioCircuito)
    - 4-state inline edit (editingId + draft + adding + new) for price table
    - Glass table with brand-filtered selector hook
key_files:
  created:
    - src/app/(admin)/circuitos/page.tsx
    - src/app/(admin)/circuitos/nuevo/page.tsx
    - src/app/(admin)/circuitos/[id]/page.tsx
  modified: []
decisions:
  - "[06-03]: cn() imported from @/components/lib/cn (not @/lib/utils) — consistent with existing pattern across the codebase"
  - "[06-03]: Circuito list uses Map icon from lucide-react for empty state (no dedicated circuit icon available)"
  - "[06-03]: Detail page guard checks both id match AND !deletedAt for soft-delete consistency"
  - "[06-03]: Deep clone uses synchronous createCircuito return value for new id — confirmed ServiceProvider returns entity"
metrics:
  duration: "4 min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 6 Plan 03: Circuitos Module Summary

Implemented the Circuitos module — glass table list with deep-clone across three entity types, and a detail page with HTML5 drag-and-drop itinerary editor plus 4-state inline price table.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Circuitos list page with glass table and deep-clone | e5daf6a | `circuitos/page.tsx`, `circuitos/nuevo/page.tsx` |
| 2 | Circuito detail page with itinerary editor and price table | 1ea51f9 | `circuitos/[id]/page.tsx` |

## What Was Built

### Task 1 — Circuitos List (`/circuitos`)

Glass table list matching the aereos/alojamientos pattern:

- Columns: Nombre, Noches, Proveedor (lookup via proveedorMap useMemo), Acciones
- Row click navigates to `/circuitos/[id]`; Eye button for explicit navigation (all roles)
- Deep-clone (`handleClone`): creates new Circuito, then clones all CircuitoDia + PrecioCircuito child records using the returned entity id — three entity types cloned atomically
- Shake confirmation modal for soft-delete (`deleteCircuito`)
- Search filter by nombre; pagination at 10/page
- `canEdit` guards: Clone/Trash buttons and "Nuevo Circuito" button hidden for VENDEDOR

### Task 1b — Nuevo Page (`/circuitos/nuevo`)

Static sibling to `[id]` preventing Next.js route capture:
- Fields: nombre (required), noches (number), proveedorId (Select)
- VENDEDOR guard: `useEffect` redirect + early null return
- Creates circuito and redirects directly to the new `/circuitos/[id]` page

### Task 2 — Circuito Detail (`/circuitos/[id]`)

Three Card sections:

**Section 1 — Header Form:**
- Controlled `headerForm` state seeded from circuito via `useState(() => ...)` lazy initializer
- Fields: nombre (Input), noches (Input number), proveedorId (Select)
- "Guardar Cambios" fires `updateCircuito` + toast; hidden from VENDEDOR

**Section 2 — Itinerary Editor:**
- Days sorted by `orden` via useMemo
- HTML5 drag-and-drop: `draggable`, `onDragStart`, `onDragOver`, `onDrop`, `onDragLeave`
- `reorderDias()` splices array; `handleDrop` updates BOTH `orden` AND `numeroDia` for all affected rows (critical per Pitfall 6)
- Drag highlight via `cn()` conditional class on `dragOverId === dia.id`
- View mode: GripVertical handle, numeroDia badge (teal circle), titulo, description truncated at 60 chars
- Edit mode: inline text input + textarea; `draggable={false}` during edit
- Add day row appends with `numeroDia = dias.length + 1` and `orden = dias.length`
- Direct delete for child records (no confirmation modal)

**Section 3 — Price Table:**
- 4-state inline edit identical to aereo/alojamiento pattern
- Columns: Periodo Desde, Periodo Hasta, Precio (USD), Acciones
- date inputs for periods, number input for precio, `formatCurrency` for display
- Both `editingPrecioId` and `draftPrecio` reset atomically on save/cancel
- Direct delete, no confirmation modal (child record pattern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] cn() import path was wrong**
- **Found during:** Task 2 TypeScript check
- **Issue:** `cn` is not exported from `@/lib/utils` — it lives in `@/components/lib/cn`
- **Fix:** Changed import to `import { cn } from "@/components/lib/cn"`
- **Files modified:** `src/app/(admin)/circuitos/[id]/page.tsx`
- **Commit:** 1ea51f9 (fixed before commit)

## Verification Results

- `npx tsc --noEmit` — exits 0 (zero TypeScript errors)
- `npm run build` — completes successfully; all three routes appear in build output
  - `/circuitos` (Static)
  - `/circuitos/nuevo` (Static)
  - `/circuitos/[id]` (Dynamic — server-rendered on demand)
- Deep-clone: `createCircuito` returns entity with new UUID; dias and precios cloned correctly
- Drag-and-drop: `reorderDias` + atomic `updateCircuitoDia` calls update both `orden` and `numeroDia`
- VENDEDOR guard: canEdit gates all mutation controls throughout list and detail

## Self-Check: PASSED
