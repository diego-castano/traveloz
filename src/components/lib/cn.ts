import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tokens propios de Collection (tailwind.config.ts). Sin esto, tailwind-merge
// toma `text-col-xl` por un color y lo borra si después viene `text-col-ink`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["col-xs", "col-sm", "col-md", "col-cuerpo", "col-lg", "col-xl", "col-2xl", "col-3xl", "col-display", "col-display-lg"] },
      ],
      shadow: [{ shadow: ["col-1", "col-2", "col-3", "col-anillo"] }],
      rounded: [{ rounded: ["col-sm", "col", "col-lg"] }],
      duration: [{ duration: ["col-rapido", "col", "col-lento"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
