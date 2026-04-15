/**
 * Design tokens — single source of truth for spacing, radius, typography,
 * and color primitives used by the data + form component layer.
 *
 * Chrome surfaces (Sidebar, Topbar, Dashboard hero, Login background) keep
 * `glassMaterials` from ./glass. Everything else consumes `ds` from this file.
 */

export const ds = {
  row: {
    /** Standard data-table row height — dense but legible. */
    height: "44px",
    /** Horizontal + vertical padding for table cells. */
    pad: { x: "16px", y: "10px" },
  },
  header: {
    /** Table header bar height. */
    height: "36px",
  },
  radius: {
    /** Inputs, selects, buttons, cells, chips, kbd hints. */
    input: "8px",
    /** Cards, dropdowns, tooltips, popovers. */
    card: "12px",
    /** Modals, command palette. */
    modal: "20px",
    /** Pill shape for chips / dots / avatars. */
    pill: "9999px",
  },
  type: {
    /** Small uppercase label (table headers, field labels). */
    label: {
      size: "10.5px",
      tracking: "0.08em",
      weight: 500,
      transform: "uppercase" as const,
    },
    /** Body text (field values, row content). */
    body: {
      size: "13.5px",
      lineHeight: "20px",
      weight: 400,
    },
    /** Monospace metadata (IDs, prices, dates, codes, kbd). */
    mono: {
      family: '"JetBrains Mono", "SF Mono", monospace',
      size: "12px",
      weight: 500,
      features: '"tnum"', // tabular nums
    },
  },
  color: {
    /** Hairline borders on tables, forms, dividers. */
    hairline: "rgba(17,17,36,0.07)",
    /** Subtler rail background for zebra / hover. */
    rail: "rgba(17,17,36,0.025)",
    /** Sticky table header background. */
    headerBg: "rgba(255,255,255,0.95)",
    /** Text tiers. */
    text: {
      primary: "#1A1A2E",
      secondary: "#6B6F99",
      tertiary: "#8A8DB5",
      muted: "#B0B4CD",
    },
    /** Brand accents — rationed. */
    accent: {
      teal: "#3BBFAD",
      tealSoft: "rgba(59,191,173,0.10)",
      tealRing: "rgba(59,191,173,0.25)",
      violet: "#7C3AED",
      danger: "#E74C5F",
      success: "#2A9E8E",
      warning: "#F59E0B",
    },
  },
  /** Motion timings — short, crisp, never jittery. */
  motion: {
    fast: 120,
    base: 180,
    slow: 240,
  },
} as const;

export type DS = typeof ds;
