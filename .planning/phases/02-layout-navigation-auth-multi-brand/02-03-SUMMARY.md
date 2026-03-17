---
phase: 02-layout-navigation-auth-multi-brand
plan: 03
subsystem: ui
tags: [topbar, breadcrumb, brand-selector, page-header, page-transitions, radix-dropdown, frozen-router, glassmorphism, motion]

# Dependency graph
requires:
  - phase: 01-foundation-design-system
    provides: glass.ts, animations.ts, cn.ts, Breadcrumb, Badge, Avatar components
  - phase: 02-layout-navigation-auth-multi-brand (plan 01)
    provides: AuthProvider (useAuth), BrandProvider (useBrand), auth.ts, brands.ts
provides:
  - Topbar component with frosted glass, breadcrumb, brand selector dropdown, user menu, Solo lectura badge
  - PageHeader component with display font title, subtitle, and action slot
  - PageTransitionWrapper with FrozenRouter pattern for AnimatePresence page transitions
affects: [02-04-admin-layout, 02-05-login-page, phase-03-sidebar, phase-04-modules]

# Tech tracking
tech-stack:
  added: []
  patterns: [FrozenRouter for App Router page transitions, Radix DropdownMenu with forceMount + AnimatePresence, breadcrumb generation from pathname]

key-files:
  created:
    - src/components/layout/Topbar.tsx
    - src/components/layout/PageHeader.tsx
    - src/components/layout/PageTransitionWrapper.tsx
  modified: []

key-decisions:
  - "Topbar brand selector uses Radix DropdownMenu with forceMount + AnimatePresence for animated open/close"
  - "Breadcrumb generated from pathname with Spanish segment label mapping"
  - "FrozenRouter uses LayoutRouterContext from next/dist/shared/lib/app-router-context.shared-runtime (internal API, stable in Next.js 14.x)"
  - "PageTransitionWrapper uses AnimatePresence mode=wait with design.json pageTransition values"

patterns-established:
  - "FrozenRouter: freeze LayoutRouterContext during exit animations for AnimatePresence in App Router"
  - "Radix DropdownMenu + forceMount + AnimatePresence: compound pattern for animated dropdowns"
  - "Breadcrumb generation from pathname: segmentLabels map for Spanish labels"

requirements-completed: [LAYO-04, LAYO-05, LAYO-08, BRND-01, AUTH-06]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 2 Plan 3: Topbar, PageHeader & PageTransitionWrapper Summary

**Frosted glass topbar with Radix DropdownMenu brand selector, Solo lectura badge for VENDEDOR, PageHeader with Playfair Display 26px, and FrozenRouter-based page transitions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T13:33:35Z
- **Completed:** 2026-03-16T13:36:44Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Topbar renders at 54px with frosted glass material, blur(24px), and sheen-slide bottom accent line
- Brand selector dropdown switches between TravelOz and DestinoIcono via useBrand().switchBrand with animated open/close
- Solo lectura Badge renders conditionally when useAuth().isVendedor is true (AUTH-06)
- User menu dropdown with avatar, name display, and logout action
- Breadcrumb auto-generates from pathname with Spanish labels for all module slugs
- PageHeader standardizes page titles with Playfair Display 26px, subtitle, and action slot
- PageTransitionWrapper enables smooth enter/exit page transitions using FrozenRouter + AnimatePresence

## Task Commits

Each task was committed atomically:

1. **Task 1: Topbar with frosted glass, breadcrumb, brand selector, and user menu** - `9e5b99f` (feat)
2. **Task 2: PageHeader and PageTransitionWrapper** - `3c34b39` (feat)

## Files Created/Modified

- `src/components/layout/Topbar.tsx` - 221 lines: Sticky frosted glass topbar with breadcrumb, brand selector (Radix DropdownMenu), Solo lectura badge, user menu, sheen accent line
- `src/components/layout/PageHeader.tsx` - 42 lines: Display font title (26px Playfair Display), subtitle, action slot with fadeSlideIn animation
- `src/components/layout/PageTransitionWrapper.tsx` - 87 lines: FrozenRouter + AnimatePresence wrapper for page transitions (opacity/y/blur enter, opacity/y exit)

## Decisions Made

- **Radix DropdownMenu with forceMount + AnimatePresence:** Using forceMount on DropdownMenu.Content allows AnimatePresence to control mount/unmount, enabling smooth dropdown open/close animations with the interactions.dropdownOpen preset
- **Breadcrumb from pathname:** generateBreadcrumbs helper maps pathname segments to Spanish labels via segmentLabels record, with Dashboard always as the root
- **FrozenRouter internal import:** LayoutRouterContext imported from next/dist/shared/lib/app-router-context.shared-runtime -- documented as non-public API stable in Next.js 14.x, isolated to single file for future updates
- **PageTransition values from design.json:** initial opacity:0/y:12/blur(4px), exit opacity:0/y:-8, duration 0.3s -- exact match to animations.interactions.pageTransition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Topbar, PageHeader, and PageTransitionWrapper ready for composition in admin layout (02-04)
- Brand selector functional -- switches brand context for sidebar gradient and login background
- Page transitions will activate once PageTransitionWrapper wraps children in (admin)/layout.tsx
- All three components consume existing providers (AuthProvider, BrandProvider) from 02-01

## Self-Check: PASSED

- [x] src/components/layout/Topbar.tsx -- FOUND (221 lines, min 80)
- [x] src/components/layout/PageHeader.tsx -- FOUND (42 lines, min 20)
- [x] src/components/layout/PageTransitionWrapper.tsx -- FOUND (87 lines, min 40)
- [x] Commit 9e5b99f -- FOUND (Task 1: Topbar)
- [x] Commit 3c34b39 -- FOUND (Task 2: PageHeader + PageTransitionWrapper)
- [x] TypeScript check: zero errors

---
*Phase: 02-layout-navigation-auth-multi-brand*
*Completed: 2026-03-16*
