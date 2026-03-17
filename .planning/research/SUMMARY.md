# Research Summary: TravelOz Admin Panel

**Domain:** Travel agency admin panel prototype with glassmorphism design system
**Researched:** 2026-03-15
**Overall confidence:** HIGH

## Executive Summary

The TravelOz admin panel is a client-facing prototype built with Next.js 14 App Router, designed to demonstrate a complete travel agency management system across ~15 CRUD modules. All data lives in React state (useState/useContext) with no database -- the goal is to validate UX flows and visual design in a videocall before building the real backend.

The stack centers on a critical compatibility decision: **Tailwind CSS v3.4.18, not v4.** Tailwind v4's CSS-first configuration model is incompatible with the `tailwind.config.ts` token extension workflow required by the "Liquid Horizon" design system (`design.json`). Multiple GitHub discussions document broken class application when using v4 with Next.js 14. This single decision cascades to `tailwind-merge` (must use v2.6.0, not v3) and reinforces staying on React 18 (bundled with Next.js 14).

The animation layer uses `motion` (the rebranded `framer-motion`), which provides spring physics, `AnimatePresence` page transitions, `layoutId` tab indicators, and stagger effects -- all explicitly required by the design spec. Radix UI's new unified package (`radix-ui` v1.4.3) replaces the old pattern of installing 5+ individual `@radix-ui/react-*` packages, simplifying dependency management.

State management uses React Context + useState. This is deliberately minimal: with ~6-8 entity arrays of hardcoded data and only synchronous CRUD operations, external state management (Zustand, Redux) adds complexity without benefit. Each entity type gets its own context provider to avoid unnecessary re-renders across modules.

## Key Findings

**Stack:** Next.js 14.2.35 + Tailwind v3.4.18 + motion 12.x + Radix unified + CVA + Context API -- all version-pinned for compatibility.
**Architecture:** Module-based App Router structure with shared glass component library, per-entity context providers, and centralized design tokens.
**Critical pitfall:** Tailwind v4 upgrade trap -- default `create-next-app` may install v4 and `tailwind-merge@latest` will be v3 (incompatible with Tailwind v3). Both must be pinned.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation & Design System** - Build glass component library first (Button, Input, Card, Table, Modal, Toast, Badge)
   - Addresses: All modules depend on these primitives
   - Avoids: Inconsistent glass effects across modules, design token drift

2. **Layout Shell** - Sidebar, Topbar, Admin Layout with AnimatePresence, Login page
   - Addresses: Navigation, brand switching, role-based visibility
   - Avoids: Rebuilding layout when adding modules

3. **Data Layer & Types** - TypeScript interfaces, hardcoded data, Context providers
   - Addresses: All CRUD operations need typed data
   - Avoids: Runtime type errors during demo

4. **Core Modules** - Paquetes (most complex), Aereos, Alojamientos
   - Addresses: Primary user flows for the videocall demo
   - Avoids: Starting with simple modules that don't test the component library

5. **Supporting Modules** - Traslados, Seguros, Circuitos, Proveedores, Catalogos
   - Addresses: Feature completeness
   - Avoids: Overbuilding before core is validated

6. **Dashboard, Reports & Notifications** - Charts, stat cards, notification wizard
   - Addresses: Demo "wow factor" and operational flow validation
   - Avoids: Building visualization before data layer is stable

**Phase ordering rationale:**
- Design system MUST come first because every module renders glass components
- Data layer before modules because CRUD operations need typed stores
- Paquetes first among modules because it's the most complex (5 tabs, service assignment, price calculation) and exercises every component type
- Dashboard/Reports last because they aggregate data from all modules

**Research flags for phases:**
- Phase 1 (Design System): Needs careful `backdrop-filter` performance testing -- more than 3 stacked blur layers causes jank
- Phase 4 (Core Modules): Paquetes tab-based form with service assignment + drag reorder is the highest complexity feature
- Phase 6 (Reports): Recharts integration is standard, unlikely to need research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm/official docs. Compatibility matrix tested against known issues. |
| Features | HIGH | Project spec is exhaustive (PROMPT_CLAUDE_CODE.md + 4 reference docs). No ambiguity in requirements. |
| Architecture | HIGH | Standard Next.js 14 App Router patterns. Context API for prototype-scale state is well-documented. |
| Pitfalls | HIGH | Tailwind v3/v4 incompatibility is well-documented. Glass performance concerns are known browser behavior. |

## Gaps to Address

- Exact `design.json` token mapping to `tailwind.config.ts` -- requires reading the full design.json file during implementation
- Recharts customization for glass-styled chart backgrounds -- may need custom theme wrapper
- Drag-and-drop reorder for service assignment and photo grid -- may need `@dnd-kit/core` or similar (not yet in stack)
- Date picker implementation -- Radix does not include a DatePicker primitive. May need a custom build or a lightweight library

---
*Research summary for: TravelOz Admin Panel Prototype*
*Researched: 2026-03-15*
