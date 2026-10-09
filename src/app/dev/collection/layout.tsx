import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fuenteDisplay, fuenteTexto } from "@/components/collection/shell/fuentes";

// Rutas de desarrollo de Collection: fuera de /backend (sin login) y solo en local.

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DevCollectionLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={`${fuenteDisplay.variable} ${fuenteTexto.variable} min-h-screen bg-col-base font-col-text text-col-ink`}>
      {children}
    </div>
  );
}
