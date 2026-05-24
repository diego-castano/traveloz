# TravelOz — Production Admin + Public Site

## What This Is

A production Next.js 14 application that powers both the **TravelOz public website** (`/`, `/destinos/*`, `/cotizar`, `/contact`, `/corporativo`, `/faq`, `/terms`, `/work-with-us`) and the **admin backend** (`/backend/*`) used by Lucha + her product team to operate the travel agency end-to-end.

The original 2026-03 prototype (mocked data, no backend) has been replaced by a real stack: **PostgreSQL on Railway, Prisma ORM, NextAuth v5 (credentials + PIN), AWS S3 for file uploads, server actions for every mutation, and CMS-driven content** for the public pages.

## Core Value

Operators run packages, leads, prices and public content from a single panel; the public site renders everything from the database; nothing about the public experience requires touching code.

## Requirements

### Validated (in production)

- ✅ Prisma schema with 27+ models, soft-delete, lifecycle states, sequential IDs
- ✅ NextAuth v5 credentials (email+password) + PIN providers
- ✅ Role-based access (ADMIN / VENDEDOR / MARKETING) enforced server-side
- ✅ Full CRUD for paquetes, aéreos, alojamientos, traslados, seguros, circuitos, proveedores, catálogos, usuarios
- ✅ Per-paquete itinerary editor (PaqueteDestino) with auto-sync `noches`
- ✅ Per-paquete opciones hoteleras (OpcionHotelera × OpcionHotel) with live price propagation
- ✅ 5 public-form submissions → admin `/backend/leads` inbox (cotizaciones, mensajes, corporativo, postulaciones, newsletter)
- ✅ Lead assignment to vendedor for 4/4 lead kinds
- ✅ CMS editing (FAQ, Terms, Clientes, Equipo, Testimonios, Categorías, SiteSettings) → public pages
- ✅ S3 uploads with image pipeline + GC orphan endpoint
- ✅ Notificaciones wizard (history persisted; email send is deferred)
- ✅ Reportes con recharts
- ✅ Dashboard (Admin + Vendedor variants) con métricas, alertas, search global
- ✅ Single tab "Publicación" consolida lifecycle (`estado`) + visibilidad pública (`publicado`)
- ✅ Onboarding strip en detalle de paquete con progreso visible y "siguiente paso"
- ✅ Reorder de servicios persiste tras F5 (bulk transaction sobre `orden`)
- ✅ Autosave + `beforeunload` warning en todos los tabs editables
- ✅ Confirmación al eliminar servicio asignado
- ✅ QuickEditHotelModal con input de período (no anual hard-coded)

### Active

- [ ] Notificaciones por email (signup admin + nueva-lead + envío masivo del wizard) — pendiente infra de mailer
- [ ] Cron de GC `/api/files/gc-orphans` en Railway scheduler — hoy se dispara manual
- [ ] Auditoría de qué endpoint sigue usando legacy `INACTIVO` post-migración (debería ser 0)

### Out of Scope (decided con cliente)

- Concurrencia/locking entre operadores editando el mismo paquete (equipo pequeño)
- Branding multi-tenant — single-tenant desde Fase 7

## Constraints

- **Stack**: Next.js 14 App Router + TypeScript + Prisma 6 + PostgreSQL + Tailwind 3 + Motion (Framer) + NextAuth v5
- **Infra**: Railway (DB + app + bucket), PgBouncer transaction-mode pooling, build runs `prisma migrate deploy`
- **Lenguaje UI**: Español rioplatense, USD throughout
- **Diseño**: Liquid Horizon v3 (glass + clay + spring)
- **Auth**: NextAuth credentials OR PIN. ADMIN bypass + isProtected (diegothx@me.com)
- **No skip-hooks en commits**: pre-commit hooks deben pasar

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `publicado` (boolean) = visibilidad pública, `estado` (enum) = pipeline interno | Operadores tenían dos toggles que se contradecían; un único Tab "Publicación" auto-syncea ambos | ✅ Aplicado 2026-05-24 |
| Borrar enum legacy `EstadoPaquete.INACTIVO` (backfill → ARCHIVADO) | Confundía el flujo BORRADOR→EN_REVISION→ACTIVO→ARCHIVADO; no agregaba semántica que ARCHIVADO+publicado=false ya no cubriera | ✅ Migración 20260524140000_drop_estado_inactivo |
| Reorder de servicios escribe `orden` en cada junction row (transaction) | El flat array `paquete.ordenServicios` no round-trippeaba; tras F5 se perdía | ✅ Aplicado 2026-05-24 |
| OnboardingProgress visible en cabecera del detalle | Operadores nuevos no sabían por dónde empezar; 7 tabs sin orientación | ✅ Aplicado 2026-05-24 |
| Borrar `src/lib/data/*.ts` legacy + reemplazar prisma/seed.ts por wrapper de seed-public.ts | El seed legacy re-inyectaba 15+ paquetes mock en cada deploy | ✅ Aplicado 2026-05-24 |
| `beforeunload` warning compartido via `useUnsavedWarn(status)` | Cada tab con autosave necesitaba la misma protección; centralizar evita olvidos | ✅ Aplicado 2026-05-24 |

---
*Last updated: 2026-05-24 — post crítico/UX/polish sweep*
