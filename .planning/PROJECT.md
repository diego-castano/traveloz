# TravelOz Admin Panel — Prototype

## What This Is

A fully functional Next.js 14 prototype of the TravelOz/DestinoIcono admin panel — a travel agency backend for managing travel packages, flights, hotels, transfers, insurance, circuits, and vendor notifications. This prototype uses hardcoded data (no database) and will be presented to the client (Geronimo Cassoni and Santiago Rodriguez) in a video call to validate UX, flows, and visual design before building the production backend.

## Core Value

The client must experience a premium, Apple-level admin panel where they can navigate all modules, perform CRUD operations on travel packages and services, see real-time price calculations (Neto → Markup → Venta), and feel that this is the product they've been waiting to replace their legacy EvangelioZ system.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-brand system (TravelOz / DestinoIcono) with brand selector in topbar
- [ ] Full CRUD for Paquetes (packages) with tabs: Datos, Servicios, Precios, Fotos, Publicacion
- [ ] Service assignment to packages (aereos, alojamientos, traslados, seguros)
- [ ] Real-time price calculation: Neto (auto-sum) → Markup (editable %) → Venta (auto-calc)
- [ ] Full CRUD for Aereos with price-per-period table
- [ ] Full CRUD for Alojamientos with price-per-period, regime, and photos
- [ ] Inline-editable Traslados table (no separate form)
- [ ] Full CRUD for Seguros
- [ ] Circuitos with day-by-day itinerary editor
- [ ] Proveedores CRUD
- [ ] Catalogos module with tabs (temporadas, tipos, etiquetas, paises, regimenes)
- [ ] Perfiles (user management with roles: ADMIN, VENDEDOR)
- [ ] Notificaciones wizard (select tag → filter packages → preview email → send)
- [ ] Reportes with charts and stats
- [ ] Dashboard with stat cards, recent activity, quick access
- [ ] Login page with liquid glass design
- [ ] Vendedor read-only view (no edit buttons, no neto/markup, only Paquetes module)
- [ ] Glassmorphism + Liquid Glass + Claymorphism design system ("Liquid Horizon" v3)
- [ ] Framer Motion animations (page transitions, stagger, spring, modal entrances)
- [ ] Sidebar violet→black gradient with glow effects
- [ ] Glass tables with dark header, row hover gradient, stagger animation
- [ ] Search and filter across all modules (instant search)
- [ ] Clone and soft-delete for all entities
- [ ] All hardcoded data realistic (based on real TravelOz packages, Uruguayan market)
- [ ] All UI in Spanish

### Out of Scope

- Database / API / backend persistence — prototype only, all data in React state
- localStorage — no persistence between sessions
- Real email sending — notifications are simulated
- Image upload — use Unsplash placeholder URLs
- Separate CSS files — all Tailwind + inline styles
- Real authentication — login sets role/brand in state only

## Context

TravelOz is a Uruguayan travel agency (Montevideo) with 35+ employees, 48K Instagram followers, operating two brands (TravelOz + DestinoIcono). They currently use a legacy system called EvangelioZ + Excel which has major pain points: disconnected services from packages, too many clicks for simple operations, no price propagation, no reporting, manual vendor notifications, and duplicate effort across brands.

This prototype is the first milestone — validate the UX and visual design with the client before connecting the real backend (Next.js 14 + PostgreSQL + Prisma + Railway). The design system is "Liquid Horizon" v3 with glassmorphism, liquid glass, claymorphism, and Apple-like animations.

Key stakeholders:
- Geronimo Cassoni — product/operations lead
- Santiago Rodriguez — commercial/strategy lead
- "Lucha" — head of product department (daily user)
- Sales team — read-only consumers

## Constraints

- **Tech Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion + Lucide React + Radix UI + CVA + date-fns + recharts
- **No Backend**: 100% client-side prototype with useState/useContext
- **Timeline**: Must be ready for client video call presentation
- **Design**: Must follow design.json v3 "Liquid Horizon" tokens exactly
- **Language**: All UI in Spanish with realistic Uruguayan travel data
- **Currency**: USD throughout
- **Visual Priority**: Must look SPECTACULAR — Apple-level premium feel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hardcoded data instead of DB | Prototype for client validation before investing in backend | — Pending |
| React state (useState/useContext) for CRUD | Simplest approach for in-memory prototype | — Pending |
| Next.js 14 App Router | Same stack as production backend, smooth transition later | — Pending |
| Glassmorphism + Liquid Glass design | Client explicitly asked for premium, beautiful UI | — Pending |
| All modules functional (no "Coming soon") | Client needs to see and interact with everything in the video call | — Pending |

---
*Last updated: 2026-03-15 after initialization*
