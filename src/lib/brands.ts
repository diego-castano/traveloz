// ---------------------------------------------------------------------------
// Brand tokens -- exact values from docs/design.json brands section
// Source: design.json v3.0.0 "Liquid Horizon"
// ---------------------------------------------------------------------------

export interface BrandTokens {
  id: string;
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

export const brandTokens: Record<string, BrandTokens> = {
  "brand-1": {
    id: "brand-1",
    name: "TravelOz",
    slug: "traveloz",
    tagline: "#ExperienciaOZ",
    logo: "/header-logo.webp",
    logoWhite: "/header-logo.webp",
    sidebarGradient:
      "linear-gradient(180deg, rgba(8,6,18,0.99) 0%, rgba(40,15,90,0.98) 55%, rgba(108,43,217,0.95) 100%)",
    sidebarBlur: "24px",
    sidebarGlow: "4px 0 24px rgba(108,43,217,0.08)",
    sidebarTopGlow:
      "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)",
    loginBackground:
      "radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.35) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59,191,173,0.2) 0%, transparent 50%), linear-gradient(135deg, #1A1A2E 0%, #0F0F1E 100%)",
    accentPrimary: "violet",
    accentSecondary: "teal",
    brandGlow: "rgba(139,92,246,0.12)",
  },
};

export const BRAND_LIST: BrandTokens[] = Object.values(brandTokens);
