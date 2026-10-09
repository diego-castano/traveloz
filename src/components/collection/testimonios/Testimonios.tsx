"use client";

// Testimonios de Collection: tarjetas con la cita como en el sitio (serif,
// filete dorado, foto 4:5 del viaje), orden arrastrando, interruptor de
// publicado y una hoja lateral con la diapositiva del slider en vivo.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ImagePlus, RefreshCw, X } from "lucide-react";
import {
  actualizarTestimonio,
  crearTestimonio,
  eliminarTestimonio,
  reordenarTestimonios,
  type TestimonioItem,
} from "@/actions/collection/testimonios.actions";
import type { Resultado } from "@/lib/collection/ejecutar";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { EncabezadoPagina, Eyebrow, Interruptor, etiquetaCampo, inputLinea } from "../ui";
import { MedioImagen, fondoDeColor } from "../sitio/medios";
import { Campo, Contador, useSensoresOrden } from "../constructor/campos";
import { SelectorMedios } from "../pickers/SelectorMedios";
import { TestimonioSlide } from "../sitio/tarjetas";
import "../sitio/sitio.css";
import { Escalado, Hoja, NuevoEnLinea, ZonaEliminar, tonoDe, useGuardadoDiferido } from "../contenido/comun";

const EASE = [0.22, 1, 0.36, 1] as const;
/** Largo que todavía se lee cómodo en el slider. */
const CITA_IDEAL = 280;

type Payload = Parameters<typeof actualizarTestimonio>[1];

/** Lo que la pantalla le pide al servidor. La ruta de desarrollo pasa uno en memoria. */
export interface ApiTestimonios {
  crear(input: { nombre: string }): Promise<Resultado<{ id: string }>>;
  actualizar(id: string, input: Payload): Promise<Resultado<null>>;
  reordenar(ids: string[]): Promise<Resultado<null>>;
  eliminar(id: string): Promise<Resultado<null>>;
}

const apiReal: ApiTestimonios = {
  crear: crearTestimonio,
  actualizar: actualizarTestimonio,
  reordenar: reordenarTestimonios,
  eliminar: eliminarTestimonio,
};

function payload(t: TestimonioItem): Payload {
  return {
    nombre: t.nombre,
    lugar: t.lugar,
    viaje: t.viaje,
    cita: t.cita,
    fotoId: t.foto?.id ?? null,
    experienciaId: t.experienciaId,
    fecha: t.fecha,
    publicado: t.publicado,
  };
}

export function Testimonios({
  inicial,
  experiencias,
  api = apiReal,
  abrirId = null,
}: {
  inicial: TestimonioItem[] | { error: string };
  experiencias: { id: string; titulo: string }[];
  api?: ApiTestimonios;
  abrirId?: string | null;
}) {
  const avisar = useAviso();
  const { puede } = useCollection();
  const editable = puede("sitio.editar");
  const sensores = useSensoresOrden();

  const [items, setItems] = useState<TestimonioItem[]>(Array.isArray(inicial) ? inicial : []);
  const [abierto, setAbierto] = useState<string | null>(abrirId);
  const error = Array.isArray(inicial) ? null : inicial.error;

  const actual = items.find((x) => x.id === abierto) ?? null;
  const guardado = useGuardadoDiferido(
    actual,
    abierto,
    (t) => (t ? api.actualizar(t.id, payload(t)) : Promise.resolve({ ok: true as const, data: null })),
    editable && !!actual,
  );
  const cambiar = (parcial: Partial<TestimonioItem>) =>
    setItems((l) => l.map((x) => (x.id === abierto ? { ...x, ...parcial } : x)));
  const cerrar = () => {
    void guardado.ya();
    setAbierto(null);
  };

  const crear = async (nombre: string) => {
    const r = await api.crear({ nombre });
    if (!r.ok) {
      avisar(r.error, "error");
      return false;
    }
    const nuevo: TestimonioItem = {
      id: r.data.id,
      nombre,
      lugar: "",
      viaje: "",
      cita: "",
      foto: null,
      publicado: false,
      orden: items.length,
      experienciaId: null,
      fecha: null,
    };
    setItems((l) => [...l, nuevo]);
    setAbierto(nuevo.id);
    return true;
  };

  const publicar = async (t: TestimonioItem, publicado: boolean) => {
    setItems((l) => l.map((x) => (x.id === t.id ? { ...x, publicado } : x)));
    const r = await api.actualizar(t.id, payload({ ...t, publicado }));
    if (!r.ok) {
      setItems((l) => l.map((x) => (x.id === t.id ? { ...x, publicado: !publicado } : x)));
      avisar(r.error, "error");
    }
  };

  const alSoltar = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const previo = items;
    const nuevo = arrayMove(
      items,
      items.findIndex((x) => x.id === e.active.id),
      items.findIndex((x) => x.id === e.over!.id),
    );
    setItems(nuevo);
    const r = await api.reordenar(nuevo.map((x) => x.id));
    if (!r.ok) {
      setItems(previo);
      avisar(r.error, "error");
    }
  };

  const eliminar = async () => {
    if (!actual) return null;
    const r = await api.eliminar(actual.id);
    if (!r.ok) return r.error;
    setAbierto(null);
    setItems((l) => l.filter((x) => x.id !== actual.id));
    avisar("Testimonio eliminado.");
    return null;
  };

  const publicados = items.filter((x) => x.publicado).length;
  const tituloExp = (id: string | null) => experiencias.find((e) => e.id === id)?.titulo ?? null;

  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoPagina
        eyebrow="Testimonios"
        titulo="Historias de viajeros"
        descripcion={`${items.length} ${items.length === 1 ? "testimonio" : "testimonios"} · ${publicados} en el sitio`}
        acciones={editable && <NuevoEnLinea etiqueta="Nuevo testimonio" placeholder="Quiénes viajaron" onCrear={crear} />}
      />

      {error && (
        <p role="alert" className="mb-6 text-[14px] text-col-alerta">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="py-24 text-center font-col-display text-[28px] italic text-col-slate">
          Todavía no hay testimonios. Cargá el primero.
        </p>
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => void alSoltar(e)}>
          <SortableContext items={items.map((x) => x.id)} strategy={rectSortingStrategy} disabled={!editable}>
            <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {items.map((t, i) => (
                  <Tarjeta
                    key={t.id}
                    t={t}
                    i={i}
                    experiencia={tituloExp(t.experienciaId)}
                    editable={editable}
                    onAbrir={() => setAbierto(t.id)}
                    onPublicar={(v) => void publicar(t, v)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {editable && items.length > 1 && (
        <p className="mt-12 text-center text-[13px] text-col-slate/70">Arrastrá las tarjetas para cambiar el orden del slider.</p>
      )}

      <Hoja abierta={!!actual} titulo={actual?.nombre || "Testimonio"} estado={guardado.estado} onCerrar={cerrar}>
        {actual && (
          <EditorTestimonio
            t={actual}
            experiencias={experiencias}
            editable={editable}
            error={guardado.error}
            cambiar={cambiar}
            onEliminar={eliminar}
          />
        )}
      </Hoja>
    </div>
  );
}

function Foto({ t, sizes }: { t: Pick<TestimonioItem, "nombre" | "foto">; sizes: string }) {
  return t.foto ? (
    <MedioImagen medio={t.foto} relleno sizes={sizes} imgClassName="group-hover:scale-[1.03]" />
  ) : (
    <div className="absolute inset-0" style={{ background: fondoDeColor(tonoDe(t.nombre || "testimonio")) }} />
  );
}

function Tarjeta({
  t,
  i,
  experiencia,
  editable,
  onAbrir,
  onPublicar,
}: {
  t: TestimonioItem;
  i: number;
  experiencia: string | null;
  editable: boolean;
  onAbrir: () => void;
  onPublicar: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id, disabled: !editable });
  return (
    <motion.li
      ref={setNodeRef}
      layout={!isDragging}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 10) * 0.03 }}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className="group relative flex flex-col rounded-sm border border-col-line bg-col-surface transition-shadow duration-300 ease-col hover:shadow-[0_18px_40px_-28px_rgba(50,55,59,0.5)]"
    >
      <button
        type="button"
        onClick={onAbrir}
        {...(editable ? { ...attributes, ...listeners } : {})}
        aria-label={`Editar el testimonio de ${t.nombre}`}
        className={cn(
          "grid flex-1 grid-cols-[112px_minmax(0,1fr)] gap-6 p-5 text-left",
          editable && "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className={cn("relative aspect-[4/5] overflow-hidden rounded-sm bg-col-line", !t.publicado && "grayscale-[0.6]")}>
          <Foto t={t} sizes="112px" />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <span aria-hidden className="h-6 font-col-display text-[64px] font-light leading-[0.75] text-col-slate/70">
            “
          </span>
          <p
            className={cn(
              "line-clamp-4 font-col-display text-[21px] leading-[1.3]",
              t.cita ? "text-col-ink" : "italic text-col-slate/50",
            )}
          >
            {t.cita || "Todavía sin cita."}
          </p>
          <div className="mt-auto flex flex-col gap-1 pt-1">
            <span className="flex items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-col-ink">
              <span aria-hidden className="h-px w-6 shrink-0 bg-col-gold" />
              <span className="truncate">{[t.nombre, t.lugar].filter(Boolean).join(" · ")}</span>
            </span>
            {t.viaje && <span className="pl-9 text-[13px] text-col-slate">{t.viaje}</span>}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between gap-3 border-t border-col-line px-5 py-3">
        <span className="min-w-0 truncate text-[12px] text-col-slate">{experiencia ?? "Sin experiencia relacionada"}</span>
        <label className="flex shrink-0 items-center gap-2 text-[12px] text-col-slate">
          {t.publicado ? "Publicado" : "Oculto"}
          <Interruptor checked={t.publicado} onCheckedChange={onPublicar} disabled={!editable} label={`Publicar el testimonio de ${t.nombre}`} />
        </label>
      </div>
    </motion.li>
  );
}

function EditorTestimonio({
  t,
  experiencias,
  editable,
  error,
  cambiar,
  onEliminar,
}: {
  t: TestimonioItem;
  experiencias: { id: string; titulo: string }[];
  editable: boolean;
  error: string | null;
  cambiar: (p: Partial<TestimonioItem>) => void;
  onEliminar: () => Promise<string | null>;
}) {
  const ro = !editable;
  const opciones =
    t.experienciaId && !experiencias.some((e) => e.id === t.experienciaId)
      ? [...experiencias, { id: t.experienciaId, titulo: "Experiencia archivada" }]
      : experiencias;
  const vista = { ...t, cita: t.cita || "La cita del viajero va acá." };

  return (
    <>
      <div className="bg-col-base px-6 py-7">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <Eyebrow>Vista previa</Eyebrow>
          <span className="text-[12px] text-col-slate">
            {t.publicado ? "Así sale en el slider de testimonios" : "Oculto: no sale en el sitio"}
          </span>
        </div>
        <Escalado ancho={1040}>
          <div className="cs-raiz" data-modo="preview">
            <div className="cs-envolvente py-12">
              <TestimonioSlide t={vista} />
            </div>
          </div>
        </Escalado>
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-col-alerta">
            {error}
          </p>
        )}
        {ro && <p className="mt-3 text-[13px] text-col-slate">Solo lectura: te falta el permiso para editar el sitio.</p>}
      </div>

      <div className="flex flex-col gap-9 px-6 py-8">
        <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-6">
          <CampoFoto t={t} editable={editable} onCambio={(m) => cambiar({ foto: m })} />
          <div className="flex flex-col gap-7">
            <Campo etiqueta="Quiénes viajaron" htmlFor="t-nombre">
              <input
                id="t-nombre"
                value={t.nombre}
                maxLength={100}
                disabled={ro}
                placeholder="Carolina y Martín"
                onChange={(e) => cambiar({ nombre: e.target.value })}
                className={cn(inputLinea, "font-col-display text-[26px]")}
              />
            </Campo>
            <Campo etiqueta="De dónde son" htmlFor="t-lugar">
              <input
                id="t-lugar"
                value={t.lugar}
                maxLength={120}
                disabled={ro}
                placeholder="Montevideo"
                onChange={(e) => cambiar({ lugar: e.target.value })}
                className={inputLinea}
              />
            </Campo>
          </div>
        </div>

        <Campo etiqueta="Viaje" htmlFor="t-viaje" ayuda="Destino y fecha, como se lee en el sitio.">
          <input
            id="t-viaje"
            value={t.viaje}
            maxLength={160}
            disabled={ro}
            placeholder="Filipinas, enero 2026"
            onChange={(e) => cambiar({ viaje: e.target.value })}
            className={inputLinea}
          />
        </Campo>

        <Campo
          etiqueta="Cita"
          htmlFor="t-cita"
          accion={<Contador n={t.cita.length} max={CITA_IDEAL} ideal={180} />}
          ayuda={
            t.cita.length > CITA_IDEAL
              ? "Larga para el slider: con menos de 280 caracteres se lee de un vistazo."
              : "Sus palabras, sin retocar de más. Menos de 280 caracteres se lee mejor."
          }
        >
          <textarea
            id="t-cita"
            rows={5}
            value={t.cita}
            maxLength={1200}
            disabled={ro}
            placeholder="Volvimos con la sensación de haber tenido el mar para nosotros solos."
            onChange={(e) => cambiar({ cita: e.target.value })}
            className={cn(inputLinea, "resize-none font-col-display text-[21px] leading-[1.4]")}
          />
        </Campo>

        <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-6">
          <Campo etiqueta="Experiencia relacionada" htmlFor="t-exp" ayuda="Opcional. Para saber de qué viaje habla.">
            <div className="relative">
              <select
                id="t-exp"
                value={t.experienciaId ?? ""}
                disabled={ro}
                onChange={(e) => cambiar({ experienciaId: e.target.value || null })}
                className={cn(inputLinea, "cursor-pointer appearance-none truncate bg-none pr-6")}
              >
                <option value="">Ninguna</option>
                {opciones.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} aria-hidden />
            </div>
          </Campo>
          <Campo etiqueta="Fecha" htmlFor="t-fecha">
            <input
              id="t-fecha"
              type="date"
              value={t.fecha?.slice(0, 10) ?? ""}
              disabled={ro}
              onChange={(e) => cambiar({ fecha: e.target.value || null })}
              className={inputLinea}
            />
          </Campo>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-col-line pt-8">
          <div>
            <p className="text-[15px] text-col-ink">Publicado</p>
            <p className="mt-1 text-[13px] text-col-slate">Apagado, no aparece en el slider del sitio.</p>
          </div>
          <Interruptor checked={t.publicado} onCheckedChange={(v) => cambiar({ publicado: v })} disabled={ro} label="Publicado" />
        </div>

        {editable && (
          <ZonaEliminar texto={`¿Eliminar el testimonio de ${t.nombre || "este viajero"}? No se puede deshacer.`} onEliminar={onEliminar} />
        )}
      </div>
    </>
  );
}

function CampoFoto({
  t,
  editable,
  onCambio,
}: {
  t: TestimonioItem;
  editable: boolean;
  onCambio: (m: MedioVista | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <span className={etiquetaCampo}>Foto</span>
      {t.foto ? (
        <div className="group relative aspect-[4/5] overflow-hidden rounded-sm">
          <Foto t={t} sizes="160px" />
          {editable && (
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1.5 opacity-0 transition-opacity duration-200 ease-col focus-within:opacity-100 group-hover:opacity-100">
              <button
                type="button"
                aria-label="Cambiar foto"
                onClick={() => setAbierto(true)}
                className="flex h-8 w-8 items-center justify-center rounded-sm bg-col-ink/70 text-col-base backdrop-blur-sm hover:bg-col-ink"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={() => onCambio(null)}
                className="flex h-8 w-8 items-center justify-center rounded-sm bg-col-ink/70 text-col-base backdrop-blur-sm hover:bg-col-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => setAbierto(true)}
          className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-col-slate/30 bg-col-base text-col-slate transition-colors duration-200 ease-col hover:border-col-gold hover:text-col-ink disabled:pointer-events-none"
        >
          <ImagePlus className="h-5 w-5 text-col-gold" strokeWidth={1.4} aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.14em]">Elegir</span>
        </button>
      )}
      <p className="text-[12px] leading-snug text-col-slate/80">Del viaje, no un retrato a cámara.</p>
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tipo="FOTO"
        titulo="Foto del testimonio"
        onElegir={(m) => onCambio(m[0] ?? null)}
      />
    </div>
  );
}
