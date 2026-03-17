# Phase 7: Catalogos & Perfiles - Research

**Researched:** 2026-03-16
**Domain:** React/Next.js 14 admin UI — tabbed catalog management, modal CRUD for simple entities, user administration with role assignment
**Confidence:** HIGH (all findings sourced from live codebase; no external library unknowns)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CATL-01 | Catalogos page with tabs for each catalog type (Temporadas, Tipos de paquete, Etiquetas, Paises y ciudades, Regimenes) | Tabs component already built with React Context + animated violet-to-teal gradient indicator using layoutId; CatalogProvider already has all five entity lists and full CRUD actions |
| CATL-02 | Temporadas tab with CRUD | Temporada type: {id, brandId, nombre, orden, activa}; createTemporada/updateTemporada/deleteTemporada in useCatalogActions(); modal CRUD pattern from Seguros/Proveedores pages is the exact model |
| CATL-03 | Tipos de paquete tab with CRUD | TipoPaquete type: {id, brandId, nombre, orden, activo}; createTipoPaquete/updateTipoPaquete/deleteTipoPaquete in useCatalogActions() |
| CATL-04 | Etiquetas tab with CRUD | Etiqueta type: {id, brandId, nombre, slug, color}; color is a hex string displayed as a colored swatch; createEtiqueta/updateEtiqueta/deleteEtiqueta in useCatalogActions() |
| CATL-05 | Paises y ciudades tab with CRUD | Pais type: {id, brandId, nombre, codigo}; Ciudad type: {id, paisId, nombre} — no brandId; usePaises() returns enriched Pais & {ciudades: Ciudad[]}[]; two-level CRUD: manage paises + manage ciudades per pais (inline expandable or nested table) |
| CATL-06 | Regimenes tab with CRUD | Regimen type: {id, brandId, nombre, abrev}; createRegimen/updateRegimen/deleteRegimen in useCatalogActions() |
| PERF-01 | Perfiles table with columns: nombre, email, rol (badge), marca, acciones | AuthUser type: {id, name, email, role, brandId}; Role = "ADMIN" | "VENDEDOR" | "MARKETING"; brand name resolved via useBrand() brands list; Badge variants: "active" for ADMIN, "pending" for VENDEDOR, "draft" for MARKETING |
| PERF-02 | Create/edit user via modal | No UserProvider exists — must build one; modal follows exact Seguros/Proveedores create/edit pattern; Select for role and brandId |
| PERF-03 | CRUD for users with role assignment | UserProvider needed: state = AuthUser[]; CRUD actions: createUser, updateUser, deleteUser; initial state = DEMO_USERS from src/lib/auth.ts; delete = hard delete (no deletedAt on AuthUser); Perfiles is ADMIN-only module (visibleModules guard) |
</phase_requirements>

---

## Summary

Phase 7 implements two pages: Catalogos and Perfiles. Both pages replace placeholder stubs that currently only render `<PageHeader>`. All UI primitives, design system tokens, and animation patterns are already in place from Phases 1-6. The technical work is primarily composition — wiring existing components and hooks into new page-level UI.

**Catalogos** is the more complex of the two: a tabbed interface housing five independent catalog mini-managers. All five catalog entity types (Temporadas, TiposPaquete, Etiquetas, Paises/Ciudades, Regimenes) already have complete CRUD actions in `useCatalogActions()` and are brand-filtered via their respective hooks. The Tabs component already exists with the animated gradient indicator. The dominant pattern for each tab is the modal CRUD list page — identical to the Seguros and Proveedores pages built in Phase 6. Paises/Ciudades is the one exception: it is a two-level entity (a Pais contains Ciudades), requiring a nested CRUD UI within the tab.

**Perfiles** requires building a new `UserProvider` because no user management state exists yet. DEMO_USERS in `src/lib/auth.ts` is the seed data, and AuthUser is the entity type. The Perfiles page is a glass Table list with a modal create/edit form — the same Seguros/Proveedores pattern. The only structural difference is that role assignment uses a Select and brand assignment uses another Select. The Badge component already has appropriate variants for the three roles.

**Primary recommendation:** Build Catalogos as one page file with five tab sub-components. Build UserProvider alongside the Perfiles page. Both modules are self-contained — neither depends on the other.

---

## Standard Stack

All libraries are already installed and in use. No new dependencies are needed.

### Core (already installed)

| Library | Version | Purpose | How Used in This Phase |
|---------|---------|---------|------------------------|
| next | 14.2.25 | App router, page routing | Both pages are in `src/app/(admin)/[module]/page.tsx` |
| react | 18.3.1 | Component model | All pages are "use client" components |
| motion (motion/react) | 12.4.7 | Animations | Delete shake, modal entrance, tab indicator layoutId |
| radix-ui | 1.4.3 | Headless primitives | Tabs.Root, Dialog (Modal) — already wrapped in project components |
| lucide-react | 0.469.0 | Icons | Plus, Pencil, Trash2, Copy, Users, Globe, Tag, Calendar, Utensils |
| tailwindcss | 3.4.18 | Utility CSS | All layout and spacing |
| class-variance-authority | 0.7.1 | Badge CVA | Badge variant/size system already in Badge.tsx |

### Project Components to Reuse (all in `src/components/`)

| Component | Import Path | Use In |
|-----------|-------------|--------|
| `Tabs, TabsList, TabsTrigger, TabsContent` | `@/components/ui/Tabs` | Catalogos page tab shell |
| `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` | `@/components/ui/Table` | All catalog mini-lists + Perfiles list |
| `Modal, ModalHeader, ModalBody, ModalFooter` | `@/components/ui/Modal` | Create/edit and delete modals for all entities |
| `Button` | `@/components/ui/Button` | All action buttons |
| `Input` | `@/components/ui/Input` | Form fields in all modals |
| `Select` | `@/components/ui/Select` | Role select, brand select, activa/activo boolean select |
| `Badge` | `@/components/ui/Badge` | Role badges in Perfiles table |
| `SearchFilter` | `@/components/ui/SearchFilter` | Search bar per tab (or on Perfiles page) |
| `Pagination` | `@/components/ui/Pagination` | Paginated lists within tabs |
| `PageHeader` | `@/components/layout/PageHeader` | Page title at top of both pages |
| `useToast` | `@/components/ui/Toast` | All action feedback |
| `glassMaterials` | `@/components/lib/glass` | Card containers within tabs if needed |
| `interactions` | `@/components/lib/animations` | `interactions.deleteShake` for delete confirmation modal |

### Provider Hooks

| Hook | Source | Returns |
|------|--------|---------|
| `useTemporadas()` | `CatalogProvider` | Brand-filtered Temporada[] |
| `useTiposPaquete()` | `CatalogProvider` | Brand-filtered TipoPaquete[] |
| `useEtiquetas()` | `CatalogProvider` | Brand-filtered Etiqueta[] |
| `usePaises()` | `CatalogProvider` | Brand-filtered (Pais & {ciudades: Ciudad[]})[] |
| `useRegimenes()` | `CatalogProvider` | Brand-filtered Regimen[] |
| `useCatalogActions()` | `CatalogProvider` | All catalog CRUD: createTemporada, updateTemporada, deleteTemporada, createTipoPaquete, updateTipoPaquete, deleteTipoPaquete, createEtiqueta, updateEtiqueta, deleteEtiqueta, createPais, updatePais, deletePais, createCiudad, updateCiudad, deleteCiudad, createRegimen, updateRegimen, deleteRegimen |
| `useUsers()` (new) | `UserProvider` (new) | All AuthUser[] (all brands) |
| `useUserActions()` (new) | `UserProvider` (new) | createUser, updateUser, deleteUser |
| `useAuth()` | `AuthProvider` | `canEdit`, `isAdmin` gate |
| `useBrand()` | `BrandProvider` | `activeBrandId`, `brands` list for brand name lookup |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Module Route Structure

```
src/app/(admin)/
├── catalogos/
│   └── page.tsx          # Tabbed page: Temporadas | Tipos | Etiquetas | Paises/Ciudades | Regimenes
└── perfiles/
    └── page.tsx          # Glass list table + modal CRUD for users
```

No sub-routes needed. Both modules are single-page. All CRUD happens in modals.

### New Provider to Build

```
src/components/providers/
├── UserProvider.tsx       # New: AuthUser[] state + CRUD + useUsers hook
└── Providers.tsx          # Add <UserProvider> to composition chain
```

### Pattern 1: Tabbed Catalog Page

**What:** Single page with five tabs. Each tab is a self-contained mini-list-manager (search, table, create button, modal). Only the active tab renders its list data.

**How to use the Tabs component:**
```typescript
// Source: src/components/ui/Tabs.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

<Tabs defaultValue="temporadas" layoutId="catalogos-tabs">
  <TabsList>
    <TabsTrigger value="temporadas">Temporadas</TabsTrigger>
    <TabsTrigger value="tipos">Tipos de Paquete</TabsTrigger>
    <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
    <TabsTrigger value="paises">Paises y Ciudades</TabsTrigger>
    <TabsTrigger value="regimenes">Regimenes</TabsTrigger>
  </TabsList>
  <TabsContent value="temporadas"><TemporadasTab /></TabsContent>
  <TabsContent value="tipos"><TiposPaqueteTab /></TabsContent>
  <TabsContent value="etiquetas"><EtiquetasTab /></TabsContent>
  <TabsContent value="paises"><PaisesTab /></TabsContent>
  <TabsContent value="regimenes"><RegimenesTab /></TabsContent>
</Tabs>
```

**Tab indicator:** Already built into TabsTrigger — `layoutId` prop passed to Tabs propagates through context to the `motion.div` in TabsTrigger. Gradient: `linear-gradient(90deg, #8B5CF6, #3BBFAD)`.

**Tab content fade-in:** Already built into TabsContent — `motion.div` with `initial={{ opacity: 0, y: 4 }}`.

**When to use:** Exactly this way for Catalogos. `layoutId` must be unique per Tabs instance to avoid animation conflicts across pages.

### Pattern 2: Tab Sub-Component with Modal CRUD (Standard Catalog Tab)

**What:** Each catalog tab (except Paises) follows the Seguros/Proveedores page.tsx pattern exactly. Local `modalOpen`, `editTarget`, `deleteTarget`, `isShaking`, `form`, `search`, `page` state. No extraction to child components needed — keep state local to the tab component.

**Apply for:** Temporadas, Tipos de Paquete, Etiquetas, Regimenes tabs.

**State pattern (copy from Seguros/Proveedores):**
```typescript
// Source: src/app/(admin)/seguros/page.tsx and proveedores/page.tsx
const [modalOpen, setModalOpen] = useState(false);
const [editTarget, setEditTarget] = useState<Temporada | null>(null);
const [deleteTarget, setDeleteTarget] = useState<Temporada | null>(null);
const [isShaking, setIsShaking] = useState(false);
const [form, setForm] = useState({ nombre: '', orden: 1, activa: true });
const [search, setSearch] = useState('');
const [page, setPage] = useState(1);
```

**Open handlers (initialize form synchronously, NOT in useEffect):**
```typescript
function handleOpenCreate() {
  setEditTarget(null);
  setForm({ nombre: '', orden: temporadas.length + 1, activa: true });
  setModalOpen(true);
}

function handleOpenEdit(t: Temporada) {
  setEditTarget(t);
  setForm({ nombre: t.nombre, orden: t.orden, activa: t.activa });
  setModalOpen(true);
}
```

**Save handler (unified create/edit):**
```typescript
function handleSave() {
  if (editTarget) {
    updateTemporada({ ...editTarget, ...form });
    toast('success', 'Temporada actualizada', '...');
  } else {
    createTemporada({ brandId: activeBrandId, ...form });
    toast('success', 'Temporada creada', '...');
  }
  setModalOpen(false);
}
```

**Delete with shake (identical to Seguros pattern):**
```typescript
function handleConfirmDelete() {
  if (!deleteTarget) return;
  setIsShaking(true);
  setTimeout(() => {
    deleteTemporada(deleteTarget.id);
    toast('success', 'Temporada eliminada', '...');
    setDeleteTarget(null);
    setIsShaking(false);
  }, 400);
}
```

### Pattern 3: Etiquetas Tab (Color Swatch Display)

**What:** Etiqueta has a `color` field (hex string like `"#22c55e"`). Display it as a colored circular swatch next to the nombre in the table. Edit as an `<input type="color">` in the modal.

**Color swatch in table cell:**
```typescript
// Source: codebase pattern — color stored as hex string in Etiqueta type
<TableCell>
  <div className="flex items-center gap-2">
    <span
      className="inline-block h-4 w-4 rounded-full border border-neutral-200/60"
      style={{ background: etiqueta.color }}
    />
    <span>{etiqueta.nombre}</span>
  </div>
</TableCell>
```

**Color input in modal:**
```typescript
<div className="flex flex-col gap-1.5">
  <label className="text-[12.5px] font-medium" style={{ color: "#2D2F4D" }}>Color</label>
  <input
    type="color"
    value={form.color}
    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
    className="h-10 w-full cursor-pointer rounded-glass-sm border border-neutral-200/80 bg-white/70"
  />
</div>
```

**Slug auto-generation:** Slug should auto-generate from nombre on create (slugify: lowercase + replace spaces with `-` + strip non-alphanumeric). Allow override in modal with a separate Input. Update slug only on create, not on edit (URL stability).
```typescript
const slug = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
```

### Pattern 4: Paises y Ciudades Tab (Two-Level CRUD)

**What:** Paises is a two-level entity. The tab shows Paises as the primary list. Each Pais row has a chevron/expand button. Clicking expand reveals an inline sub-table of Ciudades for that Pais. Ciudades CRUD (add/edit/delete) operates within the expanded row.

**Why inline expand, not nested modal:** Ciudades have only one field (nombre). Opening a separate modal for a single-field entity is over-engineered. Inline expansion is lighter.

**State:**
```typescript
// Source: pattern designed for this phase based on usePaises() enriched data
const paises = usePaises(); // already enriched with { ciudades: Ciudad[] }
const [expandedPaisId, setExpandedPaisId] = useState<string | null>(null);

// Pais CRUD modal
const [paisModalOpen, setPaisModalOpen] = useState(false);
const [editPais, setEditPais] = useState<Pais | null>(null);
const [paisForm, setPaisForm] = useState({ nombre: '', codigo: '' });

// Ciudad inline add/edit within expanded row
const [addingCiudad, setAddingCiudad] = useState<string | null>(null); // paisId
const [newCiudadNombre, setNewCiudadNombre] = useState('');
const [editingCiudadId, setEditingCiudadId] = useState<string | null>(null);
const [ciudadDraft, setCiudadDraft] = useState('');
```

**Pais row with expand toggle:**
```typescript
<TableRow key={pais.id}>
  <TableCell>
    <button onClick={() => setExpandedPaisId(expandedPaisId === pais.id ? null : pais.id)}>
      <ChevronRight className={cn("h-4 w-4 transition-transform", expandedPaisId === pais.id && "rotate-90")} />
    </button>
  </TableCell>
  <TableCell className="font-medium">{pais.nombre}</TableCell>
  <TableCell className="font-mono text-xs text-neutral-400">{pais.codigo}</TableCell>
  <TableCell className="text-neutral-400 text-sm">{pais.ciudades.length} ciudades</TableCell>
  <TableCell>/* edit/delete actions */</TableCell>
</TableRow>
{expandedPaisId === pais.id && (
  <tr>
    <td colSpan={5} className="px-8 py-3 bg-neutral-50/40">
      /* Ciudades sub-table */
    </td>
  </tr>
)}
```

**Ciudad inline add:** Within the expanded section, a small text input + Check/X buttons at the bottom of the sub-table. Uses `createCiudad({ paisId: pais.id, nombre: newCiudadNombre })`.

**Ciudad delete:** Hard delete via `deleteCiudad(ciudad.id)`. No delete confirmation needed for ciudades — they are simple string values.

**Cascade concern:** Deleting a Pais that has Ciudades: there is no FK enforcement in the in-memory store. The reducer's `DELETE_PAIS` only removes the Pais. Ciudades referencing the deleted `paisId` will remain as orphans in state but will not appear in `usePaises()` (they are filtered by `paisId`). This is acceptable at this stage — add a warning in the Pais delete confirmation: "Esto eliminara las ciudades asociadas."

### Pattern 5: Perfiles Page (User Management)

**What:** Glass Table list of all users (all brands visible to ADMIN). Modal create/edit with role and brand selects. Hard delete (no `deletedAt` on AuthUser). Page is ADMIN-only.

**ADMIN-only guard:** Check `isAdmin` from `useAuth()`. If `!isAdmin`, show an access-denied message or redirect. The nav already hides this link from non-ADMIN users via `visibleModules`, but a page-level guard is needed as defense.

**Badge mapping for roles:**
```typescript
// Source: Badge.tsx variantStyles — existing variants map cleanly to roles
const roleBadgeVariant: Record<Role, BadgeVariant> = {
  ADMIN: 'active',      // teal/green — authorized
  VENDEDOR: 'pending',  // orange — limited access
  MARKETING: 'draft',   // grey — read-only
};
const roleBadgeLabel: Record<Role, string> = {
  ADMIN: 'Admin',
  VENDEDOR: 'Vendedor',
  MARKETING: 'Marketing',
};
```

**Brand name lookup:**
```typescript
const { brands } = useBrand();
const brandMap = useMemo(() => {
  const map: Record<string, string> = {};
  for (const b of brands) { map[b.id] = b.name; }
  return map;
}, [brands]);
// Usage: brandMap[user.brandId] ?? '--'
```

**UserProvider (new — to build):**
```typescript
// Source: AuthProvider.tsx pattern + CatalogProvider.tsx useReducer pattern
// Initial state: DEMO_USERS from src/lib/auth.ts
// Actions: ADD_USER | UPDATE_USER | DELETE_USER
// Hard delete: filter(u => u.id !== action.payload)
// useUsers() hook: returns all users (not brand-filtered — ADMIN sees all)
// useUserActions() hook: returns { createUser, updateUser, deleteUser }
```

**Wire into Providers.tsx:** Add `<UserProvider>` inside the existing composition. Suggested position: inside `<AuthProvider>` after `<BrandProvider>`.

**Form state for user modal:**
```typescript
const [form, setForm] = useState({
  name: '',
  email: '',
  role: 'VENDEDOR' as Role,
  brandId: 'brand-1',
});
```

### Anti-Patterns to Avoid

- **Multiple Tabs instances on same page sharing the same `layoutId`:** The layoutId prop must be unique per Tabs instance. Use `"catalogos-tabs"` for the Catalogos page. If multiple Tabs are ever nested, each needs its own ID to avoid motion.div animation cross-contamination.
- **Storing tab content modal state at page level:** Each tab has its own `modalOpen`, `editTarget`, etc. Do NOT lift this state to the Catalogos page level. Keep it local to each tab sub-component (or in local state within the page if using inline tab sections, not extracted components).
- **Using useEffect to sync form state from editTarget:** Initialize form fields at `setModalOpen(true)` call time in `handleOpenEdit`. Effects cause race conditions and stale state (proven pitfall documented in Phase 6 research).
- **Re-rendering all tabs on brand switch:** `useTemporadas()`, `useTiposPaquete()`, etc. already filter by `activeBrandId` via `useMemo`. No extra filtering needed in tab components.
- **Hard-coding color values for the etiqueta color picker:** Let the user pick any hex color. Do not restrict to a palette.
- **Allowing VENDEDOR users to access Perfiles:** `visibleModules` for VENDEDOR is `["paquetes"]` — Perfiles is not listed. Add `isAdmin` check as page-level guard in addition to nav hiding.
- **Storing all 5 catalog tab UIs in one 1000-line file:** Extract each tab to a named function component within the same file (not separate files) for readability. Example: `function TemporadasTab() {...}` defined above the page component and used in TabsContent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animated tab indicator | Custom CSS transitions | `Tabs` + `TabsTrigger` from `@/components/ui/Tabs` | Already implements React Context + Framer Motion layoutId; exact design system gradient |
| Modal dialogs | Custom portal + overlay | `Modal` + `ModalHeader` + `ModalBody` + `ModalFooter` | Handles Radix forceMount pointer-events bug; AnimatePresence already wired |
| Dropdown selects | `<select>` HTML element | `Select` from `@/components/ui/Select` | Glass styling, Radix accessibility, already in use everywhere |
| Toast notifications | Custom state/portal | `useToast()` | 4-variant API, already available globally |
| Brand-filtered catalog data | Manual `.filter(x => x.brandId === ...)` | `useTemporadas()`, `useTiposPaquete()`, `useEtiquetas()`, `usePaises()`, `useRegimenes()` | Already brand-filtered and memoized |
| ID generation | `Math.random()` or `Date.now()` | `crypto.randomUUID()` | Established pattern in all CRUD actions |
| Role badge styling | Manual inline styles per role | `Badge` with `variant` prop | CVA size system + glass inline styles already defined; `active`/`pending`/`draft` variants map to roles |
| Slug generation | npm package | Inline `nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')` | Simple enough to inline; no library needed for this use case |

**Key insight:** Phase 7 is pure composition. Every UI primitive, animation token, data hook, and type already exists. The only net-new code is `UserProvider.tsx` (~100 lines) and the page components themselves.

---

## Common Pitfalls

### Pitfall 1: Tab layoutId Conflicts With Other Tabs on Same Page

**What goes wrong:** If `layoutId` is not specified or defaults to `"activeTab"` (the Tabs component default), and multiple Tabs instances exist on the same page, Framer Motion tries to animate between them causing the indicator to jump across tab groups.

**Why it happens:** Framer Motion `layoutId` is global — any two motion elements with the same `layoutId` are treated as the same element for shared layout animations.

**How to avoid:** Always pass a unique `layoutId` prop to `<Tabs>`. For Catalogos: `<Tabs defaultValue="temporadas" layoutId="catalogos-tabs">`.

**Warning signs:** Tab indicator animates to wrong position when switching between different Tabs groups.

### Pitfall 2: Pais Delete Leaving Orphan Ciudades

**What goes wrong:** Deleting a Pais via `deletePais(id)` only removes the Pais record. `Ciudad` records with `paisId === id` remain in `CatalogProvider` state. `usePaises()` won't expose them, but they accumulate in memory.

**Why it happens:** `DELETE_PAIS` reducer only filters paises; it does not cascade to ciudades.

**How to avoid:** In the Pais delete handler, before or after deleting the Pais, also delete all its ciudades:
```typescript
function handleDeletePais(pais: Pais & { ciudades: Ciudad[] }) {
  // Delete ciudades first to avoid orphans
  pais.ciudades.forEach(c => deleteCiudad(c.id));
  deletePais(pais.id);
  toast('success', 'Pais eliminado', '...');
}
```
Also add a warning in the delete confirmation modal: "Se eliminaran X ciudades asociadas."

**Warning signs:** After deleting a Pais and creating a new Pais with the same ID range, orphan ciudades could appear. Monitor ciudad count in state during dev.

### Pitfall 3: Modal Form State Not Reset Between Sessions

**What goes wrong:** User opens Create modal, types partial data, cancels. Then opens Edit for an existing record. The form shows partial data from the abandoned create session.

**Why it happens:** Form state is initialized via `useEffect` watching `modalOpen` or `editTarget`, not at the call site.

**How to avoid:** Always call `setForm({ ...fields })` synchronously at the same time as `setModalOpen(true)` — as done in `handleOpenCreate` and `handleOpenEdit` in Seguros/Proveedores pages.

**Warning signs:** Form fields show stale data from previous open session.

### Pitfall 4: UserProvider Seed Data Desync With AuthProvider

**What goes wrong:** `AuthProvider` uses `DEMO_USERS` from `src/lib/auth.ts` for login. `UserProvider` also initializes from `DEMO_USERS`. If a user is deleted via Perfiles, they still exist in `AuthProvider`'s internal login lookup, so they can still log in.

**Why it happens:** The two providers maintain independent state derived from the same seed.

**How to avoid:** Accept this limitation at the prototype stage — Perfiles CRUD is for UI demonstration purposes and the login system is simulated anyway. Document it in a code comment. Do NOT try to wire UserProvider into AuthProvider's login logic at this phase.

**Warning signs:** Deleted user can still log in. Expected behavior given the architecture.

### Pitfall 5: Etiqueta Slug Collisions on Edit

**What goes wrong:** Two etiquetas end up with the same `slug` value because slug is auto-generated on create but editable fields like `nombre` can be updated without regenerating slug.

**Why it happens:** Slug generation runs only during create. Updating `nombre` does not automatically update `slug`.

**How to avoid:** For the modal form: show `slug` as an editable `Input` that auto-populates from `nombre` on create (via `onChange` on nombre input), but allow manual override. On edit, show the existing slug and allow editing it — never auto-overwrite on edit. This gives URL stability for existing etiquetas.

**Warning signs:** Two etiquetas have the same slug value, causing ambiguous URL routing on the frontend.

### Pitfall 6: Perfiles Page Accessible to Non-ADMIN Users

**What goes wrong:** A VENDEDOR navigates directly to `/perfiles` by URL and can see the user list or even modify users.

**Why it happens:** Nav menu hides the link via `visibleModules`, but the page itself has no auth guard.

**How to avoid:** Add at the top of PerfilesPage:
```typescript
const { isAdmin } = useAuth();
if (!isAdmin) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
      <ShieldCheck className="h-12 w-12 mb-3 opacity-40" />
      <p className="text-sm">Acceso restringido a administradores</p>
    </div>
  );
}
```

**Warning signs:** Non-admin users can see user list or modify users by navigating directly to `/perfiles`.

---

## Code Examples

Verified patterns from live codebase:

### Tabs Page Shell (Catalogos)

```typescript
// Source: src/components/ui/Tabs.tsx — all Tabs primitives verified from live code
"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/layout/PageHeader';

export default function CatalogosPage() {
  return (
    <>
      <PageHeader title="Catalogos" subtitle="Temporadas, tipos, etiquetas, paises y regimenes" />
      <Tabs defaultValue="temporadas" layoutId="catalogos-tabs">
        <TabsList className="mb-0">
          <TabsTrigger value="temporadas">Temporadas</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Paquete</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="paises">Paises y Ciudades</TabsTrigger>
          <TabsTrigger value="regimenes">Regimenes</TabsTrigger>
        </TabsList>
        <TabsContent value="temporadas"><TemporadasTab /></TabsContent>
        <TabsContent value="tipos"><TiposPaqueteTab /></TabsContent>
        <TabsContent value="etiquetas"><EtiquetasTab /></TabsContent>
        <TabsContent value="paises"><PaisesTab /></TabsContent>
        <TabsContent value="regimenes"><RegimenesTab /></TabsContent>
      </Tabs>
    </>
  );
}
```

### Temporadas Tab (Simplest — Pure Modal CRUD)

```typescript
// Source: src/app/(admin)/proveedores/page.tsx — adapted for Temporada
function TemporadasTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const temporadas = useTemporadas();
  const { createTemporada, updateTemporada, deleteTemporada } = useCatalogActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Temporada | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Temporada | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [form, setForm] = useState({ nombre: '', orden: 1, activa: true });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ... filtered, paginated, handlers (same shape as Seguros page)

  return (
    <>
      {/* SearchFilter + "Nueva Temporada" button */}
      {/* Table with columns: nombre, orden, activa (badge), acciones */}
      {/* Create/Edit Modal */}
      {/* Delete Modal with shake */}
    </>
  );
}
```

### UserProvider (New — to Build)

```typescript
// Source: CatalogProvider.tsx useReducer pattern + auth.ts DEMO_USERS + AuthProvider.tsx type patterns
"use client";
import { createContext, useContext, useReducer, useMemo, type Dispatch } from "react";
import type { AuthUser, Role } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/auth";

type UserAction =
  | { type: "ADD_USER"; payload: AuthUser }
  | { type: "UPDATE_USER"; payload: AuthUser }
  | { type: "DELETE_USER"; payload: string };

function userReducer(state: AuthUser[], action: UserAction): AuthUser[] {
  switch (action.type) {
    case "ADD_USER": return [...state, action.payload];
    case "UPDATE_USER": return state.map(u => u.id === action.payload.id ? action.payload : u);
    case "DELETE_USER": return state.filter(u => u.id !== action.payload);
    default: return state;
  }
}

const UserStateContext = createContext<AuthUser[] | null>(null);
const UserDispatchContext = createContext<Dispatch<UserAction> | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, DEMO_USERS);
  return (
    <UserStateContext.Provider value={state}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserStateContext.Provider>
  );
}

export function useUsers(): AuthUser[] {
  const ctx = useContext(UserStateContext);
  if (!ctx) throw new Error("useUsers must be used within <UserProvider>");
  return ctx;
}

export function useUserActions() {
  const dispatch = useContext(UserDispatchContext);
  if (!dispatch) throw new Error("useUserActions must be used within <UserProvider>");
  return useMemo(() => ({
    createUser: (data: Omit<AuthUser, "id">) => {
      const user: AuthUser = { ...data, id: crypto.randomUUID() };
      dispatch({ type: "ADD_USER", payload: user });
      return user;
    },
    updateUser: (user: AuthUser) => dispatch({ type: "UPDATE_USER", payload: user }),
    deleteUser: (id: string) => dispatch({ type: "DELETE_USER", payload: id }),
  }), [dispatch]);
}
```

### Perfiles Table Row with Role Badge

```typescript
// Source: Badge.tsx variant system; AuthUser type from src/lib/auth.ts
import { Badge } from "@/components/ui/Badge";
import type { Role } from "@/lib/auth";

const roleBadgeVariant: Record<Role, "active" | "pending" | "draft"> = {
  ADMIN: "active",
  VENDEDOR: "pending",
  MARKETING: "draft",
};

// In table row:
<TableRow key={user.id}>
  <TableCell className="font-medium text-neutral-800">{user.name}</TableCell>
  <TableCell className="text-neutral-500">{user.email}</TableCell>
  <TableCell>
    <Badge variant={roleBadgeVariant[user.role]} size="sm">
      {user.role === "ADMIN" ? "Admin" : user.role === "VENDEDOR" ? "Vendedor" : "Marketing"}
    </Badge>
  </TableCell>
  <TableCell>{brandMap[user.brandId] ?? "—"}</TableCell>
  <TableCell>
    <div className="flex items-center gap-1">
      {/* Eye + (if isAdmin) Pencil + Trash2 action buttons */}
    </div>
  </TableCell>
</TableRow>
```

### Pais Row With Expand for Ciudades

```typescript
// Source: pattern designed from usePaises() enriched data shape
// usePaises() returns (Pais & { ciudades: Ciudad[] })[]
const [expandedPaisId, setExpandedPaisId] = useState<string | null>(null);

<>
  <TableRow key={pais.id}>
    <TableCell className="w-8">
      <button
        className="flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
        onClick={() => setExpandedPaisId(expandedPaisId === pais.id ? null : pais.id)}
      >
        <ChevronRight
          className={cn("h-4 w-4 transition-transform", expandedPaisId === pais.id && "rotate-90")}
        />
      </button>
    </TableCell>
    <TableCell className="font-medium">{pais.nombre}</TableCell>
    <TableCell className="font-mono text-xs text-neutral-400">{pais.codigo}</TableCell>
    <TableCell className="text-neutral-400 text-sm">{pais.ciudades.length} ciudades</TableCell>
    <TableCell>{/* edit pais / delete pais buttons */}</TableCell>
  </TableRow>
  {expandedPaisId === pais.id && (
    <tr>
      <td colSpan={5} className="bg-neutral-50/30 px-8 pb-3 pt-1">
        {/* Mini-table of ciudades: nombre | acciones (edit inline / delete) */}
        {/* "+ Agregar ciudad" row at bottom */}
      </td>
    </tr>
  )}
</>
```

---

## State of the Art

| Module | Before Phase 7 | After Phase 7 |
|--------|----------------|---------------|
| Catalogos page | `<PageHeader>` stub only | Tabbed interface with 5 catalog managers (Temporadas, Tipos, Etiquetas, Paises/Ciudades, Regimenes) |
| Perfiles page | `<PageHeader>` stub only | Full user table with role badges + modal create/edit + UserProvider |
| CatalogProvider | Already has all CRUD actions but no UI consuming them | Fully consumed by Catalogos page tabs |
| UserProvider | Does not exist | New provider with useReducer, seeded from DEMO_USERS |

**No deprecated approaches for this phase.** All patterns used are current and consistent with Phases 5-6.

---

## Open Questions

1. **Etiqueta slug field: show in table or hide?**
   - What we know: Slug is used for frontend URL filtering (e.g., `/paquetes?etiqueta=brasil`). The admin panel does not currently have a frontend URL column visible elsewhere.
   - What's unclear: Whether the planner wants slug visible in the Etiquetas table column or only in the edit modal.
   - Recommendation: Show slug in the table as a secondary column (`font-mono text-xs text-neutral-400`). It helps admins understand the URL consequence. Keep it editable only in the modal.

2. **Temporadas `orden` field: auto-increment or manual?**
   - What we know: Temporada has an `orden: number` field. Seed data uses sequential integers. No drag-and-drop reordering exists.
   - What's unclear: Whether `orden` should be an editable `Input` in the modal or managed automatically.
   - Recommendation: Include `orden` as an editable `Input type="number"` in the modal form, defaulting to `temporadas.length + 1` on create. No drag-and-drop needed — this is a reference catalog, not a frequently reordered list.

3. **Perfiles: should VENDEDOR and MARKETING be able to edit their own profile?**
   - What we know: The Perfiles module is ADMIN-only (`visibleModules` for VENDEDOR = `["paquetes"]`). There is no "my account" concept in the current design.
   - What's unclear: Whether a self-edit flow is needed.
   - Recommendation: Out of scope for Phase 7. Perfiles is strictly ADMIN-managed user administration. No self-edit.

4. **Catalog tabs: persist active tab across navigation?**
   - What we know: `Tabs` component uses `defaultValue="temporadas"` by default. Navigating away from Catalogos and back resets the active tab to "temporadas".
   - What's unclear: Whether tab persistence is required.
   - Recommendation: No persistence needed. `defaultValue="temporadas"` is acceptable — this is a simple admin reference page, not a stateful workflow.

---

## Sources

### Primary (HIGH confidence)

All findings sourced directly from the live codebase:

- `src/components/ui/Tabs.tsx` — Full Tabs component: RadixTabs.Root wrapper, TabsContext for activeValue/layoutId propagation, motion.div with layoutId for gradient indicator, TabsContent fade-in animation
- `src/components/ui/Badge.tsx` — CVA size variants, glass inline style variantStyles map (confirmed: "active", "pending", "draft" variants map cleanly to ADMIN/VENDEDOR/MARKETING)
- `src/components/ui/Modal.tsx` — Radix Dialog with forceMount + AnimatePresence; ModalHeader/ModalBody/ModalFooter components
- `src/components/ui/Table.tsx` — Glass table with motion.tbody stagger; TableHeader dark background; TableCell variants
- `src/components/ui/Select.tsx` — Radix Select with glass styling; label, error, options interface
- `src/components/ui/Input.tsx` — Glass input with label/error/size variants
- `src/components/ui/Tag.tsx` — Tag color presets; NOT used for etiqueta color display (etiqueta color is arbitrary hex, not a preset)
- `src/components/providers/CatalogProvider.tsx` — CatalogState, all actions (createTemporada...deleteRegimen), all selector hooks (useTemporadas, useTiposPaquete, useEtiquetas, usePaises, useRegimenes), useCatalogActions
- `src/components/providers/AuthProvider.tsx` — AuthContextValue, useAuth hook, canEdit/isAdmin/isVendedor flags
- `src/components/providers/BrandProvider.tsx` — useBrand, brands list for brand name lookup in Perfiles
- `src/components/providers/Providers.tsx` — Current composition order; where UserProvider must be inserted
- `src/lib/types.ts` — Temporada, TipoPaquete, Etiqueta, Pais, Ciudad, Regimen interfaces confirmed
- `src/lib/auth.ts` — AuthUser, Role, DEMO_USERS; Role = "ADMIN" | "VENDEDOR" | "MARKETING"; no deletedAt on AuthUser (hard delete for users)
- `src/lib/data/catalogos.ts` — Seed data shape confirming all field values and realistic content
- `src/app/(admin)/seguros/page.tsx` — Complete reference implementation of modal CRUD list page (Phase 6 output)
- `src/app/(admin)/proveedores/page.tsx` — Complete reference implementation of modal CRUD list page (Phase 6 output)
- `src/components/lib/glass.ts` — glassMaterials tokens (frosted, liquidModal, frostedSubtle)
- `src/components/lib/animations.ts` — interactions.deleteShake, springs, interactions.modalContent
- `package.json` — Confirmed versions: next 14.2.25, react 18.3.1, motion 12.4.7, radix-ui 1.4.3, lucide-react 0.469.0, class-variance-authority 0.7.1

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sourced entirely from live codebase and package.json; no external unknowns
- Architecture patterns: HIGH — Tabs, Modal, Table, Badge all verified from live component code; CatalogProvider CRUD actions verified end-to-end; UserProvider design follows established CatalogProvider pattern exactly
- Pitfalls: HIGH — identified from direct code inspection; layoutId pitfall verified from Tabs implementation; orphan Ciudad pitfall verified from reducer code; auth guard pitfall verified from auth.ts visibleModules

**Research date:** 2026-03-16
**Valid until:** Stable — no external dependencies; patterns will not change unless Phases 1-6 are refactored. Re-research not needed unless design system changes.
