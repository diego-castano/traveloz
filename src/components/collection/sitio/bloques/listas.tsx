"use client";

// Bloques que muestran contenido cargado en otros módulos: destinos,
// experiencias, estilos, especialistas, testimonios, aliados, preguntas y
// journal. Las listas llegan ya resueltas y filtradas a lo publicado; si están
// vacías, el sitio omite el bloque y la vista previa avisa dónde se cargan.

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/components/lib/cn";
import {
  ControlesSlider,
  ItemPregunta,
  LogoAliado,
  TarjetaArticulo,
  TarjetaDestino,
  TarjetaEspecialista,
  TarjetaExperiencia,
  TestimonioSlide,
} from "../tarjetas";
import { Cabecera, fantasmaOscuro, ListaVacia, MedioBloque, type PropsBloque } from "./comun";

// ── Destinos ────────────────────────────────────────────────────────────────

/**
 * Mosaico sin huecos. Desde 1100 la grilla tiene 4 columnas y va en grupos de
 * 5 (uno grande de 2x2 y cuatro chicos, alternando el lado del grande); lo que
 * sobra completa la última fila. Entre 560 y 1100, dos columnas: el primero
 * ocupa el ancho y, si el resto es impar, el último también.
 */
function celdaMosaico(i: number, n: number) {
  const enGrupos = Math.floor(n / 5) * 5;
  let ancho = "uno";
  if (i < enGrupos) ancho = i % 5 === 0 ? "grande" : "uno";
  else {
    const r = n - enGrupos;
    const k = i - enGrupos;
    if (r === 1) ancho = "completo";
    else if (r === 2 || (r === 3 && k === 0)) ancho = "mitad";
  }
  const lado = ancho === "grande" && Math.floor(i / 5) % 2 === 1 ? "derecha" : undefined;
  const medio = i === 0 || (i === n - 1 && (n - 1) % 2 === 1) ? "2" : "1";
  return { ancho, lado, medio };
}

export function BloqueDestinos({ bloque: b, modo }: PropsBloque<"destinos">) {
  const p = modo === "preview";
  const lista = b.destinos;
  return (
    <div className="cs-bloque">
      <div className="cs-envolvente flex flex-col gap-12">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} bajada={b.bajada} preview={p} />
        {lista.length ? (
          <div className="cs-mosaico">
            {lista.map((d, i) => {
              const c = celdaMosaico(i, lista.length);
              return (
                <div key={d.id} data-ancho={c.ancho} data-lado={c.lado} data-medio={c.medio} className="relative">
                  <TarjetaDestino d={d} conBajada={c.ancho !== "uno"} className="absolute inset-0" />
                </div>
              );
            })}
          </div>
        ) : (
          p && (
            <ListaVacia>
              {b.modo === "elegidos"
                ? "Elegí los destinos de este bloque."
                : "Todavía no hay destinos publicados: se cargan en Destinos."}
            </ListaVacia>
          )
        )}
      </div>
    </div>
  );
}

// ── Experiencias ────────────────────────────────────────────────────────────

export function BloqueExperiencias({ bloque: b, modo }: PropsBloque<"experiencias">) {
  const p = modo === "preview";
  return (
    <div className="cs-bloque bg-col-surface">
      <div className="cs-envolvente flex flex-col gap-14">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} bajada={b.bajada} preview={p} />
        {b.experiencias.length ? (
          <div className="cs-tarjetas">
            {b.experiencias.map((e) => (
              <TarjetaExperiencia key={e.id} e={e} />
            ))}
          </div>
        ) : (
          p && (
            <ListaVacia>
              {b.modo === "elegidas"
                ? "Elegí las experiencias de este bloque."
                : "Todavía no hay experiencias destacadas: se marcan en Experiencias."}
            </ListaVacia>
          )
        )}
      </div>
    </div>
  );
}

// ── Estilos de viaje ────────────────────────────────────────────────────────

export function BloqueEstilos({ bloque: b, modo }: PropsBloque<"estilos">) {
  const p = modo === "preview";
  let items = b.itemsVista.filter((i) => p || i.titulo.trim());
  if (!items.length && p) items = [1, 2, 3, 4].map((n) => ({ id: `f${n}`, titulo: "", texto: "", href: "", medio: null }));
  return (
    <div className="cs-bloque">
      <div className="cs-envolvente flex flex-col gap-12">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} preview={p} />
        <div className="cs-estilos">
          {items.map((i) => {
            const contenido = (
              <>
                <MedioBloque
                  medio={i.medio}
                  preview={p}
                  relleno
                  oscuro
                  texto=""
                  sizes="(min-width: 1100px) 22vw, 60vw"
                  className="transition-transform duration-[1200ms] ease-col group-hover:scale-[1.05]"
                />
                <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(50,55,59,0.7),rgba(50,55,59,0.1)_60%)]" />
                <div className="absolute inset-x-6 bottom-6 flex flex-col gap-2.5 text-white">
                  <span aria-hidden className="h-px w-6 bg-col-gold" />
                  <span className={cn("font-col-display text-[30px] leading-[1.1]", !i.titulo && fantasmaOscuro)}>
                    {i.titulo || "Estilo de viaje"}
                  </span>
                  {i.texto && <span className="text-[14px] font-light leading-snug text-white/85">{i.texto}</span>}
                </div>
              </>
            );
            const clase = "group relative block overflow-hidden bg-col-ink";
            return i.href ? (
              <a key={i.id} href={i.href} className={clase}>
                {contenido}
              </a>
            ) : (
              <div key={i.id} className={clase}>
                {contenido}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Especialistas ───────────────────────────────────────────────────────────

export function BloqueEspecialistas({ bloque: b, modo }: PropsBloque<"especialistas">) {
  const p = modo === "preview";
  return (
    <div className="cs-bloque bg-col-surface">
      <div className="cs-envolvente flex flex-col gap-14">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} bajada={b.bajada} preview={p} />
        {b.especialistas.length ? (
          <div className="cs-retratos">
            {b.especialistas.map((e) => (
              <TarjetaEspecialista key={e.id} e={e} />
            ))}
          </div>
        ) : (
          p && <ListaVacia>Todavía no hay especialistas publicados: se cargan en Especialistas.</ListaVacia>
        )}
      </div>
    </div>
  );
}

// ── Testimonios ─────────────────────────────────────────────────────────────

export function BloqueTestimonios({ bloque: b, modo }: PropsBloque<"testimonios">) {
  const p = modo === "preview";
  const lista = b.testimonios;
  const [ref, api] = useEmblaCarousel({ align: "start", duration: 32 });
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (!api) return;
    const leer = () => setActual(api.selectedScrollSnap());
    leer();
    api.on("select", leer).on("reInit", leer);
    return () => {
      api.off("select", leer).off("reInit", leer);
    };
  }, [api]);

  return (
    <div className="cs-bloque">
      <div className="cs-envolvente flex flex-col gap-12">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} preview={p} />
        {lista.length ? (
          <div className="flex flex-col gap-10">
            <div ref={ref} className="overflow-hidden">
              <div className="-ml-10 flex touch-pan-y">
                {lista.map((t, i) => (
                  <div
                    key={t.id}
                    className="min-w-0 shrink-0 grow-0 basis-full pl-10"
                    role="group"
                    aria-roledescription="testimonio"
                    aria-label={`${i + 1} de ${lista.length}`}
                  >
                    <TestimonioSlide t={t} />
                  </div>
                ))}
              </div>
            </div>
            {lista.length > 1 && (
              <div className="cs-testimonio">
                <span aria-hidden className="cs-testimonio-hueco" />
                <ControlesSlider
                  actual={actual}
                  total={lista.length}
                  onAnterior={() => api?.scrollPrev()}
                  onSiguiente={() => api?.scrollNext()}
                />
              </div>
            )}
          </div>
        ) : (
          p && (
            <ListaVacia>
              {b.modo === "elegidos"
                ? "Elegí los testimonios de este bloque."
                : "Todavía no hay testimonios publicados: se cargan en Testimonios."}
            </ListaVacia>
          )
        )}
      </div>
    </div>
  );
}

// ── Aliados ─────────────────────────────────────────────────────────────────

export function BloqueAliados({ bloque: b, modo }: PropsBloque<"aliados">) {
  const p = modo === "preview";
  return (
    <div className="cs-bloque">
      <div className="cs-envolvente flex flex-col gap-12">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} bajada={b.bajada} preview={p} />
        {b.aliados.length ? (
          <div className="cs-aliados">
            {b.aliados.map((a) => (
              <LogoAliado key={a.id} a={a} />
            ))}
          </div>
        ) : (
          p && <ListaVacia>Todavía no hay aliados publicados: se cargan en Aliados.</ListaVacia>
        )}
      </div>
    </div>
  );
}

// ── Preguntas frecuentes ────────────────────────────────────────────────────

export function BloquePreguntas({ bloque: b, modo }: PropsBloque<"preguntas">) {
  const p = modo === "preview";
  const lista = b.preguntas;
  const [abierta, setAbierta] = useState<string | null>(lista[0]?.id ?? null);
  return (
    <div className="cs-bloque bg-col-surface">
      <div className="cs-envolvente cs-preguntas">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} preview={p} className="cs-preguntas-cabecera" />
        {lista.length ? (
          <div className="border-t border-col-ink">
            {lista.map((q) => (
              <ItemPregunta key={q.id} p={q} abierta={abierta === q.id} onAlternar={() => setAbierta(abierta === q.id ? null : q.id)} />
            ))}
          </div>
        ) : (
          p && (
            <ListaVacia>
              {b.categoria.trim()
                ? `Todavía no hay preguntas publicadas en "${b.categoria}": se cargan en Preguntas.`
                : "Todavía no hay preguntas publicadas: se cargan en Preguntas."}
            </ListaVacia>
          )
        )}
      </div>
    </div>
  );
}

// ── Journal ─────────────────────────────────────────────────────────────────

export function BloqueJournal({ bloque: b, modo }: PropsBloque<"journal">) {
  const p = modo === "preview";
  const [primero, ...resto] = b.articulos;
  return (
    <div className="cs-bloque">
      <div className="cs-envolvente flex flex-col gap-12">
        <Cabecera eyebrow={b.eyebrow} titulo={b.titulo} preview={p} />
        {primero ? (
          <div className={cn("cs-journal", !resto.length && "cs-journal--solo")}>
            <TarjetaArticulo a={primero} />
            {resto.length > 0 && (
              <div className="flex flex-col gap-10">
                {resto.map((a) => (
                  <TarjetaArticulo key={a.id} a={a} variante="fila" />
                ))}
              </div>
            )}
          </div>
        ) : (
          p && (
            <ListaVacia>
              {b.modo === "elegidos"
                ? "Elegí los artículos de este bloque."
                : "Todavía no hay artículos publicados: se escriben en Journal."}
            </ListaVacia>
          )
        )}
      </div>
    </div>
  );
}
