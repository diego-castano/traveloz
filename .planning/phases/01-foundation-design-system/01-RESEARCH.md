# Phase 1: Foundation & Design System - Research

**Researched:** 2026-03-16
**Domain:** Glassmorphism/Claymorphism Component Library with design.json v3 tokens, Tailwind CSS v3, Radix UI, Motion (Framer Motion), CVA
**Confidence:** HIGH

## Summary

Phase 1 builds the complete UI primitive library that every subsequent phase composes into module pages. The 21 DSYS requirements cover glass surfaces (cards, modals, toasts, tables), clay surfaces (buttons, pagination), form controls (inputs, selects, toggles, checkboxes, date pickers), display components (badges, tags, breadcrumbs, avatars, skeletons, price display), and layout utilities (tabs, search/filter, image uploader). Each component must render with exact design.json v3 token values -- specific rgba backgrounds, backdrop-filter blur/saturate values, box-shadow stacks, and Motion spring configurations.

The design.json v3 file is the single source of truth. It provides a complete `tailwindExtend` section ready to paste into `tailwind.config.ts`, five glass material definitions (frosted, frostedSubtle, frostedDark, liquid, liquidModal), clay button definitions with colored variants (teal, red, violet, navy), a full animation system with 5 named spring configs and 17 CSS keyframe definitions, and per-component token specifications for all 21 required components.

**Primary recommendation:** Build components in dependency order -- token layer first (tailwind config + glass utility functions), then atomic primitives (Button, Input, Badge), then composite components (Table, Modal, Toast, Tabs), then specialized components (PriceDisplay, DatePicker, ImageUploader). Each component should use CVA for variant definitions, inline styles for glass-specific properties (backdrop-filter, complex backgrounds), and Motion for spring animations. Use Radix primitives for Dialog, Select, DropdownMenu, and Tabs accessibility -- styled with the design system tokens.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DSYS-01 | Glass component library with correct backdrop-filter, blur, gradient tokens from design.json v3 | Glass material definitions (frosted/liquid/liquidModal), tailwindExtend section, cn() utility pattern, inline style strategy for backdrop-filter |
| DSYS-02 | Clay buttons with 3D shadow effects, sheen hover, press scale(0.96) | Clay colored variants (teal/red/violet/navy), CVA variant pattern, Motion whileTap/whileHover, sheen gradient animation |
| DSYS-03 | Glass inputs with focus double-ring (white + teal), error shake, all states | Input states (default/hover/focus/error/disabled/readOnly), focus shadow tokens, microBounce error animation |
| DSYS-04 | Glass table with dark header, row hover gradient, stagger animation | Table header bg rgba(26,26,46,0.94), rowHover interaction, staggerChildren config (0.04/0.08), frosted material |
| DSYS-05 | Modal with liquid glass backdrop-filter blur(40px), scale spring entrance from 0.88 | liquidModal material, modalOpen interaction (overlay + content), Radix Dialog + forceMount + AnimatePresence pattern |
| DSYS-06 | Toast with frosted glass and slide spring from right | Toast enhanced glass, toastSlide interaction (x:80, bouncy spring), auto-dismiss 5000ms, stacking pattern |
| DSYS-07 | Badge in 9 glass variants | 9 badge variants with exact bg/text/border tokens, 3 sizes (sm/md/lg), backdrop-filter blur(8px) |
| DSYS-08 | Tabs with animated violet->teal gradient indicator using layoutId | Tabs activeIndicator gradient, Motion layoutId="activeTab", snappy spring, Radix Tabs primitive |
| DSYS-09 | SearchFilter with glass search bar and filter chips | searchFilter tokens, filterChip material, focus shadow, buttonPress interaction on chips |
| DSYS-10 | PriceDisplay showing Neto->Markup->Venta with animated arrows | priceDisplay tokens, arrowPulse animation, mono font family, USD currency format |
| DSYS-11 | Card variants (glass/liquid/stat) with breathe animation and sheen | 3 card variants in design.json, liquid pseudoSheen/pseudoConicGlow, liquidFloat + borderGlow CSS animations |
| DSYS-12 | Pagination with clay active state | Table pagination tokens, clay colored teal for active, hover bg for inactive |
| DSYS-13 | Select dropdown with liquid glass animated overlay | Select extends input, frosted dropdown material, dropdownIn animation, Radix Select + CSS data-state animations |
| DSYS-14 | Toggle with spring bounce animation | Toggle tokens (44x24px, off/on bg), layout=true, bouncy spring config |
| DSYS-15 | Checkbox with pop animation | Checkbox tokens (20px, 6px radius), checkPop keyframe, bouncy spring, teal gradient checked |
| DSYS-16 | Tag pills removable with colors | 6 tag color presets (teal/violet/red/orange/green/blue), pill radius, backdrop-filter blur(6px) |
| DSYS-17 | Skeleton loader | Skeleton shimmer animation 1.8s infinite, gradient background, 12px border radius |
| DSYS-18 | Avatar | 4 sizes (xs:24/sm:32/md:40/lg:48), pill radius, white border, elevation-2 shadow |
| DSYS-19 | Breadcrumb | 12.5px font, "/" separator, muted color, current item dark, link hover teal |
| DSYS-20 | DatePicker | react-day-picker v9 in Radix Popover, liquid glass calendar popup, teal selected day clay, 20px radius |
| DSYS-21 | ImageUploader dropzone with glass style and thumbnails | frostedSubtle dropzone, dashed border, teal hover border, 80px thumbnails, drag reorder interaction |
</phase_requirements>

## Standard Stack

### Core (Pinned -- from STACK.md research)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 3.4.18 | Utility-first CSS with design token extension | v3 `tailwind.config.ts` extend pattern maps 1:1 with design.json tailwindExtend section. v4 incompatible. |
| motion | 12.36.0+ | Spring physics, AnimatePresence, layoutId, stagger | Rebranded framer-motion. Import from `motion/react`. All 21 components need Motion for interactions. |
| radix-ui | 1.4.3+ | Accessible headless primitives | Unified package. Provides Dialog (DSYS-05), Select (DSYS-13), Tabs (DSYS-08), Popover (DSYS-20). |
| class-variance-authority | 0.7.1 | Type-safe component variants | Standard for Tailwind variant systems. Button 6 variants, Badge 9 variants, Card 3 variants, Input 6 states. |
| clsx | 2.1.1 | Conditional class merging | Combined with tailwind-merge in cn() helper. |
| tailwind-merge | 2.6.0 | Tailwind class conflict resolution | Must use v2.6, NOT v3 (v3 drops Tailwind v3 support). |
| lucide-react | 0.577.0 | Icons | Design.json specifies exact icon names per component (e.g., toast variants use CheckCircle, XCircle, etc). |

### Supporting (Phase 1 specific)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | 9.14.0 | Calendar/DatePicker core | DSYS-20. Radix has no DatePicker. Use inside Radix Popover with glass styling via classNames prop. |
| date-fns | 4.1.0 | Date formatting for DatePicker | Required by react-day-picker. Use `es` locale for Spanish date display. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-day-picker | Custom date picker | RDP v9 has full classNames customization and Tailwind support. Custom = weeks of work for date edge cases. |
| CVA for variants | Tailwind-variants | CVA is the established standard with this stack. Tailwind-variants targets v4. |
| Radix Select | Custom select with listbox | Radix Select handles keyboard nav, focus trap, screen readers. Custom = accessibility debt. |
| Inline styles for glass | Tailwind plugins for backdrop-filter | Tailwind v3 has backdrop-blur utilities but not saturate+brightness combos. Inline style is the pragmatic choice. |

**Installation (Phase 1 specific):**
```bash
npm install react-day-picker@^9.14.0
# All other deps should already be installed from project init
```

## Architecture Patterns

### Recommended Component Structure
```
src/components/
  ui/
    Button.tsx          # CVA variants: primary/danger/secondary/ghost/ghostDanger/icon
    Input.tsx           # Glass input with 6 states + label + error text
    Select.tsx          # Radix Select + frosted dropdown + dropdownIn animation
    Textarea.tsx        # Extends Input glass pattern
    Toggle.tsx          # Motion layout + bouncy spring
    Checkbox.tsx        # Motion scale + checkPop
    Badge.tsx           # CVA 9 variants + 3 sizes
    Tag.tsx             # 6 color presets + removable X
    Table.tsx           # Glass table: header + rows + stagger + hover
    Modal.tsx           # Radix Dialog + liquidModal material + forceMount + AnimatePresence
    Toast.tsx           # Frosted glass + toastSlide + stack manager
    Card.tsx            # CVA 3 variants: default/liquid/stat
    Tabs.tsx            # Radix Tabs + Motion layoutId indicator
    SearchFilter.tsx    # Glass search bar + filter chips
    PriceDisplay.tsx    # Neto -> Markup -> Venta with arrows
    ImageUploader.tsx   # Dropzone + thumbnails + drag reorder
    Breadcrumb.tsx      # Simple nav breadcrumb
    Avatar.tsx          # 4 sizes, fallback initials
    Skeleton.tsx        # Shimmer animation loader
    DatePicker.tsx      # react-day-picker in Radix Popover
    Pagination.tsx      # Clay active state buttons
  lib/
    cn.ts               # clsx + tailwind-merge utility
    glass.ts            # Glass material style objects (frosted, liquid, liquidModal, etc.)
    animations.ts       # Reusable Motion spring configs and interaction presets
    tokens.ts           # Optional: typed token accessors for design.json values
```

### Pattern 1: Glass Material Utility Functions

**What:** Centralized style objects for glass surfaces, avoiding copy-paste of complex rgba/backdrop-filter values.
**When to use:** Every component that needs a glass surface (which is almost all of them).
**Why:** design.json defines 5 distinct glass materials. Inlining these values in 21+ components creates drift. A single source for glass styles ensures consistency and allows global blur reduction for performance tuning.

```typescript
// src/components/lib/glass.ts

export const glassMaterials = {
  frosted: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.25)',
    boxShadow: '0 8px 32px rgba(26,26,46,0.06), 0 1px 3px rgba(26,26,46,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
  },
  frostedSubtle: {
    background: 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(12px) saturate(150%)',
    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 2px 8px rgba(26,26,46,0.03)',
  },
  frostedDark: {
    background: 'rgba(26,26,46,0.78)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
  },
  liquid: {
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(30px) saturate(200%) brightness(1.05)',
    WebkitBackdropFilter: 'blur(30px) saturate(200%) brightness(1.05)',
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: '0 8px 32px rgba(26,26,46,0.08), 0 2px 6px rgba(26,26,46,0.04), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.1)',
  },
  liquidModal: {
    background: 'rgba(255,255,255,0.58)',
    backdropFilter: 'blur(40px) saturate(220%) brightness(1.08)',
    WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(1.08)',
    border: '1px solid rgba(255,255,255,0.4)',
    boxShadow: '0 40px 80px rgba(26,26,46,0.18), 0 16px 32px rgba(108,43,217,0.06), inset 0 2px 0 rgba(255,255,255,0.5)',
  },
} as const;

export type GlassMaterial = keyof typeof glassMaterials;
```

### Pattern 2: Motion Spring Presets from design.json

**What:** Named spring configurations matching design.json exactly.
**When to use:** Every Motion animation.

```typescript
// src/components/lib/animations.ts
import type { SpringOptions } from 'motion';

export const springs = {
  snappy:  { type: 'spring' as const, stiffness: 500, damping: 30, mass: 0.8 },
  gentle:  { type: 'spring' as const, stiffness: 260, damping: 25, mass: 1 },
  bouncy:  { type: 'spring' as const, stiffness: 400, damping: 20, mass: 0.8 },
  slow:    { type: 'spring' as const, stiffness: 150, damping: 25, mass: 1.2 },
  micro:   { type: 'spring' as const, stiffness: 600, damping: 35, mass: 0.5 },
} as const;

export const stagger = {
  container: {
    initial: 'hidden',
    animate: 'show',
    variants: {
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.04,
          delayChildren: 0.08,
        },
      },
    },
  },
  item: {
    variants: {
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0 },
    },
  },
} as const;

// Interaction presets matching design.json interactions
export const interactions = {
  buttonPress: {
    whileTap: { scale: 0.96 },
    whileHover: { scale: 1.01, y: -1 },
    transition: springs.snappy,
  },
  cardHover: {
    whileHover: { y: -5, scale: 1.01 },
    whileTap: { scale: 0.995, y: 0 },
    transition: springs.gentle,
  },
  modalContent: {
    initial: { opacity: 0, scale: 0.88, y: 30, filter: 'blur(8px)' },
    animate: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.95, y: -10, filter: 'blur(4px)' },
    transition: springs.gentle,
  },
  toastSlide: {
    initial: { opacity: 0, x: 80, scale: 0.9, filter: 'blur(4px)' },
    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: 80, scale: 0.9 },
    transition: springs.bouncy,
  },
  dropdownOpen: {
    initial: { opacity: 0, scale: 0.92, y: -8, filter: 'blur(4px)' },
    animate: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.95, y: -4, filter: 'blur(2px)' },
    transition: springs.snappy,
  },
  checkboxCheck: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: springs.bouncy,
  },
} as const;
```

### Pattern 3: CVA + Glass Style Objects for Components

**What:** Use CVA for Tailwind class variants AND a separate style object for glass-specific CSS.
**When to use:** Components that need both variant classes (sizing, colors) and glass inline styles (backdrop-filter).
**Why:** CVA handles classes, not style objects. Glass properties require inline styles because Tailwind v3 cannot express combined `backdrop-filter: blur(X) saturate(Y) brightness(Z)`.

```typescript
// src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import { cn } from '@/components/lib/cn';
import { springs } from '@/components/lib/animations';

const buttonVariants = cva(
  // base classes (common to all variants)
  'inline-flex items-center justify-center font-semibold rounded-clay transition-colors focus-visible:outline-none',
  {
    variants: {
      variant: {
        primary: 'text-white',
        danger: 'text-white',
        secondary: 'text-neutral-700 border border-neutral-200',
        ghost: 'text-neutral-600 hover:bg-neutral-100/60',
        ghostDanger: 'text-brand-red-500 hover:bg-brand-red-100/50',
        icon: 'text-neutral-400 hover:text-neutral-600',
      },
      size: {
        xs: 'h-7 px-2.5 text-[11px]',
        sm: 'h-[34px] px-3.5 text-[12.5px]',
        md: 'h-10 px-[18px] text-sm',
        lg: 'h-[46px] px-[22px] text-[15px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// Glass/clay styles that CANNOT be expressed in CVA (require inline style)
const clayStyles = {
  primary: {
    background: 'linear-gradient(145deg, #45D4C0 0%, #2A9E8E 100%)',
    boxShadow: '6px 6px 16px rgba(42,158,142,0.25), -3px -3px 10px rgba(69,212,192,0.3), inset 0 1px 0 rgba(255,255,255,0.35)',
  },
  danger: {
    background: 'linear-gradient(145deg, #E74C5F 0%, #CC2030 100%)',
    boxShadow: '6px 6px 16px rgba(204,32,48,0.25), -3px -3px 10px rgba(231,76,95,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
  },
  // secondary and ghost use Tailwind classes only
};
```

### Pattern 4: Radix Dialog + Motion AnimatePresence (Modal)

**What:** Reference integration pattern for animated Radix modals.
**When to use:** DSYS-05 (Modal), and any other Dialog usage.
**Critical:** Apply `forceMount` to BOTH Overlay and Content. Control open state externally. Wrap conditional content in AnimatePresence.

```typescript
// src/components/ui/Modal.tsx (simplified reference)
import { Dialog } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';
import { glassMaterials } from '@/components/lib/glass';
import { interactions } from '@/components/lib/animations';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[30]"
                style={{ background: 'rgba(26,26,46,0.45)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                transition={{ duration: 0.3 }}
              />
            </Dialog.Overlay>
            <Dialog.Content forceMount asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-[40] -translate-x-1/2 -translate-y-1/2 rounded-glass-xl"
                style={glassMaterials.liquidModal}
                {...interactions.modalContent}
              >
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
```

### Pattern 5: Radix Tabs + Motion layoutId (Tab Indicator)

**What:** Animated tab indicator that slides between tabs.
**When to use:** DSYS-08 (Tabs component).

```typescript
// src/components/ui/Tabs.tsx (simplified reference)
import { Tabs as RadixTabs } from 'radix-ui';
import { motion } from 'motion/react';
import { springs } from '@/components/lib/animations';

export function Tabs({ items, value, onValueChange }) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List className="relative flex border-b border-neutral-150/50">
        {items.map((item) => (
          <RadixTabs.Trigger key={item.value} value={item.value} className="relative px-4 py-2.5">
            {item.label}
            {value === item.value && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #3BBFAD)' }}
                transition={springs.snappy}
              />
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {/* TabContent panels */}
    </RadixTabs.Root>
  );
}
```

### Pattern 6: DatePicker = react-day-picker + Radix Popover

**What:** Custom DatePicker since Radix has no built-in calendar primitive.
**When to use:** DSYS-20.

```typescript
// src/components/ui/DatePicker.tsx (simplified reference)
import { Popover } from 'radix-ui';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { glassMaterials } from '@/components/lib/glass';

export function DatePicker({ value, onChange }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="/* glass input styles */">
          {value ? format(value, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          className="rounded-glass-lg p-3 z-[50]"
          style={glassMaterials.liquid}
        >
          <DayPicker
            mode="single"
            selected={value}
            onSelect={onChange}
            locale={es}
            classNames={{
              // Override with Tailwind classes for glass styling
              selected: 'bg-brand-teal-400 text-white rounded-lg',
              today: 'font-bold text-brand-violet-500',
              // ... more classNames
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

### Anti-Patterns to Avoid

- **Animating backdrop-filter directly:** Never animate the `backdrop-filter` property on the same element. It triggers GPU recomposition every frame. Instead, apply glass styles to a static wrapper and animate a sibling/parent with `opacity`/`transform` only.

- **Copy-pasting glass values:** Never inline `rgba(255,255,255,0.72)` and `blur(20px) saturate(180%)` directly in components. Always reference `glassMaterials.frosted` or similar. When performance tuning requires reducing blur, you change one file.

- **Mixing Tailwind bg classes with inline style background:** If a component uses `style={{ background: 'rgba(...)' }}`, do NOT also set `className="bg-white/70"`. The inline style wins, making the class dead code that confuses future developers.

- **Using Radix Select for animated dropdowns with AnimatePresence:** Radix Select does not support `forceMount` on Content when using `position="popper"`. Use CSS `data-[state=open]` / `data-[state=closed]` transitions instead of Motion for Select specifically. Reserve Motion AnimatePresence for Dialog and DropdownMenu only.

- **Single monolithic z-index values:** Never use arbitrary z-index values. The design.json defines a z-index scale: `dropdown: 10, sticky: 20, overlay: 30, modal: 40, popover: 50, toast: 60, sidebar: 100`. Use these consistently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dialog/Modal accessibility | Custom modal with div + backdrop | Radix Dialog with forceMount | Focus trap, Esc to close, scroll lock, aria attributes, portal rendering -- dozens of edge cases |
| Select/Dropdown keyboard nav | Custom dropdown with ul/li | Radix Select | Arrow key navigation, typeahead search, screen reader announcements, portal positioning |
| Tab panel accessibility | Custom tabs with onClick state | Radix Tabs | Arrow key navigation between tabs, automatic/manual activation, ARIA tablist/tabpanel roles |
| Date picker calendar | Custom calendar grid | react-day-picker v9 | Date math edge cases (leap years, month boundaries, locale formatting, keyboard nav within grid) |
| Component variant system | Manual if/else className logic | CVA (class-variance-authority) | Type safety, compound variants, default variants, clean separation of variant logic from JSX |
| Class merging | String concatenation | cn() = clsx + tailwind-merge | Tailwind class conflicts (e.g., `p-2` vs `p-4`) need intelligent resolution, not simple concatenation |
| Toast stacking/lifecycle | Custom timeout + state management | Dedicated toast context with queue | Auto-dismiss timing, stack positioning, enter/exit animation coordination, max toast limit |
| Spring physics | CSS `transition: transform 0.3s ease` | Motion spring configs | CSS easing cannot match physical spring behavior (overshoot, settle). The design explicitly specifies spring configs. |

**Key insight:** The design.json specifies exact animation physics (spring stiffness/damping/mass) that CSS transitions cannot reproduce. Every interactive component needs Motion for spec-accurate behavior.

## Common Pitfalls

### Pitfall 1: Backdrop-Filter Stacking Context Conflicts
**What goes wrong:** Every element with `backdrop-filter` creates a new CSS stacking context. A modal opens behind the sidebar because z-index is relative to the parent stacking context, not the document.
**Why it happens:** This glassmorphism UI has backdrop-filter on sidebar, topbar, cards, modals, dropdowns, toasts -- virtually every surface. Nested stacking contexts trap z-index values.
**How to avoid:** (1) Render ALL modals, dropdowns, toasts via Radix Portals at `document.body`. (2) Use the design.json z-index scale consistently. (3) Test the composite layout (sidebar + topbar + content + modal + toast ALL visible simultaneously) as the FIRST integration test.
**Warning signs:** Adding `z-index: 9999` to fix layering means the architecture is broken.

### Pitfall 2: Animation + Backdrop-Filter = Frame Drops
**What goes wrong:** Animating `opacity`/`scale`/`y` on an element WITH `backdrop-filter: blur()` forces the GPU to recalculate the blur every frame. Multiple staggering table rows with glass = 15fps jank.
**Why it happens:** `backdrop-filter` samples all pixels behind the element. Animating the element means the sample region changes every frame.
**How to avoid:** (1) NEVER animate elements that have `backdrop-filter`. Animate a wrapper and keep the glass surface static. (2) For table row stagger, use `opacity` + `translateY` only, then apply glass after animation completes. (3) Limit simultaneous backdrop-filter elements to 3-4 per viewport (sidebar + topbar = 2 already).
**Warning signs:** Chrome DevTools Performance tab showing frame times > 16ms.

### Pitfall 3: Radix Dialog + Motion forceMount Pointer-Events Bug
**What goes wrong:** After closing a Radix Dialog animated with Motion, `pointer-events: none` remains on `document.body`, making the entire app unclickable.
**Why it happens:** Radix applies `pointer-events: none` to body when dialog opens (to prevent interaction behind overlay). With `forceMount`, Radix does not automatically clean up when AnimatePresence handles the unmounting.
**How to avoid:** (1) Build ONE reference Modal component and reuse everywhere. (2) Apply `forceMount` to Portal, Overlay, AND Content. (3) Let AnimatePresence control the conditional render. (4) After implementing, test: open modal, close it, click anywhere -- must work.
**Warning signs:** Buttons unclickable after closing a modal.

### Pitfall 4: Radix Select Exit Animations Do Not Work with AnimatePresence
**What goes wrong:** Wrapping Select.Content in AnimatePresence expecting exit animations to play. They do not -- Select closes instantly regardless.
**Why it happens:** Radix Select with `position="popper"` does not expose `forceMount` on its Content component. AnimatePresence needs the component to stay mounted during exit, but Select unmounts it immediately.
**How to avoid:** Use CSS animations with `data-[state=open]` and `data-[state=closed]` attributes for Select specifically. Save Motion AnimatePresence for Dialog and DropdownMenu only.
**Warning signs:** Select dropdown appears with animation but disappears instantly without exit animation.

### Pitfall 5: Sheen Hover Effect Performance
**What goes wrong:** The design specifies a diagonal sheen gradient that slides across clay buttons on hover. Implemented naively with `background-position` animation on the button itself (which has complex box-shadow), it causes repaint on every frame.
**Why it happens:** Animating `background-position` is not GPU-composited. Combined with the multi-layer clay box-shadow, every frame triggers a full repaint.
**How to avoid:** Implement sheen as a `::after` pseudo-element with `overflow: hidden` on the button. Animate the pseudo-element's `transform: translateX()` instead of background-position. `transform` is GPU-composited.
**Warning signs:** CPU usage spikes when hovering over buttons.

### Pitfall 6: tailwind.config.ts Token Mismatch with design.json
**What goes wrong:** Developer extends Tailwind with token names that do not match design.json, or misses tokens, leading to inconsistent styling across components.
**Why it happens:** design.json has a `tailwindExtend` section, but it must be carefully mapped into the Tailwind config's `extend` object. Missing a color scale or shadow name means a component falls back to Tailwind defaults.
**How to avoid:** Copy the entire `tailwindExtend` section from design.json into `tailwind.config.ts` extend. Verify every color, shadow, animation, keyframe, font family, border radius, and backdrop-blur token is present. This should be task #1 of Phase 1.
**Warning signs:** Components using plain `bg-white` instead of design system colors, or `shadow-lg` instead of `shadow-glass`.

## Code Examples

### cn() Utility (Foundation of all components)
```typescript
// src/components/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### tailwind.config.ts Token Configuration
```typescript
// tailwind.config.ts - key structure from design.json tailwindExtend
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'brand-violet': {
          50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD',
          400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6C2BD9',
          800: '#5B21B6', 900: '#4C1D95', 950: '#2E1065',
        },
        'brand-teal': {
          50: '#E6F8F5', 100: '#C0EFE8', 200: '#8DE5D8', 300: '#5AD5C4',
          400: '#3BBFAD', 500: '#2A9E8E', 600: '#1F7D70', 700: '#165C53',
        },
        'brand-red': {
          50: '#FFF5F6', 100: '#FFE0E3', 200: '#FFB8BF', 300: '#FF8A95',
          400: '#E74C5F', 500: '#CC2030', 600: '#A8192A', 700: '#7A1420',
        },
        'brand-navy': {
          50: '#F0F4F8', 100: '#D9E2EC', 200: '#BCCCDC', 300: '#9FB3C8',
          400: '#6B8BAE', 500: '#1A3A5C', 600: '#153050', 700: '#0F2440',
        },
        surface: { page: '#F5F6FA', card: '#FFFFFF' },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '20px', 'glass-lg': '30px', 'glass-sm': '12px', 'glass-xl': '40px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(26,26,46,0.06), 0 1px 3px rgba(26,26,46,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
        'glass-hover': '0 20px 50px rgba(26,26,46,0.12), 0 0 30px rgba(139,92,246,0.06), inset 0 2px 0 rgba(255,255,255,0.6)',
        clay: '8px 8px 20px rgba(26,26,46,0.08), -4px -4px 12px rgba(255,255,255,0.9), inset 0 2px 0 rgba(255,255,255,0.7)',
        'clay-pressed': '2px 2px 8px rgba(26,26,46,0.1), inset 0 2px 6px rgba(26,26,46,0.06)',
        'focus-teal': '0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px rgba(59,191,173,0.4)',
        'focus-violet': '0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px rgba(139,92,246,0.3)',
        'glow-violet': '0 0 20px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.08)',
        'glow-teal': '0 0 20px rgba(59,191,173,0.25), 0 0 60px rgba(59,191,173,0.08)',
        'elevation-4': '0 4px 8px -1px rgba(26,26,46,0.06), 0 2px 4px -2px rgba(26,26,46,0.04)',
        'elevation-8': '0 8px 16px -2px rgba(26,26,46,0.08), 0 4px 6px -4px rgba(26,26,46,0.04)',
        'elevation-16': '0 16px 32px -4px rgba(26,26,46,0.1), 0 6px 12px -6px rgba(26,26,46,0.05)',
        'elevation-24': '0 24px 48px -8px rgba(26,26,46,0.12), 0 8px 16px -8px rgba(26,26,46,0.06)',
        'elevation-32': '0 32px 64px -12px rgba(26,26,46,0.15), 0 12px 24px -8px rgba(26,26,46,0.08)',
      },
      borderRadius: {
        glass: '16px', 'glass-sm': '12px', 'glass-lg': '20px', 'glass-xl': '24px',
        clay: '14px', pill: '9999px',
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'mesh-float': 'meshFloat 20s ease-in-out infinite alternate',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'liquid-float': 'liquidFloat 6s ease-in-out infinite',
        'border-glow': 'borderGlow 8s ease-in-out infinite',
        'sidebar-glow': 'sidebarGlow 6s ease-in-out infinite',
        breathe: 'breathe 8s ease-in-out infinite',
        'sheen-slide': 'sheenSlide 12s ease-in-out infinite',
        'arrow-pulse': 'arrowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        liquidFloat: { '0%,100%': { transform: 'translateY(0) scale(1)' }, '50%': { transform: 'translateY(-3px) scale(1.003)' } },
        borderGlow: { '0%,100%': { borderColor: 'rgba(255,255,255,0.25)' }, '50%': { borderColor: 'rgba(139,92,246,0.15)' } },
        breathe: { '0%,100%': { opacity: '0.72' }, '50%': { opacity: '0.78' } },
        sidebarGlow: { '0%,100%': { boxShadow: '4px 0 24px rgba(108,43,217,0.08)' }, '50%': { boxShadow: '4px 0 32px rgba(108,43,217,0.14)' } },
        sheenSlide: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(59,191,173,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(59,191,173,0)' } },
        arrowPulse: { '0%,100%': { transform: 'translateX(0)' }, '50%': { transform: 'translateX(3px)' } },
        microBounce: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.05)' } },
        meshFloat: { '0%': { backgroundPosition: '0% 0%, 100% 0%, 50% 100%' }, '50%': { backgroundPosition: '100% 100%, 0% 50%, 80% 20%' }, '100%': { backgroundPosition: '50% 0%, 50% 100%, 0% 50%' } },
        subtleRotate: { '0%': { filter: 'hue-rotate(0deg)' }, '100%': { filter: 'hue-rotate(3deg)' } },
      },
    },
  },
  plugins: [],
};

export default config;
```

### Toast Stack Manager Pattern
```typescript
// src/components/ui/Toast.tsx (context + component)
// Toast needs a context-based manager for stacking multiple toasts

import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { glassMaterials } from '@/components/lib/glass';
import { interactions } from '@/components/lib/animations';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((variant: ToastVariant, title: string, description?: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, variant, title, description }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              style={{ ...glassMaterials.frosted, backdropFilter: 'blur(30px) saturate(200%) brightness(1.05)' }}
              className="max-w-[400px] rounded-glass p-4"
              {...interactions.toastSlide}
              layout
            >
              {/* Toast content with variant icon + title + description */}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
```

### Radix Select with CSS Data-State Animations (NOT AnimatePresence)
```typescript
// For DSYS-13: Select uses CSS animations, not Motion AnimatePresence
// This is because Radix Select does not support forceMount on Content (position="popper")

// In globals.css or component styles:
// .SelectContent[data-state="open"] { animation: dropdownIn 200ms ease-out; }
// .SelectContent[data-state="closed"] { animation: dropdownOut 150ms ease-in; }

// @keyframes dropdownIn {
//   from { opacity: 0; transform: scale(0.92) translateY(-8px); filter: blur(4px); }
//   to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
// }
// @keyframes dropdownOut {
//   from { opacity: 1; transform: scale(1) translateY(0); }
//   to { opacity: 0; transform: scale(0.95) translateY(-4px); filter: blur(2px); }
// }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` | 2025 (motion v12) | Package renamed. `framer-motion` is now a compat alias. Use `motion` directly. |
| `@radix-ui/react-dialog` + `@radix-ui/react-select` + ... | `import { Dialog, Select } from 'radix-ui'` | Feb 2026 (v1.4.0) | Unified package. Single import, tree-shakeable. No version conflicts between primitives. |
| tailwind-merge v3 | tailwind-merge v2.6.0 | 2025 | v3 dropped Tailwind v3 support. MUST pin v2.6 for this project. |
| react-day-picker v8 | react-day-picker v9.14.0 | 2025 | v9: full classNames API, CSS variable theming, better Tailwind integration, improved a11y. |
| `forwardRef` for all components | React 18 `forwardRef` (React 19 removes need) | Stable in React 18 | Still need `forwardRef` for Radix `asChild` usage. React 19 will change this, but we are on React 18. |

**Deprecated/outdated:**
- `framer-motion` package name: Use `motion` package with imports from `motion/react`
- Individual `@radix-ui/react-*` packages: Use unified `radix-ui` package
- tailwind-merge v3: Incompatible with Tailwind v3

## Open Questions

1. **Google Fonts loading strategy for Playfair Display, DM Sans, JetBrains Mono**
   - What we know: design.json specifies these 3 font families as the typography system
   - What's unclear: Whether to use `next/font/google` (optimal for Next.js) or `<link>` tags. Since this is a prototype, either works.
   - Recommendation: Use `next/font/google` in the root layout for automatic optimization and zero CLS. Low risk, standard Next.js pattern.

2. **Toast positioning: bottom-right vs custom from design.json**
   - What we know: design.json says `"position": "bottom-right"` for toasts
   - What's unclear: Whether toasts should stack up (bottom to top) or down (top to bottom) from the anchor point
   - Recommendation: Stack upward from bottom-right (newest toast at bottom, older toasts pushed up). This is the standard pattern.

3. **Noise overlay implementation**
   - What we know: design.json provides an SVG data URI for fractalNoise at 2.5% opacity with mix-blend-mode overlay
   - What's unclear: Best approach -- full-viewport fixed div? CSS background on body? Performance impact?
   - Recommendation: Fixed position div covering viewport, `pointer-events: none`, with the SVG noise as background. At 2.5% opacity the performance impact is negligible. Implement in the admin layout wrapper (Phase 2), not in Phase 1 components.

## Sources

### Primary (HIGH confidence)
- `design.json` v3.0.0 "Liquid Horizon" -- complete token source for all components, read in full
- `PROMPT_CLAUDE_CODE.md` -- design system visual rules, project structure, execution instructions
- `.planning/research/STACK.md` -- version pins, compatibility matrix, installation commands
- `.planning/research/PITFALLS.md` -- 7 critical pitfalls with prevention strategies
- [Radix Primitives Animation Guide](https://www.radix-ui.com/primitives/docs/guides/animation) -- forceMount, CSS data-state, JS library integration

### Secondary (MEDIUM confidence)
- [shadcn/ui Feb 2026 Radix Unified Package](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui) -- unified `radix-ui` import syntax
- [Motion for React](https://motion.dev/docs/react) -- motion/react imports, AnimatePresence, layoutId
- [Motion Radix Integration](https://motion.dev/docs/radix) -- official guide for animating Radix with Motion
- [React DayPicker v9 Styling](https://daypicker.dev/docs/styling) -- classNames prop, Tailwind integration, CSS variables
- [CVA Documentation](https://cva.style/docs) -- variant definitions, VariantProps type, compound variants
- [Radix Dialog forceMount Issues #2023](https://github.com/radix-ui/primitives/issues/2023) -- pointer-events bug documentation

### Tertiary (LOW confidence)
- None -- all findings verified through primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions pinned and verified in STACK.md with npm links
- Architecture patterns: HIGH -- patterns derived directly from design.json token structure + Radix/Motion official docs
- Pitfalls: HIGH -- documented across Radix GitHub issues, Motion issues, and PITFALLS.md research
- Component token mapping: HIGH -- every DSYS requirement maps to a specific design.json component section

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable -- all libraries are version-pinned, no fast-moving dependencies)

---
*Phase 1 research for: TravelOz Admin Panel -- Foundation & Design System (21 components)*
*design.json v3.0.0 "Liquid Horizon" -- 703 lines of tokens*
