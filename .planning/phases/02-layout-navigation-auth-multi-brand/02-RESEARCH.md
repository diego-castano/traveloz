# Phase 2: Layout, Navigation, Auth & Multi-Brand - Research

**Researched:** 2026-03-16
**Domain:** Admin layout shell (sidebar, topbar, page transitions), multi-brand context, role-based auth state, login page -- all with glassmorphism/liquid glass styling from design.json v3
**Confidence:** HIGH

## Summary

Phase 2 transforms the 21 Phase 1 UI primitives into a functional admin shell. It builds five distinct architectural components: (1) a fixed sidebar with violet-to-black gradient, collapsible animation, and navigation items grouped into General/Servicios/Sistema; (2) a sticky frosted glass topbar with breadcrumb, brand selector dropdown, and user menu; (3) a page transition system using AnimatePresence with the FrozenRouter pattern to work around Next.js App Router limitations; (4) a BrandProvider context that switches between TravelOz and DestinoIcono, filtering all downstream data; and (5) a simulated auth system with login page, role state (ADMIN/VENDEDOR), and permission-based UI restrictions.

The design.json v3 provides exact token specifications for every component in this phase: sidebar gradient colors, topbar material and dimensions, login page mesh gradient with noise overlay, page transition spring configs, and role-specific visibility rules. The Phase 1 foundation (glass.ts, animations.ts, cn.ts, and all UI primitives) provides the building blocks -- Phase 2 composes them into layout components and context providers.

The most technically challenging aspect is page transitions in Next.js 14 App Router. The standard AnimatePresence approach does not work because the App Router unmounts components before exit animations can play. The proven solution is the FrozenRouter pattern: a component that freezes the router context during exit animations, allowing AnimatePresence to control the unmount timing. This is well-documented and stable across the community.

**Primary recommendation:** Build in dependency order -- (1) AuthProvider + BrandProvider contexts, (2) Sidebar component, (3) Topbar component with brand selector, (4) Admin layout with page transitions using FrozenRouter + AnimatePresence, (5) Login page, (6) Role-based permission system. Use Next.js App Router route groups: `(admin)/layout.tsx` for the authenticated shell and `/login/page.tsx` outside the group.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAYO-01 | Sidebar renders with violet->black gradient (#6C2BD9 -> #441496 -> #0F081E) and pulsing glow | design.json `components.sidebar` provides all tokens: sidebarGradient (brand-specific), sidebarGlow animation (6s ease-in-out infinite), topGlow radial gradient, width 252px, collapsedWidth 64px |
| LAYO-02 | Sidebar navigation items show active state with violet background, border, and glow | design.json sidebar tokens: itemActiveBg `rgba(139,92,246,0.2)`, itemActiveBorder `1px solid rgba(139,92,246,0.15)`, itemActiveGlow `inset 0 0 16px rgba(139,92,246,0.12)` |
| LAYO-03 | Sidebar can collapse/expand with animation | design.json `animations.interactions.sidebarCollapse`: expanded 252px -> collapsed 64px, gentle spring config |
| LAYO-04 | Topbar renders with frosted glass, breadcrumb, brand selector dropdown, and user menu | design.json `components.topbar`: height 54px, frosted material, blur 24px, borderBottom, bottomAccent gradient with sheenSlide animation |
| LAYO-05 | PageHeader renders with display title, subtitle, and action button | design.json `patterns.listView.pageHeader`: titleFamily display, titleWeight 700, titleSize 26px, fadeSlideIn animation |
| LAYO-06 | Admin layout wraps all pages with Sidebar + Topbar + AnimatePresence for page transitions | FrozenRouter pattern for Next.js App Router + AnimatePresence, `(admin)/layout.tsx` route group, design.json `patterns.layout` structure |
| LAYO-07 | Background renders with #F5F6FA base, SVG noise overlay at 2.5%, and 3 color orbs (teal/violet) | design.json `semantic.backgroundOrbs` (3 orbs with exact positions/sizes), `glass.noise` SVG data URI at 2.5% opacity |
| LAYO-08 | Page transitions animate with opacity, y:12, blur(4px) spring entrance | design.json `animations.interactions.pageTransition`: initial opacity:0/y:12/blur(4px), animate opacity:1/y:0/blur(0px), exit opacity:0/y:-8 |
| BRND-01 | Brand selector in topbar switches between TravelOz and DestinoIcono | design.json `brands` object with complete per-brand tokens (sidebar gradient, login background, accent colors) |
| BRND-02 | Switching brand filters all data to show only that brand's entities | BrandProvider context with activeBrandId, consumer hook useBrand(), all future data layers filter by brandId |
| BRND-03 | BrandProvider context available throughout the app | React Context with Provider at root layout level, custom useBrand() hook |
| AUTH-01 | Login page renders with mesh gradient background, noise overlay, and liquid glass card | design.json `patterns.loginPage`: brand-specific loginBackground gradient, meshFloat animation, noise overlay, liquid glass card (420px width, 40px padding, elevation-32 shadow) |
| AUTH-02 | Login sets user role (ADMIN/VENDEDOR) and brand in app state | AuthProvider context with user state { role, brandId, name, email }, simulated login sets state (no real auth) |
| AUTH-03 | Vendedor view hides create/edit/delete/clone buttons across all modules | design.json `patterns.readOnlyView.hiddenElements` + useAuth() hook with `canEdit` / `isReadOnly` derived booleans |
| AUTH-04 | Vendedor view hides neto and markup columns, shows only precio de venta | design.json `patterns.readOnlyView.priceVisibility` + design.json `roles.vendedor.seePricing` |
| AUTH-05 | Vendedor can only access Paquetes module (other sidebar items hidden) | design.json `roles.vendedor.visibleModules: ["paquetes"]`, sidebar filters nav items by role |
| AUTH-06 | Vendedor sees "Solo lectura" badge in the UI | Badge component from Phase 1 + role-conditional rendering in topbar or page header |
</phase_requirements>

## Standard Stack

### Core (Inherited from Phase 1 -- all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 3.4.18 | Utility CSS with design tokens | Pinned v3. All tailwind.config.ts tokens already configured in Phase 1. |
| motion | 12.x | Page transitions, sidebar collapse, login card entrance, all interactions | AnimatePresence for page transitions, motion.div for sidebar width animation, spring configs from animations.ts |
| radix-ui | 1.4.3+ | DropdownMenu (brand selector, user menu), Tooltip (sidebar collapsed items) | Unified package. DropdownMenu supports forceMount for Motion exit animations. |
| lucide-react | 0.577.0 | Sidebar icons, topbar icons, breadcrumb separators | design.json `iconography.moduleIcons` specifies exact icon names per nav item |
| next | 14.x | App Router with route groups, layouts, templates | `(admin)` route group isolates authenticated layout from login page |

### No New Dependencies

Phase 2 requires no additional npm installs. All libraries from Phase 1 are sufficient.

## Architecture Patterns

### Recommended Project Structure

```
src/
  app/
    layout.tsx                    # Root layout: fonts, global providers (Auth, Brand, Toast)
    globals.css                   # Base Tailwind + data-state animations (from Phase 1)
    page.tsx                      # Root page -> redirect to /login or /(admin)
    login/
      page.tsx                    # Login page (outside admin layout)
    (admin)/
      layout.tsx                  # Admin layout: Sidebar + Topbar + Background + PageTransition
      page.tsx                    # Dashboard (Phase 8, placeholder for now)
      paquetes/
        page.tsx                  # Future Phase 4
      aereos/
        page.tsx                  # Future Phase 5
      alojamientos/
        page.tsx                  # Future Phase 5
      traslados/
        page.tsx                  # Future Phase 6
      seguros/
        page.tsx                  # Future Phase 6
      circuitos/
        page.tsx                  # Future Phase 6
      proveedores/
        page.tsx                  # Future Phase 6
      catalogos/
        page.tsx                  # Future Phase 7
      perfiles/
        page.tsx                  # Future Phase 7
      notificaciones/
        page.tsx                  # Future Phase 8
      reportes/
        page.tsx                  # Future Phase 8
  components/
    layout/
      Sidebar.tsx                 # Fixed sidebar with nav groups, collapse, glow
      Topbar.tsx                  # Sticky frosted glass topbar
      PageHeader.tsx              # Display title + subtitle + action button
      AdminBackground.tsx         # Page background with orbs + noise overlay
      PageTransitionWrapper.tsx   # AnimatePresence + FrozenRouter
    providers/
      AuthProvider.tsx            # Auth context: user, role, login/logout
      BrandProvider.tsx           # Brand context: active brand, switch brand
  lib/
    auth.ts                       # Auth types, role permission helpers
    brands.ts                     # Brand data constants, brand-specific tokens
```

### Pattern 1: FrozenRouter + AnimatePresence for Page Transitions

**What:** A wrapper that freezes the Next.js router context during exit animations, enabling smooth AnimatePresence page transitions in the App Router.
**When to use:** The `(admin)/layout.tsx` wraps `{children}` in this component.
**Why needed:** Next.js App Router unmounts the previous page component immediately on navigation, preventing exit animations. FrozenRouter preserves the previous router context during the exit phase.

```typescript
// src/components/layout/PageTransitionWrapper.tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSelectedLayoutSegment } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useEffect, useRef } from "react";
import { springs } from "@/components/lib/animations";

function usePreviousValue<T>(value: T): T | undefined {
  const prevValue = useRef<T>();
  useEffect(() => {
    prevValue.current = value;
    return () => { prevValue.current = undefined; };
  });
  return prevValue.current;
}

function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const prevContext = usePreviousValue(context) || null;
  const segment = useSelectedLayoutSegment();
  const prevSegment = usePreviousValue(segment);
  const changed = segment !== prevSegment && segment !== undefined && prevSegment !== undefined;

  return (
    <LayoutRouterContext.Provider value={changed ? prevContext : context}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={segment}
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Critical import:** `LayoutRouterContext` is imported from `next/dist/shared/lib/app-router-context.shared-runtime`. This is an internal Next.js module. It is stable and widely used across the community for this exact purpose, but it is technically not a public API. If Next.js changes it in a major version, the import path may need updating.

### Pattern 2: AuthProvider with Simulated Login

**What:** React Context that holds user state (role, brand, name) and provides login/logout functions. No real auth -- login just sets state from hardcoded user data.
**When to use:** Wraps the entire app at the root layout level.

```typescript
// src/components/providers/AuthProvider.tsx
"use client";

import { createContext, useContext, useState, useCallback } from "react";

type Role = "ADMIN" | "VENDEDOR" | "MARKETING";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  brandId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVendedor: boolean;
  canEdit: boolean;
  canSeePricing: { neto: boolean; markup: boolean; venta: boolean };
  visibleModules: string[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Role-specific configs from design.json roles section
const roleConfig = {
  ADMIN: {
    canEdit: true,
    canSeePricing: { neto: true, markup: true, venta: true },
    visibleModules: ["dashboard", "paquetes", "aereos", "alojamientos", "traslados",
      "circuitos", "seguros", "proveedores", "catalogos", "perfiles",
      "notificaciones", "reportes"],
  },
  VENDEDOR: {
    canEdit: false,
    canSeePricing: { neto: false, markup: false, venta: true },
    visibleModules: ["paquetes"],
  },
  MARKETING: {
    canEdit: false,
    canSeePricing: { neto: false, markup: false, venta: true },
    visibleModules: ["paquetes", "reportes"],
  },
} as const;
```

### Pattern 3: BrandProvider with Brand-Specific Tokens

**What:** React Context that holds the active brand and provides brand-specific design tokens (sidebar gradient, login background, accent colors).
**When to use:** Wraps the entire app. The Sidebar and Login page consume brand-specific tokens from this context.

```typescript
// src/components/providers/BrandProvider.tsx
"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";

interface BrandTokens {
  name: string;
  slug: string;
  tagline: string;
  logo: string;
  logoWhite: string;
  sidebarGradient: string;
  sidebarBlur: string;
  sidebarGlow: string;
  sidebarTopGlow: string;
  loginBackground: string;
  accentPrimary: string;
  accentSecondary: string;
  brandGlow: string;
}

interface BrandContextValue {
  activeBrandId: string;
  activeBrand: BrandTokens;
  brands: BrandTokens[];
  switchBrand: (brandId: string) => void;
}

// Brand tokens extracted from design.json brands section
const brandTokens: Record<string, BrandTokens> = {
  "brand-1": {
    name: "TravelOz",
    slug: "traveloz",
    tagline: "#ExperienciaOZ",
    logo: "/assets/brands/traveloz-logo.webp",
    logoWhite: "/assets/brands/traveloz-logo-white.webp",
    sidebarGradient: "linear-gradient(180deg, rgba(108,43,217,0.95) 0%, rgba(68,20,150,0.97) 40%, rgba(15,8,30,0.99) 100%)",
    sidebarBlur: "24px",
    sidebarGlow: "4px 0 24px rgba(108,43,217,0.08)",
    sidebarTopGlow: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)",
    loginBackground: "radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.35) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59,191,173,0.2) 0%, transparent 50%), linear-gradient(135deg, #1A1A2E 0%, #0F0F1E 100%)",
    accentPrimary: "violet",
    accentSecondary: "teal",
    brandGlow: "rgba(139,92,246,0.12)",
  },
  "brand-2": {
    name: "DestinoIcono",
    slug: "destinoicono",
    tagline: "Tu destino, tu icono",
    logo: "/assets/brands/destinoicono-logo.webp",
    logoWhite: "/assets/brands/destinoicono-logo-white.webp",
    sidebarGradient: "linear-gradient(180deg, rgba(26,58,92,0.95) 0%, rgba(15,36,64,0.97) 40%, rgba(6,16,32,0.99) 100%)",
    sidebarBlur: "24px",
    sidebarGlow: "4px 0 24px rgba(26,58,92,0.08)",
    sidebarTopGlow: "radial-gradient(ellipse at 50% 0%, rgba(107,139,174,0.1) 0%, transparent 70%)",
    loginBackground: "radial-gradient(ellipse at 30% 20%, rgba(26,58,92,0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59,191,173,0.25) 0%, transparent 50%), linear-gradient(135deg, #0A1628 0%, #060E18 100%)",
    accentPrimary: "navy",
    accentSecondary: "teal",
    brandGlow: "rgba(26,58,92,0.15)",
  },
};
```

### Pattern 4: Admin Layout Composition

**What:** The `(admin)/layout.tsx` that composes Sidebar + Topbar + Background + PageTransitions into the authenticated shell.
**When to use:** This is the single layout file for all admin pages.

```typescript
// src/app/(admin)/layout.tsx
"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AdminBackground } from "@/components/layout/AdminBackground";
import { PageTransitionWrapper } from "@/components/layout/PageTransitionWrapper";
import { useAuth } from "@/components/providers/AuthProvider";
import { redirect } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto">
          <AdminBackground />
          <div className="relative z-[1] p-7">
            <PageTransitionWrapper>
              {children}
            </PageTransitionWrapper>
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Pattern 5: Sidebar with Collapse Animation and Role Filtering

**What:** Fixed sidebar with brand-specific gradient, collapsible width animation, and role-filtered navigation.
**When to use:** Rendered in `(admin)/layout.tsx`.
**Key details:**
- Width: 252px expanded, 64px collapsed (from design.json `animations.interactions.sidebarCollapse`)
- Gradient: brand-specific from BrandProvider (TravelOz = violet, DestinoIcono = navy)
- Nav items: 3 groups from design.json `components.sidebar.navItems`
- Collapse animation: Motion `animate={{ width }}` with gentle spring
- Role filtering: `useAuth().visibleModules` filters which nav items render

```typescript
// Navigation structure from design.json
const navGroups = [
  {
    group: "general",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/" },
      { id: "paquetes", label: "Paquetes", icon: "Package", href: "/paquetes" },
    ],
  },
  {
    group: "servicios",
    items: [
      { id: "aereos", label: "Aereos", icon: "Plane", href: "/aereos" },
      { id: "alojamientos", label: "Alojamientos", icon: "Hotel", href: "/alojamientos" },
      { id: "traslados", label: "Traslados", icon: "Bus", href: "/traslados" },
      { id: "circuitos", label: "Circuitos y Cruceros", icon: "Ship", href: "/circuitos" },
      { id: "seguros", label: "Seguros", icon: "ShieldCheck", href: "/seguros" },
    ],
  },
  {
    group: "sistema",
    items: [
      { id: "proveedores", label: "Proveedores", icon: "Truck", href: "/proveedores" },
      { id: "perfiles", label: "Perfiles y Roles", icon: "Users", href: "/perfiles" },
      { id: "catalogos", label: "Catalogos", icon: "Settings", href: "/catalogos" },
      { id: "notificaciones", label: "Notificaciones", icon: "Bell", href: "/notificaciones" },
      { id: "reportes", label: "Reportes", icon: "BarChart3", href: "/reportes" },
    ],
  },
];
```

### Pattern 6: Login Page with Mesh Gradient Background

**What:** Full-screen login page outside the admin layout, with animated mesh gradient, noise overlay, and liquid glass card.
**When to use:** `/login` route, rendered when user is not authenticated.
**Key design tokens from design.json `patterns.loginPage`:**
- Background: brand-specific `loginBackground` gradient
- Mesh animation: `meshFloat 20s ease-in-out infinite alternate`
- Noise overlay: SVG fractalNoise at 2.5% opacity
- Card: liquid glass material, 420px width, 40px padding, elevation-32 shadow, 24px border radius
- Card entrance: scale(0.9) + y(40) + blur(10px) -> normal with spring stiffness:200 damping:22 delay:0.2
- Title: "Bienvenido" in Playfair Display 28px

### Anti-Patterns to Avoid

- **Using `template.tsx` for page transitions:** While `template.tsx` re-mounts on navigation, it does NOT provide exit animations. AnimatePresence with FrozenRouter in `layout.tsx` is the correct approach for enter+exit transitions.

- **Nested Context providers inside `(admin)/layout.tsx`:** AuthProvider and BrandProvider must live in the ROOT `layout.tsx`, not the admin layout. The login page needs BrandProvider (for brand-specific login background) and the admin layout redirect needs AuthProvider.

- **Animating the sidebar element that has backdrop-filter:** The sidebar has `backdropFilter: blur(24px)`. Animating its width directly while backdrop-filter is applied causes frame drops. Instead, use a static glass backdrop and animate a width-constraining wrapper without glass properties.

- **Hardcoding brand tokens in Sidebar/Topbar:** Always read from BrandProvider context. Both TravelOz (violet) and DestinoIcono (navy) have different sidebar gradients, glows, and accent colors. Hardcoding violet values breaks DestinoIcono.

- **Using `router.push` inside providers for auth redirect:** In App Router, use `redirect()` from `next/navigation` in server-adjacent contexts, or conditionally render based on auth state in client components. Do NOT use `useRouter().push()` in layout effects -- it causes hydration issues.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown menus (brand selector, user menu) | Custom div with onClick/onBlur | Radix DropdownMenu | Focus management, keyboard navigation, click-outside, portal rendering -- critical for topbar dropdowns overlaying content |
| Tooltip for collapsed sidebar items | Custom hover div | Radix Tooltip | Positioning, delay, accessibility, portal to avoid stacking context issues |
| Page transitions in App Router | Custom unmount delay with setTimeout | FrozenRouter + AnimatePresence | Router context freezing during exit animation is a solved problem -- reimplementing it is fragile |
| Auth redirect logic | Custom useEffect with router.push | Conditional render in layout + redirect() | Avoids hydration mismatches and flash of content |
| Brand token resolution | Per-component brand checks | BrandProvider context with useBrand() hook | Single source of truth, avoids prop drilling brand across 10+ components |

**Key insight:** The admin layout is a composition problem, not a creation problem. Phase 1 built all the visual primitives. Phase 2 composes them into the shell with contexts providing the dynamic state (auth, brand).

## Common Pitfalls

### Pitfall 1: FrozenRouter Import Path Changes Between Next.js Versions
**What goes wrong:** The `LayoutRouterContext` import from `next/dist/shared/lib/app-router-context.shared-runtime` breaks after a Next.js update because the internal module path changes.
**Why it happens:** This is a non-public import. Next.js does not guarantee its path stability across major versions.
**How to avoid:** (1) Pin Next.js 14.x in package.json. (2) Isolate the import in a single file (`PageTransitionWrapper.tsx`) so if the path changes, only one file needs updating. (3) Add a comment with the import documenting this risk.
**Warning signs:** Build fails after `npm update` with "Cannot find module" error referencing the shared-runtime path.

### Pitfall 2: Auth Redirect Flash of Content
**What goes wrong:** Unauthenticated user navigating to `/paquetes` sees a brief flash of the admin layout (sidebar, topbar) before being redirected to `/login`.
**Why it happens:** Client-side auth check in `useEffect` runs after initial render, causing one frame of the authenticated layout.
**How to avoid:** (1) Check `isAuthenticated` synchronously at the top of `AdminLayout` and return `null` or a loading skeleton before the layout renders. (2) Use `redirect("/login")` from `next/navigation` which throws a special error that Next.js catches. (3) Store the initial auth state in a way that is available before the first render (e.g., initialize from a simple in-memory flag).
**Warning signs:** Flicker of sidebar/topbar when loading the app while logged out.

### Pitfall 3: Brand Context Re-renders Cascade
**What goes wrong:** Switching brand causes ALL components that consume BrandProvider to re-render simultaneously, causing visible jank with glass animations resetting.
**Why it happens:** Default React Context re-renders all consumers when any part of the context value changes.
**How to avoid:** (1) Memoize the context value object with `useMemo`. (2) Split brand state into separate contexts if needed (activeBrandId vs brandTokens). (3) For the prototype, this likely is not a performance issue since brand switching is infrequent. But the memoization pattern is trivial to add and prevents the issue entirely.
**Warning signs:** Sidebar and topbar visually "flash" when switching brands.

### Pitfall 4: Sidebar Collapse z-index vs Topbar
**What goes wrong:** The sidebar's collapsed tooltip or expanded content overlaps incorrectly with the topbar, or the topbar's dropdown appears behind the sidebar.
**Why it happens:** Both sidebar and topbar have `backdrop-filter`, creating independent stacking contexts. z-index values become relative to their parent stacking context rather than the document.
**How to avoid:** (1) Use the design.json z-index scale consistently: sidebar z-100, overlay z-30, modal z-40, popover z-50, toast z-60, dropdown z-10. (2) Render dropdown menus via Radix portals at document.body. (3) Test the composite layout with sidebar expanded + topbar dropdown open simultaneously.
**Warning signs:** Adding `z-index: 9999` to fix layering means the architecture is broken.

### Pitfall 5: Noise Overlay Intercepting Pointer Events
**What goes wrong:** The SVG noise overlay div covers the entire viewport and intercepts all mouse clicks, making the app non-interactive.
**Why it happens:** A fixed-position div with 100% width/height sits on top of content without `pointer-events: none`.
**How to avoid:** Always apply `pointer-events: none` to the noise overlay div and the background orbs container. These are purely visual layers.
**Warning signs:** Nothing is clickable after adding the background decorations.

### Pitfall 6: Login Page Using Admin Layout Accidentally
**What goes wrong:** The login page renders inside the admin layout (sidebar + topbar visible on login).
**Why it happens:** Incorrect route group configuration. If login is placed inside `(admin)/`, it inherits the admin layout.
**How to avoid:** Place login at `src/app/login/page.tsx` (NOT `src/app/(admin)/login/page.tsx`). The `(admin)` route group captures everything inside it. Login must be a sibling of the route group.
**Warning signs:** Sidebar visible on the login page.

### Pitfall 7: Page Transition Animates Backdrop-Filter Content
**What goes wrong:** The page transition wrapper animates `filter: blur(4px)` on a div that contains glassmorphism elements. The nested blur compounds, creating an ugly double-blur effect during transitions.
**Why it happens:** CSS `filter: blur()` on a parent element applies to ALL children, including those that already have `backdrop-filter: blur()`. The effects stack.
**How to avoid:** Keep the page transition animation simple: `opacity` + `y` + a VERY subtle `filter: blur()`. The 4px blur in the design.json is mild enough to work, but test it visually. If it looks bad, drop the blur from page transitions and keep only opacity + y offset.
**Warning signs:** Content looks excessively blurred during page navigation.

## Code Examples

### Admin Background with Orbs and Noise

```typescript
// src/components/layout/AdminBackground.tsx
"use client";

// Source: design.json semantic.backgroundOrbs + glass.noise
export function AdminBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Base color */}
      <div className="absolute inset-0 bg-surface-page" />

      {/* Color orbs from design.json semantic.backgroundOrbs */}
      <div
        className="absolute rounded-full"
        style={{
          width: "600px", height: "600px",
          top: "10%", right: "15%",
          background: "rgba(59,191,173,0.06)",
          filter: "blur(120px)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "500px", height: "500px",
          bottom: "15%", left: "15%",
          background: "rgba(139,92,246,0.05)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "400px", height: "400px",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(139,92,246,0.03)",
          filter: "blur(80px)",
        }}
      />

      {/* SVG noise overlay from design.json glass.noise */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.025,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}
```

### Sidebar Collapse with Motion

```typescript
// Sidebar collapse animation pattern
// Source: design.json animations.interactions.sidebarCollapse
import { motion } from "motion/react";
import { springs } from "@/components/lib/animations";

// In the Sidebar component:
const [collapsed, setCollapsed] = useState(false);
const sidebarWidth = collapsed ? 64 : 252;

<motion.aside
  animate={{ width: sidebarWidth }}
  transition={springs.gentle}
  className="fixed left-0 top-0 z-[100] h-screen flex-shrink-0 overflow-hidden"
  style={{
    background: activeBrand.sidebarGradient,
    backdropFilter: `blur(${activeBrand.sidebarBlur})`,
    WebkitBackdropFilter: `blur(${activeBrand.sidebarBlur})`,
    borderRight: "1px solid rgba(139,92,246,0.1)",
  }}
>
  {/* Pulsing glow overlay */}
  <div className="pointer-events-none absolute inset-0 animate-sidebar-glow" />

  {/* Top glow radial gradient */}
  <div
    className="pointer-events-none absolute inset-x-0 top-0 h-32"
    style={{ background: activeBrand.sidebarTopGlow }}
  />

  {/* Logo, nav items, collapse button, footer... */}
</motion.aside>
```

### Topbar with Brand Selector

```typescript
// Topbar composition pattern
// Source: design.json components.topbar
import { DropdownMenu } from "radix-ui";
import { glassMaterials } from "@/components/lib/glass";

<header
  className="sticky top-0 z-[20] flex h-[54px] items-center justify-between px-6"
  style={{
    ...glassMaterials.frosted,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderBottom: "1px solid rgba(255,255,255,0.25)",
  }}
>
  {/* Left: Breadcrumb */}
  <Breadcrumb />

  {/* Right: Brand selector + User menu */}
  <div className="flex items-center gap-3">
    {/* Brand selector dropdown */}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="/* brand badge styling */">
          {activeBrand.name}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          {/* Brand options */}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>

    {/* "Solo lectura" badge for VENDEDOR */}
    {isVendedor && <Badge variant="draft">Solo lectura</Badge>}

    {/* User menu dropdown */}
  </div>

  {/* Bottom accent line with sheen animation */}
  <div
    className="absolute inset-x-0 bottom-0 h-px animate-sheen-slide"
    style={{
      background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.1) 20%, rgba(59,191,173,0.1) 50%, rgba(139,92,246,0.08) 80%, transparent 100%)",
      backgroundSize: "200% 100%",
    }}
  />
</header>
```

### Root Layout Provider Composition

```typescript
// src/app/layout.tsx
// Providers wrap the entire app. Order: Auth outside, Brand inside.
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BrandProvider } from "@/components/providers/BrandProvider";
import { ToastProvider } from "@/components/ui/Toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-body antialiased">
        <AuthProvider>
          <BrandProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Auth-Aware Sidebar Nav Filtering

```typescript
// Inside Sidebar.tsx - filtering nav items by role
const { visibleModules } = useAuth();

const filteredGroups = navGroups
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => visibleModules.includes(item.id)),
  }))
  .filter((group) => group.items.length > 0);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `_app.tsx` wrapping | App Router `layout.tsx` + `template.tsx` | Next.js 13+ (2023) | Layouts persist, templates re-mount. Neither directly supports AnimatePresence exit animations. |
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` | 2025 (motion v12) | Package renamed. Already adopted in Phase 1. |
| Per-primitive Radix packages | Unified `radix-ui` package | Feb 2026 (v1.4.0) | Single import for Dialog, DropdownMenu, Tooltip. Already adopted in Phase 1. |
| `React.createContext` + manual `Provider` | Same pattern, but with split contexts by concern | 2025 best practice | Split auth context from brand context. Avoids unnecessary re-renders. |
| `useRouter().push("/login")` for auth redirect | `redirect("/login")` from `next/navigation` | Next.js 14+ | Works in both server and client components, avoids hydration issues. |

**Deprecated/outdated:**
- Using `template.tsx` for page transitions: It does NOT enable exit animations, only re-mounts on navigation
- `getServerSideProps` for auth checks: App Router uses middleware or layout-level checks
- `framer-motion` package: Use `motion` package with imports from `motion/react`

## Open Questions

1. **FrozenRouter stability across Next.js minor versions**
   - What we know: The `LayoutRouterContext` import path has been stable since Next.js 13.4 through 14.x. Community pattern is widely adopted.
   - What's unclear: Whether Next.js 15 will change this path or provide a public API for page transitions.
   - Recommendation: Pin Next.js 14.x. Isolate the import in one file. If the path changes, only one file needs updating. LOW risk for this prototype since we control the Next.js version.

2. **Brand switch animation**
   - What we know: Switching brand changes the sidebar gradient, glow, and accent colors.
   - What's unclear: Whether the brand switch should animate (crossfade) or be instant.
   - Recommendation: For the prototype, make it instant. The sidebar gradient change is dramatic enough to provide visual feedback. Adding crossfade animations between brand themes adds complexity for minimal demo value.

3. **Placeholder content for future module pages**
   - What we know: Phase 2 creates route files for all modules, but only Dashboard/Paquetes have content later.
   - What's unclear: What to render on placeholder pages.
   - Recommendation: Render a simple placeholder with the PageHeader component showing the module name + "Proximamente" subtitle. This validates that navigation, page transitions, and role filtering all work correctly without building module content.

## Sources

### Primary (HIGH confidence)
- `docs/design.json` v3.0.0 -- components.sidebar, components.topbar, patterns.layout, patterns.loginPage, brands, roles, animations.interactions sections (all token values cited in this research)
- `docs/flujo.md` -- navigation structure (7 sidebar items, 3 groups), role permissions (admin/vendedor), multi-brand architecture
- `docs/modulos_backend.md` -- User model schema, Role enum (ADMIN/VENDEDOR/MARKETING), brand model, permissions table
- `PROMPT_CLAUDE_CODE.md` -- project structure spec, login page spec, sidebar spec, vendedor restrictions, brand selector behavior
- `.planning/REQUIREMENTS.md` -- LAYO-01 through LAYO-08, BRND-01 through BRND-03, AUTH-01 through AUTH-06 requirement definitions
- `.planning/phases/01-foundation-design-system/01-RESEARCH.md` -- Phase 1 established patterns: glass.ts, animations.ts, cn.ts, CVA patterns, Radix integration

### Secondary (MEDIUM confidence)
- [FrozenRouter pattern](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router) -- Complete implementation with LayoutRouterContext, usePreviousValue, AnimatePresence integration
- [Next.js Discussion #42658](https://github.com/vercel/next.js/discussions/42658) -- Community discussion on App Router page transition approaches
- [Next.js Discussion #59349](https://github.com/vercel/next.js/discussions/59349) -- layout.tsx vs template.tsx for page transitions
- [Kent C. Dodds - How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) -- Provider pattern best practices
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) -- Context API sufficient for auth/theming/moderate global state

### Tertiary (LOW confidence)
- None -- all findings verified through primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in Phase 1, no new dependencies needed
- Architecture patterns: HIGH -- FrozenRouter pattern verified through multiple community sources and official Next.js discussions; layout composition follows standard App Router patterns; design tokens read directly from design.json
- Pitfalls: HIGH -- page transition challenges well-documented in Next.js community; z-index stacking context issues documented in Phase 1 research; auth redirect patterns are standard Next.js knowledge
- Auth/Brand contexts: HIGH -- standard React Context patterns with role configs derived directly from design.json roles section

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- all libraries are version-pinned, Next.js 14 is mature, no fast-moving dependencies)

---
*Phase 2 research for: TravelOz Admin Panel -- Layout, Navigation, Auth & Multi-Brand (17 requirements: LAYO-01 to LAYO-08, BRND-01 to BRND-03, AUTH-01 to AUTH-06)*
*design.json v3.0.0 "Liquid Horizon" -- sidebar, topbar, login, roles, brands sections*
