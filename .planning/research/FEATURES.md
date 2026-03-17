# Feature Research: TravelOz Admin Panel

**Domain:** Travel agency internal administration panel (back-office) for package management, service composition, pricing, vendor management, and seller communication
**Researched:** 2026-03-15
**Confidence:** HIGH -- features derived from client interviews (explicacion.md, flujo.md, modulos_backend.md) cross-referenced with industry patterns from OTA back-office systems

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the TravelOz team will expect from day one. Missing any of these means the system feels worse than EvangelioZ + Excel and adoption fails.

#### Module: Paquetes (Central Entity)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Package CRUD (create, read, update, delete) | Core operation -- product team creates/edits packages daily | MEDIUM | Includes soft delete. Forms must capture: titulo, noches, salidas, temporada, tipo, descripcion, textoVisual, validez dates, estado, destacado, etiquetas, fotos |
| Service assignment to packages | THE pain point. Services (aereo, hotel, traslado, seguro, circuito) must be assignable entities, not text fields | HIGH | This is the #1 differentiator vs. EvangelioZ. Junction tables (PaqueteAereo, PaqueteAlojamiento, etc.) with textoDisplay editable per assignment |
| Real-time price calculation: Neto -> Markup -> Venta | Operators need to see cost composition instantly | MEDIUM | netoCalculado = sum of all assigned service costs. precioVenta = neto * (1 + markup/100). Markup editable per package. Venta editable (recalculates markup inversely) |
| Price propagation (change service price -> all packages update) | Eliminates hours of weekly manual updates. Santiago: "nosotros vamos a actualizar el servicio, no el paquete" | HIGH | Trigger on PrecioAereo/PrecioAlojamiento/Traslado/Seguro update -> recalculate netoCalculado + precioVenta for all affected packages |
| Package cloning | Reuse last season's packages with one click. Geronimo: "no tener que cargar nuevamente paquetes" | LOW | Copy all data + service assignments + etiquetas + fotos. Reset estado to BORRADOR, clear validez dates, generate new ID |
| Package state lifecycle (BORRADOR -> ACTIVO -> INACTIVO) | Standard workflow. Drafts for work-in-progress, active for published, inactive for expired | LOW | State machine with publish/unpublish actions |
| Auto-deactivation by validez date | Geronimo: "ponemos validez 8 de octubre para que se nos den de baja automaticamente" | LOW | Cron job (hourly) checks ACTIVO packages where validezHasta < now(), sets to INACTIVO |
| Package photos with drag-and-drop reorder | Visual content is critical for travel packages | MEDIUM | Multiple photo upload, orderable, with alt text |
| Tags/etiquetas multi-select | Tags drive campaigns, frontend URLs, and notification filtering | LOW | Many-to-many via PaqueteEtiqueta junction table |
| Smart search and instant filters | Geronimo: "filtros inteligentes, pones Miami y te aparecen todos". Santiago: "que sea instantaneo" | MEDIUM | Search across titulo, destino, salidas. Filter chips by temporada, estado, tipo. Client-side filtering acceptable for prototype, server-side ILIKE for production |

#### Module: Servicios (Aereos, Alojamientos, Traslados, Seguros, Circuitos)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Aereos CRUD with period-based pricing | Flights are the highest-cost component. MVD->CUN reused across Cancun, Playa del Carmen, Costa Mujeres, Tulum packages | MEDIUM | Sub-entity PrecioAereo with periodoDesde/Hasta, precioAdulto, precioMenor. Multiple price periods per flight. Periods must not overlap |
| Alojamientos CRUD with period-based pricing + regimen + fotos | Hotels need photos, star rating, pricing by season and meal plan | MEDIUM | Sub-entity PrecioAlojamiento with periodoDesde/Hasta, precioPorNoche, regimen. Photos with reorder |
| Traslados inline-editable table | Geronimo: "que sea una tablita y chau, no tenga formulario interno" | LOW | No separate form. Edit directly in table row. Linked to Proveedor entity. Fixed price (no periods) |
| Seguros CRUD | ~4 providers, ~100 plans. Cost per day per person | LOW | Proveedor, plan name, cobertura (text), costo_por_dia. Cost = costo_por_dia x package.noches |
| Circuitos with day-by-day itinerary + period pricing | Europa Mundo circuits with multi-day itineraries | MEDIUM | Itinerary as ordered list of days with descriptions. Pricing by period same logic as hotels. Itinerary auto-displayed on frontend |
| Service reusability across packages | One flight serves many packages. One hotel appears in multiple packages | LOW | Architectural -- services are independent entities assigned to packages via junction tables. This is not a feature to build but a data model constraint to enforce |

#### Module: Proveedores

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Proveedores CRUD (normalized entity) | Geronimo: prevents "siete" vs "Seven" vs "SEVENS" duplicates | LOW | Name + contact info. Linked to traslados and seguros. Cannot delete if linked to active services |

#### Module: Catalogos

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Temporadas CRUD | Geronimo: "autonomia al 100% para crear temporadas nuevas" | LOW | Labels only: "Baja 2026", "Alta 2026". No date logic -- dates live on service prices |
| Tipos de paquete CRUD | "Lunas de miel", "Salidas grupales", etc. Used as filters in admin + frontend | LOW | Simple name + optional description |
| Etiquetas CRUD | Drive frontend URLs (traveloz.com.uy/tag/black-friday) and campaign notifications | LOW | Name + slug for URL generation |
| Paises y Ciudades CRUD | Assigned to alojamientos, traslados, paquetes | LOW | Hierarchical: Ciudad belongs to Pais |
| Regimenes hoteleros CRUD | "Desayuno", "All Inclusive", "Media Pension" | LOW | Simple labels linked to PrecioAlojamiento |

#### Module: Perfiles

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User management (CRUD by admin) | No self-registration. Admin creates accounts. 1 admin + 1 shared vendedor per brand | LOW | Email + password (bcrypt). Roles: ADMIN, VENDEDOR, MARKETING |
| Role-based access control | Vendedores see only packages (read-only, no neto/markup). Admin sees everything | MEDIUM | Middleware-level enforcement. UI conditionally renders actions/columns based on role |
| Seller read-only view | Vendedores need one-click access to package composition for responding to leads | LOW | Same package detail UI minus action buttons, minus neto/markup columns. Badge "Solo lectura" |

#### Module: Notificaciones

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Notification wizard (5-step flow) | Replaces weekly manual email to sellers. Geronimo: "hacemos un aviso a los vendedores via mail" | HIGH | Step 1: Select etiqueta/campaign. Step 2: View filtered packages. Step 3: Select packages. Step 4: Auto-generated email preview with services + links. Step 5: Send to grupo_ventas email. Template auto-generated from package data |

#### Module: Dashboard

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stat cards (total active packages, aereos, alojamientos) | Quick operational overview | LOW | Aggregated counts from data. Animated counters |
| Recent activity feed | See last created/edited packages | LOW | Query recent records sorted by updatedAt |
| Quick navigation to modules | Shortcuts for frequent actions | LOW | Links/buttons to Paquetes, Aereos, etc. |

#### Module: Reportes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Packages by destination and season (chart) | Geronimo: "tener visual grafica de cuantos paquetes tengo para Brasil en temporada baja, separado por destino" | MEDIUM | Bar or pie chart. Group by destination, filter by temporada |
| Most-used hotels table | Know which hotels dominate the portfolio | LOW | Count hotel appearances across active packages |
| Provider utilization report | Identify underused providers | LOW | Count provider references across active services |

#### Cross-cutting

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-brand selector (TravelOz / DestinoIcono) | Two brands from one system. Same UI, independent data | MEDIUM | brand_id on every entity. Selector in topbar. All queries filter by active brand. Users scoped to one brand |
| Login with JWT authentication | Secure access with role determination | LOW | Email + password. JWT in httpOnly cookie. Determines brandId + role for session |
| Soft delete globally | Never lose data. Deactivated packages reusable next season | LOW | deletedAt timestamp on all entities. Default queries filter where deletedAt IS NULL |
| Spanish-language UI | Uruguayan team. All labels, placeholders, buttons, messages in Spanish | LOW | Static strings, no i18n framework needed for single-language |
| Audit timestamps (createdAt, updatedAt) | Track when records were created/modified | LOW | Prisma @default(now()) and @updatedAt |

---

### Differentiators (Competitive Advantage)

Features that go beyond what EvangelioZ offered and what basic travel management systems provide. These make TravelOz's admin panel genuinely better than buying off-the-shelf software.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Editable textoDisplay per service assignment | Internal service link stays intact but display text is customizable. Geronimo: "que internamente quede atado pero que el nombre visual se pueda cambiar" | LOW | textoDisplay field on PaqueteAereo, PaqueteAlojamiento, etc. Auto-generated from service data if null, manually editable |
| Service drag-and-drop reorder within package | Control the order of "incluye" items on the frontend | MEDIUM | ordenServicios JSON field on Paquete, or orden field on each junction table. Drag handle UI |
| Bidirectional price editing (markup <-> venta) | Edit markup% and venta auto-updates. Edit venta and markup% recalculates. Strategic flexibility for per-package pricing | LOW | Two-way binding. precioVenta = neto * (1 + markup/100). If venta edited: markup = ((venta / neto) - 1) * 100 |
| Period-aware price matching | When assigning a service to a package, system auto-selects the PrecioAereo/PrecioAlojamiento whose date range matches the package's validez dates | HIGH | Date range overlap check. Warning if no matching period found. Critical for accuracy -- eliminates manual price lookup |
| Campaign-driven notification workflow | Tag-based filtering -> select packages -> auto-generated email -> send. Data-driven, not manual copy-paste | HIGH | Eliminates errors from manual email composition. Links always correct because generated from actual data |
| Package reactivation workflow | Find inactive 2025 packages, update dates/prices, reactivate for 2026. No re-creation needed | LOW | Filter by estado=INACTIVO, edit, change validez dates, set estado=ACTIVO. Saves massive time at season transitions |
| Multi-destination package support | One package can include hotels in different cities (Rio + Buzios). nochesEnEste per hotel assignment | MEDIUM | PaqueteAlojamiento.nochesEnEste overrides paquete.noches for that specific hotel's cost calculation |
| Frontend-aware tag URLs | Etiquetas generate URL slugs. traveloz.com.uy/tag/black-friday shows all tagged packages | LOW | Slug field on Etiqueta entity. Frontend reads slug to filter packages |
| Web visit tracking per package (future) | Santiago: "que cantidad de gente entra, a que paquete, en que fecha" | HIGH | Requires frontend analytics integration. Deferred -- needs frontend to be built first |
| Year-over-year comparison reports (future) | Compare package performance across seasons | MEDIUM | Requires 1+ year of data. Deferred to v2+ |
| Purchase timing analytics (future) | Santiago: "estudiamos el momento de compra hace un ano y medio" manually. Automate this | HIGH | Requires booking/conversion data from frontend. Deferred until sales data flows into system |
| Bulk operations on packages | Select multiple packages and change state, assign tags, or clone in batch | MEDIUM | Checkbox column in table + bulk action dropdown. Not requested explicitly but high-value for 30+ package operations |
| Keyboard shortcuts for power users | Navigate modules, save forms, search without mouse | LOW | Product team uses the system daily for hours. Keyboard efficiency matters. Not requested but high UX value |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features to deliberately NOT build. These either add complexity without value, conflict with TravelOz's actual workflow, or create maintenance burden disproportionate to benefit.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Full CRM / lead management system | Travel agencies often want lead tracking | TravelOz has 35+ employees with existing commercial workflows. Building CRM duplicates their existing tools and distracts from the admin panel's core purpose: package management | Keep admin focused on package/service management. CRM is a separate product. Vendedor view provides the quick-lookup they actually need for lead response |
| GDS/API integration (Amadeus, Sabre) | Industry standard for OTAs | TravelOz is not an OTA. They manually negotiate rates with airlines and hotels. GDS integration adds massive complexity for a 35-person agency that doesn't need real-time inventory | Manual price entry per service. If API integration is needed later, the service entity model supports it -- just change where PrecioAereo data comes from |
| Online booking engine / B2C checkout | Seems natural for a travel website | TravelOz sells via vendedores responding to leads, not self-service checkout. Building a booking engine is an entire product. The admin panel feeds the public website with package display data only | Frontend shows packages with "contact us" CTAs. The admin manages what's displayed. No shopping cart, no payment processing |
| Automatic vencimiento notifications ("your package expires in 5 days") | Santiago considered this | Santiago himself rejected it: "le llegarian muchos mails". Product team does daily follow-up already. Automated notifications would create noise | Auto-deactivation handles expiry silently. Dashboard can show "expiring soon" count without email spam |
| Per-vendedor individual user accounts | Some systems create one account per seller | Santiago prefers one shared vendedor login per brand to avoid user management overhead. With 35+ employees, individual accounts create admin burden without proportional value | 1 shared VENDEDOR account per brand. If individual tracking is needed later, add it then |
| Multi-currency pricing | Travel industry uses multiple currencies | TravelOz works exclusively in USD. Multi-currency adds UI complexity, conversion logic, and confusion for a team that has standardized on a single currency | All prices in USD. Display "USD" as static label, not a selectable field |
| Real-time collaborative editing | Multiple users editing same package simultaneously | Team of 1-2 product people per brand. Concurrent editing conflict is extremely rare. Real-time sync (WebSockets, CRDT) adds massive architectural complexity for near-zero benefit | Standard optimistic concurrency: last write wins with updatedAt check. Show warning if another user edited since you opened the record |
| Complex permission granularity (field-level access) | Fine-grained control over who sees what | Three roles (ADMIN, VENDEDOR, MARKETING) cover all use cases. Field-level permissions create configuration complexity that the admin of a 35-person agency will never manage | Module-level + column-level role checks hardcoded in the application. ADMIN sees all, VENDEDOR sees packages read-only without neto/markup, MARKETING sees packages + reports read-only |
| AI-powered package recommendations | Trendy in travel tech | No historical booking data exists yet. AI needs training data. The value proposition for an internal tool with 2-3 power users is near zero | Let humans compose packages. They have 48K Instagram followers -- they know their market better than any model |
| Inventory/availability management | Standard in OTA systems | TravelOz doesn't manage real-time hotel room inventory. They negotiate rates and publish packages. Availability is handled by the supplier | Services represent pricing agreements, not inventory. No "rooms left" or "seats available" tracking needed |
| Payment processing / invoicing | Back-office systems often include accounting | TravelOz handles payments through existing channels. Building payment processing adds PCI compliance burden and accounting complexity | Keep out of scope. Invoicing and payments are separate operational workflows |
| i18n / multi-language support | Common in SaaS products | Single team, single country (Uruguay), single language (Spanish). Building i18n infrastructure for one language is pure overhead | Hardcode all strings in Spanish. If a third brand in another language ever appears, refactor then |
| Mobile app | "Everyone needs a mobile app" | Admin panel is used at desks in the office. Complex forms (package editing with 5 tabs, drag-and-drop photos, inline pricing tables) are desktop workflows | Responsive web design for basic mobile access (viewing packages). Full editing is desktop-only. No native app |

---

## Feature Dependencies

```
[Catalogos: Temporadas, Tipos, Etiquetas, Paises, Ciudades, Regimenes]
    |
    v
[Proveedores]
    |
    v
[Servicios: Aereos, Alojamientos, Traslados, Seguros, Circuitos]
    |       \
    |        \--> [Price periods: PrecioAereo, PrecioAlojamiento, PrecioCircuito]
    v                |
[Paquetes]  <--------/  (services assigned to packages, prices resolved by period)
    |
    +---> [Price calculation: Neto -> Markup -> Venta]
    |
    +---> [Fotos, Etiquetas, textoDisplay per service]
    |
    +---> [Estado lifecycle: BORRADOR -> ACTIVO -> INACTIVO]
    |
    v
[Notificaciones] (depends on Paquetes + Etiquetas for campaign filtering)
    |
    v
[Reportes] (depends on Paquetes + Servicios for aggregation data)

[Perfiles / Auth] --> enables [Role-based views] --> constrains all modules

[Multi-brand selector] --> filters ALL data across ALL modules
```

### Dependency Notes

- **Catalogos must exist before Servicios:** You cannot create an Alojamiento without a Pais/Ciudad to assign. You cannot create a PrecioAlojamiento without a Regimen. Temporadas and Tipos are needed for Paquetes.
- **Servicios must exist before Paquetes:** A package is composed of services. You cannot assign an Aereo to a Paquete if no Aereos exist. Build service modules before the package module.
- **Auth/Perfiles must exist before everything:** All modules require brand_id filtering and role-based access. Authentication and brand context must be the first layer built.
- **Notificaciones depend on Paquetes + Etiquetas:** The notification wizard filters packages by etiqueta. Both must be functional before notifications make sense.
- **Reportes depend on populated data:** Reports are meaningless without packages and services. Build last.
- **Price propagation is a cross-cutting concern:** It triggers when ANY service price changes and affects ALL packages using that service. Must be designed as a reusable function, not per-module logic.

---

## MVP Definition

### Launch With (v1 -- Prototype for Client Validation)

The prototype shown in the videocall must demonstrate the complete workflow. All data is hardcoded (useState/useContext), but every interaction must feel real.

- [ ] **Auth + Brand selector** -- Login page, role detection, brand switching in topbar
- [ ] **Sidebar navigation** -- All 12 modules accessible, flat structure, no dropdowns
- [ ] **Catalogos module** -- CRUD for temporadas, tipos, etiquetas, paises, ciudades, regimenes (tabs)
- [ ] **Proveedores module** -- Simple CRUD with table + modal
- [ ] **Aereos module** -- Listado + detail page with period-based pricing table
- [ ] **Alojamientos module** -- Listado + detail with pricing, regimen, fotos
- [ ] **Traslados module** -- Inline-editable table (no separate form)
- [ ] **Seguros module** -- Listado + modal form
- [ ] **Circuitos module** -- Listado + detail with day-by-day itinerary + period pricing
- [ ] **Paquetes module (full)** -- Listado with filters + 5-tab detail (Datos, Servicios, Precios, Fotos, Publicacion)
- [ ] **Service assignment flow** -- Modal to assign aereo/hotel/traslado/seguro to package from existing entities
- [ ] **Price calculation display** -- Neto -> Markup -> Venta with real-time updates
- [ ] **Package cloning** -- One-click duplicate
- [ ] **Vendedor read-only view** -- Packages without neto/markup, no action buttons
- [ ] **Dashboard** -- Stat cards + recent activity
- [ ] **Notificaciones wizard** -- 5-step flow (select tag -> filter packages -> select -> preview -> send)
- [ ] **Reportes** -- Charts (packages by destination) + tables (most-used hotels)
- [ ] **Perfiles** -- User table with roles + create/edit modal

### Add After Validation (v1.x -- Production Backend)

Features to implement when connecting to real database (PostgreSQL + Prisma on Railway).

- [ ] **Real authentication** -- bcrypt password hashing, JWT tokens, httpOnly cookies, session management
- [ ] **Database persistence** -- Replace in-memory state with Prisma queries
- [ ] **Price propagation triggers** -- On service price update, recalculate all affected packages in DB
- [ ] **Auto-deactivation cron** -- Hourly job to deactivate expired packages
- [ ] **Email sending** -- Integrate Resend/SendGrid for notification emails to vendedor groups
- [ ] **Image upload** -- Replace Unsplash URLs with actual file upload (S3/Cloudinary)
- [ ] **Server-side search** -- Replace client-side filtering with PostgreSQL full-text search or ILIKE
- [ ] **Soft delete enforcement** -- deletedAt filtering in Prisma middleware
- [ ] **Optimistic concurrency** -- updatedAt check on save to prevent conflicting edits
- [ ] **Audit trail** -- createdBy/updatedBy fields populated from session user

### Future Consideration (v2+)

Features to defer until the system has been in production and has real data.

- [ ] **Web visit tracking per package** -- Requires frontend analytics. Deferred until frontend is rebuilt
- [ ] **Year-over-year comparison reports** -- Needs 1+ year of data accumulation
- [ ] **Purchase timing analytics** -- Needs booking/conversion data pipeline
- [ ] **Bulk operations** -- Multi-select packages for batch state changes or tag assignment
- [ ] **Default markup configuration** -- Global default markup% that pre-fills new packages
- [ ] **API for frontend** -- Public read-only API for the traveloz.com.uy/destinoicono websites to consume package data
- [ ] **Webhook/real-time frontend updates** -- When a package changes, the public website reflects it without manual cache clearing
- [ ] **Export to PDF/Excel** -- Export package data, reports, or notification previews
- [ ] **Activity log** -- Full history of who changed what and when

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Package CRUD with service assignment | HIGH | HIGH | P1 |
| Price calculation (Neto -> Markup -> Venta) | HIGH | MEDIUM | P1 |
| Price propagation across packages | HIGH | HIGH | P1 |
| Service CRUD (aereos, alojamientos, traslados, seguros) | HIGH | MEDIUM | P1 |
| Catalogos CRUD | HIGH | LOW | P1 |
| Multi-brand selector + data isolation | HIGH | MEDIUM | P1 |
| Auth + role-based access | HIGH | MEDIUM | P1 |
| Smart search + instant filters | HIGH | MEDIUM | P1 |
| Package cloning | HIGH | LOW | P1 |
| Auto-deactivation by validez | MEDIUM | LOW | P1 |
| Vendedor read-only view | HIGH | LOW | P1 |
| Notification wizard | MEDIUM | HIGH | P2 |
| Dashboard stats + activity | MEDIUM | LOW | P2 |
| Reporting (charts + tables) | MEDIUM | MEDIUM | P2 |
| Circuitos with itinerary | MEDIUM | MEDIUM | P2 |
| Drag-and-drop service reorder | LOW | MEDIUM | P2 |
| Period-aware price auto-matching | MEDIUM | HIGH | P2 |
| Bidirectional markup/venta editing | LOW | LOW | P2 |
| Bulk operations | LOW | MEDIUM | P3 |
| Web visit tracking | LOW | HIGH | P3 |
| YoY comparison reports | LOW | MEDIUM | P3 |
| Export to PDF/Excel | LOW | MEDIUM | P3 |
| Keyboard shortcuts | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for prototype validation and v1 launch
- P2: Should have, add during production development
- P3: Nice to have, future consideration after system is live

---

## Competitor Feature Analysis

| Feature | EvangelioZ (current) | Generic Travel SaaS (Trawex, FlightsLogic) | TravelOz New System |
|---------|---------------------|---------------------------------------------|---------------------|
| Service-package linking | Text fields only, no real connection | Full API integration with GDS/suppliers | Entity-based linking with price propagation (the sweet spot) |
| Price propagation | None -- manual update per package | Automatic via supplier APIs | Automatic via internal service price changes |
| Multi-brand support | Separate instances, double work | White-label with full separation | Same app, brand selector, shared hosting, independent data |
| Seller view | No dedicated view | Agent portal with commission tracking | Read-only package view with service composition, no financial details |
| Package builder UX | Multiple tabs, "many little steps" | Drag-and-drop with API inventory | Single-page with tabs, modal service selector, inline pricing |
| Notifications to sellers | Manual email, copy-paste links | CRM-based automation with templates | Tag-filtered wizard generating email from real package data |
| Reporting | None | Full BI dashboards with historical data | Basic charts (destinations, hotels) -- sufficient for first year |
| Catalog management | Fixed, developer-dependent | Admin-configurable | Fully admin-configurable CRUD for all catalogs |
| Package lifecycle | Manual activate/deactivate | Automated with rules engine | Auto-deactivation by validez date + cloning for reactivation |

---

## Sources

**Client interviews (HIGH confidence):**
- explicacion.md -- Business diagnosis with direct quotes from Geronimo Cassoni and Santiago Rodriguez
- flujo.md -- Complete operational flow document from two client meetings
- modulos_backend.md -- Exhaustive module specification with Prisma schemas

**Industry research (MEDIUM confidence):**
- [AltexSoft: How an OTA's Back Office System Works](https://www.altexsoft.com/blog/managing-an-online-travel-agency-how-back-office-system-of-an-ota-works/)
- [AltexSoft: Travel Agency Software Choosing Tools](https://www.altexsoft.com/blog/travel-agency-software-choosing-tools-for-booking-accounting-marketing-and-tour-building/)
- [Trawex: Travel Back Office Systems](https://www.trawex.com/travel-back-office-system.php)
- [FlightsLogic: Travel Agency Back Office Software](https://www.flightslogic.com/travel-agency-back-office-software.php)
- [DMC Quote: Travel Agent Commission Rates 2025](https://dmcquote.com/agent-commission-rates)
- [ResLogic: White Label Engine for Tour Operators](https://www.reslogic.com/blog/white-label-engine-tour-operators)
- [Jotform: 9 Best Travel Agency Management Software 2026](https://www.jotform.com/blog/travel-agency-management-software/)
- [ZipDo: Top 10 Travel Agency Management Software 2026](https://zipdo.co/best/travel-agency-management-software/)
- [Effective Tours: Calculation and Usage of Markups](https://effectivetours.com/docs/wiki/calculation-and-usage-of-mark-ups/)

---
*Feature research for: TravelOz Admin Panel (travel agency back-office)*
*Researched: 2026-03-15*
