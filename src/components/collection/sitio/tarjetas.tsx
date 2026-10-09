"use client";

// Piezas chicas del sitio de Collection: tarjetas y filas que usan los bloques
// de las páginas y también los módulos del backoffice (listas de destinos,
// testimonios, aliados, preguntas y journal) para mostrar cómo se ve cada uno.

import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import type { EspecialistaVista } from "@/lib/collection/experiencia/contenido";
import {
  NOMBRE_TIPO_ARTICULO,
  type AliadoVista,
  type ArticuloCardVista,
  type DestinoCardVista,
  type ExperienciaCardVista,
  type PreguntaVista,
  type TestimonioVista,
} from "@/lib/collection/paginas/contenido";
import { Eyebrow } from "@/components/collection/ui";
import { cn } from "@/components/lib/cn";
import { MedioFantasma, MedioImagen } from "./medios";
import { etiqueta, plural } from "./experiencia/secciones";

// Rutas del sitio público. Las define la fase 4; si cambian, cambian acá.
export const rutaSitio = {
  experiencia: (slug: string) => `/experiencias/${slug}`,
  destino: (slug: string) => `/destinos/${slug}`,
  articulo: (slug: string) => `/journal/${slug}`,
};

const zoom = "transition-transform duration-[1200ms] ease-col group-hover:scale-[1.04]";

/** "2026-10-09T…" → "9 de octubre de 2026", con la fecha de Montevideo. */
export function fechaLarga(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Montevideo",
  }).format(d);
}

/** "Guía · 8 min de lectura" (largo) o "Guía · 8 min". */
export const etiquetaArticulo = (a: Pick<ArticuloCardVista, "tipo" | "minutos">, largo = true) =>
  `${NOMBRE_TIPO_ARTICULO[a.tipo]} · ${a.minutos} min${largo ? " de lectura" : ""}`;

// ── Experiencia ─────────────────────────────────────────────────────────────

export function TarjetaExperiencia({ e, className }: { e: ExperienciaCardVista; className?: string }) {
  const datos = [e.noches > 0 && plural(e.noches, "noche", "noches"), e.destinos.length > 0 && plural(e.destinos.length, "destino", "destinos")]
    .filter(Boolean)
    .join(" · ");
  return (
    <a href={rutaSitio.experiencia(e.slug)} className={cn("group flex flex-col gap-5", className)}>
      <div className="relative overflow-hidden">
        {e.portada ? (
          <MedioImagen medio={e.portada} aspecto={4 / 5} encuadre={["16:9", "4:5"]} sizes="(min-width: 1100px) 30vw, (min-width: 560px) 45vw, 100vw" imgClassName={zoom} />
        ) : (
          <MedioFantasma aspecto={4 / 5} />
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {datos && <span className={cn(etiqueta, "text-col-slate")}>{datos}</span>}
        <h3 className="font-col-display text-[28px] leading-[1.15] text-col-ink transition-colors duration-200 ease-col group-hover:text-col-slate">
          {e.titulo}
        </h3>
        {e.bajada && <p className="line-clamp-2 max-w-[42ch] text-[15px] font-light leading-relaxed text-col-slate">{e.bajada}</p>}
        {e.precioDesde !== null && e.precioDesde > 0 && (
          <p className="mt-1 text-[13px] text-col-slate">
            Desde{" "}
            <span className="font-col-display text-[20px] text-col-ink">
              USD {new Intl.NumberFormat("es-UY").format(e.precioDesde)}
            </span>
          </p>
        )}
      </div>
    </a>
  );
}

// ── Destino ─────────────────────────────────────────────────────────────────

/**
 * Tarjeta del mosaico. Llena a su padre: quien la usa le da el alto (la
 * grilla del bloque) o un `aspecto`.
 */
export function TarjetaDestino({
  d,
  conBajada,
  aspecto,
  className,
}: {
  d: DestinoCardVista;
  conBajada?: boolean;
  aspecto?: number;
  className?: string;
}) {
  return (
    <a
      href={rutaSitio.destino(d.slug)}
      className={cn("group relative block overflow-hidden bg-col-ink text-white", className)}
      style={aspecto ? { aspectRatio: String(aspecto) } : undefined}
    >
      {d.portada ? (
        <MedioImagen medio={d.portada} relleno encuadre={["16:9", "4:5"]} sizes="(min-width: 1100px) 50vw, 100vw" imgClassName={zoom} />
      ) : (
        <MedioFantasma relleno oscuro />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(50,55,59,0.78)_0%,rgba(50,55,59,0.2)_45%,rgba(50,55,59,0)_70%)]"
      />
      {d.proximamente && (
        <span className={cn(etiqueta, "absolute left-5 top-5 rounded-sm bg-col-base px-3 py-2 text-[12px] text-col-ink")}>
          Próximamente
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
        <span className={cn(etiqueta, "text-[12px] text-white/85")}>
          Destino · {d.proximamente ? "Próximamente" : plural(d.experiencias, "experiencia", "experiencias")}
        </span>
        <span className="font-col-display text-[32px] leading-[1.05] tracking-[-0.01em]">{d.nombre}</span>
        {conBajada && d.bajada && (
          <span className="max-w-[40ch] text-[15px] font-light leading-relaxed text-white/85">{d.bajada}</span>
        )}
      </div>
    </a>
  );
}

// ── Especialista ────────────────────────────────────────────────────────────

export function TarjetaEspecialista({ e }: { e: EspecialistaVista }) {
  return (
    <div className="flex flex-col gap-4">
      {e.retrato ? (
        <MedioImagen medio={e.retrato} aspecto={4 / 5} encuadre="4:5" sizes="(min-width: 1100px) 22vw, 45vw" />
      ) : (
        <MedioFantasma aspecto={4 / 5} />
      )}
      <span className="font-col-display text-[26px] leading-[1.2]">{e.nombre}</span>
      {e.region && (
        <span className={cn(etiqueta, "flex items-center gap-2 text-col-slate")}>
          <MapPin aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.25} />
          {e.region}
        </span>
      )}
      {e.frase && <p className="font-col-display text-[21px] leading-[1.35] text-col-slate">“{e.frase}”</p>}
    </div>
  );
}

// ── Testimonio ──────────────────────────────────────────────────────────────

/** Foto del viaje (nunca un retrato a cámara) y la cita grande. */
export function TestimonioSlide({ t }: { t: TestimonioVista }) {
  return (
    <figure className="cs-testimonio">
      {t.foto ? (
        <MedioImagen medio={t.foto} aspecto={4 / 5} encuadre="4:5" sizes="(min-width: 768px) 40vw, 100vw" />
      ) : (
        <MedioFantasma aspecto={4 / 5} />
      )}
      <div className="flex flex-col gap-7">
        <span aria-hidden className="h-12 font-col-display text-[120px] font-light leading-[0.6] text-col-slate">
          “
        </span>
        <blockquote className="cs-cita-grande">{t.cita}</blockquote>
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span aria-hidden className="h-px w-8 bg-col-gold" />
          <span className={etiqueta}>{[t.nombre, t.lugar].filter(Boolean).join(" · ")}</span>
          {t.viaje && <span className="text-[13px] text-col-slate">{t.viaje}</span>}
        </figcaption>
      </div>
    </figure>
  );
}

/** Contador, barra y flechas del slider de testimonios. */
export function ControlesSlider({
  actual,
  total,
  onAnterior,
  onSiguiente,
}: {
  actual: number;
  total: number;
  onAnterior: () => void;
  onSiguiente: () => void;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const flecha =
    "flex h-12 w-12 items-center justify-center rounded-sm border transition-colors duration-200 ease-col disabled:cursor-default disabled:border-col-line disabled:text-col-slate/40";
  return (
    <div className="flex items-center gap-6">
      <span className={cn(etiqueta, "min-w-[64px] tabular-nums")} aria-live="polite">
        {pad(actual + 1)} / {pad(total)}
      </span>
      <div className="relative h-px flex-1 bg-col-line">
        <div
          className="absolute inset-y-0 left-0 bg-col-ink transition-[width] duration-500 ease-col"
          style={{ width: `${((actual + 1) / Math.max(1, total)) * 100}%` }}
        />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onAnterior} disabled={actual === 0} aria-label="Anterior" className={cn(flecha, "border-col-ink hover:bg-col-ink hover:text-col-base")}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.25} />
        </button>
        <button type="button" onClick={onSiguiente} disabled={actual >= total - 1} aria-label="Siguiente" className={cn(flecha, "border-col-ink hover:bg-col-ink hover:text-col-base")}>
          <ArrowRight className="h-4 w-4" strokeWidth={1.25} />
        </button>
      </div>
    </div>
  );
}

// ── Aliado ──────────────────────────────────────────────────────────────────

/** Logo en gris que toma color al pasar el mouse. Sin archivo, el nombre en serif. */
export function LogoAliado({ a }: { a: AliadoVista }) {
  const contenido = (
    <>
      <div className="flex h-20 items-center justify-center border border-col-line px-4">
        {a.logo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.logo.url}
            alt={a.nombre}
            loading="lazy"
            className="max-h-12 w-auto max-w-full object-contain opacity-70 grayscale transition-[filter,opacity] duration-300 ease-col group-hover:opacity-100 group-hover:grayscale-0"
          />
        ) : (
          <span className="text-center font-col-display text-[22px] leading-tight text-col-slate transition-colors duration-300 ease-col group-hover:text-col-ink">
            {a.nombre}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {a.tipo && <span className={cn(etiqueta, "text-[12px] text-col-slate")}>{a.tipo}</span>}
        {a.descripcion && <p className="text-[16px] leading-relaxed text-col-slate">{a.descripcion}</p>}
      </div>
    </>
  );
  return a.url ? (
    <a href={a.url} target="_blank" rel="noopener noreferrer" className="cs-aliado group">
      {contenido}
    </a>
  ) : (
    <div className="cs-aliado group">{contenido}</div>
  );
}

// ── Pregunta ────────────────────────────────────────────────────────────────

export function ItemPregunta({
  p,
  abierta,
  onAlternar,
}: {
  p: PreguntaVista;
  abierta: boolean;
  onAlternar: () => void;
}) {
  return (
    <div className="border-b border-col-line">
      <h3>
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={`cs-pregunta-${p.id}`}
          onClick={onAlternar}
          className={cn(
            "flex w-full items-center justify-between gap-6 py-7 text-left transition-[color,padding] duration-300 ease-col hover:pl-2 hover:text-col-ink",
            abierta ? "text-col-ink" : "text-col-slate",
          )}
        >
          <span className="font-col-display text-[24px] leading-[1.25]">{p.pregunta}</span>
          <span aria-hidden className="relative h-[18px] w-[18px] shrink-0">
            <span className="absolute left-0 top-[8.5px] h-px w-[18px] bg-col-ink" />
            <span
              className={cn(
                "absolute left-[8.5px] top-0 h-[18px] w-px bg-col-gold transition-transform duration-500 ease-col",
                abierta ? "scale-y-0" : "scale-y-100",
              )}
            />
          </span>
        </button>
      </h3>
      <div id={`cs-pregunta-${p.id}`} role="region" className="cs-dia-cuerpo" data-abierto={abierta}>
        <div>
          <div
            className="cs-prosa max-w-[680px] pb-7 pr-16 text-[16px] leading-relaxed text-col-slate"
            dangerouslySetInnerHTML={{ __html: p.respuesta }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Artículo ────────────────────────────────────────────────────────────────

export function TarjetaArticulo({
  a,
  variante = "destacada",
  className,
}: {
  a: ArticuloCardVista;
  variante?: "destacada" | "fila";
  className?: string;
}) {
  const foto = (aspecto: number, sizes: string) =>
    a.portada ? (
      <MedioImagen medio={a.portada} aspecto={aspecto} encuadre={["4:3", "1:1"]} sizes={sizes} imgClassName={zoom} />
    ) : (
      <MedioFantasma aspecto={aspecto} />
    );

  if (variante === "fila") {
    return (
      <a href={rutaSitio.articulo(a.slug)} className={cn("cs-articulo-fila group", className)}>
        <div className="overflow-hidden">{foto(1, "200px")}</div>
        <div className="flex flex-col gap-3">
          <span className={cn(etiqueta, "text-col-slate")}>{etiquetaArticulo(a, false)}</span>
          <span className="font-col-display text-[24px] leading-[1.2] transition-colors duration-200 ease-col group-hover:text-col-slate">
            {a.titulo}
          </span>
        </div>
      </a>
    );
  }
  return (
    <a href={rutaSitio.articulo(a.slug)} className={cn("group flex flex-col gap-6", className)}>
      <div className="overflow-hidden">{foto(4 / 3, "(min-width: 768px) 55vw, 100vw")}</div>
      <Eyebrow>{etiquetaArticulo(a)}</Eyebrow>
      <span className="cs-h2 transition-colors duration-200 ease-col group-hover:text-col-slate">{a.titulo}</span>
      {a.bajada && <p className="max-w-[52ch] text-[16px] font-light leading-relaxed text-col-slate">{a.bajada}</p>}
    </a>
  );
}
