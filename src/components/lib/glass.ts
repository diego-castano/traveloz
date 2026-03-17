export const glassMaterials = {
  frosted: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow:
      "0 8px 32px rgba(26,26,46,0.06), 0 1px 3px rgba(26,26,46,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
  },
  frostedSubtle: {
    background: "rgba(255,255,255,0.45)",
    backdropFilter: "blur(12px) saturate(150%)",
    WebkitBackdropFilter: "blur(12px) saturate(150%)",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 2px 8px rgba(26,26,46,0.03)",
  },
  frostedDark: {
    background: "rgba(26,26,46,0.78)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow:
      "0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  liquid: {
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(30px) saturate(200%) brightness(1.05)",
    WebkitBackdropFilter: "blur(30px) saturate(200%) brightness(1.05)",
    border: "1px solid rgba(255,255,255,0.35)",
    boxShadow:
      "0 8px 32px rgba(26,26,46,0.08), 0 2px 6px rgba(26,26,46,0.04), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.1)",
  },
  liquidModal: {
    background: "rgba(18,18,38,0.82)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    border: "1px solid rgba(139,92,246,0.15)",
    boxShadow:
      "0 40px 80px rgba(0,0,0,0.5), 0 16px 32px rgba(108,43,217,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
} as const;

export type GlassMaterial = keyof typeof glassMaterials;
