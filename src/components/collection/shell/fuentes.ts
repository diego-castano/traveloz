// Tipografías de Collection. next/font las baja en el build y las sirve
// desde el propio dominio; quedan como variables CSS en la raíz del shell.
import { Cormorant_Garamond, Jost } from "next/font/google";

export const fuenteDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-col-display",
  display: "swap",
});

export const fuenteTexto = Jost({
  subsets: ["latin"],
  // 600 solo para la marca (MarcaCollection).
  weight: ["300", "400", "500", "600"],
  variable: "--font-col-text",
  display: "swap",
});
