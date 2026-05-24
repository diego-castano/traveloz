# Project State

## Project Reference

See: [PROJECT.md](PROJECT.md) — updated 2026-05-24

**Core value:** Operators run the agency (paquetes, leads, pricing, public content) from one panel; public site renders from DB; no code touches needed for content changes.

**Current focus:** Closing post-launch gaps. The 8-phase prototype was completed 2026-03-16; since then the app has been migrated to production stack (PostgreSQL + Prisma + NextAuth + S3) and operates the live site. Recent work consolidates UX rough edges identified after the operator started using it for real bookings.

## Current Position

Phase: post-launch maintenance — no formal phases since Fase 9 (CMS coverage, 2026-05-04).

Last activity: **2026-05-24** — sweep of críticos + UX + polish:
- Critical #1+#2: Merged `FrontendTab` + `PublicacionTab` into single Publicación tab with consolidated `publicado`/`estado` semantics
- Critical #3: Fixed reorder of paquete services to persist after F5 (`reorderPaqueteAssignments` transaction)
- Alto #4-7: AutoSaveIndicator real status, confirmación al borrar servicio, `beforeunload` warning vía `useUnsavedWarn`, OnboardingProgress strip
- Polish #8-12: QuickEditHotel con período real, defaults razonables al crear paquete, precios en ServiceSelectorModal, drop `EstadoPaquete.INACTIVO` (backfill → ARCHIVADO)
- Cleanup: Borrado `src/lib/data/*` legacy + reemplazo de `prisma/seed.ts` por wrapper de seed-public.ts; docs actualizadas

## Pending Work

### Sin email infra (decisión usuario — separar)
- Notificación email al admin cuando llega un lead nuevo
- Notificación email al vendedor cuando se le asigna una cotización
- Envío real del wizard de notificaciones (hoy persiste en `Notificacion` pero no manda email)

### Operacional
- Cron de `/api/files/gc-orphans` en Railway scheduler (semanal). Hoy se dispara manual.
- Auditar logs en producción que nada quede usando `INACTIVO` post-migración.

### Doc-debt
- `docs/sesiones/` tiene los últimos 4 logs; el próximo merge debería resumir esta sesión 2026-05-24.

## Performance Metrics

Trail histórico de los 28 plans del prototipo (Fases 1-8) está en el commit history. Desde Fase 9 (2026-05-04) y el sweep de 2026-05-24 trabajamos sin plans formales — directo sobre incidents/feedback del operador.

## Session Continuity

Last session: 2026-05-24 — críticos + UX + polish + cleanup, todo en working tree (sin commit, espera review usuario).
Resume file: este archivo.
