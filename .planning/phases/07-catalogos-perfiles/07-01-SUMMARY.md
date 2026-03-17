---
phase: 07-catalogos-perfiles
plan: 01
subsystem: catalogos-ui
tags: [catalogos, tabs, crud, modal, catalog-management]
dependency_graph:
  requires:
    - CatalogProvider (useTemporadas, useTiposPaquete, useEtiquetas, usePaises, useRegimenes, useCatalogActions)
    - Tabs, TabsList, TabsTrigger, TabsContent (src/components/ui/Tabs)
    - Modal, ModalHeader, ModalBody, ModalFooter (src/components/ui/Modal)
    - Table, Badge, Button, Input, Select, SearchFilter, Pagination (src/components/ui/)
    - interactions.deleteShake (src/components/lib/animations)
    - useAuth, useBrand, useToast providers
  provides:
    - src/app/(admin)/catalogos/page.tsx — Fully functional tabbed catalog management page
  affects:
    - /catalogos route — replaces stub with full 5-tab CRUD interface
tech_stack:
  added: []
  patterns:
    - Tab sub-component pattern (5 named function components in one file)
    - Modal CRUD pattern (same as Seguros/Proveedores Phase 6)
    - Color swatch display (hex string as rounded-full span with inline background)
    - Slug auto-generation on create (slugify utility inline function)
    - Expandable table rows for two-level entity CRUD (Paises -> Ciudades)
    - Cascade delete with warning (Pais deletes all its Ciudades first)
key_files:
  created: []
  modified:
    - src/app/(admin)/catalogos/page.tsx
decisions:
  - "[07-01]: EtiquetasTab and PaisesTab implemented in same commit as TemporadasTab/TiposPaqueteTab/RegimenesTab — all 5 tabs in single file per plan"
  - "[07-01]: slugify() defined as module-level utility function above EtiquetasTab for reuse clarity"
  - "[07-01]: PaisesTab uses React.Fragment (<>) wrapper per pais row to allow expanded tr sibling without DOM nesting violation"
  - "[07-01]: Cascade delete in PaisesTab: deleteCiudad called for each ciudad before deletePais to avoid orphans in state"
metrics:
  duration: "3 min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_modified: 1
requirements:
  - CATL-01
  - CATL-02
  - CATL-03
  - CATL-04
  - CATL-05
  - CATL-06
---

# Phase 07 Plan 01: Catalogos Tabbed CRUD Page Summary

**One-liner:** Tabbed catalog management page with 5 independent modal-CRUD mini-managers (Temporadas, Tipos de Paquete, Etiquetas with color swatches, Paises y Ciudades with expandable two-level CRUD, Regimenes).

## What Was Built

Replaced the stub `/catalogos` page with a full tabbed interface. The page is a single file (`src/app/(admin)/catalogos/page.tsx`, 1489 lines) with 5 named function components defined above the default export, following the anti-pattern guidance to avoid separate files.

### CatalogosPage

- `<PageHeader>` + `<Tabs defaultValue="temporadas" layoutId="catalogos-tabs">` wrapping 5 TabsTrigger + 5 TabsContent blocks
- Each TabsContent delegates to a named tab component

### TemporadasTab

- Modal CRUD: nombre, orden (Input type number), activa (Select boolean)
- Table: Nombre, Orden, Estado (Badge active/draft), Acciones
- Default orden = temporadas.length + 1 on create
- Empty state: Calendar icon

### TiposPaqueteTab

- Modal CRUD: nombre, orden, activo (note: field is "activo" not "activa")
- Table: Nombre, Orden, Estado (Badge active/draft), Acciones
- Empty state: Layers icon

### EtiquetasTab

- Modal CRUD: nombre, slug (auto-generated on create only), color (native input type=color)
- Slug auto-generation: slugify() utility function (lowercase + replace spaces with `-` + strip non-alphanumeric)
- On edit: slug field is editable but NOT auto-overwritten from nombre (URL stability)
- Table: Nombre (with 16x16 color swatch), Slug (font-mono text-xs), Acciones
- Default color: #8B5CF6 (violet)
- Empty state: Tag icon

### PaisesTab

- Two-level CRUD: Paises (primary list) + Ciudades (inline expandable)
- Chevron button expands/collapses ciudad sub-section per pais row
- Ciudad inline add: "+ Agregar ciudad" button → Input + Check/X (Enter/Escape keyboard support)
- Ciudad inline edit: Pencil icon → Input + Check/X (only one ciudad editable at a time)
- Ciudad delete: immediate (no confirmation), Trash2 icon
- Pais delete: confirmation modal with cascade warning ("Se eliminaran N ciudades asociadas")
- Cascade delete: all ciudades deleted before pais to avoid orphans in CatalogProvider state
- Table: expand chevron, Nombre, Codigo (font-mono), Ciudades count, Acciones
- Empty state: Globe icon

### RegimenesTab

- Modal CRUD: nombre, abrev
- Table: Nombre, Abreviatura (font-mono text-xs text-neutral-400), Acciones
- Empty state: Utensils icon

### Common to All Tabs

- SearchFilter with empty filters array (search-only)
- Pagination (PAGE_SIZE = 10)
- useEffect resets page to 1 on search change
- useMemo for filtered + paginated data
- Form initialized at handleOpenCreate/handleOpenEdit call site (NOT in useEffect — per research anti-pattern warning)
- Delete modal with motion.div shake animation (interactions.deleteShake pattern)
- Toast notifications for all CRUD operations
- canEdit gate for create/edit/delete buttons (VENDEDOR sees read-only Eye button only)

## Deviations from Plan

### None - plan executed exactly as written.

Both Task 1 and Task 2 were implemented together in a single file write since all 5 tabs belong to the same file. The file was committed once after TypeScript verification passed and Next.js build succeeded.

## Verification Results

- `npx tsc --noEmit`: No output (zero type errors)
- `npx next build`: Build succeeded, `/catalogos` compiles at 11.2 kB
- All 5 tab function components present (confirmed by grep)
- File: 1489 lines (exceeds 400 line minimum from must_haves)

## Key Decisions Made

1. **Single commit for both tasks:** Tasks 1 and 2 both modify the same file. Implemented all 5 tabs together in a single coherent write, committed after full TypeScript + build verification.

2. **slugify() as module-level function:** Defined above EtiquetasTab (not inline) for clarity. Keeps the onChange handler concise.

3. **React.Fragment for expanded rows:** Using `<>` wrapper per pais in map() ensures the expanded `<tr>` is a DOM sibling of the pais `<TableRow>` without violating table structure. TableBody renders native `<tbody>` so the fragment keys properly.

4. **Cascade delete order:** `deleteCiudad` called before `deletePais` per RESEARCH.md Pitfall 2 guidance. Also added amber warning text for ciudades count > 0.

## Self-Check

### Files Exist

- [x] `src/app/(admin)/catalogos/page.tsx` exists (1489 lines)

### Commits Exist

- [x] afd2bd1 — feat(07-01): catalogos tabbed page with Temporadas, TiposPaquete, Etiquetas, Paises y Ciudades, and Regimenes tabs
