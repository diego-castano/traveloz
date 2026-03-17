# Pitfalls Research

**Domain:** Next.js 14 admin panel prototype with glassmorphism design, in-memory state, 15+ modules, Framer Motion animations, presented live via video call
**Researched:** 2026-03-15
**Confidence:** HIGH (verified across official docs, GitHub issues, and multiple community sources)

---

## Critical Pitfalls

### Pitfall 1: Backdrop-Filter Stacking Context Hell

**What goes wrong:**
Every element with `backdrop-filter: blur()` creates a new CSS stacking context. In a glassmorphism-heavy UI where cards, modals, dropdowns, toasts, the topbar, and the sidebar all use `backdrop-filter`, z-index stops working as expected. A modal opens but renders **behind** the sidebar. A dropdown inside a glass card cannot escape its parent's stacking context. A toast appears behind a modal overlay. During the live demo, the presenter clicks "Agregar servicio" and the ServiceAssigner modal is invisible -- trapped behind the sidebar's stacking context.

**Why it happens:**
`backdrop-filter`, `transform`, `opacity < 1`, and `filter` all create stacking contexts. This project has ALL of these on virtually every surface. Developers test each component in isolation (it works), but the composite layout creates nested stacking contexts that fight each other. The spec says child z-index values only apply **within their parent stacking context** -- so `z-index: 9999` on a modal inside a glass card is meaningless if the card itself has a lower z-index than the sidebar.

**How to avoid:**
1. Render all modals, dropdowns, and toasts via **Radix Portals** that mount at `document.body`, outside any stacking context.
2. Establish a z-index scale early and enforce it: `--z-dropdown: 100`, `--z-sticky: 200`, `--z-modal-overlay: 300`, `--z-modal: 310`, `--z-toast: 400`, `--z-tooltip: 500`.
3. Never apply `backdrop-filter` to a container that has children needing higher z-index than siblings outside that container.
4. Test the **composite layout** (sidebar + topbar + content + modal + toast all visible simultaneously) before building individual modules.

**Warning signs:**
- A modal appears but is not clickable (it is behind an invisible overlay)
- Dropdowns render but are clipped or hidden behind adjacent cards
- Hover effects on glass cards stop working when a toast is visible
- During development, you find yourself adding `z-index: 99999` -- this means the stacking context architecture is broken

**Phase to address:** Phase 1 (Layout & Design System). The z-index architecture and portal strategy must be defined before any module is built.

---

### Pitfall 2: Framer Motion + Backdrop-Filter = Frame Drops During Demo

**What goes wrong:**
The design calls for animations on **everything**: page transitions (opacity + blur + y), stagger animations on table rows (40ms delay per row), spring animations on modals, breathe animations on cards, liquidFloat on stat cards, sidebarGlow pulsing, sheen hover effects on buttons, bounce on checkboxes, shake on error, animated counters on stats. Each of these triggers composite layer creation. Combined with `backdrop-filter: blur(20-40px)` on multiple surfaces, the GPU cannot keep up. The result: janky 15-20fps animations during the live demo, especially on the dashboard (4 liquid stat cards + activity feed + animated counters) and the Paquetes list (15+ rows staggering in with glass table hover effects).

**Why it happens:**
`backdrop-filter` is computationally expensive -- the browser must sample and blur all pixels behind the element on every frame. When Framer Motion animates `opacity`, `scale`, or `y` on an element with `backdrop-filter`, the browser must recalculate the blur effect every single frame. Multiply this by 15 staggering table rows, 4 floating stat cards, a pulsing sidebar glow, and a breathing card animation running simultaneously, and even a modern MacBook struggles. Firefox is particularly bad -- documented in [Framer Motion issue #441](https://github.com/framer/motion/issues/441).

**How to avoid:**
1. **Never animate elements that have `backdrop-filter`**. Instead, wrap the glass surface in a static container and animate a **sibling or parent** that only transforms `opacity`/`transform` (GPU-accelerated, cheap).
2. Limit simultaneous backdrop-filter elements to **3-4 per viewport**. The sidebar and topbar are always visible (2 already). That leaves 1-2 more for the active content area.
3. For table row stagger animations, use `opacity` + `translateY` only -- no blur transition on entry. Apply the glass surface style **after** the stagger animation completes.
4. Reduce blur values: 8-12px for cards (not 20px), 16px for modals (not 40px), 20px for the sidebar (justified since it is static).
5. Add `transform: translate3d(0,0,0)` to glass elements to force GPU layer promotion, preventing CPU-bound repaints.
6. Use `will-change: transform` sparingly on elements that actually animate.
7. **Test on the presenter's actual device and browser** before the demo.

**Warning signs:**
- Chrome DevTools Performance tab shows frame times > 16ms (below 60fps)
- "Jank" visible when scrolling a glass table while the sidebar glow pulses
- The dashboard page takes > 500ms to finish all entrance animations
- CPU fan spins up when the admin panel is open

**Phase to address:** Phase 1 (Design System components) and Phase 2 (Module pages). The animation strategy must be validated on the first 2-3 pages before applying to all 15+.

---

### Pitfall 3: Page Transitions Do Not Work With Next.js App Router

**What goes wrong:**
The spec calls for page transitions: `initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}` with AnimatePresence. Developers wrap the layout's `{children}` in `<AnimatePresence>`, expect smooth crossfade between routes, and get: nothing. Or worse -- double-rendered content, flickering, or exit animations that never play. The page either pops in instantly or flashes white between navigations during the demo.

**Why it happens:**
Next.js App Router does not expose a hook or mechanism to delay unmounting of the previous page's component tree. `AnimatePresence` requires the exiting component to remain mounted during its exit animation, but Next.js immediately replaces `{children}` in the layout on route change. There is no official API for this. Community workarounds exist (FrozenRouter pattern, intercepting internal router state) but they rely on **unexposed Next.js internals** that can break with any update. The `template.tsx` file re-renders on each navigation but does not solve the exit animation problem -- it only handles enter animations.

**How to avoid:**
1. **Abandon crossfade page transitions.** Use **enter-only animations** via `template.tsx` -- each page fades/slides in, but the previous page disappears instantly. This is reliable and looks professional.
2. Alternatively, use `next-view-transitions` (built on the View Transitions API) for simple crossfades, but only if the demo browser supports it (Chrome yes, Safari partial, Firefox no).
3. If you must have exit animations, implement the FrozenRouter pattern (freeze the previous page in a cloned DOM node) but **pin your Next.js version** and test after every dependency update.
4. Focus animation budget on **in-page transitions** (modals opening, table rows appearing, tab switching) which work perfectly with AnimatePresence because you control the component lifecycle.

**Warning signs:**
- Page content flashes or duplicates momentarily during navigation
- Exit animations defined in page components never fire
- Console warnings about mismatched keys in AnimatePresence
- The layout re-renders on every navigation, resetting sidebar/topbar state

**Phase to address:** Phase 1 (Layout & Navigation). Decide the transition strategy before building any pages, because every page component's animation props depend on this decision.

---

### Pitfall 4: useContext Global Store Causes Cascade Re-renders Across All 15+ Modules

**What goes wrong:**
The store uses `useContext` with a single provider holding all entities (packages, flights, hotels, transfers, insurance, circuits, providers, catalogs, users, notifications). Every CRUD operation on any entity -- adding a transfer, editing a hotel price, toggling a package status -- triggers a re-render of **every component** consuming the context. On the Paquetes page with 15 rows, each row re-renders when someone edits a Seguro on a completely different page. During the demo, the UI stutters noticeably when performing rapid operations like inline-editing transfer prices in the table.

**Why it happens:**
React Context re-renders all consumers when the provider's value changes. Unlike Redux or Zustand, there is no selector mechanism -- you cannot subscribe to `state.transfers` without also re-rendering on `state.packages` changes. The problem is invisible with 3-5 entities but becomes severe with 10+ entity types and 100+ total records. None of the major state management libraries use Context for this exact reason.

**How to avoid:**
1. **Split the context into one provider per entity type**: `PackagesProvider`, `FlightsProvider`, `HotelsProvider`, etc. A CRUD operation on flights only re-renders flight consumers.
2. Separate **data** from **actions**: one context for the state (changes frequently), another for dispatch/actions (stable reference, never causes re-renders).
3. Wrap list item components in `React.memo()` so they skip re-renders when their specific props have not changed.
4. Memoize the context value with `useMemo` to prevent re-renders from parent re-renders that do not change the actual data.
5. For the prototype scope, this split is manageable (8-10 providers) and prevents the demo from feeling sluggish.

**Warning signs:**
- React DevTools Profiler shows components re-rendering that should not be (e.g., the Dashboard re-renders when editing a transfer on another page)
- Typing in a form input feels laggy (each keystroke triggers global re-render)
- Stagger animations replay unexpectedly (table rows re-animate because the parent re-rendered)
- CPU usage spikes during simple CRUD operations

**Phase to address:** Phase 1 (Data Layer & State Architecture). The context splitting strategy must be established before any module consumes state.

---

### Pitfall 5: Radix UI + Framer Motion Integration Requires forceMount Gymnastics

**What goes wrong:**
Radix Dialog, Select, and Dropdown are specified for the project. Developers try to add Framer Motion animations to these components (the spec demands "dropdown liquid glass animado", "modal con entrada espectacular"). Without proper integration, exit animations never play -- the Radix component unmounts its content before Framer Motion can animate it out. Or worse: with incorrect `forceMount` usage, `pointer-events: none` gets applied to `document.body`, making the **entire application unclickable** after opening a dialog. Documented in [Radix issue #2023](https://github.com/radix-ui/primitives/issues/2023).

**Why it happens:**
Radix controls component mounting/unmounting internally for accessibility and focus management. Framer Motion's AnimatePresence also wants to control mounting for exit animations. These two systems conflict. The `forceMount` prop on Radix Portal, Content, and Overlay is meant to solve this, but must be applied to the **correct combination** of sub-components. The Select component does not have `forceMount` on its Content at all when using `position="popper"`, making animated select dropdowns particularly tricky.

**How to avoid:**
1. Build **one reference implementation** for each Radix+Framer integration (Dialog, Select, Dropdown) and reuse it everywhere. Do not ad-hoc animate each instance.
2. For Dialog: apply `forceMount` to **both** Portal and Overlay. Wrap Content in AnimatePresence. Use Radix's `onOpenChange` to control a local state that AnimatePresence reads.
3. For Select: accept that exit animations on select dropdowns are limited. Use CSS transitions (`data-[state=open]` / `data-[state=closed]` attributes) instead of Framer Motion for Select specifically.
4. For Dropdown: same pattern as Dialog -- forceMount on Portal, AnimatePresence wrapping Content.
5. **Test the pointer-events issue**: after closing a dialog, verify that clicking anywhere on the page still works. This is the most dangerous bug for a live demo.

**Warning signs:**
- After closing a modal, buttons on the page are unclickable
- Select dropdowns appear instantly (no animation) or do not close
- Console warnings about missing `forceMount` or AnimatePresence children
- Focus trapping stops working after adding animation wrappers

**Phase to address:** Phase 1 (UI Component Library). These integrations are foundational -- every module uses modals and selects.

---

### Pitfall 6: Accidental Page Refresh Destroys All In-Memory CRUD Data During Demo

**What goes wrong:**
The presenter is 15 minutes into the demo. They have created 2 new packages, edited 3 hotels, assigned services, and the client is impressed. Then: accidental F5, or a browser tab suspension, or a navigation to `/login` and back. All in-memory state resets to the hardcoded defaults. The 15 minutes of demo modifications are gone. The client sees the original data, and the presenter must either explain ("it's a prototype") or re-do all the changes. The illusion of a working product is broken.

**Why it happens:**
React Context state exists only in JavaScript memory. Any event that causes a full page reload (F5, Cmd+R, browser crash recovery, tab suspension on low-memory devices, hard navigation vs client-side navigation) destroys it. The spec explicitly says "No localStorage", but this creates fragility during a live demo. Even a stray `<a href="/paquetes">` instead of `<Link href="/paquetes">` triggers a full page load.

**How to avoid:**
1. **Use `<Link>` exclusively** for all navigation. Never use `<a>` tags or `window.location`. Audit every navigation element.
2. Add a `beforeunload` event listener that warns the presenter if they accidentally try to refresh: `window.addEventListener('beforeunload', (e) => { e.preventDefault(); })`.
3. Consider a **lightweight sessionStorage sync** (even though the spec says no localStorage, sessionStorage is different and appropriate for demo resilience). On every state change, serialize to sessionStorage. On mount, hydrate from sessionStorage if available. This adds maybe 30 lines of code and saves the demo.
4. If sessionStorage is truly off the table, **pre-plan the demo flow**: have a script of exactly which entities to create/edit, and make those part of the initial hardcoded data in a "demo-ready" state.
5. Disable the browser's forward/back gestures for the demo device (macOS trackpad swipe-to-go-back triggers full reloads in some configs).

**Warning signs:**
- Developer uses `<a>` tags anywhere in the codebase
- No `beforeunload` handler registered
- Router.push() calls exist with `forceRefresh: true` or equivalent
- Testing only with hot reload (which preserves state) -- never testing with a hard page load

**Phase to address:** Phase 2 (State Management hardening). After basic CRUD works, add demo-resilience safeguards before the presentation.

---

### Pitfall 7: Recharts and Browser-Only Libraries Crash During SSR

**What goes wrong:**
The Reportes module uses Recharts for bar charts and pie charts. The developer imports Recharts normally, the page renders fine in development with Fast Refresh, and then -- a hard navigation or first page load hits the server-side rendering path. `window is not defined` error. White screen. In the worst case, this error propagates and crashes the entire Next.js server, requiring a restart during the demo.

**Why it happens:**
`"use client"` does **not** mean "only runs in the browser." Client Components in Next.js App Router are still pre-rendered on the server to generate initial HTML. Recharts (and other charting libraries) access `window`, `document`, or browser-only APIs during import or initial render. The server has no `window` object. The error occurs during SSR, before hydration.

**How to avoid:**
1. Import Recharts components via `next/dynamic` with `ssr: false`:
   ```typescript
   const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
   ```
2. Apply this pattern to **every** browser-only library component: Recharts, any drag-and-drop library, image upload dropzones, and anything that accesses `window` at import time.
3. Wrap chart containers in a `<Suspense>` boundary with a skeleton loader fallback, so the page renders gracefully while charts load client-side.
4. **Test every page with a hard reload** (Cmd+Shift+R), not just client-side navigation, to catch SSR errors before the demo.

**Warning signs:**
- The Reportes page works fine when navigating from Dashboard but crashes when accessed directly via URL
- Console shows `ReferenceError: window is not defined` during build or server logs
- Blank white areas where charts should be on first load
- Build warnings about client-only code in server context

**Phase to address:** Phase 3 (Module implementation, specifically Reportes). But the dynamic import pattern should be established as a convention in Phase 1.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single monolithic Context for all state | Fast to implement, one provider wrapping the app | Cascade re-renders kill performance at 10+ entities, impossible to optimize without rewrite | Never for this project scale (15+ entity types) |
| `z-index: 9999` to fix layering issues | Fixes the immediate visual bug | Creates an arms race; next component needs `99999`; masks broken stacking context architecture | Never -- fix the root stacking context issue |
| Inline `style={{ backdropFilter }}` on every element | Design fidelity, matches spec exactly | Performance cliff; no way to selectively reduce effects; hard to adjust globally | Acceptable in Phase 1 for prototyping, but wrap in a utility function so values can be tuned globally |
| Hardcoding data directly in page components | Fastest to build each page | Impossible to share data between pages (e.g., Paquetes needs Aereos data for ServiceAssigner); breaks CRUD because mutations do not propagate | Never -- always use the centralized data layer |
| Skipping `React.memo()` on list items | Less boilerplate, "premature optimization" | Visible jank when tables with 15+ rows re-render on every context change | Only acceptable for lists with < 5 items |
| Using `<a>` tags instead of Next.js `<Link>` | Copy-paste convenience | Full page reload, state loss, broken demo | Never in this project |

## Integration Gotchas

Common mistakes when connecting components in this specific stack.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Radix Select + Framer Motion | Wrapping Select.Content in AnimatePresence expecting exit animations | Use CSS data-attribute animations (`data-[state=open]`, `data-[state=closed]`) for Select; save Framer Motion for Dialog and Dropdown |
| Radix Dialog + Glass overlay | Applying `backdrop-filter` to both the Radix Overlay and the Dialog Content, creating nested blur that looks muddy | Apply `backdrop-filter` to Content only; use a semi-transparent solid color on Overlay (no blur on the overlay itself) |
| Framer Motion layoutId + Next.js routing | Using the same `layoutId` string across different route pages expecting shared layout animations | layoutId only works within the same React tree; cross-route shared animations require the FrozenRouter hack or should be avoided |
| Tailwind + inline glass styles | Mixing Tailwind classes and inline `style` for the same properties (e.g., `className="bg-white/70"` + `style={{ background: 'rgba(255,255,255,0.72)' }}`) | Pick one: extend Tailwind config with custom glass utilities (preferred) or use inline styles consistently. Mixing causes specificity conflicts. |
| Recharts + Next.js App Router | Static import at the top of a "use client" page | Always use `next/dynamic` with `ssr: false` for Recharts components |
| date-fns + Spanish locale | Using default English locale for `format()` and `formatDistance()` | Import and configure `es` locale globally; UI must be entirely in Spanish per spec |

## Performance Traps

Patterns that work at small scale but degrade in this prototype's scope.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Animating every table row with stagger + backdrop-filter | Dashboard table loads smoothly with 3 rows during development | Apply stagger animation to `opacity` and `translateY` only; add glass surface styling statically (not animated) | At 10+ visible rows with `backdrop-filter` on each |
| CSS `breathe` animation on all glass cards | Subtle and elegant on a single card | Use `breathe` only on the active/focused card or on stat cards (max 4); disable on cards in scrollable lists | At 6+ cards simultaneously animating in viewport |
| Unthrottled real-time price calculation | Instant feedback when editing markup on one package | Debounce calculations or use `useMemo` with dependency on the specific package being edited | When the price calculation triggers a global context update that re-renders 15 package cards |
| Framer Motion spring animations on all buttons | Playful feel, Apple-like interactions | Limit spring animations to primary CTAs and toggles; use CSS transitions for secondary interactions (hover, focus) | At 20+ interactive elements visible on screen, spring calculations compete for CPU |
| `AnimatePresence` wrapping large lists | Smooth enter/exit for list items | Use `AnimatePresence` only for individual item removal (user-triggered); use stagger only on initial page load, not on every re-render | When a filter operation causes 15 items to exit and 8 new items to enter simultaneously |

## Security Mistakes

Domain-specific security issues for this prototype context.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoding real client emails (geronimo@traveloz.com.uy) visible in the demo UI | If demo recording is shared, real contact info is exposed | Use the real names (client expects to see them) but note this for production: never hardcode real credentials |
| No route protection -- vendedor can access admin routes by URL | During demo, the client manually types `/perfiles` while in vendedor mode and sees admin content | Add a simple route guard in the admin layout that checks the role context and redirects vendedor users |
| Login accepts any credentials | Expected for prototype, but if deployed to a preview URL for client review, anyone can access | Add a simple hardcoded password check OR use Vercel password protection on the preview URL |

## UX Pitfalls

Common user experience mistakes specific to admin panel prototypes shown in live demos.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Empty states not designed | Client clicks "Traslados" for a brand that has no data, sees blank white space -- looks broken | Design empty states for every list: illustration + "No hay traslados registrados" + CTA button to create one |
| Delete confirmation too easy to trigger | Presenter accidentally deletes a package during demo, data is gone (in-memory, no undo) | Add a 2-step confirmation: first click shows "Confirmar eliminacion?" inline, second click deletes. Or implement soft-delete with undo toast (5-second window) |
| Form validation fires on mount | When opening "Crear paquete", all required fields immediately show red errors before the user types anything | Validate on blur or on submit, never on mount. Track `touched` state per field. |
| Tabs reset to first tab on re-render | Presenter edits a package on Tab 3 (Precios), navigates away and back, lands on Tab 1 (Datos) -- lost context | Store active tab in URL query params (`?tab=precios`) or in a component-level ref |
| Search/filter state lost on navigation | Presenter filters packages by "Brasil", navigates to a package detail, goes back -- filter is reset, showing all packages | Lift filter state to the layout level or store in URL search params |
| Mobile-unfriendly during screenshare | If presenter shares from a small screen or the client views on mobile, glass effects and sidebar compete for space | Not critical for video call demo, but ensure the sidebar collapses cleanly and content does not overflow horizontally |

## "Looks Done But Isn't" Checklist

Things that appear complete but will break during the live demo.

- [ ] **Glass tables:** Often missing -- hover state on the **last row** clips outside the table container (overflow issue with border-radius + backdrop-filter)
- [ ] **Modal close:** Often missing -- clicking the overlay (outside the modal content) should close it; Radix handles this but only if the overlay is a separate element, not just a background color on the portal
- [ ] **ServiceAssigner modal:** Often missing -- after assigning a service to a package, the Paquete's `netoCalculado` and `precioVenta` must update in real time; if the price calculation is decoupled from the assignment action, prices show stale values
- [ ] **Brand switching:** Often missing -- switching from TravelOz to DestinoIcono should filter ALL data across all modules; if one module reads directly from `data.ts` instead of the context, it shows unfiltered data
- [ ] **Vendedor view:** Often missing -- hiding the sidebar nav items for restricted modules; the developer hides buttons but forgets to hide entire sidebar links, so vendedor still sees "Proveedores" in the nav
- [ ] **Cloned entity:** Often missing -- the cloned package should have `estado: 'BORRADOR'` and `titulo: 'Copia de {original}'`; if the clone is a shallow copy, nested arrays (service IDs, tags) share references and editing the clone mutates the original
- [ ] **Toast stacking:** Often missing -- if the presenter rapidly creates 3 packages, 3 toasts should stack vertically, not overlap at the same position
- [ ] **Date formatting:** Often missing -- dates display in ISO format (`2026-03-15T00:00:00Z`) instead of localized Spanish (`15 de marzo de 2026`) because date-fns locale was not configured
- [ ] **Loading states:** Often missing -- no skeleton loaders while stagger animations play; the page looks empty for 200-400ms during initial animation
- [ ] **Pagination:** Often missing -- the table shows all 15 packages without pagination, which is fine for the prototype, but if pagination is implemented, navigating to page 2 and back should preserve sort/filter state

## Recovery Strategies

When pitfalls occur despite prevention, how to recover during or before the demo.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stacking context / z-index broken (modals behind sidebar) | MEDIUM | Move all Portals to render at `document.body` root. Remove `backdrop-filter` from the sidebar temporarily. Add explicit `z-index` to the portal wrapper. |
| Animation jank on demo device | LOW | Reduce all blur values by 50%. Remove `breathe` and `liquidFloat` animations. Keep only entry stagger and modal animations. This can be done with a single CSS variable toggle. |
| Page transitions flickering | LOW | Remove AnimatePresence from the layout entirely. Use `template.tsx` with a simple fade-in only. No exit animations. |
| Context re-render cascade causing jank | HIGH | Splitting a monolithic context into per-entity contexts requires touching every consumer. If discovered late, the faster fix is aggressive `React.memo()` on all list items and form inputs. |
| Data loss from page refresh during demo | LOW | Add sessionStorage persistence (30 lines of code). Or: pre-build the demo state into `data.ts` so that a refresh restores to a "good" demo state, not a blank state. |
| Recharts SSR crash | LOW | Wrap in `next/dynamic({ ssr: false })`. Takes 5 minutes per component. |
| Radix Dialog pointer-events bug | MEDIUM | Remove forceMount from the overlay. Accept no exit animation on the overlay (content can still animate). Or switch to a custom modal without Radix for the problematic instances. |
| Clone mutates original (shallow copy) | LOW | Replace spread operator with `structuredClone()` or `JSON.parse(JSON.stringify())` for the clone operation. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Backdrop-filter stacking context hell | Phase 1: Layout & Design System | Open a modal while sidebar is visible, toast appears, dropdown is open -- all layers visible and interactive |
| Animation performance death spiral | Phase 1: Design System + Phase 2: First module pages | Run Chrome DevTools Performance recording on Dashboard and Paquetes list; all animations at 60fps |
| Page transitions don't work with App Router | Phase 1: Layout & Navigation | Navigate between 3+ pages rapidly; no flickering, no white flashes, no duplicate content |
| useContext cascade re-renders | Phase 1: Data Layer | Edit a transfer, check React DevTools Profiler -- Paquetes page components should NOT re-render |
| Radix + Framer Motion integration | Phase 1: UI Component Library | Open/close every animated component (Dialog, Select, Dropdown) 5 times each; no pointer-events bugs, no animation glitches |
| Page refresh data loss | Phase 2: State Management | Hit Cmd+R after making changes; verify state persists (or warn before reload) |
| Recharts SSR crash | Phase 3: Reportes module | Access `/reportes` via direct URL (not navigation); no white screen |
| Empty states missing | Phase 2-3: Each module page | Switch to a brand with no data; every module shows a designed empty state |
| Form validation fires on mount | Phase 2: First form implementation | Open "Crear paquete" form; no red errors visible until user interacts |
| Clone shallow copy mutation | Phase 2: CRUD operations | Clone a package, edit the clone's services, verify original is unchanged |
| Brand switching incomplete | Phase 2: After brand context exists | Switch brands on every module page; verify all data filters correctly |
| Vendedor view incomplete | Phase 3: Role-based views | Log in as vendedor, check every sidebar link, every button, every column -- nothing admin-only should be visible |

## Sources

- [Radix UI Animation Guide (official)](https://www.radix-ui.com/primitives/docs/guides/animation) -- HIGH confidence
- [Radix Dialog + Framer Motion forceMount issues (GitHub #2023)](https://github.com/radix-ui/primitives/issues/2023) -- HIGH confidence
- [Radix Select animation support limitation (GitHub #1893)](https://github.com/radix-ui/primitives/issues/1893) -- HIGH confidence
- [Framer Motion Firefox lag (GitHub #441)](https://github.com/framer/motion/issues/441) -- HIGH confidence
- [Framer Motion AnimatePresence + layoutId unmount bug (GitHub #1619)](https://github.com/motiondivision/motion/issues/1619) -- HIGH confidence
- [Framer Motion AnimatePresence + layout animations (GitHub #1983)](https://github.com/framer/motion/issues/1983) -- HIGH confidence
- [Next.js App Router page transitions discussion (GitHub #42658)](https://github.com/vercel/next.js/discussions/42658) -- HIGH confidence
- [Next.js shared layout animations with App Router (GitHub #49279)](https://github.com/vercel/next.js/issues/49279) -- HIGH confidence
- [Recharts SSR issues with Next.js (GitHub #4336)](https://github.com/recharts/recharts/issues/4336) -- HIGH confidence
- [React Context performance dangers](https://thoughtspile.github.io/2021/10/04/react-context-dangers/) -- MEDIUM confidence
- [Pitfalls of overusing React Context (LogRocket)](https://blog.logrocket.com/pitfalls-of-overusing-react-context/) -- MEDIUM confidence
- [React Context performance optimization patterns](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context) -- MEDIUM confidence
- [How to fix filter: blur() performance in Safari](https://graffino.com/til/how-to-fix-filter-blur-performance-issue-in-safari) -- MEDIUM confidence
- [Glassmorphism implementation guide 2025](https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide) -- MEDIUM confidence
- [MDN: CSS Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context) -- HIGH confidence
- [Solving Framer Motion page transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router) -- MEDIUM confidence

---
*Pitfalls research for: TravelOz Admin Panel Prototype (Next.js 14, glassmorphism, in-memory state, Framer Motion, live demo)*
*Researched: 2026-03-15*
