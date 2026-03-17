---
phase: 01-foundation-design-system
plan: 02
subsystem: ui
tags: [cva, motion, glassmorphism, claymorphism, button, input, badge, tailwind, react]

# Dependency graph
requires:
  - phase: 01-foundation-design-system
    plan: 01
    provides: "cn() utility, glassMaterials, springs/interactions animation presets, tailwind.config.ts tokens"
provides:
  - "Button component with 6 CVA variants, clay 3D shadows, sheen hover, Motion press animation"
  - "Input component with glass backdrop-filter, 6 states, focus double-ring, error shake"
  - "Badge component with 9 glass variants, backdrop-filter blur, 3 sizes"
affects: [01-foundation-design-system, 02-layout-shell, 03-circuitos, 04-servicios, 05-cotizacion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CVA + inline clay styles for components needing both Tailwind variants and CSS style props"
    - "MotionSafeButtonProps type to omit conflicting React/Motion drag event handlers"
    - "Glass inline styles with state-based style composition (base + state override)"
    - "microBounce CSS animation for error feedback and new badge indicator"

key-files:
  created:
    - src/components/ui/Button.tsx
    - src/components/ui/Input.tsx
    - src/components/ui/Badge.tsx
  modified: []

key-decisions:
  - "Used Omit type pattern to resolve React.ButtonHTMLAttributes vs Motion onDrag type conflict"
  - "Sheen hover via CSS ::after pseudo-element with animate-sheen-slide (GPU composited, avoids repaint)"
  - "Input focus double-ring uses Tailwind focus: classes for base + inline style override for error/disabled"
  - "Badge uses separate CVA for sizes only, with variant styles as inline objects (glass requires style prop)"

patterns-established:
  - "MotionSafeButtonProps: Omit drag events from React HTML attrs before spreading to motion.button"
  - "Glass state composition: base style object merged with state-specific overrides"
  - "CVA for Tailwind class variants + separate inline styles map for glass/clay properties"

requirements-completed: [DSYS-02, DSYS-03, DSYS-07]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 1 Plan 2: Atomic Primitives Summary

**Clay buttons with 6 CVA variants and sheen hover, glass inputs with 6 states and double-ring focus, glass badges in 9 color variants with backdrop-filter blur**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T10:59:14Z
- **Completed:** 2026-03-16T11:03:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Button renders with clay 3D gradient shadows, sheen hover pseudo-element animation, press scale(0.96), and 6 variants across 4 sizes
- Input renders with glass backdrop-filter blur(8px), focus teal double-ring, error state with red ring and microBounce shake, label and error text with ARIA attributes
- Badge renders in all 9 glass variants (confirmed, pending, draft, active, inactive, removed, new, temporada, promo) with exact design.json colors and 3 sizes

## Task Commits

Each task was committed atomically:

1. **Task 1: Build clay Button component with CVA variants and sheen hover** - `dcb806e` (feat)
2. **Task 2: Build glass Input and Badge components** - `d21aba9` (feat)

## Files Created/Modified

- `src/components/ui/Button.tsx` - Clay button with 6 CVA variants (primary/danger/secondary/ghost/ghostDanger/icon), 4 sizes, Motion animation, sheen hover, loading state, forwardRef
- `src/components/ui/Input.tsx` - Glass input with label, error text, 6 states (default/hover/focus/error/disabled/readOnly), leftIcon/rightIcon, 3 sizes, forwardRef
- `src/components/ui/Badge.tsx` - Glass badge with 9 variants and exact design.json colors, backdrop-filter blur(8px), 3 sizes, microBounce on "new" variant

## Decisions Made

- **MotionSafeButtonProps type pattern:** Omitted `onDrag`, `onDragStart`, `onDragEnd`, `onAnimationStart` from React.ButtonHTMLAttributes to resolve type conflict with motion.button. This is a standard pattern when extending HTML element props for Motion components.
- **Sheen as CSS ::after pseudo-element:** Implemented sheen hover via `after:` Tailwind classes with `animate-sheen-slide` instead of inline JS animation. This is GPU composited (transform-based) and avoids repaint, per Research Pitfall 5.
- **Badge CVA for sizes only:** Badge uses CVA only for size variants, with a separate `variantStyles` record for glass inline styles. This keeps the pattern consistent with how glass properties must be inline (per 01-01 decision).
- **Input state composition:** Glass styles composed by merging base style with state overrides (error, disabled, readOnly) rather than conditional class switching, since backdrop-filter requires inline styles.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed React/Motion onDrag type conflict**
- **Found during:** Task 1 (Button component)
- **Issue:** Extending `React.ButtonHTMLAttributes<HTMLButtonElement>` and spreading `...props` onto `motion.button` caused TypeScript error -- `onDrag` types are incompatible between React HTML events and Motion's PanInfo-based drag events
- **Fix:** Created `MotionSafeButtonProps` type that omits `onDrag`, `onDragStart`, `onDragEnd`, `onAnimationStart` from the HTML attributes before extending
- **Files modified:** src/components/ui/Button.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors for Button.tsx
- **Committed in:** dcb806e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Type-safety fix required for correct compilation. No scope creep.

## Issues Encountered

None -- all three components compiled on first attempt after the type fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Button, Input, and Badge are production-ready atomic primitives
- All three import from Wave 1 outputs (cn, glassMaterials, springs) confirming the token infrastructure works
- Ready for composite components (Table, Modal, Toast, Card) that compose these primitives

## Self-Check: PASSED

- All 3 component files exist
- Both task commits verified (dcb806e, d21aba9)
- SUMMARY.md created

---
*Phase: 01-foundation-design-system*
*Completed: 2026-03-16*
