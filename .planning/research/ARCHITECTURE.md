# Architecture Research

**Domain:** Multi-module travel agency admin panel prototype (Next.js 14 App Router)
**Researched:** 2026-03-15
**Confidence:** HIGH

## System Overview

```
+============================================================================+
|                           ROOT LAYOUT (app/layout.tsx)                      |
|   Providers: BrandProvider > StoreProvider > ToastProvider                  |
+============================================================================+
|                                                                            |
|  +----------------------------------------------------------------------+  |
|  |              (admin) ROUTE GROUP LAYOUT                              |  |
|  |   Sidebar + Topbar + AnimatePresence wrapper + noise/orbs BG         |  |
|  +----------------------------------------------------------------------+  |
|  |                          |                                           |  |
|  |  +-------------------+  |  +--------------------------------------+  |  |
|  |  |     SIDEBAR       |  |  |         MAIN CONTENT AREA            |  |  |
|  |  |  (fixed, 252px)   |  |  |                                      |  |  |
|  |  |                   |  |  |  +--------------------------------+  |  |  |
|  |  |  Logo + Brand     |  |  |  |        TOPBAR (sticky)         |  |  |  |
|  |  |  Nav Items (13)   |  |  |  |  Breadcrumb | BrandSelector   |  |  |  |
|  |  |  Collapse toggle  |  |  |  |  UserMenu  | Notifications    |  |  |  |
|  |  |                   |  |  |  +--------------------------------+  |  |  |
|  |  |  Modules:         |  |  |                                      |  |  |
|  |  |  - Dashboard      |  |  |  +--------------------------------+  |  |  |
|  |  |  - Paquetes       |  |  |  |        PAGE CONTENT            |  |  |  |
|  |  |  - Aereos         |  |  |  |  PageHeader + Module UI        |  |  |  |
|  |  |  - Alojamientos   |  |  |  |  (motion.div page transition) |  |  |  |
|  |  |  - Traslados      |  |  |  +--------------------------------+  |  |  |
|  |  |  - Seguros        |  |  |                                      |  |  |
|  |  |  - Circuitos      |  |  +--------------------------------------+  |  |
|  |  |  - Proveedores    |  |                                            |  |
|  |  |  - Catalogos      |  +--------------------------------------------+  |
|  |  |  - Perfiles       |                                                  |
|  |  |  - Notificaciones |                                                  |
|  |  |  - Reportes       |                                                  |
|  |  +-------------------+                                                  |
|  |                                                                         |
+--+-------------------------------------------------------------------------+
|                                                                            |
|  +----------------------------------------------------------------------+  |
|  |              LOGIN ROUTE (app/login/page.tsx)                        |  |
|  |   Separate layout: mesh gradient BG, centered glass card            |  |
|  |   No sidebar/topbar — standalone page                               |  |
|  +----------------------------------------------------------------------+  |
|                                                                            |
+============================================================================+
|                         OVERLAY LAYER (z-index managed)                     |
|   Modal (z-40) | Toast stack (z-60) | Dropdowns (z-10)                     |
+============================================================================+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Root Layout** | Mounts global providers (Brand, Store, Toast), sets up fonts, metadata | Server Component wrapping client providers |
| **(admin) Layout** | Admin shell: Sidebar + Topbar + content area with noise/orb background | Client Component (`"use client"`) for AnimatePresence + sidebar state |
| **Sidebar** | Navigation between 13 modules, brand logo display, collapse/expand | Client Component with `usePathname()` for active state |
| **Topbar** | Breadcrumb trail, brand selector dropdown, user menu, notification bell | Client Component consuming BrandContext and StoreContext |
| **PageHeader** | Display title + subtitle + primary action button per module | Stateless Client Component receiving props |
| **UI Components (20+)** | Reusable primitives: Button, Input, Table, Modal, Toast, Card, etc. | Client Components with CVA variants, Framer Motion |
| **Module Components** | Domain-specific forms and editors (PaqueteForm, AereoForm, etc.) | Client Components consuming domain-specific store slices |
| **Store (Context)** | In-memory CRUD state for all entities, brand-filtered | useReducer + useContext split by domain |
| **Data Layer** | Hardcoded realistic travel data seeding the store | Pure TypeScript data objects in `lib/data.ts` |
| **Types** | TypeScript interfaces mirroring future Prisma models | Pure type definitions in `lib/types.ts` |
| **Utils** | Price calculations, currency formatting, slug generation, cn() | Pure functions in `lib/utils.ts` + `lib/cn.ts` |

## Recommended Project Structure

```
app/
  layout.tsx                    # Root layout: html/body + global providers
  login/
    page.tsx                    # Standalone login (no admin shell)
  (admin)/
    layout.tsx                  # Admin shell: Sidebar + Topbar + content wrapper
    page.tsx                    # Dashboard
    paquetes/
      page.tsx                  # Package listing (glass table)
      nuevo/page.tsx            # Create package (tabbed form)
      [id]/page.tsx             # Edit package (tabbed form, prefilled)
    aereos/
      page.tsx                  # Flight listing
      [id]/page.tsx             # Flight detail with price periods
    alojamientos/
      page.tsx                  # Hotel listing
      [id]/page.tsx             # Hotel detail with prices, photos
    traslados/
      page.tsx                  # Inline-editable transfers table
    seguros/
      page.tsx                  # Insurance listing + modal form
    circuitos/
      page.tsx                  # Circuit listing
      [id]/page.tsx             # Circuit with day-by-day itinerary
    proveedores/
      page.tsx                  # Supplier CRUD (table + modal)
    catalogos/
      page.tsx                  # Tabbed catalogs (temporadas, tipos, etc.)
    perfiles/
      page.tsx                  # User management
    notificaciones/
      page.tsx                  # Multi-step notification wizard
    reportes/
      page.tsx                  # Charts and stats

components/
  ui/                           # Design system primitives (20+ components)
    Button.tsx                  # Clay button with CVA variants
    Input.tsx                   # Glass input with states
    Select.tsx                  # Radix Select + glass dropdown
    Textarea.tsx
    Toggle.tsx                  # Spring bounce toggle
    Checkbox.tsx                # Pop animation checkbox
    Badge.tsx                   # 9 glass variants
    Tag.tsx                     # Removable pill tags
    Table.tsx                   # Glass table with dark header
    Modal.tsx                   # Liquid glass modal (Radix Dialog)
    Toast.tsx                   # Frosted glass toast
    Card.tsx                    # Glass/Liquid/Stat card variants
    Tabs.tsx                    # Animated indicator (Radix Tabs)
    SearchFilter.tsx            # Search bar + filter chips
    PriceDisplay.tsx            # Neto -> Markup -> Venta
    ImageUploader.tsx           # Simulated dropzone
    Breadcrumb.tsx
    Avatar.tsx
    Skeleton.tsx
    DatePicker.tsx
    Pagination.tsx              # Clay active state
  layout/                       # Shell components
    Sidebar.tsx                 # Violet->black gradient nav
    Topbar.tsx                  # Frosted glass topbar
    PageHeader.tsx              # Title + action button
  modules/                      # Domain-specific compound components
    PaqueteForm.tsx             # Full package form (all tabs)
    ServiceAssigner.tsx         # Modal to assign services to packages
    AereoForm.tsx               # Flight form + price period table
    AlojamientoForm.tsx         # Hotel form + prices + photos
    CircuitoItinerario.tsx      # Day-by-day itinerary editor
    NotificacionWizard.tsx      # Multi-step wizard
    ReportChart.tsx             # Charts (recharts wrapper)

lib/
  types.ts                      # All TypeScript interfaces
  data.ts                       # All hardcoded data (seed)
  store.ts                      # Global state: useReducer + useContext
  brand-context.tsx             # Brand switching context
  utils.ts                      # Price calc, formatting, helpers
  cn.ts                         # clsx + tailwind-merge utility

public/
  assets/
    brands/                     # Brand logos (TravelOz, DestinoIcono)
```

### Structure Rationale

- **`app/` is routing-only:** Pages are thin wrappers that compose module components. No business logic in page files. This follows the Next.js official recommendation of keeping `app/` for routing and putting shared code outside.
- **`components/ui/` is the design system:** Every primitive follows the "Liquid Horizon" v3 tokens. These components know nothing about travel or business logic. They receive data via props and emit events via callbacks.
- **`components/layout/` is the admin shell:** Three components that form the permanent frame. They consume BrandContext and auth state but contain no module-specific logic.
- **`components/modules/` bridges domain to UI:** Each module component composes UI primitives with domain-specific behavior. PaqueteForm uses Card, Tabs, Input, Select, PriceDisplay, etc. ServiceAssigner uses Modal, Table, and consumes multiple store slices.
- **`lib/` is the brain:** Types define the data shape. Data provides the seed. Store manages mutations. Utils handle calculations. This layer is the only one that understands business rules.
- **No `src/` directory:** For a prototype of this scope (~40 files), the extra nesting adds friction without value. The root-level `app/`, `components/`, `lib/` structure is clean enough.

## Architectural Patterns

### Pattern 1: Split Context by Domain (useReducer + useContext)

**What:** Instead of one monolithic store, split state into domain-specific context-reducer pairs. Each domain (paquetes, aereos, alojamientos, etc.) gets its own context.

**When to use:** When you have 15+ entity types and want to avoid re-rendering the entire app when one entity changes.

**Trade-offs:** More boilerplate (one provider + reducer + hooks per domain) but much better performance and maintainability. For a prototype, a hybrid approach works best: group related entities into 4-5 contexts rather than 15 individual ones.

**Recommended split:**

```typescript
// Recommended context grouping for TravelOz prototype

// 1. PackageContext — the central entity + its service assignments
//    Entities: Paquete, PaqueteAereo, PaqueteAlojamiento, PaqueteTraslado,
//              PaqueteSeguro, PaqueteCircuito, PaqueteFoto, PaqueteEtiqueta
//    Actions: CRUD packages, assign/remove services, reorder, clone

// 2. ServiceContext — all independent services
//    Entities: Aereo, PrecioAereo, Alojamiento, PrecioAlojamiento,
//              Traslado, Seguro, Circuito, CircuitoDia
//    Actions: CRUD each entity type, add price periods

// 3. CatalogContext — reference/lookup data
//    Entities: Temporada, TipoPaquete, Etiqueta, Pais, Ciudad,
//              Regimen, Proveedor
//    Actions: CRUD each catalog type

// 4. AppContext — app-level state
//    Entities: User, Brand, Notificacion
//    Actions: login/logout, switch brand, send notification

// Example implementation for one domain:
// lib/contexts/services-context.tsx

'use client';
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Aereo, Alojamiento, Traslado, Seguro, Circuito } from '@/lib/types';
import { initialAereos, initialAlojamientos /* ... */ } from '@/lib/data';

interface ServiceState {
  aereos: Aereo[];
  alojamientos: Alojamiento[];
  traslados: Traslado[];
  seguros: Seguro[];
  circuitos: Circuito[];
}

type ServiceAction =
  | { type: 'ADD_AEREO'; payload: Aereo }
  | { type: 'UPDATE_AEREO'; payload: Aereo }
  | { type: 'DELETE_AEREO'; payload: string }
  // ... other entity actions

const ServiceStateContext = createContext<ServiceState | null>(null);
const ServiceDispatchContext = createContext<React.Dispatch<ServiceAction> | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(serviceReducer, initialServiceState);
  return (
    <ServiceStateContext value={state}>
      <ServiceDispatchContext value={dispatch}>
        {children}
      </ServiceDispatchContext>
    </ServiceStateContext>
  );
}

// Custom hooks for clean consumption
export function useServices() {
  const ctx = useContext(ServiceStateContext);
  if (!ctx) throw new Error('useServices must be used within ServiceProvider');
  return ctx;
}

export function useServiceDispatch() {
  const ctx = useContext(ServiceDispatchContext);
  if (!ctx) throw new Error('useServiceDispatch must be used within ServiceProvider');
  return ctx;
}

// Derived selector hooks (avoid re-renders)
export function useAereos(brandId: string) {
  const { aereos } = useServices();
  return aereos.filter(a => a.brandId === brandId && !a.deletedAt);
}
```

### Pattern 2: Thin Pages, Fat Components

**What:** Page files in `app/` are minimal wrappers -- they import the module component, maybe read route params, and render. All logic lives in `components/modules/`.

**When to use:** Always, for this project. Keeps the routing layer clean and makes module components testable and reusable.

**Trade-offs:** None for a prototype. This is the standard pattern.

**Example:**

```typescript
// app/(admin)/paquetes/[id]/page.tsx — THIN
'use client';
import { useParams } from 'next/navigation';
import { PaqueteForm } from '@/components/modules/PaqueteForm';

export default function EditPaquetePage() {
  const { id } = useParams<{ id: string }>();
  return <PaqueteForm paqueteId={id} mode="edit" />;
}

// The PaqueteForm component handles everything:
// - Reading data from PackageContext
// - Tab navigation (Datos, Servicios, Precios, Fotos, Publicacion)
// - Form state management
// - Dispatching CRUD actions
// - Rendering UI components
```

### Pattern 3: Brand-Aware Data Filtering

**What:** All data access goes through brand-filtered hooks. The active brand is set in BrandContext and every store query filters by `brandId`.

**When to use:** Every module, every data display. The multi-tenancy contract must be enforced at the hook level, not at the component level.

**Trade-offs:** Slightly more complex hooks, but prevents data leakage between brands. Mirrors the production Prisma middleware pattern.

**Example:**

```typescript
// lib/brand-context.tsx
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { Brand } from '@/lib/types';
import { brands } from '@/lib/data';

interface BrandContextType {
  activeBrand: Brand;
  switchBrand: (brandId: string) => void;
}

const BrandContext = createContext<BrandContextType | null>(null);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [activeBrand, setActiveBrand] = useState<Brand>(brands[0]);
  const switchBrand = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) setActiveBrand(brand);
  };
  return (
    <BrandContext value={{ activeBrand, switchBrand }}>
      {children}
    </BrandContext>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}
```

### Pattern 4: Component Composition with CVA (Class Variance Authority)

**What:** Every UI component uses CVA to define its visual variants declaratively. Combined with `cn()` (clsx + tailwind-merge) for conditional class application.

**When to use:** All 20+ UI components. This is the design system enforcement mechanism.

**Trade-offs:** Requires upfront variant definition, but pays off in consistency and prevents design drift.

**Example:**

```typescript
// components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all rounded-xl',
  {
    variants: {
      variant: {
        primary: '', // Clay teal — styles applied via inline for gradients
        danger: '',  // Clay red
        secondary: 'bg-white/70 backdrop-blur-sm border border-white/20',
        ghost: 'bg-transparent hover:bg-white/30',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.01, y: -1 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### Pattern 5: Page Transitions with Template + Motion

**What:** Use a motion wrapper inside the admin layout to animate page transitions. Since AnimatePresence has known issues with App Router, use a simpler per-page `motion.div` approach with `initial`/`animate` props.

**When to use:** Every page within the `(admin)` group.

**Trade-offs:** Does not support exit animations (would need the FrozenRouter workaround). For a prototype demo, enter animations are sufficient and avoid the AnimatePresence complexity.

**Recommended approach:**

```typescript
// components/layout/PageTransition.tsx
'use client';
import { motion } from 'framer-motion';

const pageTransition = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...pageTransition}>
      {children}
    </motion.div>
  );
}

// Usage in each page:
// app/(admin)/paquetes/page.tsx
export default function PaquetesPage() {
  return (
    <PageTransition>
      <PageHeader title="Paquetes" action={{ label: 'Nuevo paquete', href: '/paquetes/nuevo' }} />
      <PaquetesList />
    </PageTransition>
  );
}
```

## Data Flow

### Provider Hierarchy (Mounting Order)

```
<html>
  <body>
    BrandProvider                    (1. Brand context - which brand is active)
      AppProvider                    (2. Auth state, user, notifications)
        ServiceProvider              (3. Aereos, alojamientos, traslados, seguros, circuitos)
          CatalogProvider            (4. Temporadas, tipos, etiquetas, paises, regimenes, proveedores)
            PackageProvider          (5. Paquetes + service assignments)
              ToastProvider          (6. Toast notification queue)
                {children}           (Admin layout or Login page)
```

**Why this order matters:**
- BrandProvider is outermost because everything else filters by brand
- AppProvider needs brand to determine user permissions
- ServiceProvider is independent of packages
- CatalogProvider provides lookup data used by packages and services
- PackageProvider depends on services and catalogs (for price calculations, assignments)
- ToastProvider is innermost because any action in any provider might trigger a toast

### CRUD Data Flow

```
User Action (click "Guardar")
    |
    v
Module Component (PaqueteForm)
    |--- validates form fields locally
    |--- calls dispatch({ type: 'UPDATE_PAQUETE', payload: updatedPaquete })
    |
    v
PackageReducer (lib/contexts/package-context.tsx)
    |--- finds entity by ID in state array
    |--- returns new state with entity replaced
    |--- (if price-related: recalculates netoCalculado, precioVenta)
    |
    v
React re-renders components consuming PackageContext
    |--- Table row updates
    |--- Detail view refreshes
    |
    v
Toast dispatch ({ type: 'ADD_TOAST', payload: { message: 'Paquete actualizado', variant: 'success' } })
    |
    v
Toast component animates in (spring slide from right)
```

### Price Calculation Flow

```
Service assigned/removed from package
    |
    v
PackageReducer recalculates:
    netoCalculado = SUM(
      assigned aereos prices (for active season) +
      assigned alojamientos prices (price/night * noches) +
      assigned traslados prices +
      assigned seguros prices (cost/day * noches)
    )
    |
    v
    precioVenta = netoCalculado * (1 + markup/100)
    |
    v
PriceDisplay component re-renders with animated number transitions
```

### Brand Filtering Flow

```
User selects brand in Topbar dropdown
    |
    v
BrandContext.switchBrand(newBrandId)
    |
    v
All hook consumers re-evaluate:
    usePaquetes(brandId) -> filters paquetes array
    useAereos(brandId) -> filters aereos array
    ... (every entity list re-filters)
    |
    v
All tables, forms, and dashboards show only the selected brand's data
```

### Key Data Flows

1. **Package creation:** User fills PaqueteForm -> dispatches ADD_PAQUETE -> reducer adds to state with BORRADOR status -> table re-renders with new row (stagger animation) -> toast confirms
2. **Service assignment:** User opens ServiceAssigner modal -> browses aereos/hotels/etc. by tab -> selects service -> dispatches ADD_PAQUETE_AEREO -> reducer updates package's service list -> PriceDisplay recalculates neto -> precioVenta updates in real-time
3. **Brand switch:** Topbar dropdown -> BrandContext.switchBrand -> all data hooks re-filter -> entire UI updates to show only new brand's entities
4. **Role-based view:** Login sets user role in AppContext -> Sidebar conditionally renders nav items (VENDEDOR sees only Paquetes) -> Components check `useAuth().role` to hide edit buttons and price columns
5. **Notification wizard:** Step-through flow: select tag -> CatalogContext provides etiquetas -> filter packages by tag -> PackageContext provides filtered list -> user selects packages -> preview renders -> dispatch SEND_NOTIFICATION -> AppContext records notification history

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Prototype (now) | In-memory state, hardcoded data, all client-side. ~40 components, 4 contexts. No optimization needed. |
| Production MVP | Replace contexts with server-side data fetching (React Server Components + Prisma). Store becomes API calls. Types stay identical. UI components unchanged. |
| Multi-user production | Add real auth (JWT/NextAuth), WebSocket for real-time updates, optimistic UI updates, SWR/React Query for cache. Consider Zustand over Context for client state. |

### Scaling Priorities

1. **First upgrade (prototype -> production):** Replace `lib/data.ts` + contexts with Prisma queries in Server Components. The thin-page pattern pays off here -- page files become async Server Components that fetch data and pass to the same module components as props.
2. **Second upgrade (MVP -> multi-user):** Add real auth middleware, RBAC enforcement in API routes, optimistic mutations, and error boundaries per module.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Single Context

**What people do:** Put all 15 entity types in one giant context with one massive reducer.
**Why it's wrong:** Every state change (adding a single traslado) re-renders every component consuming the context -- the entire admin panel. With 15+ modules and glassmorphism animations, this causes visible jank.
**Do this instead:** Split into 4-5 domain contexts as described in Pattern 1. Components only re-render when their specific domain changes.

### Anti-Pattern 2: Business Logic in Page Files

**What people do:** Put form validation, price calculations, and CRUD dispatch logic directly in `app/(admin)/paquetes/[id]/page.tsx`.
**Why it's wrong:** Pages become untestable monoliths. When you add the "nuevo" page, you duplicate all the form logic. When you move to production, you need to rewrite the page entirely.
**Do this instead:** Page files are 5-15 lines. They read route params and render a module component. All logic lives in `components/modules/` or `lib/`.

### Anti-Pattern 3: Prop Drilling Through Layout

**What people do:** Pass brand, user, and theme data from the admin layout down through Sidebar, Topbar, and every page via props.
**Why it's wrong:** The admin layout wraps 13 different page routes. Prop drilling creates a rigid coupling between the shell and every page.
**Do this instead:** Use context for cross-cutting concerns (brand, auth, toast). The layout provides contexts; pages consume them via hooks.

### Anti-Pattern 4: Glass Styles as Repeated Inline Strings

**What people do:** Copy-paste `background: rgba(255,255,255,0.72); backdrop-filter: blur(20px) saturate(180%)` into every component.
**Why it's wrong:** Design token changes require find-and-replace across 40+ files. Inconsistencies creep in immediately.
**Do this instead:** Define glass material classes in `tailwind.config.ts` (via the design.json tokens) or as style objects exported from a `lib/glass.ts` module. Components reference these by name, not by value.

### Anti-Pattern 5: AnimatePresence for App Router Page Transitions

**What people do:** Wrap page content in `AnimatePresence` expecting exit animations to work between routes.
**Why it's wrong:** The Next.js App Router does not natively support AnimatePresence exit animations. The router unmounts pages before the exit animation can run. Workarounds (FrozenRouter) are fragile and depend on internal APIs.
**Do this instead:** Use per-page `motion.div` with `initial`/`animate` props for enter animations. If exit animations are critical for the demo, use a client-side router wrapper (but accept the complexity trade-off).

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Page <-> Module Component | Props (route params, mode) | Pages pass `id` and `mode="edit"/"create"` |
| Module Component <-> Store | Context hooks (usePackages, useServiceDispatch) | Components read state via selector hooks, write via dispatch |
| Module Component <-> UI Component | Props (data, callbacks, variants) | UI components are pure -- no context consumption |
| Store <-> Store (cross-context) | Components read from multiple contexts | PaqueteForm reads PackageContext + ServiceContext + CatalogContext |
| Layout <-> Pages | React tree composition (children) | Layout provides shell, pages render in content area |
| BrandContext <-> All Contexts | Brand ID flows down, all queries filter | BrandProvider is outermost, all hooks accept/read brandId |

### Component Dependency Graph (Build Order)

```
PHASE 1: Foundation (no dependencies)
  lib/types.ts              # All interfaces
  lib/cn.ts                 # Utility function
  lib/utils.ts              # Pure functions
  lib/data.ts               # Hardcoded data (depends on types)

PHASE 2: State Layer (depends on Phase 1)
  lib/brand-context.tsx     # Brand switching (depends on types, data)
  lib/contexts/app-context.tsx      # Auth + notifications
  lib/contexts/service-context.tsx  # Aereos, hotels, etc.
  lib/contexts/catalog-context.tsx  # Lookup data
  lib/contexts/package-context.tsx  # Packages + assignments

PHASE 3: Design System (depends on Phase 1 only)
  components/ui/Button.tsx
  components/ui/Input.tsx
  components/ui/Select.tsx
  components/ui/Badge.tsx
  components/ui/Card.tsx
  components/ui/Table.tsx
  components/ui/Modal.tsx
  components/ui/Toast.tsx
  components/ui/Tabs.tsx
  components/ui/SearchFilter.tsx
  components/ui/PriceDisplay.tsx
  ... (all 20+ primitives)

PHASE 4: Shell (depends on Phase 2 + 3)
  components/layout/Sidebar.tsx     # Uses Button, brand-context
  components/layout/Topbar.tsx      # Uses Select, brand-context, app-context
  components/layout/PageHeader.tsx  # Uses Button
  app/layout.tsx                    # Mounts all providers
  app/(admin)/layout.tsx            # Composes Sidebar + Topbar

PHASE 5: Simple Modules (depends on Phase 3 + 4)
  Build in order of increasing complexity:
  1. app/login/page.tsx             # Standalone, tests Input + Button
  2. app/(admin)/page.tsx           # Dashboard, tests Card + stat display
  3. app/(admin)/proveedores/       # Simple CRUD, tests Table + Modal
  4. app/(admin)/catalogos/         # Simple CRUD with Tabs
  5. app/(admin)/perfiles/          # Simple CRUD with role badges
  6. app/(admin)/seguros/           # Simple CRUD
  7. app/(admin)/traslados/         # Inline editable table (unique pattern)

PHASE 6: Complex Modules (depends on Phase 5 patterns)
  8. app/(admin)/aereos/            # CRUD + price period sub-table
  9. app/(admin)/alojamientos/      # CRUD + prices + regime + photos
  10. app/(admin)/circuitos/        # CRUD + day-by-day itinerary editor
  11. app/(admin)/reportes/         # Charts (recharts) + stat aggregation
  12. app/(admin)/notificaciones/   # Multi-step wizard

PHASE 7: Central Module (depends on everything)
  13. app/(admin)/paquetes/         # Uses ALL contexts, ALL UI components
      - PaqueteForm with 5 tabs
      - ServiceAssigner modal
      - Real-time price calculation
      - Clone/soft-delete
```

## Sources

- [Next.js Official: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) -- HIGH confidence (official docs, verified 2026-02-27)
- [Next.js Official: Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) -- HIGH confidence
- [Next.js Official: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- HIGH confidence
- [React Official: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) -- HIGH confidence (React official docs)
- [Kent C. Dodds: Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) -- MEDIUM confidence (well-known community authority)
- [Kent C. Dodds: How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) -- MEDIUM confidence
- [Vercel Blog: Common mistakes with Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) -- HIGH confidence (official Vercel)
- [Framer Motion + Next.js Page Transitions Discussion](https://github.com/vercel/next.js/discussions/42658) -- MEDIUM confidence (known open issue)
- [Next.js App Router Patterns 2026](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146) -- LOW confidence (community article, patterns verified against official docs)
- TravelOz design.json v3 "Liquid Horizon" specification -- HIGH confidence (project source document)
- TravelOz modulos_backend.md specification -- HIGH confidence (project source document)

---
*Architecture research for: TravelOz Admin Panel Prototype*
*Researched: 2026-03-15*
