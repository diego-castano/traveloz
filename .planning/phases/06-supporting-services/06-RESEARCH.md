# Phase 6: Supporting Services Modules - Research

**Researched:** 2026-03-16
**Domain:** React/Next.js 14 module UI — inline-editable tables, modal CRUD, drag-and-drop itinerary, glass design system
**Confidence:** HIGH (all findings sourced from live codebase; no external library unknowns)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRAS-01 | Traslados renders as inline-editable table (no separate form) | Inline-edit pattern verified from Phase 5 aereo price table; adapt for whole-row edit |
| TRAS-02 | Columns: ID, nombre, tipo (regular/privado), ciudad, pais, proveedor (select), precio, acciones | Traslado type fully defined; ciudad/pais/proveedor from CatalogProvider + ServiceProvider hooks |
| TRAS-03 | Create = new inline row, edit = inline, clone, delete with feedback | 4-state pattern (editingRowId + draftRow + addingRow + newRow) from aereo/alojamiento pages |
| SEGU-01 | Seguros list renders glass Table with columns: proveedor, plan, cobertura, costo/dia, acciones | Glass Table component fully available; proveedor name lookup via useProveedores |
| SEGU-02 | Seguro form modal with fields: proveedor, plan, cobertura, costo por dia | Modal + ModalHeader + ModalBody + ModalFooter pattern from Radix Dialog; Select for proveedorId |
| SEGU-03 | Create, edit, clone, delete seguro with feedback | createSeguro/updateSeguro/deleteSeguro all in useServiceActions; toast pattern established |
| CIRC-01 | Circuitos list renders glass table | Same glass Table component; Circuito type has nombre, noches, proveedorId |
| CIRC-02 | Circuito detail with day-by-day itinerary editor (add day, edit, reorder) | HTML5 drag-and-drop for reorder; inline text edit for dia title/description; createCircuitoDia/updateCircuitoDia in useServiceActions |
| CIRC-03 | Price-per-period table for circuitos | Same 4-state inline price table pattern; createPrecioCircuito/updatePrecioCircuito available |
| CIRC-04 | Create, edit, clone, delete circuito with feedback | Full CRUD in useServiceActions; clone = createCircuito with copied fields + cloned dias + cloned precios |
| PROV-01 | Proveedores list renders glass table | Glass Table; Proveedor has nombre, contacto, email, telefono, notas |
| PROV-02 | Proveedor CRUD via modal (nombre, datos contacto) | Modal pattern with Input fields; useCatalogActions().createProveedor/updateProveedor |
| PROV-03 | Create, edit, clone, delete proveedor with feedback | deleteProveedor = soft delete (sets deletedAt); clone via createProveedor with copied fields |
</phase_requirements>

---

## Summary

Phase 6 implements four modules that replace placeholder pages. All technical infrastructure exists: types, seed data, provider actions, UI primitives, and design system tokens are already in place from Phases 1-5. The work is exclusively page-level UI composition using established patterns.

**Traslados** is the unique case: a fully inline-editable table where every row is always in either view or edit mode. No detail page, no modal. Creating adds a new editable row at the bottom. This is an extension of the Phase 5 price-table inline edit pattern applied to the whole data model.

**Seguros and Proveedores** both use the modal CRUD pattern (list page + modal for create/edit). The only difference is Seguros' form references `proveedorId` which must be a select populated from `useProveedores()`. Both use `useServiceActions()` (Seguros) and `useCatalogActions()` (Proveedores) for persistence. The glass table list + delete-shake modal + clone pattern is already proven in Paquetes and Aereos pages.

**Circuitos** is the most complex: the list page follows the standard glass table pattern, but the detail page has two sub-sections — a day-by-day itinerary editor with drag-and-drop reorder (HTML5 native, matching the project's existing convention per prior decisions) and a price-per-period table (identical pattern to aereo/alojamiento price tables). Clone for Circuito must deep-clone: copy the Circuito entity, then copy all its CircuitoDia records and PrecioCircuito records referencing the new ID.

**Primary recommendation:** Implement modules in order of ascending complexity — Proveedores (simplest modal CRUD), Seguros (modal CRUD + proveedorId select), Traslados (inline-editable table), Circuitos (detail page with itinerary editor). Each module has a self-contained list page. Only Circuitos adds a detail route.

---

## Standard Stack

All libraries are already installed and in use. No new dependencies are needed.

### Core (already installed)

| Library | Version | Purpose | How Used in This Phase |
|---------|---------|---------|------------------------|
| next | 14.2.25 | App router, page routing | Route pages at `src/app/(admin)/[module]/` |
| react | 18.3.1 | Component model | All pages are "use client" components |
| motion (motion/react) | 12.4.7 | Animations | Delete shake, modal entrance, table row stagger |
| radix-ui | 1.4.3 | Headless primitives | Dialog (Modal), Select — already wrapped in project components |
| lucide-react | 0.469.0 | Icons | Plus, Pencil, Trash2, Copy, Check, X, GripVertical |
| tailwindcss | 3.4.18 | Utility CSS | All layout and spacing |

### Project Components to Reuse (all in `src/components/`)

| Component | Import Path | Use In |
|-----------|-------------|--------|
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `@/components/ui/Table` | All list pages |
| `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` | `@/components/ui/Modal` | Seguros, Proveedores modals; delete confirmation everywhere |
| `Button` | `@/components/ui/Button` | Actions everywhere |
| `Input` | `@/components/ui/Input` | Form fields in modals and detail pages |
| `Select` | `@/components/ui/Select` | proveedorId, paisId, ciudadId, tipo dropdowns |
| `SearchFilter` | `@/components/ui/SearchFilter` | Search bar on list pages |
| `Pagination` | `@/components/ui/Pagination` | Paginated list pages |
| `PageHeader` | `@/components/layout/PageHeader` | Page titles |
| `Card` | `@/components/ui/Card` | Detail page card sections |
| `useToast` | `@/components/ui/Toast` | All action feedback |
| `glassMaterials` | `@/components/lib/glass` | Inline inputs within Traslados table |
| `interactions`, `springs` | `@/components/lib/animations` | Delete shake, modal animations |

### Provider Hooks

| Hook | Source | Returns |
|------|--------|---------|
| `useTraslados()` | `ServiceProvider` | Brand-filtered Traslado[] (no deletedAt) |
| `useSeguros()` | `ServiceProvider` | Brand-filtered Seguro[] |
| `useCircuitos()` | `ServiceProvider` | Brand-filtered Circuito[] |
| `useProveedores()` | `CatalogProvider` | Brand-filtered Proveedor[] (no deletedAt) |
| `useServiceState()` | `ServiceProvider` | Raw state including circuitoDias, preciosCircuito |
| `useServiceActions()` | `ServiceProvider` | All CRUD operations for services |
| `useCatalogActions()` | `CatalogProvider` | CRUD for proveedores |
| `usePaises()` | `CatalogProvider` | Paises with nested ciudades (for cascading select) |
| `useAuth()` | `AuthProvider` | `canEdit` gate |
| `useBrand()` | `BrandProvider` | `activeBrandId` for creating new records |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Module Route Structure

```
src/app/(admin)/
├── traslados/
│   └── page.tsx          # Inline-editable table (no [id] route — UNIQUE)
├── seguros/
│   └── page.tsx          # Glass list + modal CRUD
├── circuitos/
│   ├── page.tsx          # Glass list
│   └── [id]/
│       └── page.tsx      # Detail: header + itinerary editor + price table
└── proveedores/
    └── page.tsx          # Glass list + modal CRUD
```

Note: Seguros and Proveedores have NO detail routes. All create/edit happens in modals on the list page. Traslados has NO detail route either.

### Pattern 1: Inline-Editable Table (Traslados — UNIQUE)

**What:** Every row is either view-mode or edit-mode. Clicking edit on a row activates in-place inputs for all columns. "Add" inserts a new editable row at the bottom.

**When to use:** ONLY for Traslados. This pattern is different from the price table pattern because the entire entity (not just sub-records) is inline-editable.

**State variables:**
```typescript
// Source: Phase 5 aereo/alojamiento inline price table, adapted for full-row entity
const [editingRowId, setEditingRowId] = useState<string | null>(null);
const [draftRow, setDraftRow] = useState<Partial<Traslado>>({});
const [addingRow, setAddingRow] = useState(false);
const [newRow, setNewRow] = useState<Partial<Omit<Traslado, 'id' | 'brandId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>>({});
```

**View mode cell:** render data values with Pencil/Copy/Trash2 icons
**Edit mode cell:** render `<input>` or `<Select>` with Check/X icons

**Inline input className** (copy exactly from aereo detail page):
```typescript
const inlineInputClassName =
  "w-full rounded-[6px] border border-neutral-150/50 bg-white/70 px-2 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm";
```

**Column-specific inputs in edit mode:**
- `nombre`: `<input type="text" className={inlineInputClassName} />`
- `tipo`: `<Select options={[{value:'REGULAR', label:'Regular'}, {value:'PRIVADO', label:'Privado'}]} />`
- `ciudadId`: `<Select options={ciudadOptions} />` — cascading from `paisId`
- `paisId`: `<Select options={paises.map(...)} />` — changes reset ciudadId in draftRow
- `proveedorId`: `<Select options={proveedores.map(...)} />`
- `precio`: `<input type="number" className={inlineInputClassName + ' text-right'} />`

**Clone for Traslado:** `createTraslado({...traslado, nombre: 'Copia de ' + traslado.nombre})`

### Pattern 2: Glass List + Modal CRUD (Seguros, Proveedores)

**What:** List page with glass Table + search + pagination. Create/edit via Modal. Delete via confirmation Modal with shake animation.

**Modal state pattern:**
```typescript
// Source: Paquetes page.tsx / Aereos page.tsx
const [modalOpen, setModalOpen] = useState(false);
const [editTarget, setEditTarget] = useState<Seguro | null>(null); // null = create mode
const [deleteTarget, setDeleteTarget] = useState<Seguro | null>(null);
const [isShaking, setIsShaking] = useState(false);

// Form state for create/edit
const [form, setForm] = useState({ proveedorId: '', plan: '', cobertura: '', costoPorDia: 0 });
```

**Opening create vs edit:**
```typescript
function handleOpenCreate() {
  setEditTarget(null);
  setForm({ proveedorId: '', plan: '', cobertura: '', costoPorDia: 0 });
  setModalOpen(true);
}

function handleOpenEdit(item: Seguro) {
  setEditTarget(item);
  setForm({ proveedorId: item.proveedorId, plan: item.plan, cobertura: item.cobertura, costoPorDia: item.costoPorDia });
  setModalOpen(true);
}
```

**Save handler (unified create/edit):**
```typescript
function handleSave() {
  if (editTarget) {
    updateSeguro({ ...editTarget, ...form });
    toast('success', 'Seguro actualizado', '...');
  } else {
    createSeguro({ brandId: activeBrandId, ...form });
    toast('success', 'Seguro creado', '...');
  }
  setModalOpen(false);
}
```

**Delete with shake:**
```typescript
// Source: Aereos page.tsx handleConfirmDelete
function handleConfirmDelete() {
  if (!deleteTarget) return;
  setIsShaking(true);
  setTimeout(() => {
    deleteSeguro(deleteTarget.id);
    toast('success', 'Seguro eliminado', '...');
    setDeleteTarget(null);
    setIsShaking(false);
  }, 400);
}
```

**Clone:**
```typescript
function handleClone(item: Seguro) {
  createSeguro({ brandId: item.brandId, proveedorId: item.proveedorId, plan: 'Copia de ' + item.plan, cobertura: item.cobertura, costoPorDia: item.costoPorDia });
  toast('success', 'Seguro clonado', '...');
}
```

### Pattern 3: Circuito Detail with Itinerary Editor

**What:** Detail page with three sections — entity header form, day-by-day itinerary editor (accordion-style rows with drag handle), and price-per-period table.

**Itinerary state:**
```typescript
// Source: project's existing drag-and-drop convention (HTML5 native)
const [editingDiaId, setEditingDiaId] = useState<string | null>(null);
const [draftDia, setDraftDia] = useState<Partial<CircuitoDia>>({});
const [addingDia, setAddingDia] = useState(false);
const [newDia, setNewDia] = useState<Partial<Omit<CircuitoDia, 'id' | 'circuitoId'>>>({});
const [dragOverId, setDragOverId] = useState<string | null>(null);
```

**Drag-and-drop reorder (HTML5 native):**
```typescript
// Source: existing project convention per prior decisions
function handleDragStart(e: React.DragEvent, diaId: string) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', diaId);
}

function handleDrop(e: React.DragEvent, targetId: string) {
  e.preventDefault();
  const sourceId = e.dataTransfer.getData('text/plain');
  if (sourceId === targetId) return;
  // Recompute orden values and dispatch UPDATE_CIRCUITO_DIA for each changed entry
  const reordered = reorderDias(dias, sourceId, targetId);
  reordered.forEach((d, i) => {
    if (d.orden !== i) updateCircuitoDia({ ...d, orden: i });
  });
  setDragOverId(null);
}

function reorderDias(dias: CircuitoDia[], sourceId: string, targetId: string): CircuitoDia[] {
  const sorted = [...dias].sort((a, b) => a.orden - b.orden);
  const sourceIndex = sorted.findIndex(d => d.id === sourceId);
  const targetIndex = sorted.findIndex(d => d.id === targetId);
  const [moved] = sorted.splice(sourceIndex, 1);
  sorted.splice(targetIndex, 0, moved);
  return sorted;
}
```

**Itinerary row display:** Show `numeroDia` badge + `titulo` + `descripcion` (truncated). Edit mode shows two text inputs.

**Price table for Circuitos:** Identical to PrecioAereo pattern (periodoDesde, periodoHasta, precio) using the 4-state inline edit with `editingRowId / draftRow / addingRow / newRow`.

**Clone for Circuito (deep clone):**
```typescript
function handleClone(circuito: Circuito) {
  const newCircuito = createCircuito({ brandId: circuito.brandId, nombre: 'Copia de ' + circuito.nombre, noches: circuito.noches, proveedorId: circuito.proveedorId });
  // Clone dias
  const dias = serviceState.circuitoDias.filter(d => d.circuitoId === circuito.id);
  dias.forEach(d => createCircuitoDia({ circuitoId: newCircuito.id, numeroDia: d.numeroDia, titulo: d.titulo, descripcion: d.descripcion, orden: d.orden }));
  // Clone precios
  const precios = serviceState.preciosCircuito.filter(p => p.circuitoId === circuito.id);
  precios.forEach(p => createPrecioCircuito({ circuitoId: newCircuito.id, periodoDesde: p.periodoDesde, periodoHasta: p.periodoHasta, precio: p.precio }));
  toast('success', 'Circuito clonado', '...');
}
```

### Pattern 4: Cascading Select (Ciudad dependent on Pais)

Traslados requires pais → ciudad cascade. This is already implemented in alojamientos detail page. Reuse exactly:

```typescript
// Source: src/app/(admin)/alojamientos/[id]/page.tsx
const paises = usePaises(); // returns Pais & { ciudades: Ciudad[] }[]

const ciudadOptions = useMemo(
  () => paises.find(p => p.id === paisId)?.ciudades.map(c => ({ value: c.id, label: c.nombre })) ?? [],
  [paises, paisId]
);
// When paisId changes: reset ciudadId in draft
```

In the inline-edit context for Traslados, when `draftRow.paisId` changes, also reset `draftRow.ciudadId` to `''`.

### Anti-Patterns to Avoid

- **Separate detail page for Seguros or Proveedores:** These are modal-only. Do not create `/seguros/[id]` or `/proveedores/[id]` routes.
- **Separate detail page for Traslados:** No `/traslados/[id]` or `/traslados/nuevo`. Everything is inline in the list table.
- **useEffect to sync form state from editTarget:** Initialize form fields at `setModalOpen(true)` call time, not via effects. Effects cause flicker and stale state race conditions.
- **Hard delete for soft-delete entities:** Traslados, Seguros, Circuitos, Proveedores all use soft delete (`deletedAt`). Call `deleteTraslado(id)`, `deleteSeguro(id)`, `deleteCircuito(id)`, `deleteProveedor(id)` — these set `deletedAt` in the reducer, not filter out.
- **Allowing multiple rows in edit mode simultaneously:** `editingRowId` is a single string, not an array. Only one row can be in edit mode at a time. Clicking edit on a different row should cancel the current edit first.
- **Re-using the `<Table>` glass component for the Traslados inline table:** The outer Table component has `motion.tbody` with stagger animations that conflict with frequent inline-edit state updates. Use a plain `<table>` inside a `<Card>` (as in the aereo/alojamiento price table sections) for the inline-edit table. The glass Table component is for read-only list pages.
- **Missing `e.stopPropagation()` on action buttons:** When table rows have `onClick` for navigation, action buttons (edit, delete, clone) must call `e.stopPropagation()` to prevent row click from firing. Already established pattern in Paquetes and Aereos pages.
- **Not gating Circuito clone behind VENDEDOR check:** Clone modifies data. All mutation actions must be inside `{canEdit && (...)}` guards.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom portal + overlay | `Modal` + `ModalHeader` + `ModalBody` + `ModalFooter` | Already implemented; handles Radix pointer-events bug with forceMount |
| Dropdown selects | `<select>` HTML element | `Select` from `@/components/ui/Select` | Glass styling, Radix accessibility, already in use everywhere |
| Toast notifications | Custom state/portal | `useToast()` | Already available, consistent 4-variant API |
| Brand filtering | Manual `.filter(x => x.brandId === ...)` in components | `useTraslados()`, `useSeguros()`, `useCircuitos()`, `useProveedores()` | Already brand-filtered and deletedAt-filtered |
| ID generation | `Math.random()` | `crypto.randomUUID()` | Already the pattern in all serviceActions |
| Inline input styling | Tailwind classes from scratch | `inlineInputClassName` constant from aereo detail page | Exact glass focus ring matches design system tokens |
| Drag visual feedback | CSS transforms, clone elements | `dragOverId` state + border highlight on target row | Simple enough with HTML5 DnD; matches project's established pattern |

**Key insight:** Every primitive needed for Phase 6 exists. The only new code is page-level composition using existing patterns.

---

## Common Pitfalls

### Pitfall 1: Traslados Table Uses Glass Table Component

**What goes wrong:** Developer wraps the inline-editable table in the `<Table>` component from `@/components/ui/Table.tsx`. The `motion.tbody` stagger animation re-fires every time `editingRowId` changes, causing row animations on every keypress.

**Why it happens:** The `Table` component is designed for read-only display. Its `TableBody` uses Framer Motion with stagger entry animations.

**How to avoid:** Use a plain `<table>` inside a `glassMaterials.frosted` `<div>` (as done in the price table sections of aereo/alojamiento detail pages), not the `<Table>` component.

**Warning signs:** Row animations triggering during typing in edit mode.

### Pitfall 2: Cascading Select State Desync in Inline Edit

**What goes wrong:** When the user changes `paisId` in the Traslados inline edit, the `ciudadId` still shows the old value (from a different pais), resulting in invalid data being saved.

**Why it happens:** `draftRow.ciudadId` is not reset when `draftRow.paisId` changes in edit mode.

**How to avoid:** In the paisId change handler, explicitly reset ciudadId:
```typescript
setDraftRow(d => ({ ...d, paisId: newPaisId, ciudadId: '' }));
```

**Warning signs:** Saving a traslado where the stored `ciudadId` does not belong to the stored `paisId`.

### Pitfall 3: Circuito Clone Missing Sub-Records

**What goes wrong:** `handleClone(circuito)` only copies the Circuito entity, not its CircuitoDia or PrecioCircuito records. The cloned circuit shows as empty.

**Why it happens:** `createCircuito` only creates the parent record. Sub-records must be cloned separately via `createCircuitoDia` and `createPrecioCircuito`.

**How to avoid:** After creating the new Circuito, immediately loop through `serviceState.circuitoDias.filter(d => d.circuitoId === circuito.id)` and `serviceState.preciosCircuito.filter(p => p.circuitoId === circuito.id)`, calling create for each. Use `useServiceState()` directly (not `useCircuitos()`) to access sub-records.

**Warning signs:** Cloned circuit has 0 days and 0 price periods.

### Pitfall 4: Modal Form State Not Reset Between Sessions

**What goes wrong:** User opens Create modal, partially fills it, cancels. Then opens Edit for an existing record. The form shows the partial data from the abandoned create session.

**Why it happens:** Modal form state is initialized in a useEffect watching `modalOpen` rather than at the call site.

**How to avoid:** Always call `setForm({ ...fields })` synchronously at the same time as `setModalOpen(true)` — as shown in Pattern 2 above with `handleOpenCreate` and `handleOpenEdit`.

**Warning signs:** Form fields show stale data from previous open session.

### Pitfall 5: Proveedor Name Lookup Requires Separate `useMemo`

**What goes wrong:** In Seguros list, displaying the proveedor name requires looking up `proveedorId` against the proveedores list. Without memoization, this runs on every render.

**Why it happens:** Lookup happens inline in the render with `.find()`.

**How to avoid:** Build a `proveedorMap` in `useMemo`:
```typescript
const proveedores = useProveedores();
const proveedorMap = useMemo(() => {
  const map: Record<string, string> = {};
  for (const p of proveedores) { map[p.id] = p.nombre; }
  return map;
}, [proveedores]);
// Usage: proveedorMap[seguro.proveedorId] ?? '--'
```

**Warning signs:** Missing names or performance issues with large lists.

### Pitfall 6: Drag-and-Drop Order Index vs `numeroDia`

**What goes wrong:** After reordering, `orden` is updated correctly, but `numeroDia` still reflects the original day number. UI shows "Dia 3" in position 1.

**Why it happens:** `numeroDia` and `orden` are separate fields. Reorder updates `orden`; `numeroDia` must also be recalculated.

**How to avoid:** When dispatching reorder updates, also update `numeroDia` to match the new position index + 1:
```typescript
reordered.forEach((d, i) => {
  updateCircuitoDia({ ...d, orden: i, numeroDia: i + 1 });
});
```

**Warning signs:** Day number badges don't match display position after drag-and-drop.

---

## Code Examples

### Proveedores Modal Form (simplest modal CRUD)

```typescript
// Source: Paquetes page.tsx delete modal + Aereos clone pattern, adapted
function ProveedorModal({ open, onOpenChange, editTarget, onSave }) {
  const [form, setForm] = useState({ nombre: '', contacto: '', email: '', telefono: '', notas: '' });

  // Initialize when modal opens -- NOT in useEffect
  // Call setForm at the same time as setModalOpen(true) in the parent

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="md">
      <ModalHeader title={editTarget ? 'Editar Proveedor' : 'Nuevo Proveedor'}>{null}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <Input label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <Input label="Contacto" value={form.contacto ?? ''} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} />
          <Input label="Email" type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Telefono" value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
          <Input label="Notas" value={form.notas ?? ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={() => onSave(form)}>{editTarget ? 'Guardar' : 'Crear'}</Button>
      </ModalFooter>
    </Modal>
  );
}
```

### Delete Confirmation Modal (reusable across all four modules)

```typescript
// Source: Aereos page.tsx — identical pattern used in Paquetes
<Modal open={!!deleteTarget} onOpenChange={open => { if (!open) { setDeleteTarget(null); setIsShaking(false); } }} size="sm">
  <ModalHeader title="Eliminar [Entity]">{null}</ModalHeader>
  <ModalBody>
    <motion.div
      animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
      transition={isShaking ? interactions.deleteShake.transition : undefined}
    >
      <p className="text-neutral-700">Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?</p>
      <p className="text-sm text-neutral-400 mt-2">Esta accion no se puede deshacer.</p>
    </motion.div>
  </ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
    <Button variant="danger" onClick={handleConfirmDelete}>Eliminar</Button>
  </ModalFooter>
</Modal>
```

### Traslados Inline Row — Edit Mode Skeleton

```typescript
// Source: aereo/[id] page.tsx inline price table, adapted for full entity
{editingRowId === traslado.id ? (
  <tr key={traslado.id} className="border-b border-neutral-100/50">
    <TableCell variant="id">{traslado.id.slice(-4)}</TableCell>
    <td className="px-4 py-2">
      <input type="text" className={inlineInputClassName} value={draftRow.nombre ?? ''} onChange={e => setDraftRow(d => ({ ...d, nombre: e.target.value }))} />
    </td>
    <td className="px-4 py-2">
      <Select options={[{ value: 'REGULAR', label: 'Regular' }, { value: 'PRIVADO', label: 'Privado' }]} value={draftRow.tipo} onValueChange={v => setDraftRow(d => ({ ...d, tipo: v as TipoTraslado }))} />
    </td>
    {/* ... pais, ciudad (cascading), proveedor selects, precio number input */}
    <td className="px-4 py-2">
      <div className="flex items-center gap-1">
        <Button variant="icon" size="xs" onClick={handleSaveEdit}><Check className="h-4 w-4 text-green-600" /></Button>
        <Button variant="icon" size="xs" onClick={handleCancelEdit}><X className="h-4 w-4 text-neutral-400" /></Button>
      </div>
    </td>
  </tr>
) : (
  /* view mode row */
)}
```

### Circuito Itinerary Row with Drag Handle

```typescript
// Source: project's established HTML5 DnD convention
<tr
  key={dia.id}
  draggable={canEdit}
  onDragStart={e => handleDragStart(e, dia.id)}
  onDragOver={e => { e.preventDefault(); setDragOverId(dia.id); }}
  onDrop={e => handleDrop(e, dia.id)}
  onDragLeave={() => setDragOverId(null)}
  className={cn(
    "border-b border-neutral-100/50 transition-colors",
    dragOverId === dia.id && "bg-brand-teal-50/40"
  )}
>
  {canEdit && (
    <td className="px-2 py-3 w-8 cursor-grab">
      <GripVertical className="h-4 w-4 text-neutral-300" />
    </td>
  )}
  <td className="px-4 py-3">
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-teal-100 text-xs font-bold text-brand-teal-700">
      {dia.numeroDia}
    </span>
  </td>
  {/* titulo, descripcion, action buttons */}
</tr>
```

---

## State of the Art

| Module | Old Placeholder | New Implementation |
|--------|-----------------|--------------------|
| Traslados | `<PageHeader>` only | Inline-editable full table — unique pattern in project |
| Seguros | `<PageHeader>` only | Glass list + modal CRUD |
| Circuitos | `<PageHeader>` only | Glass list + detail page with itinerary + prices |
| Proveedores | `<PageHeader>` only | Glass list + modal CRUD |

All four replace stub placeholder pages that only render `<PageHeader>`.

---

## Open Questions

1. **Seguro `cobertura` field format**
   - What we know: Type is `string` (e.g., "USD 40.000", "USD 80.000"). Free text in seed data.
   - What's unclear: Should it be free text `<Input>` or a structured `number` field formatted on display?
   - Recommendation: Use free text `<Input>` matching the seed data pattern. Avoids parsing complexity with no benefit at this stage.

2. **Circuito detail route — list navigation**
   - What we know: Paquetes routes to `/paquetes/[id]`; aereos routes to `/aereos/[id]`
   - What's unclear: Should Circuito list rows be clickable to navigate to detail, or should there be an explicit Eye/detail button?
   - Recommendation: Follow the Aereos pattern — row click navigates to `/circuitos/[id]`, and action column has Eye + Copy + Trash2 buttons (no separate Edit button since the detail page handles editing inline).

3. **Proveedor soft delete — cascade to Seguros/Traslados/Circuitos**
   - What we know: Deleting a Proveedor sets `deletedAt` on the Proveedor record. Existing Seguros/Traslados that reference the deleted `proveedorId` are unaffected in state.
   - What's unclear: Should the Proveedores delete confirmation warn about related records?
   - Recommendation: No cascade warning needed at this stage. The lookup `proveedorMap[id] ?? '--'` already handles missing proveedores gracefully in list views.

---

## Sources

### Primary (HIGH confidence)

All findings sourced directly from the live codebase:

- `src/lib/types.ts` — Traslado, Seguro, Circuito, CircuitoDia, PrecioCircuito, Proveedor interfaces
- `src/lib/data/traslados.ts`, `seguros.ts`, `circuitos.ts`, `proveedores.ts` — Seed data confirming field shapes
- `src/components/providers/ServiceProvider.tsx` — All CRUD actions: createTraslado, updateTraslado, deleteTraslado, createSeguro, updateSeguro, deleteSeguro, createCircuito, updateCircuito, deleteCircuito, createCircuitoDia, updateCircuitoDia, deleteCircuitoDia, createPrecioCircuito, updatePrecioCircuito, deletePrecioCircuito
- `src/components/providers/CatalogProvider.tsx` — createProveedor, updateProveedor, deleteProveedor; useProveedores hook
- `src/app/(admin)/aereos/[id]/page.tsx` — Inline price table: 4-state pattern (editingRowId, draftRow, addingRow, newRow) + inlineInputClassName
- `src/app/(admin)/alojamientos/[id]/page.tsx` — Cascading pais/ciudad Select pattern; photo grid; inline price table with Select in edit mode
- `src/app/(admin)/aereos/page.tsx` — Glass list: search, pagination, clone, delete-shake modal, canEdit gate
- `src/app/(admin)/paquetes/page.tsx` — Advanced list: filter chips, temporadaMap lookup, deleteTarget pattern
- `src/components/ui/Table.tsx` — Glass table (motion.tbody stagger — NOT suitable for inline edit)
- `src/components/ui/Modal.tsx` — Radix Dialog wrapper with forceMount fix
- `src/components/ui/Select.tsx` — Radix Select with glass styling
- `src/components/lib/glass.ts` — glassMaterials tokens
- `src/components/lib/animations.ts` — deleteShake, modalContent, springs
- `package.json` — Confirmed versions: next 14.2.25, react 18.3.1, motion 12.4.7, radix-ui 1.4.3, lucide-react 0.469.0

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sourced entirely from live codebase; no external unknowns
- Architecture patterns: HIGH — verified against 3 completed modules (Paquetes, Aereos, Alojamientos)
- Pitfalls: HIGH — identified from direct code inspection of actual implementations; some confirmed by code comments (e.g., Modal.tsx "IMPORTANT: forceMount on Portal, Overlay, Content prevents Radix pointer-events bug")

**Research date:** 2026-03-16
**Valid until:** Stable — patterns will not change unless Phases 1-5 are refactored. Re-research not needed unless design system changes.
