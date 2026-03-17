# Requirements: TravelOz Admin Panel Prototype

**Defined:** 2026-03-15
**Core Value:** Client experiences a premium, Apple-level admin panel where they can navigate all modules, CRUD travel entities, and see real-time price calculations -- validating UX before building the production backend.

## v1 Requirements

### Foundation & Design System

- [x] **DSYS-01**: Glass component library renders with correct backdrop-filter, blur, and gradient tokens from design.json v3
- [x] **DSYS-02**: Clay buttons render with 3D shadow effects, sheen hover animation, and press scale(0.96)
- [x] **DSYS-03**: Glass inputs render with focus double-ring (white + teal), error shake animation, and all states
- [x] **DSYS-04**: Glass table renders with dark header, row hover gradient violet->teal, and stagger animation on load
- [x] **DSYS-05**: Modal renders with liquid glass backdrop-filter blur(40px), scale spring entrance from 0.88
- [x] **DSYS-06**: Toast renders with frosted glass and slide spring from right
- [x] **DSYS-07**: Badge renders in 9 glass variants (activo/borrador/inactivo/temporada/promo/etc)
- [x] **DSYS-08**: Tabs render with animated violet->teal gradient indicator using layoutId
- [x] **DSYS-09**: SearchFilter component with glass search bar and filter chips
- [x] **DSYS-10**: PriceDisplay component showing Neto -> Markup -> Venta with animated arrows
- [x] **DSYS-11**: Card variants render (glass/liquid/stat) with breathe animation and sheen
- [x] **DSYS-12**: Pagination renders with clay active state buttons
- [x] **DSYS-13**: Select dropdown renders with liquid glass animated overlay
- [x] **DSYS-14**: Toggle renders with spring bounce animation
- [x] **DSYS-15**: Checkbox renders with pop animation
- [x] **DSYS-16**: Tag pills render as removable with colors
- [x] **DSYS-17**: Skeleton loader component for loading states
- [x] **DSYS-18**: Avatar component for user display
- [x] **DSYS-19**: Breadcrumb component for navigation context
- [x] **DSYS-20**: DatePicker component for date selection
- [x] **DSYS-21**: ImageUploader dropzone with glass style and thumbnail previews

### Layout & Navigation

- [x] **LAYO-01**: Sidebar renders with violet->black gradient (#6C2BD9 -> #441496 -> #0F081E) and pulsing glow
- [x] **LAYO-02**: Sidebar navigation items show active state with violet background, border, and glow
- [x] **LAYO-03**: Sidebar can collapse/expand with animation
- [x] **LAYO-04**: Topbar renders with frosted glass, breadcrumb, brand selector dropdown, and user menu
- [x] **LAYO-05**: PageHeader renders with display title, subtitle, and action button
- [x] **LAYO-06**: Admin layout wraps all pages with Sidebar + Topbar + AnimatePresence for page transitions
- [x] **LAYO-07**: Background renders with #F5F6FA base, SVG noise overlay at 2.5%, and 3 color orbs (teal/violet)
- [x] **LAYO-08**: Page transitions animate with opacity, y:12, blur(4px) spring entrance

### Multi-Brand

- [x] **BRND-01**: Brand selector in topbar switches between TravelOz and DestinoIcono
- [x] **BRND-02**: Switching brand filters all data to show only that brand's entities
- [x] **BRND-03**: BrandProvider context available throughout the app

### Authentication & Roles

- [x] **AUTH-01**: Login page renders with mesh gradient background, noise overlay, and liquid glass card
- [x] **AUTH-02**: Login sets user role (ADMIN/VENDEDOR) and brand in app state
- [x] **AUTH-03**: Vendedor view hides create/edit/delete/clone buttons across all modules
- [x] **AUTH-04**: Vendedor view hides neto and markup columns, shows only precio de venta
- [x] **AUTH-05**: Vendedor can only access Paquetes module (other sidebar items hidden)
- [x] **AUTH-06**: Vendedor sees "Solo lectura" badge in the UI

### Data Layer

- [x] **DATA-01**: TypeScript interfaces defined for all entities (Brand, User, Paquete, Aereo, Alojamiento, Traslado, Seguro, Circuito, Proveedor, etc)
- [x] **DATA-02**: Hardcoded realistic data: 2 brands, 5 users, 15+ paquetes, 10+ aereos, 12+ alojamientos, 8+ traslados, 6+ seguros, 2+ circuitos
- [x] **DATA-03**: All data in Spanish with realistic Uruguayan travel market info
- [x] **DATA-04**: Context-based store provides CRUD operations (create, read, update, delete) for all entities in memory
- [x] **DATA-05**: Utility functions: formatCurrency, calcularNeto, calcularVenta, slugify

### Dashboard

- [x] **DASH-01**: Dashboard renders 4 liquid glass stat cards with animated counter numbers
- [x] **DASH-02**: Dashboard shows recent activity (last packages created/edited)
- [x] **DASH-03**: Dashboard shows quick access links to all modules

### Paquetes Module

- [x] **PAQT-01**: Paquetes list renders glass table with columns: ID, titulo, destino, temporada, noches, estado, precio venta, acciones
- [x] **PAQT-02**: Paquetes list has instant search and filter chips (temporada, estado, tipo)
- [x] **PAQT-03**: Paquete detail has 5 tabs: Datos, Servicios, Precios, Fotos, Publicacion
- [x] **PAQT-04**: Tab Datos: form with titulo, noches, salidas, temporada (select), tipo (select), descripcion, texto visual
- [x] **PAQT-05**: Tab Servicios: list of assigned services with "Agregar servicio" button opening modal with tabs (Aereo/Hotel/Traslado/Seguro)
- [x] **PAQT-06**: Tab Servicios: each assigned service shows name + price + editable textoDisplay
- [x] **PAQT-07**: Tab Servicios: drag-and-drop reorder of assigned services
- [x] **PAQT-08**: Tab Precios: PriceDisplay component with Neto (auto-calculated) -> Markup (editable %) -> Venta (auto-calculated, editable)
- [x] **PAQT-09**: Tab Precios: changing markup recalculates venta in real-time
- [x] **PAQT-10**: Tab Fotos: grid of photos with simulated upload and drag-and-drop reorder
- [x] **PAQT-11**: Tab Publicacion: toggle publicado, date pickers validez, estado, destacado toggle, etiquetas multi-select with removable tags
- [x] **PAQT-12**: Create new paquete from /paquetes/nuevo with full form
- [x] **PAQT-13**: Clone paquete creates "Copia de {nombre}" in BORRADOR state
- [x] **PAQT-14**: Delete paquete shows confirmation modal with shake animation, then soft-deletes

### Aereos Module

- [x] **AERO-01**: Aereos list renders glass table with columns: ID, ruta, destino, acciones
- [x] **AERO-02**: Aereo detail shows flight data + editable price-per-period table (periodo_desde, periodo_hasta, neto adulto, neto menor)
- [x] **AERO-03**: Price-per-period table supports add row, edit inline, delete row
- [x] **AERO-04**: Create, edit, clone, delete aereo with appropriate feedback

### Alojamientos Module

- [x] **ALOJ-01**: Alojamientos list renders glass table with columns: ID, hotel, ciudad, pais, categoria (estrellas), acciones
- [x] **ALOJ-02**: Alojamiento detail shows hotel data + price-per-period table with regimen + photo grid
- [x] **ALOJ-03**: Price-per-period table supports CRUD with regimen field
- [x] **ALOJ-04**: Create, edit, clone, delete alojamiento with feedback

### Traslados Module

- [x] **TRAS-01**: Traslados renders as inline-editable table (no separate form)
- [x] **TRAS-02**: Columns: ID, nombre, tipo (regular/privado), ciudad, pais, proveedor (select), precio, acciones
- [x] **TRAS-03**: Create = new inline row, edit = inline, clone, delete with feedback

### Seguros Module

- [x] **SEGU-01**: Seguros list renders glass table with columns: proveedor, plan, cobertura, costo/dia, acciones
- [x] **SEGU-02**: Seguro form modal with fields: proveedor, plan, cobertura, costo por dia
- [x] **SEGU-03**: Create, edit, clone, delete seguro with feedback

### Circuitos Module

- [x] **CIRC-01**: Circuitos list renders glass table
- [x] **CIRC-02**: Circuito detail with day-by-day itinerary editor (add day, edit, reorder)
- [x] **CIRC-03**: Price-per-period table for circuitos
- [x] **CIRC-04**: Create, edit, clone, delete circuito with feedback

### Proveedores Module

- [x] **PROV-01**: Proveedores list renders glass table
- [x] **PROV-02**: Proveedor CRUD via modal (nombre, datos contacto)
- [x] **PROV-03**: Create, edit, clone, delete proveedor with feedback

### Catalogos Module

- [x] **CATL-01**: Catalogos page with tabs for each catalog type
- [x] **CATL-02**: Temporadas tab with CRUD
- [x] **CATL-03**: Tipos de paquete tab with CRUD
- [x] **CATL-04**: Etiquetas tab with CRUD
- [x] **CATL-05**: Paises y ciudades tab with CRUD
- [x] **CATL-06**: Regimenes tab with CRUD

### Perfiles Module

- [x] **PERF-01**: Perfiles table with columns: nombre, email, rol (badge), marca, acciones
- [x] **PERF-02**: Create/edit user via modal
- [x] **PERF-03**: CRUD for users with role assignment

### Notificaciones Module

- [x] **NOTF-01**: Notification wizard step 1: select etiqueta/campaign
- [x] **NOTF-02**: Notification wizard step 2: view filtered paquetes by etiqueta
- [x] **NOTF-03**: Notification wizard step 3: select paquetes to notify
- [x] **NOTF-04**: Notification wizard step 4: preview email template with service summary and links
- [x] **NOTF-05**: Notification wizard step 5: send (simulated) with success toast

### Reportes Module

- [x] **REPT-01**: Stat cards: total paquetes activos, aereos, alojamientos, visitas web simuladas
- [x] **REPT-02**: Bar chart of paquetes by destino (using recharts)
- [x] **REPT-03**: Table of hoteles mas usados

## v2 Requirements

### Enhanced Features (deferred to production)

- **V2-01**: Real database persistence with PostgreSQL + Prisma
- **V2-02**: Real authentication with sessions
- **V2-03**: Real email sending for notifications
- **V2-04**: Real image upload with storage
- **V2-05**: Automatic price propagation across packages when service price changes
- **V2-06**: Auto-deactivation of packages when validez_hasta date passes
- **V2-07**: Advanced reporting with year-over-year comparisons
- **V2-08**: Web analytics integration (visits per package)
- **V2-09**: Marketing/Reporting role
- **V2-10**: Cruise management (separate from circuitos)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database / API | Prototype only -- all data in React state |
| localStorage | No persistence between sessions needed for demo |
| Real email sending | Notifications are simulated with toast |
| Real image upload | Use Unsplash placeholder URLs |
| Separate CSS files | All Tailwind + inline styles per design spec |
| Real authentication | Login just sets role/brand in state |
| Mobile responsive | Admin panel is desktop-first for the video call |
| i18n / multi-language | All UI in Spanish only |
| Unit / E2E tests | Prototype -- visual validation in video call |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSYS-01 to DSYS-21 (21) | Phase 1: Foundation & Design System | Pending |
| LAYO-01 to LAYO-08 (8) | Phase 2: Layout, Navigation, Auth & Multi-Brand | Pending |
| BRND-01 to BRND-03 (3) | Phase 2: Layout, Navigation, Auth & Multi-Brand | Pending |
| AUTH-01 to AUTH-06 (6) | Phase 2: Layout, Navigation, Auth & Multi-Brand | Pending |
| DATA-01 to DATA-05 (5) | Phase 3: Data Layer & Types | Pending |
| PAQT-01 to PAQT-14 (14) | Phase 4: Paquetes Module | Pending |
| AERO-01 to AERO-04 (4) | Phase 5: Aereos & Alojamientos | Pending |
| ALOJ-01 to ALOJ-04 (4) | Phase 5: Aereos & Alojamientos | Pending |
| TRAS-01 to TRAS-03 (3) | Phase 6: Supporting Services | Pending |
| SEGU-01 to SEGU-03 (3) | Phase 6: Supporting Services | Pending |
| CIRC-01 to CIRC-04 (4) | Phase 6: Supporting Services | Pending |
| PROV-01 to PROV-03 (3) | Phase 6: Supporting Services | Pending |
| CATL-01 to CATL-06 (6) | Phase 7: Catalogos & Perfiles | Pending |
| PERF-01 to PERF-03 (3) | Phase 7: Catalogos & Perfiles | Complete |
| DASH-01 to DASH-03 (3) | Phase 8: Dashboard, Notificaciones & Reportes | Pending |
| NOTF-01 to NOTF-05 (5) | Phase 8: Dashboard, Notificaciones & Reportes | Pending |
| REPT-01 to REPT-03 (3) | Phase 8: Dashboard, Notificaciones & Reportes | Pending |

**Coverage:**
- v1 requirements: 98 total (DSYS:21 + LAYO:8 + BRND:3 + AUTH:6 + DATA:5 + PAQT:14 + AERO:4 + ALOJ:4 + TRAS:3 + SEGU:3 + CIRC:4 + PROV:3 + CATL:6 + PERF:3 + DASH:3 + NOTF:5 + REPT:3)
- Mapped to phases: 98
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*
