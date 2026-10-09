"use client";

// Imagen de un medio de la biblioteca: reserva el alto con el aspecto real,
// pinta el color dominante y el placeholder borroso hasta que llega la
// variante, y elige tamaño con srcSet.

import { useState } from "react";
import { Play } from "lucide-react";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";

export const aspectoDe = (m: ColMedioDto) =>
  m.ancho && m.alto ? m.ancho / m.alto : m.tipo === "VIDEO" ? 16 / 9 : 4 / 5;

export const srcSetDe = (m: ColMedioDto) =>
  m.variantes.length > 0 ? m.variantes.map((v) => `${v.url} ${v.w}w`).join(", ") : undefined;

/** La variante más chica que cubre `ancho`, o el original. */
export function srcDe(m: ColMedioDto, ancho = 960) {
  if (m.tipo === "VIDEO") return m.posterUrl;
  const ordenadas = [...m.variantes].sort((a, b) => a.w - b.w);
  return (ordenadas.find((v) => v.w >= ancho) ?? ordenadas[ordenadas.length - 1])?.url ?? m.url;
}

export function fmtPeso(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function fmtDuracion(s: number | null) {
  if (!s) return "";
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

export function MedioImagen({
  medio,
  sizes,
  ancho,
  aspecto,
  className,
  imgClassName,
  objectPosition,
  insigniaClassName,
}: {
  medio: ColMedioDto;
  sizes: string;
  ancho?: number;
  /** Fuerza un aspecto (recortes); si no, usa el del medio. */
  aspecto?: number;
  className?: string;
  imgClassName?: string;
  objectPosition?: string;
  /** Clases de la insignia de video (duración y peso). */
  insigniaClassName?: string;
}) {
  const [cargada, setCargada] = useState(false);
  const src = srcDe(medio, ancho);
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: String(aspecto ?? aspectoDe(medio)),
        backgroundColor: medio.colorDominante ?? "#E2E2E2",
      }}
    >
      {medio.placeholder && !cargada && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={medio.placeholder}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
          style={{ objectPosition }}
        />
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          srcSet={medio.tipo === "FOTO" ? srcSetDe(medio) : undefined}
          sizes={sizes}
          alt={medio.alt}
          loading="lazy"
          decoding="async"
          // Si ya venía de caché antes de hidratar, onLoad no llega a dispararse.
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) setCargada(true);
          }}
          onLoad={() => setCargada(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-col-lento ease-col",
            cargada ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          style={{ objectPosition: objectPosition ?? `${medio.focoX * 100}% ${medio.focoY * 100}%` }}
        />
      )}
      {medio.tipo === "VIDEO" && (
        <span
          className={cn(
            "pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-col-sm bg-col-ink/70 px-2 py-1 text-col-xs tracking-wide text-col-base backdrop-blur-sm transition-opacity duration-col ease-col",
            insigniaClassName,
          )}
        >
          <Play className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden />
          {[fmtDuracion(medio.duracion), fmtPeso(medio.peso)].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  );
}
