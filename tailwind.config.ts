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
        // Hairline + rail tokens used by DataTable, Field, FormSection
        hairline: "rgba(17,17,36,0.07)",
        rail: "rgba(17,17,36,0.025)",
        // Traveloz Collection (solo bajo /backend/collection)
        col: {
          base: "#F0F0F0",
          surface: "#FFFFFF",
          ink: "#32373B",
          slate: "#4A5859",
          gold: "#F4B860",
          line: "#DCDCDC",
          alerta: "#9E3D2F",
          // Azul noche del fondo del logo: el color de contraste del chrome.
          // Muestreado a ojo; se cambia acá cuando llegue el archivo del diseñador.
          noche: "#04071F",
          "noche-2": "#0E1436",
          "noche-linea": "rgba(255,255,255,0.08)",
          // Texto secundario y terciario sólidos: los dos pasan AA (4.5:1)
          // sobre base y sobre blanco. Nada de grises por opacidad en texto.
          muted: "#5A6667",
          subtle: "#636E6F",
          // Estados. El dorado queda solo como acento de marca.
          ok: "#3F6B4F",
          aviso: "#8A5D17",
          error: "#9E3D2F",
          info: "#2C4A6E",
          // Anillo de foco: 3:1 o más sobre base, blanco y azul noche.
          foco: "#A8722A",
        },
      },
      spacing: {
        row: "44px",
      },
      fontSize: {
        // Uppercase micro-label used across headers + field labels
        label: ["10.5px", { letterSpacing: "0.08em", lineHeight: "1" }],
        // Compact body for dense tables
        row: ["13.5px", { lineHeight: "20px" }],
        // Monospace metadata
        meta: ["12px", { lineHeight: "16px" }],
        // Escala de Collection. Prohibido text-[Npx] en components/collection.
        "col-xs": ["12px", { lineHeight: "16px" }],
        "col-sm": ["13px", { lineHeight: "18px" }],
        "col-md": ["14px", { lineHeight: "20px" }],
        "col-cuerpo": ["15px", { lineHeight: "24px" }],
        "col-lg": ["17px", { lineHeight: "26px" }],
        "col-xl": ["22px", { lineHeight: "28px" }],
        "col-2xl": ["28px", { lineHeight: "34px" }],
        "col-3xl": ["34px", { lineHeight: "40px" }],
        "col-display": ["44px", { lineHeight: "48px" }],
        "col-display-lg": ["56px", { lineHeight: "60px" }],
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
        "col-display": ["var(--font-col-display)", "Georgia", "serif"],
        "col-text": ["var(--font-col-text)", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        col: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        "col-rapido": "150ms",
        col: "200ms",
        "col-lento": "320ms",
      },
      backdropBlur: {
        glass: "20px",
        "glass-lg": "30px",
        "glass-sm": "12px",
        "glass-xl": "40px",
      },
      boxShadow: {
        // Elevaciones de Collection, tintadas con azul noche.
        "col-1": "0 1px 2px rgba(4,7,31,0.08)",
        "col-2": "0 18px 40px -22px rgba(4,7,31,0.38)",
        "col-3": "0 28px 64px -28px rgba(4,7,31,0.5)",
        // Halo dorado de los campos enfocados (va con el borde tinta).
        "col-anillo": "0 0 0 3px rgba(244,184,96,0.3)",
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
        "col-sm": "4px",
        col: "6px",
        "col-lg": "10px",
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
