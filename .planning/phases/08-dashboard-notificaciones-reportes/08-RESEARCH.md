# Phase 8: Dashboard, Notificaciones & Reportes - Research

**Researched:** 2026-03-16
**Domain:** React dashboard UI, multi-step wizard, recharts v2, motion v12 counter animation
**Confidence:** HIGH

---

## Summary

Phase 8 completes the TravelOz admin panel by implementing three pages that aggregate data from all prior phases: a stat-card Dashboard, a 5-step Notificaciones wizard, and a Reportes page with a recharts bar chart. All three pages are shells that already exist in the codebase but contain only a `PageHeader` stub — they must be fully built out from scratch while matching the established glass design system.

The technical challenge is primarily data aggregation: the Dashboard and Reportes pages must derive computed values by joining context provider state across PackageProvider, ServiceProvider, and CatalogProvider. There is no backend — all data lives in React context reducers. The Notificaciones wizard manages its own local `useState` step machine (no external state library needed). The recharts BarChart requires deriving a `destino` summary by joining `paqueteAereos -> aereos.destino` — the same join pattern already used in the paquetes list page.

Animation requirements are well-supported: `motion/react` (v12.36.0) exports `useMotionValue`, `animate`, and `useSpring` for counter animation. Recharts 2.15.4 is already installed and exports `BarChart`, `ResponsiveContainer`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, and `Cell` — the full set needed for a styled bar chart. The wizard email preview is a simulated UI with static HTML structure (no email library needed). The root page redirect must change from `/paquetes` to `/dashboard` as a final step.

**Primary recommendation:** Build each page as a single `page.tsx` with inline sub-components for stat cards, activity feed, and chart sections — matching the pattern of other module pages. Use local `useState` for wizard step machine, derive all aggregated stats with `useMemo` from context hooks, and use `animate(motionValue, target, options)` from `motion/react` for counter animation on mount.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard renders 4 liquid glass stat cards with animated counter numbers | Card `stat` variant + `glassMaterials.liquid` already exists. `animate(useMotionValue, target)` from `motion/react` enables counter animation. |
| DASH-02 | Dashboard shows recent activity (last packages created/edited) | `usePaquetes()` from PackageProvider returns paquetes with `createdAt`/`updatedAt` ISO strings — sort and slice last 5. |
| DASH-03 | Dashboard shows quick access links to all modules | Next.js `Link` + lucide-react icons already used in Sidebar — reuse same nav item list or copy href map. |
| NOTF-01 | Notification wizard step 1: select etiqueta/campaign | `useEtiquetas()` from CatalogProvider returns etiquetas with `{id, nombre, color, slug}`. Select component from `@/components/ui/Select` already styled. |
| NOTF-02 | Notification wizard step 2: view filtered paquetes by etiqueta | `usePackageState().paqueteEtiquetas` junction table — filter by selected `etiquetaId`, join to `usePaquetes()`. |
| NOTF-03 | Notification wizard step 3: select paquetes to notify | Checkbox from `@/components/ui/Checkbox` already styled. Manage selected set with `useState<Set<string>>`. |
| NOTF-04 | Notification wizard step 4: preview email template with service summary and links | Static HTML email template rendered as JSX. `usePaqueteServices(id)` from PackageProvider gets services per paquete. |
| NOTF-05 | Notification wizard step 5: send (simulated) with success toast | `useToast()` from `@/components/ui/Toast` — `toast("success", ...)`. Reset wizard to step 1 after toast. |
| REPT-01 | Stat cards: total paquetes activos, aereos, alojamientos, visitas web simuladas | Aggregate from `usePaquetes()`, `useAereos()`, `useAlojamientos()` + hardcoded simulated visits number. |
| REPT-02 | Bar chart of paquetes by destino (using recharts) | Derive destino via `paqueteAereos -> aereos.destino` join (same pattern as paquetes page line 85-108). Use `BarChart`, `Bar`, `XAxis`, `YAxis`, `ResponsiveContainer` from `recharts`. |
| REPT-03 | Table of hoteles mas usados | Count `paqueteAlojamientos` by `alojamientoId`, join to `alojamientos.nombre` — render with existing `Table` component. |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion/react` | 12.36.0 | Counter animation, page transitions | Already used throughout — `animate()` + `useMotionValue()` from `framer-motion` under the hood |
| `recharts` | 2.15.4 | Bar chart for paquetes by destino | Already in `package.json`, not yet used in any page — Phase 8 is first consumer |
| `lucide-react` | ^0.469.0 | Icons for stat cards and wizard steps | Consistent with rest of app |
| React context hooks | — | Data aggregation across providers | PackageProvider, ServiceProvider, CatalogProvider already wrap all admin pages |

### Supporting (already in codebase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/components/ui/Card` | — | Stat card containers (`stat` variant) | DASH-01, REPT-01 stat cards |
| `@/components/ui/Table` | — | Hoteles mas usados table | REPT-03 |
| `@/components/ui/Toast` | — | Simulated send success notification | NOTF-05 |
| `@/components/ui/Checkbox` | — | Paquete selection in wizard step 3 | NOTF-03 |
| `@/components/ui/Badge` | — | Estado badges in wizard paquete list | NOTF-02 |
| `@/components/ui/Button` | — | Wizard navigation (Siguiente/Atrás/Enviar) | NOTF-01 through NOTF-05 |
| `next/link` | — | Quick access links in Dashboard | DASH-03 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `animate(motionValue, target)` for counter | Plain `useEffect` + `setInterval` | Motion version is GPU-optimized, avoids re-renders — use motion |
| Inline wizard step machine with `useState` | External state machine (XState) | Overkill for 5 linear steps — use `useState<number>` for step index |
| recharts `BarChart` | Chart.js, Victory, nivo | recharts is already installed — don't add new dependencies |

**Installation:** No new packages required. All dependencies are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/(admin)/
├── page.tsx                      # CHANGE: redirect to /dashboard instead of /paquetes
├── (admin)/
│   ├── page.tsx                  # Dashboard: REPLACE stub with full page
│   │   └── _components/          # (optional) if page grows large
│   ├── notificaciones/
│   │   └── page.tsx              # Wizard: REPLACE stub with full 5-step wizard
│   └── reportes/
│       └── page.tsx              # Reports: REPLACE stub with full page
```

The `_components/` folder is optional for this phase — given the wizard's complexity, `notificaciones/page.tsx` may benefit from splitting wizard steps into a `_components/WizardStep{N}.tsx` pattern. Dashboard and Reportes are simpler and can be single-file.

### Pattern 1: Animated Stat Counter

**What:** On mount, animate a `motionValue` from 0 to target number. Render via `<motion.span>` which updates DOM directly without React re-renders.

**When to use:** DASH-01 (4 stat cards), REPT-01 (4 report stat cards)

**Example:**
```typescript
// Source: framer-motion/dist/cjs/index.js — animate, useMotionValue exported from motion/react
import { useEffect } from "react";
import { motion, useMotionValue, animate } from "motion/react";

function AnimatedCounter({ target }: { target: number }) {
  const count = useMotionValue(0);

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 1.2,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [count, target]);

  return (
    <motion.span className="text-3xl font-bold font-mono text-neutral-900">
      {count}
    </motion.span>
  );
}
```

Note: `motion.span` renders the MotionValue directly as text. For integer display, pass a `motionValue.on("change", ...)` callback and `Math.round()` into a `useState`, or use `useTransform(count, Math.round)` to round.

### Pattern 2: Step Wizard with useState

**What:** A linear 5-step wizard where step index is managed by local state. Each step renders a different sub-component. Navigation is Next/Back buttons plus the final Send action.

**When to use:** NOTF-01 through NOTF-05

**Example:**
```typescript
// Source: codebase pattern — local useState for multi-step
const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
const [selectedEtiquetaId, setSelectedEtiquetaId] = useState<string | null>(null);
const [selectedPaqueteIds, setSelectedPaqueteIds] = useState<Set<string>>(new Set());

// Step indicator — horizontal row of 5 numbered circles with active highlight
// Each step renders conditionally: {step === 1 && <Step1 />}
// Navigation: Siguiente disabled if required field not filled
```

### Pattern 3: Recharts BarChart with Glass Tooltip

**What:** A `ResponsiveContainer` wrapping a `BarChart` with a custom `Tooltip` styled with `glassMaterials.frosted`. Bar fill uses the app's teal accent color.

**When to use:** REPT-02 paquetes by destino

**Example:**
```typescript
// Source: recharts 2.15.4 types confirmed — BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer all exported
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";

// Data shape derived from paqueteAereos -> aereos.destino join
const data = [
  { destino: "Cancun", count: 4 },
  { destino: "Brasil", count: 3 },
  // ...
];

// Render
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="rgba(26,26,46,0.06)"
      vertical={false}
    />
    <XAxis
      dataKey="destino"
      tick={{ fill: "rgba(26,26,46,0.5)", fontSize: 12 }}
      axisLine={false}
      tickLine={false}
    />
    <YAxis
      tick={{ fill: "rgba(26,26,46,0.4)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      allowDecimals={false}
    />
    <Tooltip
      contentStyle={{
        ...glassMaterials.frosted,
        border: "none",
        borderRadius: 10,
      }}
      cursor={{ fill: "rgba(59,191,173,0.06)" }}
    />
    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="rgba(59,191,173,0.8)" />
  </BarChart>
</ResponsiveContainer>
```

### Pattern 4: Destino Aggregation for Bar Chart

**What:** Derive a `{ destino: string; count: number }[]` array by joining `paqueteAereos` (junction) to `aereos.destino`. Exactly the same join used in the paquetes list page.

**When to use:** REPT-02

**Example:**
```typescript
// Source: paquetes/page.tsx lines 85-108 — established pattern
const state = usePackageState();
const aereos = useAereos();
const paquetes = usePaquetes(); // brand-filtered, non-deleted

const destinoChartData = useMemo(() => {
  // Build aereo lookup: aereoId -> destino
  const aereoMap: Record<string, string> = {};
  for (const a of aereos) {
    aereoMap[a.id] = a.destino;
  }
  // Count paquetes per destino (active only)
  const counts: Record<string, number> = {};
  for (const p of paquetes) {
    if (p.estado !== "ACTIVO") continue;
    const firstAereo = state.paqueteAereos.find((pa) => pa.paqueteId === p.id);
    if (firstAereo) {
      const destino = aereoMap[firstAereo.aereoId] ?? "Otro";
      counts[destino] = (counts[destino] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([destino, count]) => ({ destino, count }))
    .sort((a, b) => b.count - a.count);
}, [paquetes, aereos, state.paqueteAereos]);
```

### Pattern 5: Hoteles Mas Usados Table

**What:** Count appearances of each `alojamientoId` in `paqueteAlojamientos`, join to `alojamientos.nombre`, sort descending, render top 5-8 with existing `Table` component.

**When to use:** REPT-03

**Example:**
```typescript
const alojamientos = useAlojamientos(); // brand-filtered from ServiceProvider
const state = usePackageState();

const hotelesData = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const pa of state.paqueteAlojamientos) {
    counts[pa.alojamientoId] = (counts[pa.alojamientoId] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([alojId, count]) => {
      const hotel = alojamientos.find((a) => a.id === alojId);
      return { nombre: hotel?.nombre ?? "Desconocido", count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}, [alojamientos, state.paqueteAlojamientos]);
```

### Anti-Patterns to Avoid

- **Calling `usePackageState()` inside recharts `Cell` or `Tooltip` render callbacks:** Context hooks can only be called at component level — derive all data with `useMemo` before passing to recharts.
- **Using `useState` to update counter values on every animation frame:** Motion's `animate(motionValue, target)` updates the DOM directly via `motion.span` — no `useState` needed for the number itself.
- **Importing recharts without `"use client"` directive:** recharts uses browser APIs — the page must be a client component.
- **Animating recharts bars AND motion counters simultaneously on first paint:** Both trigger on mount — this is fine since they're on different DOM nodes, but verify no layout jank by checking the glass cards render before recharts attempts to measure container width.
- **Step 1 of wizard letting user proceed with no etiqueta selected:** The Siguiente button must be disabled until a selection is made — guard each step's Next button.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animated number counter | Custom `setInterval` + `useState` ticker | `animate(useMotionValue, target)` from `motion/react` | Skips React re-renders, GPU-optimized, handles cleanup |
| Bar chart | SVG `<rect>` elements with D3 scales | `recharts` (already installed) | Responsive, accessible, handles tooltip, axis formatting |
| Step wizard indicator | Custom step dots/circles from scratch | Build with existing `Badge` or simple flex + inline styles | Only 5 steps, static — no library needed, but don't over-engineer |
| Email preview template | External email library (react-email, mjml) | Plain JSX with inline styles | This is a simulated preview, not real email delivery |
| Toast on send | Custom notification component | `useToast()` from `@/components/ui/Toast` | Already in the provider tree, matches glass design |
| Destino lookup | GraphQL query or API call | `useMemo` join over context state | All data is already in React context — no fetch needed |

**Key insight:** Every data query for Dashboard, Notificaciones, and Reportes is a join or filter over data already available in the existing context providers. No new providers, no API calls, no new dependencies.

---

## Common Pitfalls

### Pitfall 1: ResponsiveContainer width="100%" failing on first render

**What goes wrong:** recharts `ResponsiveContainer` measures its parent's width on mount. If the parent container has no explicit width (e.g., it's inside a flex child that hasn't painted), the chart renders at 0px wide and never corrects.

**Why it happens:** The `ResponsiveContainer` uses `ResizeObserver` internally. In some Next.js SSR scenarios, the first paint sees 0 dimensions.

**How to avoid:** Wrap the chart card in a container with explicit `w-full` and ensure the parent `<div>` in `page.tsx` is `width: "100%"`. Also set a `minHeight` on the `ResponsiveContainer` (e.g., `height={280}` — use a fixed number, not `"100%"`).

**Warning signs:** Chart invisible on first load but visible after window resize.

### Pitfall 2: `motion.span` renders MotionValue object, not number

**What goes wrong:** `<motion.span>{count}</motion.span>` where `count` is a `MotionValue<number>` — this works if `motion.span` is used (it reads the value). But `<span>{count}</span>` (plain span) renders `[object Object]`.

**Why it happens:** `MotionValue` is an object, not a primitive. Only `motion.*` components know how to read and re-render it.

**How to avoid:** Always use `<motion.span>{count}</motion.span>` — never a plain `<span>`.

**Warning signs:** Counter displays `[object Object]` on screen.

### Pitfall 3: Wizard state not resetting after send

**What goes wrong:** User completes wizard, sends, then clicks Notificaciones again and sees the wizard in its final state (step 5) with stale selections.

**Why it happens:** `useState` inside the page component persists across navigations if Next.js page caching keeps the component mounted.

**How to avoid:** After toast shows and send is "complete", reset all wizard state: `setStep(1)`, `setSelectedEtiquetaId(null)`, `setSelectedPaqueteIds(new Set())`.

**Warning signs:** Returning to the page after sending shows old wizard state.

### Pitfall 4: `usePackageState()` cross-brand data leak in Reportes

**What goes wrong:** `state.paqueteAlojamientos` in PackageState is NOT brand-filtered by default — it contains ALL brands' junction records. If you count `alojamientoId` occurrences without filtering to brand, hoteles from brand-2 appear in brand-1's report.

**Why it happens:** Junction tables (PaqueteAlojamiento, PaqueteAereo, PaqueteEtiqueta) don't have a `brandId` field — they reference `paqueteId` which does. You must filter junction records through the paquete's brandId.

**How to avoid:** Always start from `usePaquetes()` (which is brand-filtered) and collect their IDs, then filter junction records to only those paquete IDs.

```typescript
const paquetes = usePaquetes(); // brand-filtered
const paqueteIds = new Set(paquetes.map((p) => p.id));
const brandPaqueteAlojamientos = state.paqueteAlojamientos.filter(
  (pa) => paqueteIds.has(pa.paqueteId)
);
```

**Warning signs:** Hoteles or destinos from the other brand appear in the chart.

### Pitfall 5: Root redirect not updated

**What goes wrong:** The root `src/app/page.tsx` redirects authenticated users to `/paquetes`. After Phase 8, it should redirect to `/dashboard`. If not updated, authenticated users who navigate to `/` still land on Paquetes.

**Why it happens:** The Phase 8 goal says "Root page redirects to /paquetes — needs to change to /dashboard." There's a TODO comment in `src/app/page.tsx` line 18: `router.replace("/paquetes"); // Default landing page (Dashboard is Phase 8)`.

**How to avoid:** Update `src/app/page.tsx` to `router.replace("/dashboard")` as part of this phase.

**Warning signs:** After login, user lands on Paquetes instead of Dashboard.

### Pitfall 6: recharts Tooltip styled with glassMaterials spread

**What goes wrong:** `glassMaterials.frosted` contains `backdropFilter` and `WebkitBackdropFilter`. Passing these directly as `contentStyle` to recharts `Tooltip` — recharts renders its tooltip as a plain div and those CSS properties may apply correctly, but the `boxShadow` from `glassMaterials.frosted` may conflict with recharts' own wrapper styles.

**How to avoid:** Use `glassMaterials.frosted` as base but override `border: "none"` and `borderRadius: 10`. Test visually.

---

## Code Examples

Verified patterns from official sources and codebase inspection:

### Stat Card with Animated Counter (DASH-01, REPT-01)

```typescript
// Source: motion/react exports verified in framer-motion/dist/cjs/index.js
// Card.tsx stat variant uses glassMaterials.liquid inline style
import { useEffect } from "react";
import { motion, useMotionValue, animate, useTransform } from "motion/react";
import { Card, CardContent, StatIcon } from "@/components/ui/Card";
import { Package } from "lucide-react";
import { glassMaterials } from "@/components/lib/glass";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  const count = useMotionValue(0);
  // Round to integer for display
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value]);

  return (
    <Card variant="stat" className="flex-1">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">
              {label}
            </p>
            <motion.span className="text-3xl font-bold font-mono text-neutral-900">
              {rounded}
            </motion.span>
          </div>
          <StatIcon style={{ background: `${color}20`, color }}>
            <Icon size={18} strokeWidth={1.75} />
          </StatIcon>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Recharts BarChart Styled for Glass Design System (REPT-02)

```typescript
// Source: recharts 2.15.4 types/index.d.ts — all exports confirmed
// glassMaterials from @/components/lib/glass
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { glassMaterials } from "@/components/lib/glass";

// Glass tooltip content style
const tooltipStyle: React.CSSProperties = {
  ...glassMaterials.frosted,
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  color: "rgba(26,26,46,0.8)",
};

// Usage
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={destinoChartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,46,0.06)" vertical={false} />
    <XAxis
      dataKey="destino"
      tick={{ fill: "rgba(26,26,46,0.5)", fontSize: 12 }}
      axisLine={false}
      tickLine={false}
    />
    <YAxis
      tick={{ fill: "rgba(26,26,46,0.4)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      allowDecimals={false}
    />
    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,191,173,0.06)" }} />
    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="rgba(59,191,173,0.75)" />
  </BarChart>
</ResponsiveContainer>
```

### Wizard Step Machine (NOTF-01 through NOTF-05)

```typescript
// Source: codebase pattern — local useState for multi-step
"use client";
import { useState } from "react";
import { useEtiquetas } from "@/components/providers/CatalogProvider";
import { usePaquetes, usePackageState } from "@/components/providers/PackageProvider";
import { useToast } from "@/components/ui/Toast";

type WizardStep = 1 | 2 | 3 | 4 | 5;

export default function NotificacionesPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedEtiquetaId, setSelectedEtiquetaId] = useState<string | null>(null);
  const [selectedPaqueteIds, setSelectedPaqueteIds] = useState<Set<string>>(new Set());

  const etiquetas = useEtiquetas(); // CatalogProvider — brand-filtered
  const paquetes = usePaquetes();   // PackageProvider — brand-filtered
  const state = usePackageState();

  // Step 2: filter paquetes by selected etiqueta
  const filteredPaquetes = selectedEtiquetaId
    ? paquetes.filter((p) =>
        state.paqueteEtiquetas.some(
          (pe) => pe.paqueteId === p.id && pe.etiquetaId === selectedEtiquetaId,
        ),
      )
    : [];

  const handleSend = () => {
    // Simulated send — show success toast then reset
    toast("success", "Notificaciones enviadas", `${selectedPaqueteIds.size} vendedores notificados`);
    setStep(1);
    setSelectedEtiquetaId(null);
    setSelectedPaqueteIds(new Set());
  };

  // Render step content conditionally...
}
```

### Brand-Filtered Junction Table Pattern (Cross-Brand Safety)

```typescript
// Source: paquetes/page.tsx lines 85-108 — established join pattern
// Always filter junctions through paquete IDs to prevent cross-brand data
const paquetes = usePaquetes(); // brand-filtered
const paqueteIds = useMemo(() => new Set(paquetes.map((p) => p.id)), [paquetes]);
const state = usePackageState();

const brandSafeAlojamientos = useMemo(
  () => state.paqueteAlojamientos.filter((pa) => paqueteIds.has(pa.paqueteId)),
  [state.paqueteAlojamientos, paqueteIds],
);
```

### Root Page Redirect Update (DASH requirement)

```typescript
// Source: src/app/page.tsx — line 18 has TODO comment for Phase 8
// Change from:
router.replace("/paquetes");
// To:
router.replace("/dashboard");
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package name | `motion` package (reexports framer-motion) | v11+ | Import from `motion/react`, not `framer-motion/react` |
| `animate` as component (`<motion.animate>`) | `animate()` function for MotionValue | — | `animate(motionValue, target, options)` is the imperative API |
| recharts without `"use client"` | recharts requires client component | Next.js 13+ | All recharts pages must have `"use client"` directive |
| `framer-motion` MotionValue string rendering | `motion.span` renders MotionValue directly | v10+ | No need for `useEffect` + `useState` pattern for counter display |

**Deprecated/outdated:**
- `useDeprecatedAnimatedState`: Replaced by `useAnimate` — do not use
- `AnimateSharedLayout`: Replaced by `layoutId` on `motion.*` elements — do not use

---

## Open Questions

1. **Integer vs float display in AnimatedCounter**
   - What we know: `useTransform(count, Math.round)` produces a derived MotionValue that rounds. This is confirmed to work by the framer-motion API.
   - What's unclear: Whether `<motion.span>{rounded}</motion.span>` correctly displays the integer (MotionValue<number>) vs the raw float `count`.
   - Recommendation: Test both `rounded` (via `useTransform`) and `Math.round(count.get())` in a `onChange` callback. If display is wrong, use the callback pattern: `count.on("change", (v) => setDisplayValue(Math.round(v)))`.

2. **Simulated "visitas web" count for REPT-01**
   - What we know: There is no web analytics data. The requirement says "visitas web simuladas."
   - What's unclear: Whether this should be a hardcoded constant (e.g., 1_247) or a slightly randomized value per brand.
   - Recommendation: Use a hardcoded constant (e.g., 1247 for brand-1, 892 for brand-2) — derive from `activeBrandId` in a map. Do not randomize on each render.

3. **Email preview template design for NOTF-04**
   - What we know: It's a simulated preview (no real email library). Requirements say "service summary and links."
   - What's unclear: Exact visual design of the email preview card.
   - Recommendation: Render a glass card with a simple email layout: brand logo area, heading "Nuevos paquetes disponibles", list of selected paquetes with titulo, destino, precioVenta, and a fake "Ver paquete" link button. Style with inline styles matching the email-like appearance (white background, simple typography).

4. **Quick access module links for DASH-03**
   - What we know: `visibleModules` from `useAuth()` filters what the user can see. The Dashboard should show "all modules."
   - What's unclear: Whether Dashboard quick links should also respect `visibleModules` filtering (VENDEDOR only sees Paquetes).
   - Recommendation: Apply the same `visibleModules` filter used in Sidebar. This ensures VENDEDOR's dashboard shows only the Paquetes quick link.

---

## Sources

### Primary (HIGH confidence)

- `/src/components/lib/glass.ts` — glassMaterials object with all 5 glass variants (frosted, frostedSubtle, frostedDark, liquid, liquidModal) — confirmed in codebase
- `/src/components/lib/animations.ts` — springs, stagger, interactions — confirmed in codebase
- `/src/components/ui/Card.tsx` — Card with stat variant using `glassMaterials.liquid` — confirmed in codebase
- `/src/components/ui/Toast.tsx` — `useToast()` hook and ToastProvider — confirmed in codebase
- `/src/components/ui/Table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell — confirmed in codebase
- `/src/components/providers/PackageProvider.tsx` — `usePaquetes()`, `usePackageState()`, `usePaqueteServices()`, `usePackageActions()` — confirmed in codebase
- `/src/components/providers/CatalogProvider.tsx` — `useEtiquetas()`, `useTemporadas()` — confirmed in codebase
- `/src/components/providers/ServiceProvider.tsx` — `useAereos()`, `useAlojamientos()` — confirmed in codebase
- `node_modules/recharts/package.json` + `types/index.d.ts` — recharts 2.15.4, exports: BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell — confirmed
- `node_modules/motion/package.json` — motion 12.36.0 (wraps framer-motion)
- `node_modules/framer-motion/dist/cjs/index.js` — `animate`, `useMotionValue`, `useTransform`, `useSpring`, `useAnimate` exports confirmed
- `/src/lib/data/paquetes.ts` — SEED_PAQUETE_ETIQUETAS junction data confirmed with brand-1/brand-2 etiquetaIds
- `/src/lib/data/catalogos.ts` — SEED_ETIQUETAS with 8 brand-1 + 5 brand-2 etiquetas, each with `{id, nombre, slug, color}` hex string
- `/src/app/(admin)/paquetes/page.tsx` lines 85-108 — established destino join pattern via `aereoMap` + `paqueteAereos`

### Secondary (MEDIUM confidence)

- WebSearch: `motion/react` v12 counter animation via `animate(motionValue, target, {duration, ease})` pattern — confirmed pattern is consistent with framer-motion docs and multiple community sources (buildui.com recipe, driaug/animated-counter)
- WebSearch: recharts 2.x `BarChart` requires `ResponsiveContainer` wrapper, `Bar` with `dataKey`, `radius` for rounded corners — consistent with recharts GitHub discussions

### Tertiary (LOW confidence)

- WebSearch: `useTransform(motionValue, Math.round)` produces rounded integer MotionValue — mentioned in community examples but not directly verified in the installed codebase types. If it doesn't work as expected, fallback to `count.on("change", callback)` pattern.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and exports verified in node_modules
- Architecture: HIGH — follows existing patterns from paquetes/page.tsx and all other module pages
- Recharts API: HIGH — types confirmed in recharts/types/index.d.ts, 2.15.4 installed
- Motion counter animation: MEDIUM — `animate` + `useMotionValue` confirmed exported; `useTransform(count, Math.round)` is LOW confidence on exact behavior
- Pitfalls: HIGH — cross-brand junction filtering verified, root redirect confirmed from source code comment, Responsive Container sizing is a known recharts issue

**Research date:** 2026-03-16
**Valid until:** 2026-04-15 (recharts 2.x is stable; motion API is stable for v12 branch)
