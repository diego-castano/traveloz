"use client";

// Medios del sitio de Collection (sitio y vista previa). Reservan el alto con
// el aspecto real, pintan el color dominante y el placeholder borroso hasta
// que llega la variante, y entran con un fundido. Sin url (borradores o la
// demo) dibujan un bloque de color con el tono del medio.
//
// Encuadres: con `encuadre`, si la foto tiene ese recorte y la caja tiene su
// aspecto, se dibuja exactamente esa región; si la caja tiene otro aspecto
// (portadas que cambian con la pantalla) se usa el centro del recorte más
// parecido como foco. Sin recorte, manda el punto de foco.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ImageIcon, Play } from "lucide-react";
import type { FotoCatalogo, MedioVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { centroDelRecorte, elegirRecorte, estiloRecorte, type Aspecto } from "@/lib/collection/recortes";

export const aspectoMedio = (m: MedioVista) =>
  m.ancho && m.alto ? m.ancho / m.alto : m.tipo === "VIDEO" ? 16 / 9 : 4 / 5;

export const focoMedio = (m: MedioVista) => `${m.focoX * 100}% ${m.focoY * 100}%`;

export function fmtDuracion(s: number | null) {
  if (!s) return "";
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function srcSetDe(m: MedioVista) {
  return m.variantes.length > 0 ? m.variantes.map((v) => `${v.url} ${v.w}w`).join(", ") : undefined;
}

/** La variante más chica que cubre `ancho`, o el original. */
export function srcDe(m: MedioVista, ancho = 1600) {
  if (m.tipo === "VIDEO") return m.posterUrl ?? "";
  const ordenadas = [...m.variantes].sort((a, b) => a.w - b.w);
  return (ordenadas.find((v) => v.w >= ancho) ?? ordenadas[ordenadas.length - 1])?.url ?? m.url;
}

/** Bloque de color para cuando no hay archivo: luz arriba, tono hacia la tinta abajo. */
export function fondoDeColor(color: string | null) {
  const c = color ?? "#9AA3A4";
  return `radial-gradient(120% 90% at 28% 18%, rgba(255,255,255,0.28), rgba(255,255,255,0) 58%), linear-gradient(165deg, ${c} 0%, color-mix(in srgb, ${c} 62%, #32373B) 100%)`;
}

type Caja = {
  /** Fuerza un aspecto (recortes); si no, usa el del medio. */
  aspecto?: number;
  /** Ocupa todo el padre (position absolute) en vez de reservar aspecto. */
  relleno?: boolean;
  className?: string;
};

function estiloCaja(aspecto: number | undefined, relleno: boolean | undefined): React.CSSProperties {
  return relleno ? {} : { aspectRatio: String(aspecto) };
}

/**
 * Recorte que toca para esta caja: mide la caja (las de relleno no tienen
 * aspecto fijo) y elige entre los encuadres pedidos.
 */
function useEncuadre(medio: MedioVista, encuadre: Aspecto | readonly Aspecto[] | undefined, cajaFija: number | null) {
  const pedidos: readonly Aspecto[] = !encuadre ? [] : typeof encuadre === "string" ? [encuadre] : encuadre;
  const activo = medio.tipo === "FOTO" && pedidos.some((a) => medio.recortes?.[a]);
  const ref = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!activo || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setMedida(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activo]);
  const imgAspect = medio.ancho && medio.alto ? medio.ancho / medio.alto : null;
  const eleccion = activo ? elegirRecorte(medio.recortes, pedidos, medida ?? cajaFija) : null;
  let estilo: React.CSSProperties = { objectPosition: focoMedio(medio) };
  let exacto = false;
  if (eleccion && eleccion.exacto && imgAspect) {
    estilo = estiloRecorte(eleccion.recorte, imgAspect);
    exacto = true;
  } else if (eleccion) {
    const c = centroDelRecorte(eleccion.recorte);
    estilo = { objectPosition: `${c.x * 100}% ${c.y * 100}%` };
  }
  return { ref, estilo, exacto };
}

export function MedioImagen({
  medio,
  sizes = "100vw",
  aspecto,
  relleno,
  prioridad,
  encuadre,
  className,
  imgClassName,
}: Caja & {
  medio: MedioVista;
  sizes?: string;
  prioridad?: boolean;
  /** Encuadre(s) guardados que valen para este lugar (ver lib/collection/recortes). */
  encuadre?: Aspecto | readonly Aspecto[];
  imgClassName?: string;
}) {
  const [cargada, setCargada] = useState(false);
  const src = srcDe(medio);
  const { ref, estilo, exacto } = useEncuadre(medio, encuadre, relleno ? null : aspecto ?? aspectoMedio(medio));
  const ubicar = exacto ? "" : "absolute inset-0 h-full w-full object-cover";
  return (
    <div
      ref={ref}
      className={cn("overflow-hidden", relleno ? "absolute inset-0" : "relative", className)}
      style={{
        ...estiloCaja(aspecto ?? aspectoMedio(medio), relleno),
        background: src ? medio.colorDominante ?? "#DCDCDC" : fondoDeColor(medio.colorDominante),
      }}
    >
      {src && medio.placeholder && !cargada && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={medio.placeholder}
          alt=""
          aria-hidden
          className={cn(ubicar, "scale-110 blur-xl")}
          style={estilo}
        />
      )}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          srcSet={medio.tipo === "FOTO" ? srcSetDe(medio) : undefined}
          sizes={sizes}
          alt={medio.alt}
          loading={prioridad ? "eager" : "lazy"}
          decoding="async"
          // Si ya venía de caché antes de hidratar, onLoad no llega.
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0 && !cargada) setCargada(true);
          }}
          onLoad={() => setCargada(true)}
          className={cn(
            ubicar,
            "transition-[opacity,transform] duration-700 ease-col",
            cargada ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          style={estilo}
        />
      ) : (
        <span role="img" aria-label={medio.alt} className="sr-only" />
      )}
    </div>
  );
}

/** Foto del catálogo común de hoteles: sin variantes ni color, solo fundido. */
export function FotoCatalogoImagen({
  foto,
  aspecto = 4 / 3,
  relleno,
  className,
  imgClassName,
}: Caja & { foto: FotoCatalogo; imgClassName?: string }) {
  const [cargada, setCargada] = useState(false);
  return (
    <div
      className={cn("overflow-hidden bg-col-line", relleno ? "absolute inset-0" : "relative", className)}
      style={estiloCaja(aspecto, relleno)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto.url}
        alt={foto.alt}
        loading="lazy"
        decoding="async"
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0 && !cargada) setCargada(true);
        }}
        onLoad={() => setCargada(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-col",
          cargada ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}

/** Hueco de un medio en la vista previa: gris rayado con un ícono tenue. */
export function MedioFantasma({
  aspecto = 4 / 5,
  relleno,
  oscuro,
  texto,
  className,
}: Caja & { oscuro?: boolean; texto?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        oscuro ? "cs-fantasma cs-fantasma--oscuro text-col-base/40" : "cs-fantasma text-col-slate/40",
        relleno ? "absolute inset-0" : "relative",
        className,
      )}
      style={estiloCaja(aspecto, relleno)}
    >
      <ImageIcon className="h-6 w-6" strokeWidth={1.25} />
      {texto && <span className="px-4 text-center text-[12px] uppercase tracking-[0.14em]">{texto}</span>}
    </div>
  );
}

/**
 * Video de un medio. "fondo": mudo, en bucle, sin controles (portada); si el
 * usuario pidió menos movimiento queda el póster quieto. "reproductor": póster
 * con botón de play y duración; al tocarlo carga el video con controles.
 */
export function MedioVideo({
  medio,
  variante,
  titulo,
  aspecto,
  relleno,
  className,
}: Caja & { medio: MedioVista; variante: "fondo" | "reproductor"; titulo?: string }) {
  const reducido = useReducedMotion();
  const [reproduciendo, setReproduciendo] = useState(false);
  const caja = cn("overflow-hidden", relleno ? "absolute inset-0" : "relative", className);
  const estilo: React.CSSProperties = {
    ...estiloCaja(aspecto ?? aspectoMedio(medio), relleno),
    background: medio.url ? medio.colorDominante ?? "#32373B" : fondoDeColor(medio.colorDominante),
  };

  if (variante === "fondo") {
    return (
      <div className={caja} style={estilo}>
        {medio.url && (
          <video
            key={reducido ? "quieto" : "bucle"}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: focoMedio(medio) }}
            src={medio.url}
            poster={medio.posterUrl ?? undefined}
            autoPlay={!reducido}
            muted
            loop
            playsInline
            preload={reducido ? "none" : "metadata"}
            aria-label={medio.alt}
          />
        )}
      </div>
    );
  }

  const duracion = fmtDuracion(medio.duracion);
  return (
    <div className={cn(caja, "group")} style={estilo}>
      {reproduciendo && medio.url ? (
        <video
          className="absolute inset-0 h-full w-full bg-col-ink object-contain"
          src={medio.url}
          poster={medio.posterUrl ?? undefined}
          controls
          autoPlay
          playsInline
          aria-label={medio.alt}
        />
      ) : (
        <>
          {medio.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={medio.posterUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1600ms] ease-col group-hover:scale-[1.03]"
              style={{ objectPosition: focoMedio(medio) }}
            />
          )}
          <div className="absolute inset-0 bg-col-ink/35" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => setReproduciendo(true)}
              disabled={!medio.url}
              aria-label={titulo ? `Reproducir: ${titulo}` : "Reproducir video"}
              className="flex h-20 w-20 items-center justify-center rounded-sm border border-col-base/80 bg-col-ink/50 text-col-base backdrop-blur-sm transition-[background-color,border-color,transform,color] duration-300 ease-col hover:scale-105 hover:border-col-gold hover:bg-col-gold hover:text-col-ink active:scale-100 disabled:cursor-default"
            >
              <Play className="ml-1 h-7 w-7" strokeWidth={1.25} />
            </button>
            <span className="text-[12px] uppercase tracking-[0.14em] text-white">
              Reproducir{duracion && ` · ${duracion}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
