"use client";

// Piezas que comparten los bloques de las páginas: cabecera, texto rico,
// medio con su fantasma, enlace con filete y el aviso de lista vacía.

import { ArrowRight } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { BloqueVista } from "@/lib/collection/paginas/contenido";
import { Eyebrow } from "@/components/collection/ui";
import { cn } from "@/components/lib/cn";
import { MedioFantasma, MedioImagen, MedioVideo } from "../medios";

export type Modo = "sitio" | "preview";
export type BloqueDeVista<T extends BloqueVista["tipo"]> = Extract<BloqueVista, { tipo: T }>;
export type PropsBloque<T extends BloqueVista["tipo"]> = { bloque: BloqueDeVista<T>; modo: Modo };

export const fantasma = "italic text-col-slate/40";
export const fantasmaOscuro = "italic text-white/40";
export const TITULO_FANTASMA = "Tu título va acá";

export function Html({ html, className }: { html: string; className?: string }) {
  return <div className={cn("cs-prosa", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Eyebrow, título y bajada de un bloque. En la vista previa el título vacío se ve fantasma. */
export function Cabecera({
  eyebrow,
  titulo,
  bajada,
  preview,
  oscuro,
  centrado,
  className,
}: {
  eyebrow?: string;
  titulo: string;
  bajada?: string;
  preview: boolean;
  oscuro?: boolean;
  centrado?: boolean;
  className?: string;
}) {
  if (!eyebrow && !titulo && !bajada && !preview) return null;
  return (
    <div className={cn("flex flex-col gap-5", centrado && "items-center text-center", className)}>
      {eyebrow && <Eyebrow className={cn(oscuro && "text-col-line")}>{eyebrow}</Eyebrow>}
      {(titulo || preview) && (
        <h2 className={cn("cs-h2 max-w-[22ch]", !titulo && (oscuro ? fantasmaOscuro : fantasma))}>
          {titulo || TITULO_FANTASMA}
        </h2>
      )}
      {bajada && (
        <p className={cn("max-w-[56ch] text-[17px] font-light leading-[1.65]", oscuro ? "text-col-line" : "text-col-slate")}>
          {bajada}
        </p>
      )}
    </div>
  );
}

/** Foto o video del bloque; sin medio, fantasma en la vista previa y nada en el sitio. */
export function MedioBloque({
  medio,
  preview,
  aspecto,
  relleno,
  sizes = "100vw",
  oscuro,
  texto = "Elegí una foto",
  className,
  prioridad,
}: {
  medio: MedioVista | null;
  preview: boolean;
  aspecto?: number;
  relleno?: boolean;
  sizes?: string;
  oscuro?: boolean;
  texto?: string;
  className?: string;
  prioridad?: boolean;
}) {
  if (!medio) return preview ? <MedioFantasma aspecto={aspecto} relleno={relleno} oscuro={oscuro} texto={texto} className={className} /> : null;
  if (medio.tipo === "VIDEO") return <MedioVideo medio={medio} variante="fondo" aspecto={aspecto} relleno={relleno} className={className} />;
  return <MedioImagen medio={medio} aspecto={aspecto} relleno={relleno} sizes={sizes} prioridad={prioridad} className={className} />;
}

/** Enlace con filete que se vuelve dorado. En la vista previa, sin texto, se ve fantasma. */
export function Enlace({
  texto,
  href,
  preview,
  claro,
  fantasmaTexto = "Texto del botón",
}: {
  texto: string;
  href: string;
  preview: boolean;
  claro?: boolean;
  fantasmaTexto?: string;
}) {
  if (!texto.trim() || !href.trim()) {
    if (!preview) return null;
    return (
      <span className={cn("cs-enlace", texto.trim() ? "" : claro ? "text-white/40" : "text-col-slate/40")}>
        <span>{texto.trim() || fantasmaTexto}</span>
        <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={1.25} />
      </span>
    );
  }
  return (
    <a href={href} className={cn("cs-enlace", claro ? "text-col-base" : "text-col-ink")}>
      <span>{texto}</span>
      <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 ease-col" strokeWidth={1.25} />
    </a>
  );
}

/** Aviso para una lista que todavía no tiene nada publicado (solo vista previa). */
export function ListaVacia({ children, oscuro }: { children: React.ReactNode; oscuro?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] items-center justify-center px-8 py-12 text-center text-[15px] leading-relaxed",
        oscuro ? "cs-fantasma cs-fantasma--oscuro text-col-line/70" : "cs-fantasma text-col-slate/70",
      )}
    >
      <p className="max-w-[44ch]">{children}</p>
    </div>
  );
}
