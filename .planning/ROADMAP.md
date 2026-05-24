# Roadmap: TravelOz

## Overview

The prototype roadmap (8 phases, glass component library → admin modules) was completed 2026-03-16. Since then the project shifted into **production operations mode**: the app is live, the operator uses it daily for real bookings, and work happens in tight reactive cycles based on what the operator hits.

This file tracks **post-prototype** initiatives rather than the original 8-phase plan (whose history stays in git).

## Production Milestones (completed)

- [x] **v2.0 — Migration to Prod stack** (2026-04-10) — Prisma + PostgreSQL + NextAuth credentials + Railway deploy pipeline
- [x] **Fase 9 — Full CMS coverage** (2026-05-04) — every public page text/image editable from `/backend/web/*`
- [x] **CMS connectivity sweep** (2026-05-18) — 88 SiteSettings keys, public form persistence, lead-to-vendor assignment, admin pages for FAQ/Terms/Clientes/Equipo/Trabajá con nosotros
- [x] **Creador de paquetes fixes** (2026-05-18b) — auto-create draft, publish gate, sync `noches`, autosave en FrontendTab, work-with-us readability
- [x] **PIN auth + audit log + lockout** (2026-05-24) — alternate login flow, append-only audit trail, failed-login lockout
- [x] **Críticos + UX + polish sweep** (2026-05-24) — see PROJECT.md Key Decisions for the list. Big items: merged Publicación tab, reorder persistence, onboarding strip, dropped legacy `INACTIVO`

## Active Initiatives

### Email infra (out of scope until separated track)
- [ ] Choose mailer (Resend / Postmark / SES) and wire SMTP env
- [ ] Email template for new lead → admin
- [ ] Email template for cotización asignada → vendedor
- [ ] Wizard `/backend/notificaciones` real send (today: persists `Notificacion` row only)

### Operational hygiene
- [ ] Schedule `/api/files/gc-orphans` weekly cron on Railway
- [ ] Surface `AuditLog` in `/backend` UI (today: data only, no viewer)
- [ ] Bucket size dashboard tile

### Nice-to-have (no committed dates)
- [ ] Concurrencia: lock simple cuando dos operadores editan el mismo paquete
- [ ] Bulk import desde Excel/Sheets para hoteles y aéreos (parcial: ya hay `import-hotels-from-sheets.ts`)
- [ ] Export de cotizaciones a CSV para CRM externo
- [ ] Versioning/snapshot de paquete antes de publicar cambios

## Completed (prototype era — historical)

The 8-phase prototype roadmap (Foundation/Design System → Layout/Auth → Data Layer → Paquetes → Aéreos+Alojamientos → Supporting Services → Catálogos+Perfiles → Dashboard+Notificaciones+Reportes) was delivered between 2026-03-15 and 2026-03-16 as a hardcoded prototype. Every phase is replaced by its production counterpart now — see git history for the original plans (`.planning/phases/0X-*-PLAN.md`).
