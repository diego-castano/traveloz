# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Client experiences a premium, Apple-level admin panel where they can navigate all modules, CRUD travel entities, and see real-time price calculations -- validating UX before building the production backend.
**Current focus:** MILESTONE COMPLETE -- All 8 phases delivered

## Current Position

Phase: 8 of 8 (Dashboard, Notificaciones, Reportes) -- COMPLETE
Plan: 3 of 3 in current phase (all complete)
Status: ALL PHASES COMPLETE -- Milestone v1.0 prototype delivered
Last activity: 2026-03-16 -- Phase 8 verified and closed (Dashboard, Notificaciones wizard, Reportes with recharts)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 28
- Average duration: 2.5 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-design-system | 3 | 7 min | 2.3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-04 (2 min), 01-08 (3 min)
- Trend: stable

*Updated after each plan completion*
| Phase 01 P04 | 2 min | 2 tasks | 2 files |
| Phase 01 P05 | 2 min | 2 tasks | 3 files |
| Phase 01 P03 | 4 min | 2 tasks | 3 files |
| Phase 01 P02 | 4 min | 2 tasks | 3 files |
| Phase 01 P07 | 3 min | 2 tasks | 4 files |
| Phase 01 P08 | 3 min | 2 tasks | 2 files |
| Phase 02 P01 | 2min | 2 tasks | 6 files |
| Phase 02 P02 | 2min | 2 tasks | 2 files |
| Phase 02 P03 | 3min | 2 tasks | 3 files |
| Phase 02 P04 | 3min | 1 tasks | 1 files |
| Phase 02 P05 | 2min | 2 tasks | 14 files |
| Phase 03 P01 | 3min | 2 tasks | 2 files |
| Phase 03 P02 | 7min | 2 tasks | 7 files |
| Phase 03 P03 | 5min | 2 tasks | 2 files |
| Phase 03 P04 | 3min | 2 tasks | 2 files |
| Phase 03 P05 | 3min | 3 tasks | 3 files |
| Phase 04 P01 | 2min | 1 tasks | 1 files |
| Phase 04 P02 | 4min | 2 tasks | 3 files |
| Phase 04 P03 | 5min | 2 tasks | 3 files |
| Phase 04 P04 | 3min | 2 tasks | 3 files |
| Phase 04 P05 | 2min | 2 tasks | 2 files |
| Phase 05 P01 | 4min | 2 tasks | 3 files |
| Phase 06 P01 | 3 | 2 tasks | 2 files |
| Phase 06 P03 | 4min | 2 tasks | 3 files |
| Phase 07 P01 | 3min | 2 tasks | 1 files |
| Phase 07 P02 | 2min | 2 tasks | 3 files |
| Phase 08 P02 | 4 | 1 tasks | 1 files |
| Phase 08 P03 | 2 | 2 tasks | 1 files |
| Phase 08-dashboard-notificaciones-reportes P01 | 3 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Tailwind CSS v3.4.18 pinned (not v4) per research -- v4 incompatible with tailwind.config.ts token workflow
- [Roadmap]: Radix UI unified package (v1.4.3) instead of individual @radix-ui/react-* packages
- [Roadmap]: motion (rebranded framer-motion) v12.x for all animations
- [Roadmap]: Per-entity Context providers to avoid cross-module re-renders
- [01-01]: All design tokens sourced exclusively from docs/design.json -- no approximated values
- [01-01]: Glass materials use inline style objects (not Tailwind classes) for complex backdrop-filter values
- [01-01]: WebkitBackdropFilter included on all glass materials for Safari compatibility
- [01-01]: Animation interactions reference springs by value spread for type safety
- [01-07]: Tag uses inline style for backdrop-filter and color -- consistent with glass pattern from 01-01
- [01-07]: Breadcrumb renders plain <a> tags (not Next.js Link) -- to upgrade when routing is set up in Phase 2
- [01-04]: Radix Dialog forceMount on Portal + Overlay + Content prevents pointer-events bug
- [01-04]: Toast uses enhanced frosted glass (blur 30px) for stronger visual presence at z-60
- [01-04]: Toast timer cleanup via useRef Map prevents stale callbacks on manual dismiss
- [01-05]: Tabs use React Context to share activeValue and layoutId across compound sub-components
- [01-05]: SearchFilter uses inline styles for glass properties, consistent with glass.ts pattern
- [01-05]: PriceDisplay uses frostedSubtle material with sizeConfig object for sm/lg variants
- [01-03]: Table wrapper uses div with glass material + inner table for overflow hidden rounding
- [01-03]: Motion drag event handlers explicitly omitted from props to avoid TS conflict with React HTML attrs
- [01-03]: Pagination ellipsis logic triggers when totalPages > 7
- [01-06]: CSS data-state animations for Radix Select dropdown (not AnimatePresence) -- forceMount unsupported with position=popper
- [01-06]: Toggle uses Motion layout prop with bouncy spring for thumb slide animation
- [01-06]: Checkbox uses AnimatePresence for check mark pop-in (simple mount/unmount, no Radix constraint)
- [Phase 01-02]: MotionSafeButtonProps Omit pattern resolves React/Motion onDrag type conflict on motion.button
- [Phase 01-02]: Sheen hover via CSS ::after pseudo-element with animate-sheen-slide (GPU composited)
- [Phase 01-02]: Badge uses CVA for sizes only; variant glass styles use inline style objects
- [Phase 01-02]: Input state composition merges base glass style with state-specific overrides
- [01-08]: react-day-picker v9 classNames API (not CSS modules) for full Tailwind integration in DatePicker
- [01-08]: HTML5 native drag-and-drop for ImageUploader thumbnail reorder instead of adding @dnd-kit dependency
- [01-08]: Simulated file upload with URL.createObjectURL -- appropriate for prototype scope
- [02-01]: Providers.tsx client wrapper keeps root layout as server component for metadata export
- [02-01]: AuthProvider uses useMemo on context value to prevent unnecessary re-renders
- [02-01]: Brand tokens copied exactly from design.json brands section -- no approximated values
- [02-01]: RoleConfig exported as named interface for reuse in sidebar filtering and page-level checks
- [02-02]: Sidebar uses inline styles for all glass/gradient properties (consistent with Phase 1 glass pattern)
- [02-02]: Radix Tooltip wraps nav items only when collapsed (avoids unnecessary DOM nodes when expanded)
- [02-02]: Mouse event handlers for hover states use imperative style mutations (not state) to avoid re-renders per item
- [02-03]: Topbar brand selector uses Radix DropdownMenu with forceMount + AnimatePresence for animated open/close
- [02-03]: Breadcrumb generated from pathname with Spanish segment label mapping via segmentLabels record
- [02-03]: FrozenRouter uses LayoutRouterContext from next/dist/shared/lib/app-router-context.shared-runtime (internal API, stable in Next.js 14.x)
- [02-03]: PageTransitionWrapper uses AnimatePresence mode=wait with design.json pageTransition values (y:12/blur:4px enter, y:-8 exit)
- [02-04]: Login page placed at src/app/login/page.tsx OUTSIDE (admin) route group to avoid inheriting admin layout
- [02-04]: Card entrance uses spring animation (stiffness:200, damping:22) from design.json patterns.loginPage
- [02-04]: Demo quick-select buttons fill both email and password fields for fast testing
- [02-04]: Auth redirect check at top of component prevents authenticated users from seeing login
- [02-05]: Root page redirects to /paquetes (not /dashboard) since Dashboard is Phase 8
- [02-05]: Auth redirect uses useRouter + useEffect (not redirect()) because admin layout is client component
- [03-01]: All dates stored as ISO 8601 strings (not Date objects) to mirror real API behavior
- [03-01]: Single types.ts file with all 22 interfaces to prevent circular dependency issues
- [03-01]: User type re-exported from auth.ts rather than redefined -- single source of truth
- [03-01]: Ciudad has no brandId -- inherits brand scope through parent Pais
- [03-02]: Paises and reference data duplicated per brand for correct selector hook filtering by activeBrandId
- [03-02]: Ciudades duplicated per brand's paises to maintain consistent parent-child brand scoping
- [03-02]: CX Max seguro mapped to Universal Assistance proveedor (no dedicated CX proveedor entity)
- [03-02]: Circuitos split 1 per brand to ensure both brands have circuit demo data
- [03-03]: Paquete pricing pre-computed as static values in seed data -- appropriate for prototype scope
- [03-03]: Brand-2 aereo IDs reused for brand-1 paquete-7 (Buenos Aires) since no dedicated brand-1 EZE route exists
- [03-03]: Some paquetes use proxy alojamientos/traslados from nearby cities when exact destination not in seed data
- [03-04]: Proveedor uses soft delete (has deletedAt); all other catalog entities use hard delete (no deletedAt field)
- [03-04]: Sub-entities (PrecioAereo, AlojamientoFoto, CircuitoDia, etc.) use hard delete since they are child records
- [03-04]: usePaises enriches each Pais with child Ciudades array for convenience
- [03-04]: Sub-entity CRUD actions only generate id (no createdAt/updatedAt fields on those types)
- [03-05]: PackageProvider is independent at context level -- no imports from ServiceProvider or CatalogProvider
- [03-05]: CLONE_PAQUETE copies paquete + all 7 junction record types with new UUIDs
- [03-05]: PaqueteEtiqueta has no UPDATE action -- etiquetas are assign/remove only (no mutable fields)
- [04-01]: Destino derived from first assigned aereo via paqueteAereos junction and aereo lookup map (destinoMap)
- [04-01]: Filter chip namespacing uses "category:value" format for multi-category OR/AND filtering
- [04-01]: Spread readonly deleteShake.animate.x into mutable array to satisfy motion/react TS types
- [04-01]: ModalHeader uses title prop with null children for delete modal (component requires children prop)
- [04-02]: Tab URL sync uses router.replace with scroll:false to avoid navigation history pollution
- [04-02]: nuevo/ placed as static sibling to [slug]/ for correct Next.js App Router route matching
- [04-02]: DatosTab uses local useState initialized from paquete prop (encapsulated form state)
- [04-02]: Textarea uses inline glass styling consistent with Input component pattern (no Textarea UI component)
- [04-02]: VENDEDOR guard: readOnly prop on edit forms, useEffect redirect on create page
- [04-03]: MapIcon alias for lucide-react Map icon to avoid global Map constructor shadowing
- [04-03]: HTML5 native drag-and-drop for service reorder (consistent with 01-08 ImageUploader, no @dnd-kit)
- [04-03]: Nested Tabs use distinct layoutId (serviceSelectorTabs vs paqueteDetailTab) to prevent underline collision
- [04-04]: Precio lookup by service entity ID since junction types lack precioId fields (first matching precio used)
- [04-04]: PriceDisplay receives 0 for neto/markup when VENDEDOR (hidden values), venta always shown
- [04-04]: Live neto recalculation via useMemo from current service state, not stale paquete.netoCalculado
- [04-05]: Publicado toggle derived from estado === ACTIVO (no separate boolean field on Paquete type)
- [04-05]: Etiqueta hex colors mapped to closest Tag preset via hexToTagColor lookup table
- [05-01]: Aereos list uses empty filters array for SearchFilter (search-only, no filter chips needed)
- [05-01]: Inline price row edit pattern: reset both editingRowId and draftRow atomically on save/cancel to prevent desync
- [05-01]: /aereos/nuevo as static sibling to /aereos/[id] for correct Next.js App Router route matching
- [05-01]: Explicit property spread in updateAereo call (not ...aereo spread) for TypeScript narrowing
- [Phase 05-aereos-alojamientos]: StarRating uses 5 lucide Star icons inline; index < categoria fills amber-400, otherwise text-neutral-600 outline
- [Phase 05-aereos-alojamientos]: ciudadMap built by iterating pais.ciudades from usePaises() enriched return — prevents ciudad column showing '--'
- [Phase 05-aereos-alojamientos]: Price table edit resets BOTH editingRowId=null AND draftRow={} on save/cancel to prevent edit state desync
- [06-02]: Plain <table> used (NOT glass Table component) to avoid motion.tbody stagger animation conflicts on frequent inline-edit re-renders
- [06-02]: Ciudad Select disabled when no paisId selected to prevent confusing empty dropdown
- [06-02]: Cascading select reset: setDraftRow(d => ({...d, paisId: v, ciudadId: ''})) atomically resets child on parent change
- [06-02]: Inline-entity edit pattern extends Phase 5 price-table pattern to full entity rows (not just sub-records)
- [Phase 06]: Proveedores and Seguros use modal-only CRUD — no detail routes per RESEARCH.md anti-patterns
- [Phase 06]: proveedorMap built with useMemo in Seguros page for O(1) name lookups in table rows
- [06-03]: cn() imported from @/components/lib/cn (not @/lib/utils) -- consistent with existing pattern across the codebase
- [06-03]: Deep clone uses synchronous createCircuito return value for new id -- confirmed ServiceProvider returns entity
- [06-03]: Drag-and-drop reorder updates BOTH orden AND numeroDia for all affected rows (Pitfall 6 from RESEARCH.md)
- [07-01]: EtiquetasTab slug auto-generation only on create (not edit) for URL stability -- editTarget check in onChange handler
- [07-01]: PaisesTab uses React.Fragment wrapper per pais row to allow expanded tr sibling without DOM nesting violation
- [07-01]: Cascade delete in PaisesTab: deleteCiudad called for each ciudad before deletePais to avoid orphans in state
- [07-02]: UserProvider uses hard delete (filter by id) -- AuthUser has no deletedAt field unlike Proveedor
- [07-02]: useUsers() intentionally NOT brand-filtered -- ADMIN administers all users across all brands
- [07-02]: UserProvider positioned between PackageProvider and ToastProvider in Providers.tsx composition chain
- [07-02]: roleBadgeVariant record maps Role to Badge variant: ADMIN=active/teal, VENDEDOR=pending/orange, MARKETING=draft/grey
- [07-02]: ADMIN guard uses early return at page component level (not route-level middleware)
- [Phase 08-02]: Wizard collapsed to 4-step flow: Etiqueta → Paquetes → Seleccion → Enviar. Send button on step 4 (previously step 5 ghost removed)
- [Phase 08-03]: useBrand imported from BrandProvider not AuthProvider as plan docs stated -- corrected import path
- [Phase 08-02]: Inline step content functions in page component — no separate files per plan spec, allows shared state access without prop drilling
- [Phase 08-03]: recharts Tooltip glass: spread glassMaterials.frosted into contentStyle with border:none override
- [Phase 08-03]: AnimatedCounter uses useMotionValue + useTransform(count, Math.round) + animate(count, value, duration:1.2) with cleanup
- [Phase 08-dashboard-notificaciones-reportes]: Dashboard uses INACTIVO not PAUSADO for inactive paquetes -- EstadoPaquete type is BORRADOR|ACTIVO|INACTIVO
- [Phase 08-dashboard-notificaciones-reportes]: motion.span required for MotionValue rendering in StatCard counter -- plain span only shows 0
- [Phase 08-dashboard-notificaciones-reportes]: Dashboard href changed from / to /dashboard in Sidebar, isActive special case for / removed

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: backdrop-filter performance -- more than 3 stacked blur layers causes jank (research flag)
- Phase 4: Drag-and-drop reorder for services/photos may need @dnd-kit/core (not yet in stack)

## Session Continuity

Last session: 2026-03-16
Stopped at: MILESTONE COMPLETE -- All 8 phases delivered. Project ready for client presentation.
Resume file: None
