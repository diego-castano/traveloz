import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "brand-violet": {
          "50": "#F5F3FF",
          "100": "#EDE9FE",
          "200": "#DDD6FE",
          "300": "#C4B5FD",
          "400": "#A78BFA",
          "500": "#8B5CF6",
          "600": "#7C3AED",
          "700": "#6C2BD9",
          "800": "#5B21B6",
          "900": "#4C1D95",
          "950": "#2E1065",
        },
        "brand-teal": {
          "50": "#E6F8F5",
          "100": "#C0EFE8",
          "200": "#8DE5D8",
          "300": "#5AD5C4",
          "400": "#3BBFAD",
          "500": "#2A9E8E",
          "600": "#1F7D70",
          "700": "#165C53",
        },
        "brand-red": {
          "50": "#FFF5F6",
          "100": "#FFE0E3",
          "200": "#FFB8BF",
          "300": "#FF8A95",
          "400": "#E74C5F",
          "500": "#CC2030",
          "600": "#A8192A",
          "700": "#7A1420",
        },
        "brand-navy": {
          "50": "#F0F4F8",
          "100": "#D9E2EC",
          "200": "#BCCCDC",
          "300": "#9FB3C8",
          "400": "#6B8BAE",
          "500": "#1A3A5C",
          "600": "#153050",
          "700": "#0F2440",
        },
        neutral: {
          "0": "#FFFFFF",
          "25": "#FAFBFE",
          "50": "#F5F6FA",
          "100": "#ECEDF5",
          "150": "#E4E6F2",
          "200": "#D2D5E5",
          "300": "#B0B4CD",
          "400": "#8A8DB5",
          "500": "#6B6F99",
          "600": "#3D4066",
          "700": "#2D2F4D",
          "800": "#232342",
          "900": "#1A1A2E",
          "950": "#111124",
        },
        surface: {
          page: "#F5F6FA",
          card: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      backdropBlur: {
        glass: "20px",
        "glass-lg": "30px",
        "glass-sm": "12px",
        "glass-xl": "40px",
      },
      boxShadow: {
        glass:
          "0 8px 32px rgba(26,26,46,0.06), 0 1px 3px rgba(26,26,46,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
        "glass-hover":
          "0 20px 50px rgba(26,26,46,0.12), 0 0 30px rgba(139,92,246,0.06), inset 0 2px 0 rgba(255,255,255,0.6)",
        clay: "8px 8px 20px rgba(26,26,46,0.08), -4px -4px 12px rgba(255,255,255,0.9), inset 0 2px 0 rgba(255,255,255,0.7)",
        "clay-pressed":
          "2px 2px 8px rgba(26,26,46,0.1), inset 0 2px 6px rgba(26,26,46,0.06)",
        "focus-teal":
          "0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px rgba(59,191,173,0.4)",
        "focus-violet":
          "0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px rgba(139,92,246,0.3)",
        "glow-violet":
          "0 0 20px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.08)",
        "glow-teal":
          "0 0 20px rgba(59,191,173,0.25), 0 0 60px rgba(59,191,173,0.08)",
        "elevation-4":
          "0 4px 8px -1px rgba(26,26,46,0.06), 0 2px 4px -2px rgba(26,26,46,0.04)",
        "elevation-8":
          "0 8px 16px -2px rgba(26,26,46,0.08), 0 4px 6px -4px rgba(26,26,46,0.04)",
        "elevation-16":
          "0 16px 32px -4px rgba(26,26,46,0.1), 0 6px 12px -6px rgba(26,26,46,0.05)",
        "elevation-24":
          "0 24px 48px -8px rgba(26,26,46,0.12), 0 8px 16px -8px rgba(26,26,46,0.06)",
        "elevation-32":
          "0 32px 64px -12px rgba(26,26,46,0.15), 0 12px 24px -8px rgba(26,26,46,0.08)",
      },
      borderRadius: {
        glass: "16px",
        "glass-sm": "12px",
        "glass-lg": "20px",
        "glass-xl": "24px",
        clay: "14px",
        pill: "9999px",
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "mesh-float": "meshFloat 20s ease-in-out infinite alternate",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "liquid-float": "liquidFloat 6s ease-in-out infinite",
        "border-glow": "borderGlow 8s ease-in-out infinite",
        "sidebar-glow": "sidebarGlow 6s ease-in-out infinite",
        breathe: "breathe 8s ease-in-out infinite",
        "sheen-slide": "sheenSlide 12s ease-in-out infinite",
        "arrow-pulse": "arrowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        meshFloat: {
          "0%": { backgroundPosition: "0% 0%, 100% 0%, 50% 100%" },
          "50%": { backgroundPosition: "100% 100%, 0% 50%, 80% 20%" },
          "100%": { backgroundPosition: "50% 0%, 50% 100%, 0% 50%" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(59,191,173,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(59,191,173,0)" },
        },
        liquidFloat: {
          "0%,100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-3px) scale(1.003)" },
        },
        borderGlow: {
          "0%,100%": { borderColor: "rgba(255,255,255,0.25)" },
          "50%": { borderColor: "rgba(139,92,246,0.15)" },
        },
        sidebarGlow: {
          "0%,100%": { boxShadow: "4px 0 24px rgba(108,43,217,0.08)" },
          "50%": { boxShadow: "4px 0 32px rgba(108,43,217,0.14)" },
        },
        breathe: {
          "0%,100%": { opacity: "0.72" },
          "50%": { opacity: "0.78" },
        },
        sheenSlide: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        subtleRotate: {
          "0%": { filter: "hue-rotate(0deg)" },
          "100%": { filter: "hue-rotate(3deg)" },
        },
        arrowPulse: {
          "0%,100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(3px)" },
        },
        microBounce: {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
