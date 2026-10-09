"use client";

// Paso 6: galería. Grilla grande ordenable con leyenda propia por foto,
// sumar desde la biblioteca o soltando archivos directo sobre la grilla, y
// el video a sangre aparte.

import { useCallback, useMemo, useState } from "react";
import { Check, Film, ImagePlus, Upload, X } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../../shell/contexto";
import { Boton } from "../../ui";
import { MedioFantasma } from "../../sitio/medios";
import { SelectorMedios } from "../../pickers/SelectorMedios";
import { useSubidas } from "../../biblioteca/useSubidas";
import { Campo, Contador, Grupo, ListaOrdenable, Miniatura, SlotMedio, entrada } from "../campos";
import { useConstructor } from "../contexto";

const MAX = 60;
const MINIMO = 6;
const FOTOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const vistaDeDto = (m: ColMedioDto): MedioVista => ({
  id: m.id,
  tipo: m.tipo,
  url: m.url,
  variantes: m.variantes,
  ancho: m.ancho,
  alto: m.alto,
  colorDominante: m.colorDominante,
  placeholder: m.placeholder,
  alt: m.alt,
  leyenda: m.leyenda,
  credito: m.credito,
  focoX: m.focoX,
  focoY: m.focoY,
  posterUrl: m.posterUrl,
  duracion: m.duracion });

export function PasoGaleria() {
  const { borrador, setContenido, mapas, agregarMedios, api, editable } = useConstructor();
  const { puede } = useCollection();
  const galeria = borrador.contenido.galeria;
  const video = borrador.contenido.video;
  const [selector, setSelector] = useState(false);
  const [encima, setEncima] = useState(false);

  const alListo = useCallback(
    (m: ColMedioDto) => {
      agregarMedios([vistaDeDto(m)]);
      setContenido((k) =>
        k.galeria.some((r) => r.medioId === m.id) || k.galeria.length >= MAX
          ? {}
          : { galeria: [...k.galeria, { medioId: m.id }] },
      );
    },
    [agregarMedios, setContenido],
  );
  const opciones = useMemo(
    () => ({ preparar: api.prepararSubidaMedio, registrar: api.registrarMedio, put: api.subirArchivo }),
    [api],
  );
  const { subidas, agregar } = useSubidas(alListo, opciones);
  const enCurso = subidas.filter((s) => s.estado !== "listo" && s.estado !== "error");
  const puedeSubir = editable && puede("medios.editar");

  const items = galeria.map((r) => ({ ...r, id: r.medioId }));
  const cambiarLeyenda = (id: string, leyenda: string) =>
    setContenido((k) => ({
      galeria: k.galeria.map((r) => (r.medioId === id ? { ...r, leyenda: leyenda || undefined } : r)) }));

  return (
    <div className="flex flex-col gap-12">
      <div
        onDragOver={(e) => {
          if (!puedeSubir || !e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setEncima(false);
        }}
        onDrop={(e) => {
          if (!puedeSubir) return;
          e.preventDefault();
          setEncima(false);
          const files = Array.from(e.dataTransfer.files).filter((f) => FOTOS.includes(f.type));
          if (files.length) agregar(files.slice(0, MAX - galeria.length));
        }}
        className={cn(
          "relative -m-3 rounded-col p-3 transition-colors duration-col ease-col",
          encima && "bg-col-gold/10 outline-dashed outline-1 outline-col-gold",
        )}
      >
        <div className="mb-5 flex items-end gap-4">
          <div className="min-w-0">
            <p className="flex items-baseline gap-3 whitespace-nowrap">
              <span className="font-col-display text-col-2xl tabular-nums leading-none text-col-ink">
                {galeria.length} {galeria.length === 1 ? "foto" : "fotos"}
              </span>
              <span className={cn("flex items-center gap-1 text-col-sm", galeria.length >= MINIMO ? "text-col-ok" : "text-col-muted")}>
                · mínimo {MINIMO}
                {galeria.length >= MINIMO && <Check className="h-3.5 w-3.5" strokeWidth={2} aria-label="cumplido" />}
              </span>
            </p>
            <p className="mt-1.5 text-col-sm text-col-slate">
              {puedeSubir ? "Arrastrá para ordenar. Soltá archivos acá para subirlos." : "Arrastrá para ordenar."}
            </p>
          </div>
          {editable && galeria.length < MAX && (
            <Boton tam="sm" className="ml-auto" onClick={() => setSelector(true)}>
              <ImagePlus className="h-4 w-4" strokeWidth={1.5} /> Agregar de la biblioteca
            </Boton>
          )}
        </div>

        {galeria.length === 0 && enCurso.length === 0 ? (
          <button
            type="button"
            disabled={!editable}
            onClick={() => setSelector(true)}
            className="grid w-full grid-cols-3 gap-3"
            aria-label="Agregar fotos a la galería"
          >
            {Array.from({ length: MINIMO }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "flex aspect-[4/5] items-center justify-center rounded-col-sm border border-dashed border-col-slate/25 bg-col-surface",
                  i === 0 && "col-span-2 row-span-2 aspect-auto",
                )}
              >
                {i === 0 && (
                  <span className="flex flex-col items-center gap-3 px-6 text-center">
                    <ImagePlus className="h-7 w-7 text-col-gold" strokeWidth={1.2} />
                    <span className="font-col-display text-col-2xl leading-tight text-col-ink">Seis fotos, como mínimo</span>
                    <span className="text-col-sm text-col-slate">Elegí de la biblioteca o soltá archivos acá.</span>
                  </span>
                )}
              </span>
            ))}
          </button>
        ) : (
          <ListaOrdenable
            grilla
            deshabilitado={!editable}
            items={items}
            onOrden={(xs) => setContenido(() => ({ galeria: xs.map(({ id: _id, ...r }) => r) }))}
            className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3"
            render={(r, i, asa) => {
              const m = mapas.medios.get(r.medioId);
              return (
                <figure className="group">
                  <div
                    {...asa.props}
                    aria-label={`Mover foto ${i + 1}`}
                    className={cn(
                      "relative cursor-grab touch-none overflow-hidden rounded-col-sm active:cursor-grabbing",
                      asa.arrastrando && "shadow-col-2",
                    )}
                  >
                    {m ? (
                      <Miniatura medio={m} aspecto={4 / 5} sizes="240px" />
                    ) : (
                      <MedioFantasma aspecto={4 / 5} texto="No encontrada" />
                    )}
                    <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-col-sm bg-col-ink/70 px-1.5 text-col-xs tabular-nums lining-nums text-col-base backdrop-blur-sm">
                      {i + 1}
                    </span>
                    {editable && (
                      <button
                        type="button"
                        aria-label={`Quitar foto ${i + 1}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setContenido((k) => ({ galeria: k.galeria.filter((x) => x.medioId !== r.medioId) }))}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-col-sm bg-col-ink/70 text-col-base opacity-0 backdrop-blur-sm transition-opacity hover:bg-col-ink focus:opacity-100 group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                  <figcaption className="mt-1.5">
                    <input
                      aria-label={`Leyenda de la foto ${i + 1}`}
                      value={r.leyenda ?? ""}
                      maxLength={300}
                      onChange={(e) => cambiarLeyenda(r.medioId, e.target.value)}
                      placeholder={m?.leyenda || "Leyenda"}
                      className={cn(entrada, "min-h-9 border-transparent bg-transparent px-2 py-1 text-col-sm hover:border-col-line focus:bg-col-surface")}
                    />
                  </figcaption>
                </figure>
              );
            }}
          />
        )}
        {enCurso.length > 0 && (
          <ul className="mt-4 grid grid-cols-3 gap-3" aria-label="Subiendo">
            {enCurso.map((s) => (
              <li key={s.id} className="relative aspect-[4/5] overflow-hidden rounded-col-sm bg-col-line">
                {s.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.preview} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                )}
                <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 text-col-sm text-col-ink">
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {s.estado === "procesando" ? "Procesando" : `${s.progreso}%`}
                </span>
                <span className="absolute inset-x-0 bottom-0 h-1 bg-col-ink/15">
                  <span className="block h-full bg-col-gold transition-[width] duration-col-lento" style={{ width: `${s.progreso}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Grupo titulo="Video a sangre" ayuda="Ocupa todo el ancho entre el día a día y la galería. Opcional.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[260px_1fr]">
          <SlotMedio
            aspecto={16 / 9}
            tipo="VIDEO"
            medioId={video?.medioId}
            etiqueta="video"
            vacio="Elegir video"
            onCambio={(m) => setContenido((k) => ({ video: m ? { medioId: m.id, titulo: k.video?.titulo ?? "" } : null }))}
          />
          <Campo
            etiqueta="Título del video"
            htmlFor="video-titulo"
            accion={video ? <Contador n={video.titulo.length} max={160} /> : null}
            ayuda={video ? undefined : "Elegí primero el video."}
          >
            <div className="relative">
              <Film className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-col-muted" strokeWidth={1.5} />
              <input
                id="video-titulo"
                disabled={!video}
                value={video?.titulo ?? ""}
                maxLength={160}
                onChange={(e) => setContenido((k) => ({ video: k.video ? { ...k.video, titulo: e.target.value } : null }))}
                placeholder="Bacuit, un día en el agua"
                className={cn(entrada, "pl-10 font-col-display text-col-xl")}
              />
            </div>
          </Campo>
        </div>
      </Grupo>

      <SelectorMedios
        abierto={selector}
        onCerrar={() => setSelector(false)}
        multiple
        tipo="FOTO"
        titulo="Fotos para la galería"
        maximo={MAX - galeria.length}
        onElegir={(ms) => {
          agregarMedios(ms);
          setContenido((k) => {
            const ya = new Set(k.galeria.map((r) => r.medioId));
            return { galeria: [...k.galeria, ...ms.filter((m) => !ya.has(m.id)).map((m) => ({ medioId: m.id }))].slice(0, MAX) };
          });
        }}
      />
    </div>
  );
}
