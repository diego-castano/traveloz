// Tipografías de Collection. Cormorant Garamond (display) la baja next/font
// de Google; Clarika Geometric (texto) viene en woff2 dentro del repo. Las dos
// quedan como variables CSS en la raíz del shell y del sitio público.
// Clarika no trae 500 ni 600: en Collection se usa 300, 400 y 700.
import { Cormorant_Garamond } from "next/font/google";
import localFont from "next/font/local";

export const fuenteDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-col-display",
  display: "swap",
});

export const fuenteTexto = localFont({
  src: [
    { path: "./clarika/ClarikaGeometric-Light.woff2", weight: "300", style: "normal" },
    { path: "./clarika/ClarikaGeometric-LightItalic.woff2", weight: "300", style: "italic" },
    { path: "./clarika/ClarikaGeometric-Regular.woff2", weight: "400", style: "normal" },
    { path: "./clarika/ClarikaGeometric-Bold.woff2", weight: "700", style: "normal" },
    { path: "./clarika/ClarikaGeometric-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-col-text",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});
