# Phase 4: Paquetes Module - Research

**Researched:** 2026-03-16
**Domain:** Next.js 14 App Router module (list + tabbed detail view, service assignment, pricing, photo management, role-gated access)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAQT-01 | Table with columns (ID, titulo, destino, temporada, noches, estado badge, precio venta, acciones) | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` components fully built; Badge has `active`/`inactive`/`draft` variants mapping to `EstadoPaquete`; `usePaquetes()` provides brand-filtered non-deleted list |
| PAQT-02 | Instant search filters whole table, plus filter chips for temporada, estado, tipo | `SearchFilter` component built with `searchValue`, `filters: FilterChip[]`, `onFilterToggle`; client-side filter uses `useMemo` over `usePaquetes()` array |
| PAQT-03 | 5-tab detail view (Datos, Servicios, Precios, Fotos, Publicacion) with slug-based URLs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` components built; Next.js 14 dynamic route `[slug]` under `/paquetes/` with `useRouter`/`useSearchParams` for tab sync; `slugify()` utility exists |
| PAQT-04 | Datos tab form with all entity fields (titulo, destino, noches, descripcion, temporada, tipo select dropdowns) | `Input`, `Select`, `Textarea` (needs thin wrapper) components built; `Paquete` type has all fields; `useTemporadas()` and `useTiposPaquete()` for dropdown options |
| PAQT-05 | Servicios tab lists assigned services with add/remove/reorder, modal selector with tabs for each service type | `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` built; `Tabs` for service type tabs inside modal; `usePaqueteServices()` returns all 5 service lists; `usePackageActions()` has all assign/remove operations; reorder via HTML5 drag-and-drop (decided) |
| PAQT-06 | Precios tab with PriceDisplay showing Neto -> Markup -> Venta, real-time recalculation | `PriceDisplay` fully built with `editable` prop and `onMarkupChange`/`onVentaChange` callbacks; `calcularNeto()` and `calcularVenta()` in utils; VENDEDOR restriction: `canSeePricing.neto=false`, `canSeePricing.markup=false` from `useAuth()` |
| PAQT-07 | Fotos tab with photo grid, simulated upload, drag-and-drop reorder | `ImageUploader` fully built with `images`, `onAdd`, `onRemove`, `onReorder` props; uses HTML5 native drag-and-drop; simulates upload with `URL.createObjectURL`; `addFoto`/`removeFoto`/`updateFoto` in `usePackageActions()` |
| PAQT-08 | Publicacion tab with toggles (publicado, destacado), date pickers, estado selector, etiquetas multi-select | `Toggle`, `DatePicker`, `Select`, `Tag` all built; `Paquete.destacado` is the toggle; no `publicado` boolean on type -- maps to `estado === 'ACTIVO'`; `useEtiquetas()` + `usePaqueteServices().etiquetas` for multi-select |
| PAQT-09 | Create new paquete from /paquetes/nuevo with full form | Next.js 14 static segment `/paquetes/nuevo` must be defined BEFORE `[slug]` dynamic route to prevent capture; `createPaquete()` in `usePackageActions()` |
| PAQT-10 | Clone creates "Copia de {titulo}" in BORRADOR estado | `clonePaquete(id)` in `usePackageActions()` -- already copies all service assignments; produces `"Copia de ${source.titulo}"` and `estado: "BORRADOR"` |
| PAQT-11 | Delete shows confirmation modal with shake, soft-deletes | `Modal` for confirmation; `interactions.deleteShake` animation in animations.ts; `deletePaquete(id)` sets `deletedAt` (soft-delete) |
| PAQT-12 | VENDEDOR role restrictions: no create/edit/delete buttons, no neto/markup columns | `useAuth()` exposes `canEdit`, `canSeePricing.neto`, `canSeePricing.markup`; conditionally render action buttons and table columns |
| PAQT-13 | All text in Spanish | No external i18n library needed; inline Spanish strings; existing components already use Spanish placeholders |
| PAQT-14 | Glass design system components used throughout | All 20 glass UI components available; `glassMaterials`, `springs`, `interactions` from lib; `Card`, `Table`, `Modal`, `Tabs`, `SearchFilter`, `PriceDisplay` are the primary surfaces |
</phase_requirements>

---

## Summary

Phase 4 builds on a complete foundation: all 20 glass UI components, 3 context providers (PackageProvider, ServiceProvider, CatalogProvider), all 22 entity types, seed data with 16 paquetes, and utility functions (`formatCurrency`, `calcularNeto`, `calcularVenta`, `slugify`) are already present. No new libraries need to be installed. The work is entirely UI composition -- wiring existing providers into page components.

The most architecturally complex requirements are: (1) the slug-based URL with tab sync via `useSearchParams`, (2) the service selector modal with 5 tabbed service types, (3) the real-time pricing recalculation in the Precios tab, and (4) the `/paquetes/nuevo` vs `/paquetes/[slug]` route ordering issue in Next.js App Router. All other requirements are straightforward compositions of existing components.

One clarification needed: the `Paquete` type has no `publicado: boolean` field -- publication state is controlled via `estado: EstadoPaquete` ('ACTIVO' | 'BORRADOR' | 'INACTIVO'). The Publicacion tab's "publicado" toggle should map to toggling `estado` between 'ACTIVO' and 'INACTIVO', not a separate boolean field.

**Primary recommendation:** Build in 5 tasks: (1) list page with search/filter, (2) detail page shell with tab routing, (3) Datos + Publicacion tabs, (4) Servicios tab with modal, (5) Precios + Fotos tabs.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.25 | App Router, dynamic routes, `useSearchParams` | Project framework -- locked |
| React | 18.3.1 | Client components, `useState`, `useMemo`, `useReducer` | Project framework |
| TypeScript | 5.8.2 | Types: `Paquete`, `PaqueteAereo`, etc. | Project framework |
| motion | 12.4.7 | Animations (springs, stagger, deleteShake, modal) | Already used in all 20 UI components |
| Radix UI | 1.4.3 | Dialog, Tabs, Select, Popover primitives | Already used in all glass components |
| Tailwind CSS | 3.4.18 | All styling utilities | Project CSS framework |
| lucide-react | 0.469.0 | Icons (Plus, Edit, Trash, Copy, etc.) | Already installed |
| date-fns | 4.1.0 | Date formatting in DatePicker | Already installed |

### Existing Project Utilities (use, don't reimpliment)

| Utility | Location | Purpose |
|---------|----------|---------|
| `formatCurrency` | `@/lib/utils` | USD formatter: `formatCurrency(1234)` → `"$1,234"` |
| `calcularNeto` | `@/lib/utils` | Sum all service costs for a paquete |
| `calcularVenta` | `@/lib/utils` | Apply markup: `neto * (1 + markup/100)` |
| `slugify` | `@/lib/utils` | URL-safe slug from Spanish text |
| `glassMaterials` | `@/components/lib/glass` | Inline style objects: `.frosted`, `.liquid`, `.liquidModal`, `.frostedSubtle` |
| `springs` | `@/components/lib/animations` | Motion spring configs: `.snappy`, `.bouncy`, `.gentle` |
| `interactions` | `@/components/lib/animations` | Preset animations: `.modalContent`, `.deleteShake`, `.buttonPress` |
| `cn` | `@/components/lib/cn` | `clsx` + `tailwind-merge` utility |

### No New Installations Required

All required functionality is available. Do NOT add new packages.

---

## Architecture Patterns

### Recommended File Structure

```
src/app/(admin)/paquetes/
├── page.tsx                    # List page (PAQT-01, PAQT-02, PAQT-10, PAQT-11)
├── nuevo/
│   └── page.tsx                # Create new paquete (PAQT-09)
└── [slug]/
    ├── page.tsx                # Detail shell with 5-tab layout (PAQT-03)
    └── _components/            # Tab content components (co-located)
        ├── DatosTab.tsx        # PAQT-04
        ├── ServiciosTab.tsx    # PAQT-05
        ├── PreciosTab.tsx      # PAQT-06
        ├── FotosTab.tsx        # PAQT-07
        ├── PublicacionTab.tsx  # PAQT-08
        └── ServiceSelectorModal.tsx  # PAQT-05 sub-component
```

**Why `nuevo/` before `[slug]/`:** Next.js App Router matches static segments before dynamic segments when they are siblings. `/paquetes/nuevo` must be a static sibling directory alongside `[slug]`, not inside it. This is the correct pattern.

### Pattern 1: Slug-based URL with Tab Sync

**What:** Detail page reads slug from URL params, finds paquete by slugified title, and syncs active tab to URL search params.
**When to use:** Slug-based detail pages where users can deep-link to a specific tab.

```typescript
// src/app/(admin)/paquetes/[slug]/page.tsx
"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePaquetes } from "@/components/providers/PackageProvider";
import { slugify } from "@/lib/utils";

export default function PaqueteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const paquetes = usePaquetes();
  const paquete = paquetes.find((p) => slugify(p.titulo) === slug);

  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "datos";

  const handleTabChange = (tab: string) => {
    router.replace(`/paquetes/${slug}?tab=${tab}`, { scroll: false });
  };

  if (!paquete) return <NotFound />;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      {/* 5 tabs */}
    </Tabs>
  );
}
```

### Pattern 2: Client-side Table Filtering with useMemo

**What:** All search/filter logic in a single `useMemo` that derives `filteredPaquetes` from search string + active filter chips.
**When to use:** Client-side filtering of in-memory data from a provider.

```typescript
// src/app/(admin)/paquetes/page.tsx
const [search, setSearch] = useState("");
const [activeFilters, setActiveFilters] = useState<string[]>([]);

const filteredPaquetes = useMemo(() => {
  return paquetes.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase());

    // filter chips are OR-groups per category, AND across categories
    const temporadaFilter = activeFilters.filter((f) => f.startsWith("temporada:"));
    const estadoFilter = activeFilters.filter((f) => f.startsWith("estado:"));
    const tipoFilter = activeFilters.filter((f) => f.startsWith("tipo:"));

    const matchesTemporada =
      temporadaFilter.length === 0 ||
      temporadaFilter.includes(`temporada:${p.temporadaId}`);
    const matchesEstado =
      estadoFilter.length === 0 ||
      estadoFilter.includes(`estado:${p.estado}`);
    const matchesTipo =
      tipoFilter.length === 0 ||
      tipoFilter.includes(`tipo:${p.tipoPaqueteId}`);

    return matchesSearch && matchesTemporada && matchesEstado && matchesTipo;
  });
}, [paquetes, search, activeFilters]);
```

### Pattern 3: Real-time Pricing with Local State

**What:** Precios tab maintains a local `markup` state, calls `calcularVenta(neto, markup)` for display, and persists with `updatePaquete` on save.
**When to use:** Editable computed fields where the formula is deterministic.

```typescript
// Inside PreciosTab.tsx
const [localMarkup, setLocalMarkup] = useState(paquete.markup);
const computedVenta = calcularVenta(paquete.netoCalculado, localMarkup);

// PriceDisplay with editable=true
<PriceDisplay
  neto={paquete.netoCalculado}
  markup={localMarkup}
  venta={computedVenta}
  onMarkupChange={setLocalMarkup}
  editable
  size="lg"
/>

// On save: dispatch updatePaquete with new markup + precioVenta
```

### Pattern 4: Delete Confirmation with Shake Animation

**What:** Clicking delete opens a Modal; the modal content has a `motion.div` with `interactions.deleteShake` applied after a brief delay.
**When to use:** Destructive actions that need confirmation + visual feedback.

```typescript
// Modal content shake on confirm-click
const [isShaking, setIsShaking] = useState(false);

const handleConfirmDelete = () => {
  setIsShaking(true);
  setTimeout(() => {
    deletePaquete(paquete.id);
    setOpen(false);
  }, 400);
};

<motion.div
  animate={isShaking ? interactions.deleteShake.animate : undefined}
  transition={interactions.deleteShake.transition}
>
  {/* confirmation text */}
</motion.div>
```

### Pattern 5: VENDEDOR Role Gate

**What:** Use `useAuth()` to conditionally render create/edit/delete buttons and neto/markup table columns.
**When to use:** Any feature that differs by role.

```typescript
const { canEdit, canSeePricing } = useAuth();

// Conditionally render action buttons
{canEdit && <Button>Nuevo Paquete</Button>}

// Conditionally render table columns
{canSeePricing.neto && <TableHead variant="price">Neto</TableHead>}
{canSeePricing.markup && <TableHead variant="markup">Markup</TableHead>}
```

### Pattern 6: Service Selector Modal with Tabbed Service Types

**What:** `ServiceSelectorModal` contains a `Tabs` root with 5 tabs (Aereos, Alojamientos, Traslados, Seguros, Circuitos). Each tab shows a list of available services from ServiceProvider that are NOT already assigned.
**When to use:** Multi-type service selection with tabs inside a modal.

```typescript
// ServiceSelectorModal.tsx
// Inside Modal + ModalBody:
<Tabs defaultValue="aereos">
  <TabsList>
    <TabsTrigger value="aereos">Aereos</TabsTrigger>
    <TabsTrigger value="alojamientos">Alojamientos</TabsTrigger>
    {/* ... */}
  </TabsList>
  <TabsContent value="aereos">
    {/* list aereos not already assigned, with "Agregar" button */}
  </TabsContent>
</Tabs>
```

Note: `Tabs` has a `layoutId` prop to namespace the animated underline. Use a unique `layoutId` when nesting tabs (e.g., `layoutId="serviceTabs"` inside a modal that already has outer tabs with default `layoutId="activeTab"`).

### Pattern 7: Fotos Tab with ImageUploader

**What:** `ImageUploader` is pre-built. Connect its callbacks to `usePackageActions()`.
**When to use:** Photo grid with add/reorder/remove functionality.

```typescript
// FotosTab.tsx
const { fotos } = usePaqueteServices(paquete.id);
const { addFoto, removeFoto, updateFoto } = usePackageActions();

const images: ImageItem[] = fotos.map((f) => ({
  id: f.id,
  url: f.url,
  alt: f.alt,
}));

const handleAdd = (urls: string[]) => {
  urls.forEach((url, i) => {
    addFoto({
      paqueteId: paquete.id,
      url,
      alt: `Foto ${fotos.length + i + 1}`,
      orden: fotos.length + i,
    });
  });
};

const handleReorder = (reordered: ImageItem[]) => {
  reordered.forEach((img, idx) => {
    const original = fotos.find((f) => f.id === img.id);
    if (original && original.orden !== idx) {
      updateFoto({ ...original, orden: idx });
    }
  });
};

<ImageUploader
  images={images}
  onAdd={handleAdd}
  onRemove={removeFoto}
  onReorder={handleReorder}
  maxImages={10}
/>
```

### Anti-Patterns to Avoid

- **Nested context inside detail page:** Do NOT create a new provider per paquete. Use `usePaqueteById(id)` + `usePaqueteServices(id)` from existing PackageProvider.
- **Slug collision:** Two paquetes with similar titles will have the same slug if `slugify` produces identical output. The list page should handle this (e.g., append ID fragment or use ID-based URL). Recommendation: use `paquete.id` as canonical URL, store slug for display only. OR accept that slugify collision is a prototype limitation (LOW risk with seed data).
- **Uncontrolled tab state without URL sync:** Tabs on the detail page MUST sync to `?tab=` search param so users can deep-link and back-navigate correctly.
- **Missing `layoutId` uniqueness for nested Tabs:** If the ServiceSelectorModal is open while the outer page has active Tabs, both share the default `layoutId="activeTab"`. This causes the animated underline to animate between both, breaking visually. Pass a unique `layoutId` to the inner Tabs.
- **`/paquetes/nuevo` captured by `[slug]`:** If `nuevo/` directory is not a sibling of `[slug]/`, Next.js will match `/paquetes/nuevo` as `slug="nuevo"` and find no paquete. Ensure route nesting is correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| USD currency display | Custom formatter | `formatCurrency()` from `@/lib/utils` | Already handles rounding, `$` prefix, comma separators |
| Neto calculation | Custom sum | `calcularNeto()` from `@/lib/utils` | Handles all 5 service types with their specific pricing formulas |
| Markup to venta | Custom formula | `calcularVenta()` from `@/lib/utils` | One-liner but already tested |
| URL slug generation | Custom regex | `slugify()` from `@/lib/utils` | Handles Spanish accents, replaces non-ASCII |
| Photo upload UI | Custom dropzone | `ImageUploader` from `@/components/ui` | Built with HTML5 D&D, object URLs, thumbnail grid, remove buttons |
| Pricing display | Custom layout | `PriceDisplay` from `@/components/ui` | Has `editable` mode, `size` variants, arrow pulse animations |
| Modal dialog | Custom overlay | `Modal` + `ModalHeader` + `ModalBody` + `ModalFooter` | Radix Dialog with `forceMount` and motion animations; pointer-events bug fix included |
| Tab navigation | Custom tab component | `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` | Radix Tabs with animated underline via `motion.div layoutId` |
| Date input | Custom date picker | `DatePicker` from `@/components/ui` | Uses `react-day-picker` v9 with Spanish locale, glass styling |
| Toggle switch | Custom checkbox | `Toggle` from `@/components/ui` | Motion animated with glass styling |
| Removable tags | Custom chip | `Tag` with `removable` prop | Built with `X` button and color presets |
| Status badge | Custom pill | `Badge` with variant | Has `active`/`inactive`/`draft` variants for `EstadoPaquete` |
| Search + filter chips | Custom search bar | `SearchFilter` from `@/components/ui` | Glass bar with animated chips built-in |
| Image drag reorder | @dnd-kit | HTML5 native D&D (already in `ImageUploader`) | Decision locked by prior phase |

**Key insight:** This phase is almost entirely wiring work. Every primitive is built. Build only page-level compositions.

---

## Common Pitfalls

### Pitfall 1: Missing `"use client"` on Detail Page with `useSearchParams`
**What goes wrong:** Next.js 14 throws "useSearchParams() should be wrapped in a Suspense boundary" at build time.
**Why it happens:** `useSearchParams` in App Router requires the component to be in a Suspense boundary when used in a Server Component tree.
**How to avoid:** Mark the detail page `"use client"` at the top, OR wrap the component using `useSearchParams` in a `<Suspense>` with a fallback. Since all admin pages are already `"use client"` (they use `useAuth()`), this is handled.
**Warning signs:** Build error mentioning `useSearchParams` and Suspense.

### Pitfall 2: Tabs `layoutId` Collision When Modal Contains Tabs
**What goes wrong:** The animated indicator bar jumps between outer page tabs and modal tabs, causing a jarring animation.
**Why it happens:** Both `Tabs` instances default to `layoutId="activeTab"`. Motion's `layoutId` is global in the component tree.
**How to avoid:** Pass explicit `layoutId="serviceSelectorTabs"` to the Tabs inside `ServiceSelectorModal`.
**Warning signs:** Tab underline animating between unrelated locations when modal opens.

### Pitfall 3: `/paquetes/nuevo` Matched as Slug
**What goes wrong:** Navigating to `/paquetes/nuevo` loads the detail page with slug `"nuevo"`, which finds no paquete and shows a not-found state.
**Why it happens:** `[slug]` dynamic segment captures all paths unless a static sibling directory exists.
**How to avoid:** Create `src/app/(admin)/paquetes/nuevo/page.tsx` as a static sibling directory to `[slug]/`, not inside it.
**Warning signs:** `/paquetes/nuevo` shows "Paquete no encontrado" instead of the create form.

### Pitfall 4: `publicado` Toggle Has No Backing Field on `Paquete`
**What goes wrong:** Developer creates a `publicado` toggle wired to a non-existent `paquete.publicado` field, causing TypeScript errors or silent state corruption.
**Why it happens:** The requirements say "toggle for publicado" but the `Paquete` type has only `estado: EstadoPaquete`.
**How to avoid:** Map "publicado" toggle to `estado === 'ACTIVO'`. Toggling it changes estado between 'ACTIVO' and 'INACTIVO'. The `destacado: boolean` field does exist on `Paquete` and maps directly to the "destacado" toggle.
**Warning signs:** TypeScript showing `Property 'publicado' does not exist on type 'Paquete'`.

### Pitfall 5: Stale `netoCalculado` After Service Assignment
**What goes wrong:** User adds a service in Servicios tab, switches to Precios tab, and sees the old `netoCalculado` value (not reflecting the new service).
**Why it happens:** `paquete.netoCalculado` is a pre-computed static value in state, not re-derived from assigned services in real time.
**How to avoid:** In PreciosTab, recompute neto on the fly using `calcularNeto()` with the current service assignments from `usePaqueteServices(paqueteId)`, rather than displaying `paquete.netoCalculado`. Update `paquete.netoCalculado` via `updatePaquete` when services change.
**Warning signs:** Neto shows different value after adding/removing a service.

### Pitfall 6: `SearchFilter` FilterChip Array Shape
**What goes wrong:** Developer passes incorrect `value` format to filter chips, causing filter logic to never match paquete properties.
**Why it happens:** `SearchFilter` accepts `FilterChip[]` with arbitrary `value` strings -- the developer must define a consistent namespacing convention and match it in the filter `useMemo`.
**How to avoid:** Use namespaced values: `"temporada:{temporadaId}"`, `"estado:ACTIVO"`, `"tipo:{tipoPaqueteId}"`. Match this in the filter useMemo with `startsWith("temporada:")`.
**Warning signs:** Filter chips toggle active state but list doesn't change.

### Pitfall 7: Object URL Memory Leak in ImageUploader
**What goes wrong:** Prototype creates many `URL.createObjectURL()` blobs that are never revoked, causing memory growth.
**Why it happens:** `ImageUploader` creates object URLs from files but never calls `URL.revokeObjectURL()`.
**How to avoid:** For a prototype, this is acceptable. Do not add a `useEffect` cleanup for object URLs unless specifically requested. Flag as known prototype limitation.
**Warning signs:** Browser memory grows after repeated image uploads/removals.

---

## Code Examples

### Paquete List Page Shell

```typescript
// src/app/(admin)/paquetes/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { usePaquetes } from "@/components/providers/PackageProvider";
import { useTemporadas, useTiposPaquete } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatCurrency, slugify } from "@/lib/utils";

// Estado -> Badge variant map
const estadoBadgeVariant = {
  ACTIVO: "active",
  BORRADOR: "draft",
  INACTIVO: "inactive",
} as const;

const estadoLabel = {
  ACTIVO: "Activo",
  BORRADOR: "Borrador",
  INACTIVO: "Inactivo",
} as const;
```

### Detail Page Tab URL Sync

```typescript
// src/app/(admin)/paquetes/[slug]/page.tsx
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePaquetes } from "@/components/providers/PackageProvider";
import { slugify } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

const TABS = ["datos", "servicios", "precios", "fotos", "publicacion"] as const;
type TabValue = typeof TABS[number];

export default function PaqueteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const paquetes = usePaquetes();

  const paquete = paquetes.find((p) => slugify(p.titulo) === slug);
  const activeTab = (searchParams.get("tab") ?? "datos") as TabValue;

  if (!paquete) {
    return <div>Paquete no encontrado</div>;
  }

  const handleTabChange = (tab: string) => {
    router.replace(`/paquetes/${slug}?tab=${tab}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="datos">Datos</TabsTrigger>
        <TabsTrigger value="servicios">Servicios</TabsTrigger>
        <TabsTrigger value="precios">Precios</TabsTrigger>
        <TabsTrigger value="fotos">Fotos</TabsTrigger>
        <TabsTrigger value="publicacion">Publicacion</TabsTrigger>
      </TabsList>
      {/* Tab content components */}
    </Tabs>
  );
}
```

### PriceDisplay Live Recalculation

```typescript
// Inside PreciosTab.tsx
import { useState, useMemo } from "react";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { calcularNeto, calcularVenta } from "@/lib/utils";
import { usePaqueteServices } from "@/components/providers/PackageProvider";
import { useServiceState } from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";

function PreciosTab({ paquete }) {
  const { canSeePricing } = useAuth();
  const [localMarkup, setLocalMarkup] = useState(paquete.markup);
  const services = usePaqueteServices(paquete.id);
  const serviceState = useServiceState();

  // Re-derive neto from live service assignments (not stale paquete.netoCalculado)
  const liveNeto = useMemo(() => {
    // Build service arrays with price lookups
    const assignedAereos = services.aereos.map((pa) => ({
      aereo: serviceState.aereos.find((a) => a.id === pa.aereoId)!,
      precioAereo: serviceState.preciosAereo.find((p) => p.aereoId === pa.aereoId),
    }));
    // ... similar for other service types
    return calcularNeto(paquete, assignedAereos, [], [], [], []);
  }, [services, serviceState, paquete]);

  const computedVenta = calcularVenta(liveNeto, localMarkup);

  return (
    <PriceDisplay
      neto={liveNeto}
      markup={localMarkup}
      venta={computedVenta}
      onMarkupChange={setLocalMarkup}
      editable={canSeePricing.markup}
      size="lg"
    />
  );
}
```

### ServiceSelectorModal with Nested Tabs

```typescript
// ServiceSelectorModal.tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

// CRITICAL: layoutId must differ from the parent page Tabs (default: "activeTab")
<Tabs defaultValue="aereos" layoutId="serviceSelectorTabs">
  <TabsList>
    <TabsTrigger value="aereos">Aereos</TabsTrigger>
    <TabsTrigger value="alojamientos">Alojamientos</TabsTrigger>
    <TabsTrigger value="traslados">Traslados</TabsTrigger>
    <TabsTrigger value="seguros">Seguros</TabsTrigger>
    <TabsTrigger value="circuitos">Circuitos</TabsTrigger>
  </TabsList>
  {/* Each TabsContent shows filtered list of available services */}
</Tabs>
```

### Delete Confirmation with Shake Animation

```typescript
// Inside delete confirmation modal
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";

const [shaking, setShaking] = useState(false);

const confirmDelete = () => {
  setShaking(true);
  setTimeout(() => {
    deletePaquete(paquete.id);
    router.push("/paquetes");
  }, 400);
};

<motion.div
  animate={shaking ? interactions.deleteShake.animate : {}}
  transition={interactions.deleteShake.transition}
>
  <p>Esta accion no se puede deshacer. El paquete sera eliminado.</p>
</motion.div>
<Button variant="danger" onClick={confirmDelete}>
  Eliminar Paquete
</Button>
```

### Badge Mapping for EstadoPaquete

```typescript
// Mapping from Paquete.estado to Badge.variant
const estadoBadge = {
  ACTIVO: { variant: "active" as const, label: "Activo" },
  BORRADOR: { variant: "draft" as const, label: "Borrador" },
  INACTIVO: { variant: "inactive" as const, label: "Inactivo" },
};

<Badge variant={estadoBadge[paquete.estado].variant}>
  {estadoBadge[paquete.estado].label}
</Badge>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (v12) | 2024 | Import from `"motion/react"` not `"framer-motion"` |
| Radix separate packages (`@radix-ui/react-dialog`) | Unified `radix-ui` package | 2024 | Import `{ Dialog } from "radix-ui"` |
| `react-day-picker` v8 API | `react-day-picker` v9 API | 2024 | `mode="single"`, `classNames` object, `modifiersStyles` |
| `useRouter().query` | `useSearchParams()` hook | Next.js 13+ | Tab sync uses `useSearchParams()` + `router.replace()` |

**Already resolved by Phase 3:**
- `motion` v12 import pattern: `import { motion, AnimatePresence } from "motion/react"` (NOT `framer-motion`)
- Radix unified import: `import { Tabs } from "radix-ui"` etc.

---

## Open Questions

1. **Slug uniqueness / collision handling**
   - What we know: `slugify("Buzios Relax")` = `"buzios-relax"`, if two paquetes have same title they get same slug
   - What's unclear: Should we use `paquete.id` in the URL instead (e.g., `/paquetes/paquete-1`), or append id to slug (e.g., `/paquetes/buzios-relax-paquete-1`)?
   - Recommendation: Use `paquete.id` directly as the URL slug for maximum reliability. The `id` values in seed data are already human-readable strings like `"paquete-1"`. If brief titles are preferred, use `slugify(titulo)-${id.slice(-4)}`. For this prototype, using the paquete's `id` directly avoids all slug collision issues.

2. **"destino" column in table (PAQT-01)**
   - What we know: `Paquete` type has no `destino` string field. Aereo has `destino: string`, Alojamiento has `ciudadId` + `paisId`.
   - What's unclear: Should "destino" in the table display the aereo's `destino`, the alojamiento's ciudad/pais, or a free-text field derived from some other source?
   - Recommendation: Display the first assigned aereo's `destino` field (most natural for travel packages). If no aereo assigned, show the first alojamiento's pais/ciudad lookup. If nothing, show `"—"`. This requires `usePaqueteServices(paquete.id)` to be called for each table row or pre-joined in a derived hook.

3. **`publicado` vs `estado` mapping in Publicacion tab**
   - What we know: `Paquete` type has `estado: 'BORRADOR' | 'ACTIVO' | 'INACTIVO'` and `destacado: boolean`. There is no `publicado: boolean` field.
   - What's unclear: The requirement says "toggle for publicado" -- should this be a separate toggle that sets estado to ACTIVO/INACTIVO, or should it be a combined "estado" selector dropdown only?
   - Recommendation: Model the "publicado" toggle as: `checked = paquete.estado === 'ACTIVO'`. Toggling on sets `estado = 'ACTIVO'`, toggling off sets `estado = 'INACTIVO'`. The estado selector (BORRADOR/ACTIVO/INACTIVO) is displayed separately.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection -- all 20 UI components, 3 providers, types, utils (2026-03-16)
- `src/components/ui/PriceDisplay.tsx` -- confirmed `editable` prop, `onMarkupChange`, arrow animations
- `src/components/ui/ImageUploader.tsx` -- confirmed HTML5 D&D, simulated upload, thumbnail grid
- `src/components/ui/Modal.tsx` -- confirmed `forceMount`, size variants, pointer-events comment
- `src/components/ui/Tabs.tsx` -- confirmed `layoutId` prop for animation namespacing
- `src/components/providers/PackageProvider.tsx` -- confirmed all CRUD, clone, service assignment hooks
- `src/components/providers/ServiceProvider.tsx` -- confirmed all service data hooks
- `src/components/providers/CatalogProvider.tsx` -- confirmed temporadas, tipos, etiquetas hooks
- `src/lib/auth.ts` -- confirmed `canEdit`, `canSeePricing` role configs for VENDEDOR
- `src/lib/utils.ts` -- confirmed `formatCurrency`, `calcularNeto`, `calcularVenta`, `slugify`
- `package.json` -- confirmed all installed versions (no new installs needed)

### Secondary (MEDIUM confidence)
- Next.js 14 App Router: static segments before dynamic segments pattern (well-known, confirmed by Next.js docs knowledge)
- `useSearchParams()` requires Suspense in App Router -- well-documented Next.js 14 behavior

### Tertiary (LOW confidence -- prototype only)
- `URL.createObjectURL` memory leak behavior (common browser behavior, not verified in this specific setup)
- Slug collision probability with seed data (assessed by inspection of seed titles -- all appear unique)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages confirmed from package.json, all components read directly
- Architecture: HIGH -- Next.js App Router route structure confirmed, patterns derived from existing code
- Pitfalls: HIGH for code issues (verified by reading actual component code), MEDIUM for edge cases like memory leaks
- Open questions: 3 identified -- all have clear recommendations, planner can proceed

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack, all internal -- no external API dependencies)
