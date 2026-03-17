# Roadmap: TravelOz Admin Panel Prototype

## Overview

This roadmap delivers a fully functional Next.js 14 prototype of the TravelOz/DestinoIcono admin panel -- from glass component library through all 15+ CRUD modules to dashboard analytics. The 8 phases follow natural dependency order: design system primitives first (everything renders glass components), then layout shell and auth, then typed data layer, then modules in complexity order (Paquetes first as the most complex, then Aereos/Alojamientos, then supporting services, then catalogs/profiles), and finally the aggregation layer (dashboard, notifications, reports). Every phase delivers a coherent, demo-ready capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Design System** - Glass component library with all primitives rendering design.json v3 tokens (completed 2026-03-16)
- [x] **Phase 2: Layout, Navigation, Auth & Multi-Brand** - Sidebar, topbar, login page, brand switching, and role-based access (completed 2026-03-16)
- [x] **Phase 3: Data Layer & Types** - TypeScript interfaces, hardcoded realistic data, and context-based CRUD stores (completed 2026-03-16)
- [x] **Phase 4: Paquetes Module** - Complete package management with 5-tab detail, service assignment, and real-time pricing (completed 2026-03-16)
- [x] **Phase 5: Aereos & Alojamientos Modules** - Flight and hotel CRUD with price-per-period tables (completed 2026-03-16)
- [x] **Phase 6: Supporting Services Modules** - Traslados, Seguros, Circuitos, and Proveedores CRUD (completed 2026-03-16)
- [x] **Phase 7: Catalogos & Perfiles** - Reference data management and user administration (completed 2026-03-16)
- [x] **Phase 8: Dashboard, Notificaciones & Reportes** - Analytics dashboard, notification wizard, and reporting charts (completed 2026-03-16)

## Phase Details

### Phase 1: Foundation & Design System
**Goal**: Every glass/clay/liquid UI primitive renders correctly with design.json v3 tokens, ready to compose into module pages
**Depends on**: Nothing (first phase)
**Requirements**: DSYS-01, DSYS-02, DSYS-03, DSYS-04, DSYS-05, DSYS-06, DSYS-07, DSYS-08, DSYS-09, DSYS-10, DSYS-11, DSYS-12, DSYS-13, DSYS-14, DSYS-15, DSYS-16, DSYS-17, DSYS-18, DSYS-19, DSYS-20, DSYS-21
**Success Criteria** (what must be TRUE):
  1. A glass card, glass input, and clay button render on screen with visible backdrop-filter blur, 3D shadows, and gradient tokens matching design.json v3
  2. A glass table renders with dark header row, violet-to-teal hover gradient on data rows, and stagger entrance animation
  3. A modal opens with liquid glass blur(40px) backdrop and spring scale animation from 0.88, and a toast slides in from the right with frosted glass styling
  4. Tabs switch with an animated violet-to-teal gradient indicator using layoutId, and badges render in all 9 glass variants
  5. All form primitives (select, toggle, checkbox, date picker, image uploader, search/filter bar, tag pills, pagination) render with their specified glass/clay/spring animations
**Plans**: 8 plans

Plans:
- [x] 01-01-PLAN.md — Token infrastructure: Tailwind config, cn(), glass materials, animation presets
- [x] 01-02-PLAN.md — Core primitives: Button (clay), Input (glass), Badge (9 variants)
- [x] 01-03-PLAN.md — Data display: Table (glass + stagger), Card (3 variants), Pagination (clay)
- [x] 01-04-PLAN.md — Overlays: Modal (liquid glass + Radix Dialog), Toast (frosted + slide)
- [x] 01-05-PLAN.md — Navigation/display: Tabs (layoutId), SearchFilter (chips), PriceDisplay (arrows)
- [x] 01-06-PLAN.md — Form controls: Select (data-state CSS), Toggle (spring), Checkbox (pop)
- [x] 01-07-PLAN.md — Simple display: Tag (pills), Skeleton (shimmer), Avatar (fallback), Breadcrumb
- [x] 01-08-PLAN.md — Specialized: DatePicker (react-day-picker + Popover), ImageUploader (dropzone)

### Phase 2: Layout, Navigation, Auth & Multi-Brand
**Goal**: Users can log in, see the full admin layout shell with sidebar navigation and topbar, switch brands, and experience role-based access restrictions
**Depends on**: Phase 1
**Requirements**: LAYO-01, LAYO-02, LAYO-03, LAYO-04, LAYO-05, LAYO-06, LAYO-07, LAYO-08, BRND-01, BRND-02, BRND-03, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. The login page renders with mesh gradient background, noise overlay, and liquid glass card -- entering credentials sets user role and brand in app state
  2. After login, the admin layout renders with a violet-to-black gradient sidebar (collapsible), frosted glass topbar with breadcrumb and brand selector, and animated page transitions
  3. Switching brand in the topbar dropdown changes the active brand context and all downstream data filters to that brand's entities
  4. Logging in as VENDEDOR hides all create/edit/delete/clone buttons, hides neto/markup price columns, restricts sidebar to Paquetes only, and shows a "Solo lectura" badge
  5. Page transitions animate with opacity, vertical offset, and blur spring entrance via AnimatePresence
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Auth and Brand providers, role config, demo users, root layout with provider composition
- [x] 02-02-PLAN.md — Sidebar with brand gradient, collapse animation, nav groups, role filtering + AdminBackground
- [x] 02-03-PLAN.md — Topbar with frosted glass, brand selector, user menu + PageHeader + PageTransitionWrapper
- [x] 02-04-PLAN.md — Login page with mesh gradient, noise overlay, liquid glass card
- [x] 02-05-PLAN.md — Admin layout composition, placeholder pages for all 12 modules, route structure

### Phase 3: Data Layer & Types
**Goal**: All entity types are defined in TypeScript, realistic hardcoded data populates the app, and context-based stores provide CRUD operations for every entity
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. TypeScript interfaces exist for all entities (Brand, User, Paquete, Aereo, Alojamiento, Traslado, Seguro, Circuito, Proveedor, Temporada, Tipo, Etiqueta, Pais, Regimen) with no any types
  2. Hardcoded data includes 2 brands, 5+ users, 15+ paquetes, 10+ aereos, 12+ alojamientos, 8+ traslados, 6+ seguros, 2+ circuitos -- all in Spanish with realistic Uruguayan travel market info (real destinations, USD pricing)
  3. Context providers expose create, read, update, and delete operations for every entity type, and calling these operations updates the in-memory state immediately
  4. Utility functions (formatCurrency, calcularNeto, calcularVenta, slugify) work correctly with USD formatting and price calculation logic
**Plans**: 5 plans

Plans:
- [x] 03-01-PLAN.md — TypeScript entity interfaces (22 types) and utility functions (formatCurrency, calcularNeto, calcularVenta, slugify)
- [x] 03-02-PLAN.md — Catalog and service seed data (temporadas, tipos, etiquetas, paises, regimenes, proveedores, aereos, alojamientos, traslados, seguros, circuitos)
- [x] 03-03-PLAN.md — Package seed data (15+ paquetes with service assignments) and data barrel index
- [x] 03-04-PLAN.md — CatalogProvider and ServiceProvider with split state/dispatch, CRUD actions, brand-filtered hooks
- [x] 03-05-PLAN.md — PackageProvider with CRUD + clone + service assignment, Providers.tsx composition, PriceDisplay update

### Phase 4: Paquetes Module
**Goal**: Users can browse, search, create, edit, clone, and delete travel packages through a 5-tab detail view with service assignment, real-time pricing, photo management, and publication controls
**Depends on**: Phase 3
**Requirements**: PAQT-01, PAQT-02, PAQT-03, PAQT-04, PAQT-05, PAQT-06, PAQT-07, PAQT-08, PAQT-09, PAQT-10, PAQT-11, PAQT-12, PAQT-13, PAQT-14
**Success Criteria** (what must be TRUE):
  1. The Paquetes list page renders a glass table with all columns (ID, titulo, destino, temporada, noches, estado, precio venta, acciones) and supports instant search with filter chips for temporada, estado, and tipo
  2. Opening a paquete shows 5 functional tabs (Datos, Servicios, Precios, Fotos, Publicacion) -- the Datos tab has a working form with all fields, and the Servicios tab lets users add/remove/reorder services via modal with tabs for each service type
  3. The Precios tab displays PriceDisplay with Neto (auto-summed from assigned services) -> Markup (editable %) -> Venta (auto-calculated), and changing markup recalculates venta in real-time with animated arrows
  4. The Fotos tab shows a photo grid with simulated upload and drag-and-drop reorder, and the Publicacion tab has working toggles for publicado/destacado, date pickers for validez, estado selector, and multi-select etiquetas with removable tags
  5. Creating a new paquete from /paquetes/nuevo works with the full form, cloning creates "Copia de {nombre}" in BORRADOR state, and deleting shows a confirmation modal with shake animation then soft-deletes
**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md — List page with glass table, instant search, filter chips, clone/delete with shake animation
- [x] 04-02-PLAN.md — Detail page shell with 5-tab URL sync, Datos tab form, /paquetes/nuevo create page
- [x] 04-03-PLAN.md — Servicios tab with assigned service list, add/remove/reorder, ServiceSelectorModal
- [x] 04-04-PLAN.md — Precios tab with live neto recalculation + PriceDisplay, Fotos tab with ImageUploader
- [x] 04-05-PLAN.md — Publicacion tab with toggles, date pickers, estado selector, etiquetas multi-select

### Phase 5: Aereos & Alojamientos Modules
**Goal**: Users can fully manage flights and hotels with price-per-period tables, hotel photos, and regimen selection
**Depends on**: Phase 3
**Requirements**: AERO-01, AERO-02, AERO-03, AERO-04, ALOJ-01, ALOJ-02, ALOJ-03, ALOJ-04
**Success Criteria** (what must be TRUE):
  1. The Aereos list renders a glass table with columns (ID, ruta, destino, acciones) and supports create, edit, clone, and delete with appropriate feedback toasts
  2. The Aereo detail page shows flight data plus an editable price-per-period table (periodo_desde, periodo_hasta, neto adulto, neto menor) where users can add rows, edit inline, and delete rows
  3. The Alojamientos list renders a glass table with columns (ID, hotel, ciudad, pais, categoria estrellas, acciones) and supports full CRUD with feedback
  4. The Alojamiento detail page shows hotel data, a price-per-period table with regimen field (CRUD for rows), and a photo grid
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Aereos list + /aereos/nuevo create + /aereos/[id] detail with inline price-per-period table
- [ ] 05-02-PLAN.md — Alojamientos list + /alojamientos/nuevo create (pais/ciudad cascade) + /alojamientos/[id] detail with price table (regimen) + photo grid

### Phase 6: Supporting Services Modules
**Goal**: Users can manage traslados (inline-editable table), seguros (modal CRUD), circuitos (day-by-day itinerary), and proveedores (modal CRUD)
**Depends on**: Phase 3
**Requirements**: TRAS-01, TRAS-02, TRAS-03, SEGU-01, SEGU-02, SEGU-03, CIRC-01, CIRC-02, CIRC-03, CIRC-04, PROV-01, PROV-02, PROV-03
**Success Criteria** (what must be TRUE):
  1. The Traslados page renders as a fully inline-editable table (no separate form) with columns (ID, nombre, tipo regular/privado, ciudad, pais, proveedor select, precio, acciones) where creating adds a new inline row and editing happens in-place
  2. The Seguros list renders a glass table (proveedor, plan, cobertura, costo/dia, acciones) and the form modal with all fields works for create/edit, plus clone and delete with feedback
  3. The Circuitos list renders a glass table, and the detail page has a working day-by-day itinerary editor (add day, edit, reorder) plus a price-per-period table, with full CRUD support
  4. The Proveedores list renders a glass table and the modal CRUD (nombre, datos contacto) works with create, edit, clone, and delete with feedback
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Proveedores (glass table + modal CRUD) and Seguros (glass table + modal CRUD with proveedorId Select)
- [ ] 06-02-PLAN.md — Traslados inline-editable table (unique pattern: full-row inline edit, pais/ciudad cascade, no detail page)
- [ ] 06-03-PLAN.md — Circuitos list (glass table + deep-clone) and detail page (header form + itinerary editor with HTML5 DnD + price table)

### Phase 7: Catalogos & Perfiles
**Goal**: Users can manage all reference data catalogs (temporadas, tipos, etiquetas, paises, regimenes) via tabbed interface and administer user profiles with role assignment
**Depends on**: Phase 3
**Requirements**: CATL-01, CATL-02, CATL-03, CATL-04, CATL-05, CATL-06, PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. The Catalogos page renders with tabs for each catalog type (Temporadas, Tipos de paquete, Etiquetas, Paises y ciudades, Regimenes), and switching tabs shows the corresponding catalog list
  2. Each catalog tab supports full CRUD -- users can create, edit, and delete entries within each catalog type with immediate UI feedback
  3. The Perfiles page renders a table with columns (nombre, email, rol badge, marca, acciones) and users can create/edit users via modal with role assignment (ADMIN/VENDEDOR)
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Catalogos tabbed page with 5 catalog mini-managers (Temporadas, Tipos, Etiquetas, Paises/Ciudades, Regimenes)
- [x] 07-02-PLAN.md — UserProvider + Perfiles page with glass table, role badges, and modal CRUD

### Phase 8: Dashboard, Notificaciones & Reportes
**Goal**: Users land on a data-rich dashboard, can run the notification wizard end-to-end, and can view reports with charts -- completing the full admin panel experience for the client demo
**Depends on**: Phases 4, 5, 6, 7 (aggregates data from all modules)
**Requirements**: DASH-01, DASH-02, DASH-03, NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, REPT-01, REPT-02, REPT-03
**Success Criteria** (what must be TRUE):
  1. The Dashboard renders 4 liquid glass stat cards with animated counter numbers, a recent activity feed (last packages created/edited), and quick access links to all modules
  2. The Notificaciones wizard walks through all 5 steps: select etiqueta -> view filtered paquetes -> select paquetes to notify -> preview email template with service summary and links -> send (simulated) with success toast
  3. The Reportes page shows stat cards (total paquetes activos, aereos, alojamientos, visitas web simuladas), a bar chart of paquetes by destino using recharts, and a table of hoteles mas usados
  4. All three modules (Dashboard, Notificaciones, Reportes) render with the glass design system and feel cohesive with the rest of the admin panel
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Dashboard with animated stat cards, recent activity feed, quick access links, and root redirect to /dashboard
- [ ] 08-02-PLAN.md — Notificaciones 5-step wizard: etiqueta selection, paquete filtering, checkbox selection, email preview, simulated send
- [ ] 08-03-PLAN.md — Reportes with stat cards, recharts bar chart (paquetes by destino), and hoteles mas usados table

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
Note: Phases 5, 6, and 7 depend only on Phase 3, so they could theoretically run in parallel, but sequential execution is recommended for solo development.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Design System | 8/8 | Complete | 2026-03-16 |
| 2. Layout, Navigation, Auth & Multi-Brand | 5/5 | Complete | 2026-03-16 |
| 3. Data Layer & Types | 5/5 | Complete | 2026-03-16 |
| 4. Paquetes Module | 5/5 | Complete | 2026-03-16 |
| 5. Aereos & Alojamientos | 2/2 | Complete   | 2026-03-16 |
| 6. Supporting Services | 3/3 | Complete   | 2026-03-16 |
| 7. Catalogos & Perfiles | 0/2 | Complete    | 2026-03-16 |
| 8. Dashboard, Notificaciones & Reportes | 3/3 | Complete   | 2026-03-16 |
