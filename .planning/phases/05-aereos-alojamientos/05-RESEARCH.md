# Phase 5: Aereos & Alojamientos Modules - Research

**Researched:** 2026-03-16
**Domain:** Next.js 14 App Router CRUD modules — flights list/detail with inline price table, hotels list/detail with inline price table + regimen select + photo grid
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AERO-01 | Aereos list renders glass table with columns: ID, ruta, destino, acciones | `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell` components fully built; `useAereos()` provides brand-filtered, non-deleted list from ServiceProvider |
| AERO-02 | Aereo detail shows flight data + editable price-per-period table (periodo_desde, periodo_hasta, neto adulto, neto menor) | `Aereo` type has `ruta`, `destino`, `aerolinea`, `equipaje`; `PrecioAereo` type has `periodoDesde`, `periodoHasta`, `precioAdulto`, `precioMenor`; `useServiceState().preciosAereo` filtered by `aereoId` |
| AERO-03 | Price-per-period table supports add row, edit inline, delete row | No dedicated inline-edit table component exists — needs a local `editingRow` state pattern; add row via `createPrecioAereo()`; update via `updatePrecioAereo()`; delete via `deletePrecioAereo()` from `useServiceActions()` |
| AERO-04 | Create, edit, clone, delete aereo with appropriate feedback | `createAereo()`, `updateAereo()`, `deleteAereo()` exist in `useServiceActions()`; clone uses same pattern as `clonePaquete` (copy fields + "Copia de" prefix, new UUID); `useToast()` for feedback; delete shake modal reuses `interactions.deleteShake` |
| ALOJ-01 | Alojamientos list renders glass table with columns: ID, hotel, ciudad, pais, categoria (estrellas), acciones | `Alojamiento.nombre`, `ciudadId`, `paisId`, `categoria` (number 1-5); need `usePaises()` from CatalogProvider for lookup map; star rendering with Lucide `Star` icon |
| ALOJ-02 | Alojamiento detail shows hotel data + price-per-period table with regimen + photo grid | `PrecioAlojamiento` type has `periodoDesde`, `periodoHasta`, `precioPorNoche`, `regimenId`; `useRegimenes()` from CatalogProvider for dropdown; `AlojamientoFoto` has `url`, `alt`, `orden`; `ImageUploader` already built |
| ALOJ-03 | Price-per-period table supports CRUD with regimen field | Same inline-edit table pattern as AERO-03; `regimenId` column uses `Select` component (or `<select>`) for inline editing; `createPrecioAlojamiento()`, `updatePrecioAlojamiento()`, `deletePrecioAlojamiento()` exist |
| ALOJ-04 | Create, edit, clone, delete alojamiento with feedback | `createAlojamiento()`, `updateAlojamiento()`, `deleteAlojamiento()` in `useServiceActions()`; clone pattern same as AERO-04; cidade/pais select from `usePaises()` |
</phase_requirements>

---

## Summary

Phase 5 builds two new CRUD modules (Aereos and Alojamientos) that mirror the Paquetes module pattern from Phase 4, but are architecturally simpler: no complex service assignments, no pricing recalculation, no Publicacion tab. The core challenge is the **inline-editable price-per-period table**, which does not have a pre-built component and must be implemented with a local `editingRowId` state pattern.

All providers (`ServiceProvider`, `CatalogProvider`, `BrandProvider`, `AuthProvider`), all UI components (`Table`, `Modal`, `Button`, `Input`, `Select`, `ImageUploader`, `SearchFilter`, `Toast`, `Tabs`), all TypeScript types, and all seed data are already present. No new libraries are required. The data layer has complete CRUD actions for `Aereo`, `PrecioAereo`, `Alojamiento`, `PrecioAlojamiento`, and `AlojamientoFoto` in `useServiceActions()`. The work is entirely UI composition, following patterns already established in Phase 4.

The Alojamientos module is more complex than Aereos because: (1) the list requires ciudad/pais lookups, (2) the price table has a `regimenId` dropdown column (requires `useRegimenes()`), (3) star category rendering requires a visual component, and (4) the photo grid reuses `ImageUploader`. Neither module uses tabs on the detail page — a two-panel layout (form + price table, or form + price table + photos) is the simpler and more appropriate structure.

**Primary recommendation:** Build in 4 tasks: (1) Aereos list page, (2) Aereo detail page with inline price table, (3) Alojamientos list page, (4) Alojamiento detail page with inline price table and photo grid.

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.25 | App Router, dynamic routes `[id]` | Project framework — locked |
| React | 18.3.1 | `useState`, `useMemo`, `useCallback`, `useEffect` | Project framework |
| TypeScript | 5.8.2 | All entity types already defined | Project framework |
| motion | 12.4.7 | `interactions.deleteShake`, stagger on table rows | Already used in all UI components |
| Radix UI | 1.4.3 | Dialog (Modal), Select, Tabs primitives | Already used in all glass components |
| Tailwind CSS | 3.4.18 | Utility classes (grid, flex, space-y) | Project CSS framework |
| lucide-react | 0.469.0 | `Plane`, `Hotel`, `Star`, `Plus`, `Eye`, `Pencil`, `Copy`, `Trash2`, `Save`, `X`, `ArrowLeft` | Already installed |

### Existing Project APIs (use these, do not reimplement)

| Hook / Component | Where | What It Provides |
|------------------|-------|-----------------|
| `useAereos()` | ServiceProvider | Brand-filtered, non-deleted `Aereo[]` |
| `useAlojamientos()` | ServiceProvider | Brand-filtered, non-deleted `Alojamiento[]` |
| `useServiceState()` | ServiceProvider | Full state — access `.preciosAereo`, `.preciosAlojamiento`, `.alojamientoFotos` |
| `useServiceActions()` | ServiceProvider | All CRUD: `createAereo`, `updateAereo`, `deleteAereo`, `createPrecioAereo`, `updatePrecioAereo`, `deletePrecioAereo`, `createAlojamiento`, `updateAlojamiento`, `deleteAlojamiento`, `createPrecioAlojamiento`, `updatePrecioAlojamiento`, `deletePrecioAlojamiento`, `createAlojamientoFoto`, `updateAlojamientoFoto`, `deleteAlojamientoFoto` |
| `usePaises()` | CatalogProvider | `(Pais & { ciudades: Ciudad[] })[]` — brand-filtered with nested ciudades |
| `useRegimenes()` | CatalogProvider | `Regimen[]` — brand-filtered, used for dropdown in alojamiento price table |
| `useBrand()` | BrandProvider | `activeBrandId` — needed for `createAereo` / `createAlojamiento` payload |
| `useAuth()` | AuthProvider | `canEdit` — gates action buttons, edit forms, VENDEDOR restriction |
| `useToast()` | Toast UI | `toast("success"|"warning"|"error", title, description)` |
| `ImageUploader` | UI | Photo grid with add/remove/drag-reorder — identical to FotosTab in Paquetes |
| `SearchFilter` | UI | Search input + filter chips (same as Paquetes list) |
| `Table`, `TableHeader`, etc. | UI | Glass table — all sub-components available |
| `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` | UI | Delete confirmation modal + create/edit modal |
| `interactions.deleteShake` | animations.ts | Shake animation on delete confirm button |

### No New Installation Needed

```bash
# No npm install required for Phase 5
# All dependencies already present from Phases 1-4
```

---

## Architecture Patterns

### Recommended Route Structure

```
src/app/(admin)/
├── aereos/
│   ├── page.tsx                    # List page (replaces placeholder)
│   ├── nuevo/
│   │   └── page.tsx               # Create form page
│   └── [id]/
│       └── page.tsx               # Detail/edit page with price table
└── alojamientos/
    ├── page.tsx                    # List page (replaces placeholder)
    ├── nuevo/
    │   └── page.tsx               # Create form page
    └── [id]/
        └── page.tsx               # Detail/edit page with price table + photos
```

Note: Use `[id]` not `[slug]` — Aereos and Alojamientos have no `titulo` field to slugify. The `Aereo.id` and `Alojamiento.id` (UUID format) serve as the route parameter. The `nuevo` static segment must be defined before `[id]` to prevent Next.js App Router from capturing `/aereos/nuevo` as an ID route.

### Pattern 1: List Page with Glass Table + Search + CRUD Actions

Mirrors `src/app/(admin)/paquetes/page.tsx` exactly. Key differences for Aereos/Alojamientos:
- No filter chips (no temporada/estado/tipo dimensions) — search-only is sufficient
- Actions: View (Eye), Edit (Pencil), Clone (Copy), Delete (Trash2) — same as Paquetes
- Clone prefix: `"Copia de ${aereo.ruta}"` for Aereos; `"Copia de ${alojamiento.nombre}"` for Alojamientos
- Both use soft-delete (`deletedAt`), so `useAereos()` / `useAlojamientos()` already filters them out

```typescript
// Source: confirmed from ServiceProvider.tsx useAereos() hook
export function useAereos(): Aereo[] {
  const { activeBrandId } = useBrand();
  const state = useServiceState();
  return useMemo(
    () => state.aereos.filter((a) => a.brandId === activeBrandId && !a.deletedAt),
    [state.aereos, activeBrandId],
  );
}
```

### Pattern 2: Detail Page with Two-Column Layout (No Tabs)

The detail page for Aereo and Alojamiento is simpler than Paquetes — no multi-tab navigation needed. Use a two-section layout:
- **Top card**: Entity form fields (ruta, destino, aerolinea, equipaje for Aereo; nombre, ciudad, pais, categoria, sitioWeb for Alojamiento)
- **Bottom card**: Inline-editable price-per-period table
- **Alojamiento only — third card**: Photo grid using `ImageUploader`

```typescript
// Route pattern: /aereos/[id] and /alojamientos/[id]
// useParams<{ id: string }>() to get the ID
// Then: useServiceState().aereos.find((a) => a.id === id && !a.deletedAt)
```

### Pattern 3: Inline-Editable Price Table

This is the core new UI pattern for Phase 5. No pre-built component — implement with local state.

**State model:**
```typescript
const [editingRowId, setEditingRowId] = useState<string | null>(null);
const [draftRow, setDraftRow] = useState<Partial<PrecioAereo>>({});
const [addingRow, setAddingRow] = useState(false);
const [newRow, setNewRow] = useState<Partial<PrecioAereo>>({});
```

**Rendering mode:** Table rows render in two modes:
- **View mode** (editingRowId !== row.id): display values + Edit/Delete action buttons
- **Edit mode** (editingRowId === row.id): render `<Input>` or `<input>` cells + Save/Cancel buttons

**Add row flow:** A persistent "+ Agregar periodo" button below the table opens a new empty row at the bottom in edit mode.

**Save flow:** On save, call `updatePrecioAereo(draftRow)` / `createPrecioAereo(newRow)`, show toast, clear editing state.

**Delete flow:** Inline delete (no confirmation modal needed for price rows — they are child data, no name to display in shake modal). Call `deletePrecioAereo(id)` directly, show toast.

### Pattern 4: Alojamiento Star Rating Rendering

```typescript
// Render categoria (1-5 stars) using Lucide Star icon
function StarRating({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}
```

### Pattern 5: Clone Action (No New Library)

```typescript
// Aereo clone -- mirrors clonePaquete from PackageProvider
function handleCloneAereo(id: string) {
  const source = aereos.find((a) => a.id === id);
  if (!source) return;
  const now = new Date().toISOString();
  createAereo({
    brandId: source.brandId,
    ruta: `Copia de ${source.ruta}`,
    destino: source.destino,
    aerolinea: source.aerolinea,
    equipaje: source.equipaje,
  });
  toast("success", "Aereo clonado", "Se creo una copia del vuelo.");
}
```

Note: Price rows are NOT cloned — only the parent entity. This keeps the pattern consistent with how Paquetes clone works (service assignments are NOT cloned either).

### Pattern 6: Ciudad/Pais Lookup for Alojamiento List

```typescript
// Build lookup maps from usePaises()
const paises = usePaises(); // Pais & { ciudades: Ciudad[] }[]
const paisMap = useMemo(() => {
  const m: Record<string, string> = {};
  for (const p of paises) m[p.id] = p.nombre;
  return m;
}, [paises]);

const ciudadMap = useMemo(() => {
  const m: Record<string, string> = {};
  for (const p of paises) {
    for (const c of p.ciudades) m[c.id] = c.nombre;
  }
  return m;
}, [paises]);
```

### Pattern 7: Regimen Select in Alojamiento Price Table

```typescript
// During inline edit, render a <Select> for regimenId
const regimenes = useRegimenes(); // Regimen[]

<Select
  value={draftRow.regimenId ?? ""}
  onValueChange={(val) => setDraftRow({ ...draftRow, regimenId: val })}
  options={regimenes.map((r) => ({ value: r.id, label: r.nombre }))}
  placeholder="Regimen..."
/>
```

### Anti-Patterns to Avoid

- **Tabs on Aereo/Alojamiento detail**: Aereo has only 4 fields + price table. Tabs would be overengineering. Use a simple vertical card layout instead.
- **Confirmation modal for price row deletion**: Price rows have no meaningful "name" to display and are child data. A direct delete with toast is sufficient. Reserve the shake modal for parent entity deletion.
- **Separate edit page for Aereo/Alojamiento**: The detail page at `[id]` doubles as both view and edit (same as DatosTab in Paquetes). No `/aereos/[id]/editar` needed.
- **Custom date input for periodoDesde/periodoHasta**: Use the existing `DatePicker` component or an `<input type="date">` — do not build a custom date parser.
- **Cloning price rows on clone**: Only clone the parent entity. Price rows must be added manually to the clone. Consistent with Paquetes pattern.
- **Using `slugify()` for aereo/alojamiento routes**: These entities have no `titulo`. Use their UUID `id` directly as the route param.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo grid with drag-reorder | Custom drag grid | `ImageUploader` | Already built with HTML5 drag-and-drop, remove button, `maxImages` prop |
| Search box + filter chips | Custom input | `SearchFilter` | Already handles `searchValue`, `filters: FilterChip[]`, `onFilterToggle` |
| Toast notifications | Custom notification | `useToast()` | Already handles success/warning/error with auto-dismiss |
| Delete confirm modal | Custom dialog | `Modal` + `ModalHeader/Body/Footer` | Already built with glass material and portal rendering |
| Brand/auth scoping | Custom context | `useBrand()`, `useAuth()` | Already provides `activeBrandId`, `canEdit`, `canSeePricing` |
| CRUD state management | Local `useState` arrays | `useServiceActions()` | All CRUD operations (create, update, delete) already dispatch to ServiceProvider reducer |
| Star rating display | Custom CSS stars | Lucide `Star` icon + `fill-amber-400` | Simple, consistent with icon system |
| Date formatting | Custom formatter | `<input type="date">` or existing `DatePicker` | DatePicker component is already built |

**Key insight:** Every non-trivial UI primitive is already built. Phase 5 is composition, not construction. The only genuinely new UI pattern is the inline-editable table row — and that requires only React `useState`, not a library.

---

## Common Pitfalls

### Pitfall 1: Next.js Route Capture — `nuevo` vs `[id]`

**What goes wrong:** Creating `/aereos/[id]/page.tsx` before `/aereos/nuevo/page.tsx` causes Next.js App Router to capture the literal string "nuevo" as an ID, resulting in a 404 or a "aereo not found" state when navigating to the create form.

**Why it happens:** Next.js App Router evaluates static routes (literal segments) before dynamic routes only when both are at the same depth. The static `nuevo` segment at `aereos/nuevo` is a sibling of the dynamic `aereos/[id]`, so it wins. But this only works if both exist — if only `[id]` exists, "nuevo" is captured as an ID.

**How to avoid:** Create `/aereos/nuevo/page.tsx` and `/alojamientos/nuevo/page.tsx` before or at the same time as `[id]/page.tsx`. Test by navigating to `/aereos/nuevo` and confirming the create form renders, not a "not found" error.

**Warning signs:** Console shows "aereo not found" when navigating to `/aereos/nuevo`.

### Pitfall 2: `useServiceState()` Contains ALL Brands — Always Filter

**What goes wrong:** `useServiceState().preciosAereo` returns price rows for ALL brands. If you forget to filter by the parent entity's ID, you'll show price rows from aereos/alojamientos of other brands on the detail page.

**Why it happens:** `preciosAereo` has no `brandId` — it links to `aereoId`. The filter must be `preciosAereo.filter(p => p.aereoId === aereo.id)`.

**How to avoid:** Always filter child collections by parent ID, not by brand. Example:
```typescript
const precios = useServiceState().preciosAereo.filter(p => p.aereoId === aereo.id);
```

**Warning signs:** A detail page shows more price rows than seeded, or shows rows from other hotels/flights.

### Pitfall 3: Inline Edit State Desync After Save

**What goes wrong:** After calling `updatePrecioAereo(draftRow)`, the old `editingRowId` is still set. If the user immediately clicks edit on a different row, both rows appear to be in edit mode momentarily, or the form shows stale values.

**Why it happens:** `editingRowId` and `draftRow` are separate `useState` values. Forgetting to reset both after save causes desync.

**How to avoid:** Always clear both after save or cancel:
```typescript
function handleSaveRow() {
  updatePrecioAereo({ ...draftRow } as PrecioAereo);
  setEditingRowId(null);   // ALWAYS reset both
  setDraftRow({});
  toast("success", "Precio actualizado");
}
```

**Warning signs:** Clicking "Guardar" leaves the row in edit mode visually.

### Pitfall 4: `usePaises()` Returns Pais with Nested Ciudades — Flatten for Lookup

**What goes wrong:** Trying to look up a `Ciudad` name from `ciudadId` by iterating `usePaises()` without accounting for the nested structure. `paises[0].ciudades` contains the city objects — they are not at the top level.

**Why it happens:** `usePaises()` returns `(Pais & { ciudades: Ciudad[] })[]` — cities are nested under their parent country. See CatalogProvider.tsx line 276-289.

**How to avoid:** Build a flat `ciudadMap` in `useMemo` by iterating `pais.ciudades` for each pais (see Pattern 6 above).

**Warning signs:** Ciudad column shows `--` for all rows even though seed data has valid `ciudadId` values.

### Pitfall 5: Alojamiento Create Form — Ciudad Must Be Filtered by Selected Pais

**What goes wrong:** Showing all brand ciudades in the ciudad dropdown regardless of selected pais. Users can create an alojamiento with a mismatched ciudad/pais combination (e.g., "Buzios" under "Mexico").

**Why it happens:** Not filtering the ciudad options dynamically based on the selected `paisId` value in the form state.

**How to avoid:** In the create/edit form, filter city options:
```typescript
const selectedPais = paises.find(p => p.id === selectedPaisId);
const ciudadOptions = selectedPais?.ciudades.map(c => ({ value: c.id, label: c.nombre })) ?? [];
```
Reset `ciudadId` to `""` whenever `paisId` changes.

**Warning signs:** Ciudad dropdown shows cities from multiple countries when only one pais is selected.

### Pitfall 6: `glassMaterials` Requires Inline Style — Not Tailwind Classes

**What goes wrong:** Trying to use Tailwind classes like `backdrop-blur-lg` for the glass effect on cards or tables. The project's glass system uses inline `style` objects from `glassMaterials` in `src/components/lib/glass.ts`, not Tailwind utilities.

**Why it happens:** Tailwind's `backdrop-filter` classes do not compose `saturate()` and `blur()` together the same way. The project explicitly chose inline styles (confirmed in prior decisions) for reliable Safari WebKit support.

**How to avoid:** Use `style={{ ...glassMaterials.frosted }}` on card/table wrappers. The `Card` and `Table` components already handle this internally — no need to add glass styles to child elements.

**Warning signs:** Glass effect is missing or broken in Safari; backdrop-filter shows as Tailwind class rather than inline style.

---

## Code Examples

Verified patterns from actual project source code:

### Aereos List Page — Core Structure

```typescript
// Pattern from paquetes/page.tsx — adapted for Aereos
"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Copy, Trash2, Plane } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { useAereos, useServiceActions } from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useToast } from "@/components/ui/Toast";
import type { Aereo } from "@/lib/types";

export default function AereosPage() {
  const router = useRouter();
  const aereos = useAereos();                        // brand-filtered, non-deleted
  const { createAereo, deleteAereo } = useServiceActions();
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Aereo | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return aereos;
    const q = search.toLowerCase();
    return aereos.filter(
      (a) => a.ruta.toLowerCase().includes(q) || a.destino.toLowerCase().includes(q)
    );
  }, [aereos, search]);

  // Clone: copy fields + "Copia de" prefix, no price rows
  function handleClone(id: string) {
    const source = aereos.find(a => a.id === id);
    if (!source) return;
    createAereo({
      brandId: source.brandId,
      ruta: `Copia de ${source.ruta}`,
      destino: source.destino,
      aerolinea: source.aerolinea,
      equipaje: source.equipaje,
    });
    toast("success", "Aereo clonado", "Se creo una copia del vuelo.");
  }

  // Delete: shake + soft-delete
  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteAereo(deleteTarget.id);
      toast("success", "Aereo eliminado", `"${deleteTarget.ruta}" fue eliminado.`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }
}
```

### Inline Price Table — Edit Row State Pattern

```typescript
// Source: new pattern for Phase 5 — based on existing form patterns in DatosTab
"use client";
import { useState } from "react";
import { useServiceState, useServiceActions } from "@/components/providers/ServiceProvider";
import { useToast } from "@/components/ui/Toast";
import type { PrecioAereo } from "@/lib/types";

interface PrecioAereoTableProps {
  aereoId: string;
  canEdit: boolean;
}

export function PrecioAereoTable({ aereoId, canEdit }: PrecioAereoTableProps) {
  const { preciosAereo } = useServiceState();
  const { createPrecioAereo, updatePrecioAereo, deletePrecioAereo } = useServiceActions();
  const { toast } = useToast();

  const precios = preciosAereo.filter(p => p.aereoId === aereoId);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draftRow, setDraftRow] = useState<Partial<PrecioAereo>>({});
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<Partial<Omit<PrecioAereo, "id" | "aereoId">>>({});

  function handleStartEdit(precio: PrecioAereo) {
    setEditingRowId(precio.id);
    setDraftRow({ ...precio });
  }

  function handleSaveEdit() {
    updatePrecioAereo(draftRow as PrecioAereo);
    setEditingRowId(null);
    setDraftRow({});
    toast("success", "Precio actualizado");
  }

  function handleCancelEdit() {
    setEditingRowId(null);
    setDraftRow({});
  }

  function handleSaveNew() {
    createPrecioAereo({
      aereoId,
      periodoDesde: newRow.periodoDesde ?? "",
      periodoHasta: newRow.periodoHasta ?? "",
      precioAdulto: newRow.precioAdulto ?? 0,
      precioMenor: newRow.precioMenor ?? 0,
    });
    setAddingRow(false);
    setNewRow({});
    toast("success", "Periodo agregado");
  }

  function handleDelete(id: string) {
    deletePrecioAereo(id);
    toast("success", "Periodo eliminado");
  }
  // ... render table with conditional input cells
}
```

### Alojamiento Detail — Photo Grid (reuses FotosTab pattern)

```typescript
// Source: mirrors FotosTab.tsx exactly, adapted for AlojamientoFoto
const { alojamientoFotos } = useServiceState();
const { createAlojamientoFoto, deleteAlojamientoFoto, updateAlojamientoFoto } = useServiceActions();

const fotos = alojamientoFotos.filter(f => f.alojamientoId === alojamiento.id);
const images: ImageItem[] = fotos.map(f => ({ id: f.id, url: f.url, alt: f.alt }));

function handleAdd(urls: string[]) {
  urls.forEach((url, i) => {
    createAlojamientoFoto({
      alojamientoId: alojamiento.id,
      url,
      alt: `Foto ${fotos.length + i + 1}`,
      orden: fotos.length + i,
    });
  });
}

function handleRemove(id: string) {
  deleteAlojamientoFoto(id);
}

function handleReorder(reordered: ImageItem[]) {
  reordered.forEach((img, newIndex) => {
    const original = fotos.find(f => f.id === img.id);
    if (original && original.orden !== newIndex) {
      updateAlojamientoFoto({ ...original, orden: newIndex });
    }
  });
}
// <ImageUploader images={images} onAdd={canEdit ? handleAdd : undefined} onRemove={canEdit ? handleRemove : undefined} onReorder={canEdit ? handleReorder : undefined} />
```

### Star Rating Component

```typescript
// Simple inline component — no new library needed
import { Star } from "lucide-react";

function StarRating({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < count ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`}
        />
      ))}
    </span>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom drag-and-drop library (dnd-kit) | HTML5 native drag-and-drop | Phase 1-4 decisions | No additional bundle; works in `ImageUploader` already |
| Tailwind backdrop-filter utilities | Inline `style` objects from `glassMaterials` | Phase 1 design system | Safari/WebKit compatibility; all glass components use this |
| Modal confirmation for row delete | Direct delete with toast | Phase 5 design decision | Price rows are child data without meaningful names — modal is overkill |
| Tabs on detail page (like Paquetes) | Flat two-card layout | Phase 5 scope | Aereo/Alojamiento have fewer fields; tabs add navigation complexity for no benefit |
| `slugify()` for URL routing | UUID `id` as route param | Phase 5 scope | Aereo has `ruta` (not `titulo`); Alojamiento has `nombre` but UUIDs are simpler and collision-free |

---

## Open Questions

1. **Create flow — modal vs. dedicated page?**
   - What we know: Paquetes uses a dedicated `/paquetes/nuevo` page. This adds route complexity (static segment before dynamic).
   - What's unclear: Whether a modal dialog for create (simpler routing) or a dedicated page (more screen space, consistent with Paquetes) is preferred.
   - Recommendation: Use a dedicated `/aereos/nuevo` and `/alojamientos/nuevo` page to be consistent with the Paquetes pattern. Ensure the static `nuevo` segment is created before `[id]`.

2. **Pagination on list pages?**
   - What we know: Paquetes list has pagination (`Pagination` component, 10 items/page). Aereos has 12 items, Alojamientos has 14 — both fit on one page.
   - What's unclear: Whether pagination should be implemented now or left out since seed data is small.
   - Recommendation: Include pagination (copy from Paquetes list) as good practice for when the data grows. Cost is low — component already exists.

3. **Alojamiento create form — inline ciudad/pais cascade or flat selects?**
   - What we know: `usePaises()` returns `(Pais & { ciudades: Ciudad[] })[]`. Ciudades are nested inside paises.
   - What's unclear: Whether to show two separate selects (Pais then Ciudad) with dynamic filtering, or a single combined select.
   - Recommendation: Two selects (Pais first, then Ciudad filtered by selected Pais). Reset ciudadId when paisId changes. This mirrors how the data model works.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase read — `src/components/providers/ServiceProvider.tsx` — confirmed all CRUD hooks and actions for Aereo, PrecioAereo, Alojamiento, PrecioAlojamiento, AlojamientoFoto
- Direct codebase read — `src/components/providers/CatalogProvider.tsx` — confirmed `useRegimenes()`, `usePaises()` APIs
- Direct codebase read — `src/lib/types.ts` — confirmed all TypeScript interfaces
- Direct codebase read — `src/lib/data/aereos.ts` — confirmed 12 aereos + 27 price rows seed data
- Direct codebase read — `src/lib/data/alojamientos.ts` — confirmed 14 alojamientos + 28 price rows + 28 foto rows seed data
- Direct codebase read — `src/components/ui/Table.tsx` — confirmed Table component API
- Direct codebase read — `src/components/ui/ImageUploader.tsx` — confirmed ImageUploader API
- Direct codebase read — `src/app/(admin)/paquetes/page.tsx` — confirmed list page pattern (clone, delete, search, table, toast, shake modal)
- Direct codebase read — `src/app/(admin)/paquetes/[slug]/_components/DatosTab.tsx` — confirmed form pattern
- Direct codebase read — `src/app/(admin)/paquetes/[slug]/_components/FotosTab.tsx` — confirmed photo grid pattern
- Direct codebase read — `src/components/lib/glass.ts` — confirmed `glassMaterials` inline style objects
- Direct codebase read — `src/components/lib/animations.ts` — confirmed `interactions.deleteShake`

### Secondary (MEDIUM confidence)

- Phase 4 RESEARCH.md — confirmed stack versions (Next.js 14.2.25, React 18.3.1, motion 12.4.7, Radix 1.4.3, Tailwind 3.4.18, lucide-react 0.469.0, date-fns 4.1.0)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed by direct file read; versions from Phase 4 RESEARCH.md
- Architecture patterns: HIGH — all patterns derived from reading actual implemented Phase 4 code
- Pitfalls: HIGH — all pitfalls identified from real codebase characteristics (ServiceProvider structure, Next.js static vs dynamic route priority, glassMaterials inline style requirement)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable; no fast-moving dependencies; all findings from internal codebase)
