"use client";

// Secciones de la página de experiencia. Cada una se omite en el sitio si no
// tiene contenido y, en la vista previa, muestra fantasmas para que quien edita
// vea la estructura mientras la completa.

import { createContext, useContext, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Check, Mail, MessageCircle, Phone, Play } from "lucide-react";
import {
  textoPlano,
  type ExperienciaVista,
  type PASOS,
  type TipoExperiencia,
} from "@/lib/collection/experiencia/contenido";
import { boton, Eyebrow } from "@/components/collection/ui";
import { cn } from "@/components/lib/cn";
import { FotoCatalogoImagen, MedioFantasma, MedioImagen, MedioVideo } from "../medios";

const Visor = dynamic(() => import("../Visor"), { ssr: false });

// ── Contexto y piezas comunes ───────────────────────────────────────────────

export type SeccionPagina = (typeof PASOS)[number]["seccion"];

interface Pagina {
  preview: boolean;
  resaltada?: string;
  consultar: () => void;
}

export const PaginaCtx = createContext<Pagina>({ preview: false, consultar: () => {} });
const usePagina = () => useContext(PaginaCtx);

type V = { v: ExperienciaVista };

export const etiqueta = "text-[13px] font-medium uppercase tracking-[0.12em]";
const fantasma = "italic text-col-slate/40";
const botonClaro = "bg-col-base text-col-ink hover:bg-col-gold";

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const vacioHtml = (h: string) => textoPlano(h).length === 0;
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
export const precioVisible = (v: ExperienciaVista) => v.mostrarPrecio && (v.precioDesde ?? 0) > 0;
/** "Filipinas: Manila, El Nido y Boracay" → "Filipinas", para la barra y el menú. */
export const tituloCorto = (t: string) => t.split(":")[0].trim();
export const ciudades = (v: ExperienciaVista) => v.tramos.filter((t) => t.ciudadNombre.trim());

const TIPOS: Record<TipoExperiencia, string> = { VIAJE: "Viaje", HOTEL: "Hotel", CRUCERO: "Crucero", TREN: "Tren" };
const NUMEROS = ["", "Un", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho"];

function etiquetaDias(desde: number, hasta: number) {
  if (hasta <= desde) return `Día ${desde}`;
  return hasta === desde + 1 ? `Días ${desde} y ${hasta}` : `Días ${desde} a ${hasta}`;
}

/** ["Manila", "Isla"] → "Manila e isla"; con `minuscula`, "español e inglés". */
function unirLista(xs: string[], minuscula = false) {
  const l = xs.map((x) => (minuscula ? x.trim().toLowerCase() : x.trim())).filter(Boolean);
  if (l.length < 2) return l[0] ?? "";
  const ultimo = l[l.length - 1];
  return `${l.slice(0, -1).join(", ")} ${/^h?i/i.test(ultimo) ? "e" : "y"} ${ultimo}`;
}

export function Seccion({
  seccion,
  ancla,
  className,
  children,
}: {
  seccion: SeccionPagina;
  ancla?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { preview, resaltada } = usePagina();
  return (
    <section
      data-seccion={seccion}
      data-ancla={ancla}
      className={cn("cs-seccion", preview && resaltada === seccion && "cs-resaltada", className)}
    >
      {children}
    </section>
  );
}

function BotonConsultar({ claro, className }: { claro?: boolean; className?: string }) {
  const { consultar } = usePagina();
  return (
    <button type="button" onClick={consultar} className={cn(boton(), claro && botonClaro, className)}>
      Consultar
    </button>
  );
}

function Html({ html, className }: { html: string; className?: string }) {
  return <div className={cn("cs-prosa", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Portada ─────────────────────────────────────────────────────────────────

export function Portada({ v }: V) {
  const { preview } = usePagina();
  const n = ciudades(v).length;
  const datos = [
    v.noches > 0 || preview ? { valor: v.noches > 0 ? pad2(v.noches) : "00", nombre: "Noches", texto: false } : null,
    n > 0 || preview ? { valor: pad2(n), nombre: n === 1 ? "Destino" : "Destinos", texto: false } : null,
    v.mejorEpoca.trim() || preview ? { valor: v.mejorEpoca.trim(), nombre: "Mejor época", texto: true } : null,
    { valor: TIPOS[v.tipo], nombre: "Tipo", texto: true },
  ].filter((d): d is NonNullable<typeof d> => !!d);
  const destinos = v.destinos.map((d) => d.nombre).join(" · ");

  return (
    <Seccion seccion="hero">
      <header className="cs-hero">
        {v.portada ? (
          v.portada.tipo === "VIDEO" ? (
            <MedioVideo medio={v.portada} variante="fondo" relleno />
          ) : (
            <MedioImagen medio={v.portada} relleno prioridad sizes="100vw" />
          )
        ) : (
          preview && <MedioFantasma relleno oscuro texto="Elegí la portada" className="pb-40" />
        )}
        <div className="cs-hero-velo" aria-hidden />
        <div className="cs-hero-texto cs-envolvente">
          {(destinos || preview) && (
            <Eyebrow className={cn("text-white", !destinos && "text-white/40")}>{destinos || "Destino"}</Eyebrow>
          )}
          <h1 className={cn("cs-h1 max-w-[16ch]", !v.titulo && "italic text-white/40")}>
            {v.titulo || "Tu título va acá"}
          </h1>
          <div className="cs-hero-pie">
            {(v.bajada || preview) && (
              <p
                className={cn(
                  "max-w-[46ch] text-[17px] font-light leading-[1.6] text-white/90",
                  !v.bajada && "italic text-white/40",
                )}
              >
                {v.bajada || "Una línea que invite a seguir leyendo."}
              </p>
            )}
            <BotonConsultar claro className="shrink-0" />
          </div>
        </div>
      </header>
      <div className="border-b border-col-line bg-col-surface">
        <dl className="cs-envolvente cs-datos" style={{ "--cs-n": datos.length } as React.CSSProperties}>
          {datos.map((d) => (
            <div key={d.nombre} className="flex flex-col-reverse justify-end gap-3 px-5 py-7">
              <dt className={cn(etiqueta, "text-col-slate")}>{d.nombre}</dt>
              <dd className={cn("cs-dato", d.texto && "cs-dato--texto", !d.valor && fantasma)}>{d.valor || "Dic a Abr"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Seccion>
  );
}

// ── Intro y lo imperdible ───────────────────────────────────────────────────

export function Intro({ v }: V) {
  const { preview } = usePagina();
  const hayIntro = !vacioHtml(v.intro);
  const imperdibles = v.imperdibles.length
    ? v.imperdibles
    : preview
      ? [1, 2, 3, 4].map((i) => ({ id: `f${i}`, titulo: "", texto: "", medio: null }))
      : [];
  if (!preview && !v.frase.trim() && !hayIntro && !imperdibles.length) return null;
  const foto = v.imperdibles.find((i) => i.medio)?.medio ?? null;
  const conFoto = !!foto || (preview && !v.imperdibles.length);
  const n = v.imperdibles.length;

  return (
    <Seccion seccion="intro" ancla="resumen" className="cs-bloque">
      <div className="cs-envolvente">
        {(v.frase.trim() || preview) && (
          <p className={cn("cs-frase mx-auto max-w-[22ch] text-center", !v.frase.trim() && fantasma)}>
            {v.frase.trim() || "Una frase que resuma el viaje."}
          </p>
        )}
        {(v.frase.trim() || preview) && (hayIntro || preview) && (
          <span aria-hidden className="mx-auto my-10 block h-px w-12 bg-col-gold" />
        )}
        {hayIntro ? (
          <Html html={v.intro} className="cs-intro mx-auto max-w-[760px] text-center text-col-ink" />
        ) : (
          preview && (
            <p className={cn("mx-auto max-w-[680px] text-center text-[19px] leading-relaxed", fantasma)}>
              Escribí la intro: dos o tres párrafos que cuenten por qué vale la pena este viaje y para quién es.
            </p>
          )
        )}

        {imperdibles.length > 0 && (
          <div className={cn("cs-imperdibles mt-24", conFoto && "cs-imperdibles--con-foto")}>
            {foto ? (
              <MedioImagen medio={foto} aspecto={4 / 5} sizes="(min-width: 1024px) 40vw, 100vw" />
            ) : (
              conFoto && <MedioFantasma aspecto={4 / 5} />
            )}
            <div>
              <span className={cn(etiqueta, "text-col-slate")}>Lo imperdible</span>
              <h2 className="cs-h2 mb-10 mt-4">
                {n > 0 ? `${NUMEROS[n] ?? n} ${n === 1 ? "momento que no se olvida" : "momentos que no se olvidan"}` : "Momentos que no se olvidan"}
              </h2>
              <ol className="border-t border-col-ink">
                {imperdibles.map((i, k) => (
                  <li key={i.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-5 border-b border-col-line py-6">
                    <span className="font-col-display text-[24px] leading-8 text-col-slate">{pad2(k + 1)}</span>
                    <div className="flex flex-col gap-2">
                      <span className={cn("font-col-display text-[24px] leading-8", !i.titulo && fantasma)}>
                        {i.titulo || "Un momento imperdible del viaje."}
                      </span>
                      {i.texto && <span className="text-[15px] font-light leading-relaxed text-col-slate">{i.texto}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </Seccion>
  );
}

// ── Relato por destino ──────────────────────────────────────────────────────

export function Recorrido({ v }: V) {
  const { preview } = usePagina();
  let tramos = v.tramos.filter((t) => preview || t.ciudadNombre.trim() || !vacioHtml(t.relato));
  if (!tramos.length) {
    if (!preview) return null;
    tramos = [{ id: "fantasma", ciudadNombre: "", paisNombre: "", noches: 0, relato: "", medio: null, hotel: null }];
  }

  return (
    <Seccion seccion="recorrido" ancla="relato" className="cs-bloque bg-col-surface">
      <div className="cs-envolvente">
        <h2 className="cs-h2 mb-16 max-w-[18ch]">El viaje, destino por destino</h2>
        <div className="cs-tramos">
          {tramos.map((t, i) => {
            const conFoto = !!t.medio || preview;
            return (
              <article
                key={t.id}
                className={cn("cs-tramo", i % 2 === 1 && "cs-tramo--inverso", !conFoto && "cs-tramo--solo")}
              >
                {t.medio ? (
                  <MedioImagen medio={t.medio} aspecto={4 / 5} sizes="(min-width: 1024px) 50vw, 100vw" />
                ) : (
                  preview && <MedioFantasma aspecto={4 / 5} texto="Foto del destino" />
                )}
                <div className="flex flex-col gap-5">
                  <span className={cn(etiqueta, "text-col-slate")}>
                    Destino {pad2(i + 1)}
                    {t.noches > 0 && ` · ${plural(t.noches, "noche", "noches")}`}
                    {t.paisNombre && ` · ${t.paisNombre}`}
                  </span>
                  <h3 className={cn("cs-nombre", !t.ciudadNombre && fantasma)}>
                    {t.ciudadNombre || "Nombre del destino"}
                  </h3>
                  {!vacioHtml(t.relato) ? (
                    <Html html={t.relato} className="max-w-[480px]" />
                  ) : (
                    preview && <p className={cn("text-[18px]", fantasma)}>Sumá el relato de este destino.</p>
                  )}
                  {(t.hotel?.nombre.trim() || preview) && (
                    <div className="mt-4 flex flex-col gap-1 border-t border-col-line pt-5">
                      <span className={cn(etiqueta, "text-col-slate")}>Te alojás en</span>
                      <span className={cn("font-col-display text-[24px] font-medium leading-8", !t.hotel?.nombre.trim() && fantasma)}>
                        {t.hotel?.nombre.trim() || "Elegí el hotel"}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Seccion>
  );
}

// ── Hoteles en detalle ──────────────────────────────────────────────────────

export function Hoteles({ v }: V) {
  const { preview } = usePagina();
  const [activo, setActivo] = useState(0);
  const tramos = v.tramos.filter((t) => t.hotel?.nombre.trim());
  if (!tramos.length && !preview) return null;
  const actual = tramos[Math.min(activo, tramos.length - 1)];

  return (
    <Seccion seccion="recorrido" ancla="hoteles" className="cs-bloque">
      <div className="cs-envolvente">
        <h2 className="cs-h2 mb-10">Dónde te vas a alojar</h2>
        {tramos.length > 1 && (
          <div role="tablist" aria-label="Hoteles" className="cs-subnav-links mb-12 border-b border-col-line">
            {tramos.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={i === activo}
                onClick={() => setActivo(i)}
                className={cn(
                  etiqueta,
                  "relative mr-8 shrink-0 pb-4 pt-1 transition-colors duration-200 ease-col",
                  i === activo ? "text-col-ink" : "text-col-slate/70 hover:text-col-ink",
                )}
              >
                {t.ciudadNombre || t.hotel?.nombre}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-[2px] origin-left bg-col-gold transition-transform duration-500 ease-col",
                    i === activo ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </button>
            ))}
          </div>
        )}
        {actual ? <FichaHotel key={actual.id} tramo={actual} /> : <FichaHotelFantasma />}
      </div>
    </Seccion>
  );
}

function FichaHotel({ tramo }: { tramo: ExperienciaVista["tramos"][number] }) {
  const { preview } = usePagina();
  const h = tramo.hotel!;
  const propias = h.medios.slice(0, 3);
  const catalogo = propias.length ? [] : h.fotosCatalogo.slice(0, 3);
  const n = propias.length || catalogo.length;
  const zoom = "transition-transform duration-[1200ms] ease-col group-hover:scale-[1.04]";

  return (
    <div className={cn("cs-hotel", !n && !preview && "cs-hotel--solo")}>
      {n > 0 ? (
        <div className={cn("cs-hotel-fotos", n === 1 && "cs-hotel-fotos--una", n === 2 && "cs-hotel-fotos--dos")}>
          {propias.map((m) => (
            <div key={m.id} className="group relative overflow-hidden">
              <MedioImagen medio={m} relleno sizes="(min-width: 1024px) 40vw, 100vw" imgClassName={zoom} />
            </div>
          ))}
          {catalogo.map((f) => (
            <div key={f.url} className="group relative overflow-hidden">
              <FotoCatalogoImagen foto={f} relleno imgClassName={zoom} />
            </div>
          ))}
        </div>
      ) : (
        preview && <FotosFantasma />
      )}
      <div className="flex flex-col gap-6">
        <Eyebrow>
          {[tramo.ciudadNombre, tramo.noches > 0 && plural(tramo.noches, "noche", "noches")].filter(Boolean).join(" · ")}
        </Eyebrow>
        <h3 className="cs-h2">{h.nombre}</h3>
        {!vacioHtml(h.texto) ? (
          <Html html={h.texto} className="text-col-slate" />
        ) : (
          preview && <p className={cn("text-[18px]", fantasma)}>Contá por qué lo elegimos.</p>
        )}
        {h.destacados.length > 0 && (
          <ul className="border-t border-col-ink">
            {h.destacados.map((d) => (
              <li key={d} className="flex items-center gap-4 border-b border-col-line py-3.5 text-[16px]">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45 bg-col-gold" />
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FotosFantasma() {
  return (
    <div className="cs-hotel-fotos">
      {[0, 1, 2].map((i) => (
        <div key={i} className="relative">
          <MedioFantasma relleno />
        </div>
      ))}
    </div>
  );
}

function FichaHotelFantasma() {
  return (
    <div className="cs-hotel">
      <FotosFantasma />
      <div className="flex flex-col gap-6">
        <Eyebrow className="text-col-slate/40">Destino · noches</Eyebrow>
        <h3 className={cn("cs-h2", fantasma)}>Nombre del hotel</h3>
        <p className={cn("text-[18px]", fantasma)}>Elegí el hotel de cada tramo en Recorrido.</p>
      </div>
    </div>
  );
}

// ── Video a sangre ──────────────────────────────────────────────────────────

export function VideoSangre({ v }: V) {
  const { preview } = usePagina();
  if (!v.video) {
    if (!preview) return null;
    return (
      <Seccion seccion="galeria">
        <MedioFantasma aspecto={32 / 9} texto="Video a sangre (opcional)" />
      </Seccion>
    );
  }
  return (
    <Seccion seccion="galeria">
      <div className="cs-video">
        <MedioVideo medio={v.video.medio} variante="reproductor" titulo={v.video.titulo} relleno />
        {v.video.titulo && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8">
            <div className="cs-envolvente">
              <Eyebrow className="text-white">{v.video.titulo}</Eyebrow>
            </div>
          </div>
        )}
      </div>
    </Seccion>
  );
}

// ── Día a día ───────────────────────────────────────────────────────────────

export function Dias({ v }: V) {
  const { preview } = usePagina();
  const reales = v.dias.filter((d) => d.titulo.trim() || !vacioHtml(d.texto));
  const dias = reales.length
    ? reales
    : preview
      ? [1, 2, 3].map((n) => ({
          id: `f${n}`,
          desde: n,
          hasta: n,
          titulo: "",
          texto: "",
          ciudadNombre: "",
          hotelNombre: "",
          medios: [],
        }))
      : [];
  const [abierto, setAbierto] = useState<string | null>(dias[0]?.id ?? null);
  if (!dias.length) return null;
  const lugares = ciudades(v).map((t) => t.ciudadNombre);

  return (
    <Seccion seccion="dias" ancla="dias" className="cs-bloque bg-col-surface">
      <div className="cs-envolvente cs-dias">
        <div className="cs-dias-aside flex flex-col gap-5">
          <h2 className="cs-h2">Día a día</h2>
          {(v.noches > 0 || lugares.length > 0) && (
            <p className="max-w-[32ch] text-[16px] font-light leading-relaxed text-col-slate">
              {[v.noches > 0 && plural(v.noches, "noche", "noches"), unirLista(lugares)].filter(Boolean).join(lugares.length > 1 ? " entre " : " en ")}.
              {" "}El ritmo se ajusta con tu especialista.
            </p>
          )}
        </div>
        <ol className="border-t border-col-ink">
          {dias.map((d) => {
            const abre = abierto === d.id;
            const vacio = !d.titulo.trim();
            return (
              <li key={d.id} className="border-b border-col-line">
                <h3>
                  <button
                    type="button"
                    aria-expanded={abre}
                    aria-controls={`cs-dia-${d.id}`}
                    onClick={() => setAbierto(abre ? null : d.id)}
                    className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-6 text-left"
                  >
                    <span className="flex flex-col gap-2">
                      <span className={cn(etiqueta, "text-col-slate")}>
                        {etiquetaDias(d.desde, d.hasta)}
                        {d.ciudadNombre && ` · ${d.ciudadNombre}`}
                      </span>
                      <span
                        className={cn(
                          "font-col-display text-[26px] leading-tight transition-colors duration-200 ease-col group-hover:text-col-slate",
                          vacio && fantasma,
                        )}
                      >
                        {d.titulo || "Contá qué pasa este día"}
                      </span>
                    </span>
                    <span aria-hidden className="relative h-4 w-4">
                      <span className="absolute left-0 top-[7.5px] h-px w-4 bg-col-ink" />
                      <span
                        className={cn(
                          "absolute left-[7.5px] top-0 h-4 w-px bg-col-gold transition-transform duration-500 ease-col",
                          abre ? "scale-y-0" : "scale-y-100",
                        )}
                      />
                    </span>
                  </button>
                </h3>
                <div id={`cs-dia-${d.id}`} role="region" className="cs-dia-cuerpo" data-abierto={abre}>
                  <div>
                    <div className="flex flex-col gap-5 pb-8">
                      {!vacioHtml(d.texto) ? (
                        <Html html={d.texto} className="max-w-[640px] text-col-slate" />
                      ) : (
                        preview && <p className={cn("text-[17px]", fantasma)}>Texto del día: actividades, traslados y comidas.</p>
                      )}
                      {d.medios.length > 0 && (
                        <div className="cs-dia-fotos">
                          {d.medios.slice(0, 3).map((m) => (
                            <MedioImagen key={m.id} medio={m} aspecto={4 / 3} sizes="240px" />
                          ))}
                        </div>
                      )}
                      {d.hotelNombre && (
                        <p className="text-[14px] text-col-slate">
                          Noche en <span className="font-col-display text-[18px] text-col-ink">{d.hotelNombre}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Seccion>
  );
}

// ── Galería ─────────────────────────────────────────────────────────────────

const ASPECTOS_FANTASMA = [4 / 5, 3 / 2, 1, 3 / 4, 3 / 2, 4 / 5];

export function Galeria({ v }: V) {
  const { preview } = usePagina();
  const [indice, setIndice] = useState(-1);
  if (!v.galeria.length && !preview) return null;

  return (
    <Seccion seccion="galeria" className="cs-bloque">
      <div className="cs-envolvente">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 className="cs-h2">El viaje en imágenes</h2>
          {v.galeria.length > 0 && (
            <span className="shrink-0 pb-2 text-[13px] text-col-slate">{plural(v.galeria.length, "foto", "fotos")}</span>
          )}
        </div>
        <div className="cs-galeria">
          {v.galeria.length
            ? v.galeria.map((m, i) => (
                <figure key={`${m.id}-${i}`} className="relative">
                  <button
                    type="button"
                    onClick={() => setIndice(i)}
                    aria-label={`Ver foto: ${m.leyendaUso || m.alt}`}
                    className="group relative block w-full cursor-zoom-in overflow-hidden"
                  >
                    <MedioImagen
                      medio={m}
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      imgClassName="transition-transform duration-[1200ms] ease-col group-hover:scale-[1.04]"
                    />
                    {m.tipo === "VIDEO" && (
                      <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm bg-col-ink/60 text-col-base">
                        <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </span>
                    )}
                  </button>
                  {(m.leyendaUso || m.credito) && (
                    <figcaption className="cs-galeria-leyenda pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] bg-col-base px-2.5 py-1.5 text-[12px] leading-4 text-col-ink">
                      {m.leyendaUso}
                      {m.credito && <span className="text-col-slate">{m.leyendaUso && " · "}Foto: {m.credito}</span>}
                    </figcaption>
                  )}
                </figure>
              ))
            : ASPECTOS_FANTASMA.map((a, i) => <MedioFantasma key={i} aspecto={a} texto={i === 0 ? "Sumá 6 fotos o más" : undefined} />)}
        </div>
      </div>
      {indice >= 0 && <Visor fotos={v.galeria} indice={indice} onCerrar={() => setIndice(-1)} />}
    </Seccion>
  );
}

// ── Qué incluye, información práctica y precio ──────────────────────────────

const CAMPOS_INFO = [
  ["idioma", "Idioma"],
  ["moneda", "Moneda"],
  ["visado", "Visado"],
  ["comoLlegar", "Cómo llegar"],
  ["salud", "Salud"],
  ["clima", "Clima"],
] as const;

/** "Peso filipino. Tarjetas en hoteles." → título corto + nota. */
function partirInfo(t: string) {
  const i = t.indexOf(". ");
  return i > 0 && i < 70 ? [t.slice(0, i), t.slice(i + 2)] : [t, ""];
}

export function Detalles({ v }: V) {
  const { preview } = usePagina();
  const listas = [
    { id: "incluye", nombre: "Qué incluye", items: v.incluye },
    { id: "noIncluye", nombre: "Qué no incluye", items: v.noIncluye },
  ].filter((l) => l.items.length || preview);
  const [pestana, setPestana] = useState(listas[0]?.id ?? "incluye");
  const info = CAMPOS_INFO.filter(([k]) => v.info[k].trim() || preview);
  const precio = precioVisible(v);
  if (!preview && !listas.length && !info.length && !precio) return null;
  const lista = listas.find((l) => l.id === pestana) ?? listas[0];

  return (
    <Seccion seccion="info" ancla="info" className="cs-bloque bg-col-surface">
      <div className="cs-envolvente flex flex-col gap-16">
        <h2 className="cs-h2">Antes de viajar</h2>

        {lista && (
          <div className="max-w-[760px]">
            <div role="tablist" aria-label="Qué incluye" className="flex gap-8">
              {listas.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={l.id === lista.id}
                  onClick={() => setPestana(l.id)}
                  className={cn(
                    etiqueta,
                    "relative pb-4 transition-colors duration-200 ease-col",
                    l.id === lista.id ? "text-col-ink" : "text-col-slate/70 hover:text-col-ink",
                  )}
                >
                  {l.nombre}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[2px] origin-left bg-col-gold transition-transform duration-500 ease-col",
                      l.id === lista.id ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </button>
              ))}
            </div>
            <ul role="tabpanel" className="border-t border-col-ink text-[16px] leading-relaxed">
              {(lista.items.length ? lista.items : ["", "", ""]).map((it, i) => (
                <li key={i} className="flex items-center gap-4 border-b border-col-line py-3.5">
                  {lista.id === "incluye" ? (
                    <Check aria-hidden className="h-4 w-4 shrink-0 text-col-ink" strokeWidth={1.5} />
                  ) : (
                    <span aria-hidden className="mx-0.5 h-px w-3 shrink-0 bg-col-slate" />
                  )}
                  <span className={cn(lista.id === "noIncluye" && "text-col-slate", !it && fantasma)}>
                    {it || (lista.id === "incluye" ? "Algo que incluye el viaje" : "Algo que no incluye")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {info.length > 0 && (
          <div className="cs-info-grid">
            {info.map(([k, nombre]) => {
              const [titulo, nota] = partirInfo(v.info[k].trim());
              return (
                <div key={k} className="flex flex-col gap-3 py-7">
                  <span className={cn(etiqueta, "text-col-slate")}>{nombre}</span>
                  <span className={cn("font-col-display text-[24px] leading-8", !titulo && fantasma)}>{titulo || "Sin completar"}</span>
                  {nota && <span className="text-[14px] leading-[22px] text-col-slate">{nota}</span>}
                </div>
              );
            })}
          </div>
        )}

        <div className="cs-detalles-pie border-t border-col-line pt-8">
          {precio ? (
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-col-display text-[30px] leading-none">
                Desde USD {new Intl.NumberFormat("es-UY").format(v.precioDesde!)}
              </span>
              {v.precioNota && <span className="text-[13px] text-col-slate">{v.precioNota}</span>}
            </p>
          ) : (
            <p className="text-[13px] text-col-slate">Información orientativa. Tu especialista la confirma al armar el viaje.</p>
          )}
          <BotonConsultar className="self-start" />
        </div>
      </div>
    </Seccion>
  );
}

// ── Especialista ────────────────────────────────────────────────────────────

export function Especialista({ v }: V) {
  const { preview } = usePagina();
  const e = v.especialista;
  if (!e && !preview) return null;
  const canales = e
    ? [
        e.whatsapp && {
          nombre: "WhatsApp",
          href: `https://wa.me/${e.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
            `Hola ${e.nombre.split(" ")[0]}, quiero consultar por ${v.titulo}.`,
          )}`,
          Icono: MessageCircle,
        },
        e.telefono && { nombre: "Llamada", href: `tel:${e.telefono.replace(/[^\d+]/g, "")}`, Icono: Phone },
        e.email && {
          nombre: "Email",
          href: `mailto:${e.email}?subject=${encodeURIComponent(`Consulta: ${v.titulo}`)}`,
          Icono: Mail,
        },
      ].filter((c): c is { nombre: string; href: string; Icono: typeof Mail } => !!c)
    : [];

  return (
    <Seccion seccion="hero" ancla="especialista" className="cs-bloque bg-col-ink text-col-base">
      <div className="cs-envolvente cs-especialista">
        <div className="cs-especialista-retrato">
          {e?.retrato ? (
            <MedioImagen medio={e.retrato} aspecto={4 / 5} sizes="280px" />
          ) : (
            <MedioFantasma aspecto={4 / 5} oscuro texto={e ? undefined : "Retrato"} />
          )}
        </div>
        <div className="flex flex-col gap-5">
          <Eyebrow className="text-col-line">{e?.region ? `Tu especialista en ${e.region}` : "Tu especialista"}</Eyebrow>
          <h2 className={cn("cs-h2", !e && "italic text-col-base/40")}>{e?.nombre || "Elegí el especialista"}</h2>
          {e?.frase && (
            <p className="max-w-[34ch] font-col-display text-[24px] leading-[1.3] text-col-line">“{e.frase}”</p>
          )}
          {e && e.idiomas.length > 0 && (
            <span className="text-[13px] text-col-line">Habla {unirLista(e.idiomas, true)}</span>
          )}
        </div>
        {canales.length > 0 && (
          <div className="cs-especialista-canales flex flex-col gap-3">
            {canales.map(({ nombre, href, Icono }) => (
              <a
                key={nombre}
                href={href}
                target={nombre === "WhatsApp" ? "_blank" : undefined}
                rel={nombre === "WhatsApp" ? "noopener noreferrer" : undefined}
                className={cn(
                  etiqueta,
                  "group flex h-14 items-center justify-between rounded-sm border border-col-slate px-5 text-col-base transition-[border-color,background-color,padding] duration-300 ease-col hover:border-col-gold hover:bg-col-gold/10 hover:pl-6",
                )}
              >
                <span className="flex items-center gap-3.5">
                  <Icono aria-hidden className="h-5 w-5" strokeWidth={1.25} />
                  {nombre}
                </span>
                <ArrowRight aria-hidden className="h-4 w-4 text-col-gold transition-transform duration-300 ease-col group-hover:translate-x-1" strokeWidth={1.25} />
              </a>
            ))}
          </div>
        )}
      </div>
    </Seccion>
  );
}

// ── Cierre ──────────────────────────────────────────────────────────────────

export function Cierre({ v }: V) {
  const foto = v.portada?.tipo === "FOTO" ? v.portada : null;
  return (
    <div className="cs-cierre flex items-center">
      {foto && <MedioImagen medio={foto} relleno sizes="100vw" />}
      <div aria-hidden className="absolute inset-0 bg-col-ink/55" />
      <div className="cs-envolvente relative flex flex-col items-center gap-6 py-24 text-center">
        <h2 className="cs-h2 max-w-[20ch] text-col-base">Este viaje se arma a tu medida.</h2>
        <p className="max-w-[46ch] text-[17px] font-light leading-relaxed text-col-line">
          Contanos cuándo querés viajar y con quién. Tu especialista te escribe en el día.
        </p>
        <BotonConsultar claro className="mt-2" />
      </div>
    </div>
  );
}

// ── Barra inferior en celular ───────────────────────────────────────────────

export function Barra({ v }: V) {
  const n = ciudades(v).length;
  const datos = [v.noches > 0 && plural(v.noches, "noche", "noches"), n > 0 && plural(n, "destino", "destinos")]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="cs-barra items-center justify-between gap-3 border-t border-col-line bg-col-surface px-5 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-col-display text-[20px] font-medium leading-6">{tituloCorto(v.titulo) || "Experiencia"}</span>
        {datos && <span className={cn(etiqueta, "text-[12px] text-col-slate")}>{datos}</span>}
      </div>
      <BotonConsultar className="shrink-0" />
    </div>
  );
}
