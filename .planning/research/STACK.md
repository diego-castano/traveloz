# Stack Research

**Domain:** Next.js 14 Admin Panel Prototype with Glassmorphism Design System
**Project:** TravelOz Backend Admin
**Researched:** 2026-03-15
**Confidence:** HIGH

## Decision Context

This is a **client-facing prototype** (no database, no API) meant to be shown in a videocall. Every technology choice optimizes for: (1) visual polish and animation quality, (2) developer velocity for ~15 CRUD modules, (3) stability over cutting-edge, since we cannot debug framework issues during a demo.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 14.2.35 | App Router framework | Latest security-patched v14. The project spec mandates Next.js 14 specifically. v14 is EOL (Oct 2025) but perfectly stable for a prototype. Using v15/v16 would require React 19 migration and risk breaking animation/UI library compatibility. **Confidence: HIGH** |
| React | 18.3.x | UI library | Bundled with Next.js 14. Do NOT upgrade to React 19 -- it requires Next.js 15+ and introduces breaking changes to refs/context that would affect Radix UI and Motion. **Confidence: HIGH** |
| TypeScript | 5.5+ | Type safety | Bundled with Next.js 14 `create-next-app`. Strong typing for 15+ entity interfaces is essential for avoiding runtime bugs during the demo. **Confidence: HIGH** |
| Tailwind CSS | 3.4.18 | Utility-first styling | **Use v3, NOT v4.** Tailwind v4 has documented compatibility issues with Next.js 14 (broken class application, PostCSS config changes, CSS-first config incompatible with `tailwind.config.ts` token extension). The project requires heavy `tailwind.config.ts` extension with design tokens from `design.json` -- this workflow is native to v3 and deprecated in v4. Next.js officially documents v3 setup for App Router. **Confidence: HIGH** |

### Animation & Interaction

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| motion | 12.36.0 | Animation library | The `framer-motion` package has been rebranded to `motion`. Install `motion` and import from `motion/react`. Same API, same team, actively maintained (released 3 days ago). Provides spring physics, `AnimatePresence`, `layoutId`, stagger -- all required by the design spec. **Confidence: HIGH** |

### UI Primitives

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| radix-ui | 1.4.3 | Accessible headless primitives | Use the **unified `radix-ui` package** (released Feb 2026) instead of individual `@radix-ui/react-*` packages. Tree-shakeable, prevents version conflicts, cleaner `package.json`. Provides Dialog, Select, DropdownMenu, Tabs, Tooltip -- all specified in the project requirements. **Confidence: HIGH** |

### Styling Utilities

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| class-variance-authority | 0.7.1 | Component variant system | Standard for building variant-based components with Tailwind. Used for Button (primary/danger/secondary/ghost), Badge (9 variants), Card (glass/liquid/stat), Input states. **Confidence: HIGH** |
| clsx | 2.1.1 | Conditional class names | 239B, zero-dependency utility. Combined with tailwind-merge in `cn()` helper. **Confidence: HIGH** |
| tailwind-merge | 2.6.0 | Tailwind class conflict resolution | **Use v2.6.0, NOT v3.** tailwind-merge v3 drops Tailwind v3 support in favor of v4. Since we use Tailwind v3.4, we must use tailwind-merge v2.6.0. **Confidence: HIGH** |

### Icons

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| lucide-react | 0.577.0 | Icon library | 1500+ icons, tree-shakeable, consistent stroke width. Specified in project requirements. Lighter than heroicons, more comprehensive than feather-icons. **Confidence: HIGH** |

### Data & Utilities

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| date-fns | 4.1.0 | Date formatting/manipulation | Tree-shakeable, functional API. Used for `validezDesde/Hasta` fields, season date ranges, notification timestamps. Format in Spanish locale (`es`). **Confidence: HIGH** |
| recharts | 3.8.0 | Charts/graphs | React-native SVG charting. Used for Reports module (bar charts by destination, pie charts). Declarative component API fits React patterns. No D3 configuration needed. **Confidence: HIGH** |

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React Context + useState | (built-in) | In-memory CRUD state | **Use Context API, NOT Zustand/Redux.** Rationale: (1) All data is hardcoded in memory -- no async, no caching, no persistence. (2) A prototype with ~6-8 entity arrays does not need external state management. (3) Zero added dependencies. (4) Context re-renders are acceptable because we have no database queries to optimize. Wrap each entity store in its own context to avoid unnecessary re-renders across modules. **Confidence: HIGH** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| postcss | PostCSS processor for Tailwind v3 | Required peer dependency. Install with `postcss autoprefixer`. |
| eslint + eslint-config-next | Linting | Bundled with `create-next-app`. Keep defaults. |
| prettier + prettier-plugin-tailwindcss | Code formatting | Auto-sorts Tailwind classes. Critical for consistency across 15+ modules. |

---

## Installation

```bash
# Initialize project
npx create-next-app@14 traveloz-admin --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core UI + Animation
npm install motion radix-ui recharts

# Styling utilities
npm install class-variance-authority clsx tailwind-merge@2.6.0

# Icons + Data
npm install lucide-react date-fns

# Dev dependencies (Tailwind v3 pinned)
npm install -D tailwindcss@3.4.18 postcss autoprefixer
npm install -D prettier prettier-plugin-tailwindcss
```

**Important:** `create-next-app@14` will scaffold with Tailwind v3 by default. If it installs v4, force downgrade with `npm install -D tailwindcss@3.4.18`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Tailwind CSS v3.4.18 | Tailwind CSS v4.2.1 | When using Next.js 15/16 AND you don't need `tailwind.config.ts` token extension. v4's CSS-first config is elegant but incompatible with this project's design token workflow. |
| React Context (built-in) | Zustand 5.x | When prototyping grows into production with async data, cross-tab state, or middleware needs. For this hardcoded prototype, Context is sufficient and simpler. |
| motion (unified package) | framer-motion 12.x | Never -- `framer-motion` is a compatibility alias that re-exports `motion`. Use `motion` directly. Both are maintained by the same team. |
| radix-ui (unified) | @radix-ui/react-dialog + individual packages | When targeting older build tools that don't tree-shake well. The unified package is recommended by Radix themselves as of 2026. |
| tailwind-merge v2.6.0 | tailwind-merge v3.5.0 | Only when using Tailwind CSS v4. v3 explicitly dropped v3 support. |
| CVA (class-variance-authority) | tailwind-variants | When using Tailwind v4 (tailwind-variants has v4 migration support). CVA is the established standard with shadcn/ui and works perfectly with v3. |
| recharts 3.8.0 | visx, nivo, chart.js | `visx` for custom D3-like control (overkill for admin charts). `nivo` for more chart types but heavier. `chart.js` for canvas-based (loses SVG + React integration). Recharts is the sweet spot for declarative React charts. |
| date-fns 4.1.0 | dayjs, luxon | `dayjs` is smaller but less tree-shakeable. `luxon` is heavier with timezone support we don't need. date-fns has the best TypeScript support and tree-shaking. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Tailwind CSS v4 | Documented class application failures with Next.js 14. CSS-first config breaks `tailwind.config.ts` token extension pattern required by `design.json`. | Tailwind CSS v3.4.18 |
| tailwind-merge v3 | Drops Tailwind v3 support entirely. Will silently miscategorize v3 classes. | tailwind-merge v2.6.0 |
| framer-motion (package name) | Deprecated package name. Still works but `motion` is the canonical package going forward. | `motion` package, import from `motion/react` |
| @radix-ui/react-dialog etc. (individual) | Clutters package.json with 5+ entries. Risk of version mismatches between primitives. | Unified `radix-ui` package |
| React 19 | Requires Next.js 15+. Breaking changes to refs, context, and `forwardRef` would affect Radix UI compatibility with Next.js 14. | React 18.3.x (bundled with Next.js 14) |
| Next.js 15/16 | Project spec mandates Next.js 14. Upgrading mid-prototype introduces unnecessary risk with breaking changes to caching behavior, route handlers, and React version requirements. | Next.js 14.2.35 |
| Redux / Redux Toolkit | Massive boilerplate for a prototype with hardcoded data. No async actions, no middleware, no devtools needed. | React Context + useState |
| Zustand | Adds a dependency for something useState/useContext handles in this scope. The ~6 entity arrays with synchronous CRUD don't justify the abstraction. | React Context + useState |
| localStorage / IndexedDB | Project spec explicitly says NO localStorage. Data lives only in React state and resets on refresh (expected for prototype). | In-memory useState |
| Separate CSS files | Project spec says NO separate CSS files. Everything uses Tailwind utilities + inline styles for glass effects with `backdrop-filter`. | Tailwind classes + `style={{}}` for `backdropFilter`, `background: rgba()` |
| shadcn/ui | While shadcn/ui uses Radix + CVA + Tailwind (same stack), it prescribes its own design language. This project has a custom "Liquid Horizon" design system that would clash with shadcn defaults. Build custom components using the same primitives instead. | Custom components with Radix + CVA + Tailwind |
| MUI / Chakra UI / Ant Design | Opinionated styling systems that fight against custom glassmorphism design. Cannot easily achieve the `backdrop-filter: blur(40px) saturate(220%)` effects without overriding everything. | Headless Radix primitives + custom Tailwind styling |

---

## Stack Patterns by Variant

**For glassmorphism/liquid glass surfaces:**
- Use inline `style={{}}` for `backdropFilter`, `background: rgba()`, and `WebkitBackdropFilter` (Safari prefix)
- Use Tailwind for everything else (layout, spacing, typography, responsive)
- Define glass material tokens in `tailwind.config.ts` `extend.backgroundImage` and `extend.backdropBlur` where possible
- Performance: limit stacked `backdrop-filter` elements. More than 3-4 layered blur elements causes janky scroll on mobile Safari

**For component variants (Button, Badge, Card):**
- Use CVA for variant definitions with Tailwind classes
- Use the `cn()` helper (`clsx` + `tailwind-merge`) for conditional class merging
- Keep glass-specific inline styles in the component, not in CVA variants (CVA handles classes, not style objects)

**For animations:**
- Import from `motion/react` (NOT `framer-motion`)
- Use `AnimatePresence` with `mode="wait"` for page transitions in the admin layout
- Use `layoutId` for tab indicators (violet-to-teal gradient)
- Use `stagger` with `delayChildren: 0.08` + `staggerChildren: 0.04` for table row entrance
- Use `spring` type with `damping: 20, stiffness: 300` for UI interactions (toggles, modals)

**For Radix UI primitives:**
- Import from `radix-ui` unified package: `import { Dialog } from "radix-ui"`
- Style with Tailwind + CVA. Radix provides behavior + accessibility, you provide all visual styling
- Use `data-[state=open]` and `data-[state=closed]` Tailwind selectors for animation triggers

---

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@14.2.35 | react@18.3.x, react-dom@18.3.x | Bundled. Do NOT install React separately. |
| next@14.2.35 | tailwindcss@3.4.18 | Officially documented. Uses `tailwind.config.ts` + PostCSS. |
| tailwindcss@3.4.18 | tailwind-merge@2.6.0 | v2.6 is the last version supporting Tailwind v3 classes. |
| tailwindcss@3.4.18 | postcss@8.x, autoprefixer@10.x | Required peer dependencies for Tailwind v3. |
| motion@12.36.0 | react@18.3.x | Full support. motion/react works with React 18+. |
| radix-ui@1.4.3 | react@18.3.x | Unified package supports React 18+. |
| recharts@3.8.0 | react@18.3.x | Recharts 3.x supports React 18+. |
| class-variance-authority@0.7.1 | tailwindcss@3.4.18 | Framework-agnostic, works with any Tailwind version. |
| date-fns@4.1.0 | (standalone) | No React/framework dependency. Pure utility. |
| lucide-react@0.577.0 | react@18.3.x | Peer dependency on React 18+. |

---

## Critical Version Pins

These versions MUST be pinned exactly to avoid compatibility issues:

```json
{
  "dependencies": {
    "next": "14.2.35",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "motion": "^12.36.0",
    "radix-ui": "^1.4.3",
    "recharts": "^3.8.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "~2.6.0",
    "lucide-react": "^0.577.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "tailwindcss": "~3.4.18",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^5.5.0",
    "prettier": "^3.0.0",
    "prettier-plugin-tailwindcss": "^0.6.0"
  }
}
```

**Note:** Use `~` (patch-only) for `tailwindcss` and `tailwind-merge` to prevent accidental major version upgrades that would break compatibility.

---

## Glassmorphism-Specific Stack Notes

### Tailwind v3 Configuration for Glass Effects

The `design.json` tokens require extending `tailwind.config.ts` with custom values:

```typescript
// tailwind.config.ts - key extensions for glassmorphism
module.exports = {
  theme: {
    extend: {
      backdropBlur: {
        'glass': '20px',
        'glass-heavy': '30px',
        'modal': '40px',
      },
      backdropSaturate: {
        'glass': '180%',
        'liquid': '200%',
        'modal': '220%',
      },
      // ... more tokens from design.json
    }
  }
}
```

This `extend` pattern is Tailwind v3's strength. Tailwind v4's CSS-first `@theme` approach would require rewriting all token definitions in CSS variables -- unnecessary work for a prototype.

### Browser Support for backdrop-filter

`backdrop-filter` has 96%+ global browser support as of 2026. Safari requires `-webkit-backdrop-filter` prefix. Tailwind v3's `backdrop-blur-*` utilities automatically handle this via autoprefixer.

### Performance Guardrails

- Limit to 3 stacked `backdrop-filter` layers in any viewport
- Use `will-change: transform` on animated glass elements
- Prefer `opacity` + `transform` animations (GPU-composited) over `backdrop-filter` transitions
- Do NOT animate `backdrop-filter` values directly -- it triggers layout recalc

---

## Sources

- [Next.js 14.2.35 Security Update](https://nextjs.org/blog/security-update-2025-12-11) -- version verification (HIGH confidence)
- [Next.js Tailwind v3 Guide](https://nextjs.org/docs/app/guides/tailwind-v3-css) -- official v3 setup for App Router (HIGH confidence)
- [Tailwind CSS v4 Compatibility](https://tailwindcss.com/docs/compatibility) -- v4 browser requirements and incompatibilities (HIGH confidence)
- [Tailwind v4 + Next.js 14 Issues](https://github.com/tailwindlabs/tailwindcss/discussions/17029) -- community-reported class application failures (MEDIUM confidence)
- [Motion Upgrade Guide](https://motion.dev/docs/react-upgrade-guide) -- framer-motion to motion migration (HIGH confidence)
- [Motion npm](https://www.npmjs.com/package/motion) -- v12.36.0 verification (HIGH confidence)
- [Radix UI Unified Package](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui) -- Feb 2026 unified package announcement (HIGH confidence)
- [radix-ui npm](https://www.npmjs.com/package/radix-ui) -- v1.4.3 verification (HIGH confidence)
- [tailwind-merge npm](https://www.npmjs.com/package/tailwind-merge) -- v3 drops Tailwind v3 support (HIGH confidence)
- [class-variance-authority](https://cva.style/docs) -- v0.7.1 documentation (HIGH confidence)
- [recharts npm](https://www.npmjs.com/package/recharts) -- v3.8.0 verification (HIGH confidence)
- [date-fns npm](https://www.npmjs.com/package/date-fns) -- v4.1.0 verification (HIGH confidence)
- [lucide-react npm](https://www.npmjs.com/package/lucide-react) -- v0.577.0 verification (HIGH confidence)
- [clsx npm](https://www.npmjs.com/package/clsx) -- v2.1.1 verification (HIGH confidence)
- [React State Management 2025](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) -- Context vs Zustand comparison (MEDIUM confidence)
- [Glassmorphism with Tailwind CSS](https://www.epicweb.dev/tips/creating-glassmorphism-effects-with-tailwind-css) -- best practices (MEDIUM confidence)

---
*Stack research for: TravelOz Admin Panel Prototype (Next.js 14 + Glassmorphism)*
*Researched: 2026-03-15*
