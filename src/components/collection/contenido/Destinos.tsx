"use client";

// Destinos de Collection: mosaico de tarjetas como el del sitio, filtros por
// estado, orden arrastrando y una hoja lateral con vista previa en vivo y
// guardado automático.

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, RefreshCw, Search, X } from "lucide-react";
import {
  actualizarDestino,
  crearDestino,
  eliminarDestino,
  reordenarDestinos,
  type DestinoItem,
  type EstadoDestino,
} from "@/actions/collection/destinos.actions";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { Resultado } from "@/lib/collection/ejecutar";
import { slugify } from "@/lib/utils";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Eyebrow, etiquetaCampo, inputLinea } from "../ui";
import { MedioImagen, fondoDeColor } from "../sitio/medios";
import { Campo, Contador, useSensoresOrden } from "../constructor/campos";
import { EditorTexto } from "../editor/EditorTexto";
import { SelectorMedios } from "../pickers/SelectorMedios";
import { ChipFiltro, Hoja, NuevoEnLinea, ZonaEliminar, tonoDe, useGuardadoDiferido } from "./comun";

const EASE = [0.22, 1, 0.36, 1] as const;
export const DOMINIO_COLLECTION = "collection.traveloz.com.uy";

export interface PaisCatalogo {
  id: string;
  nombre: string;
  regionNombre: string | null;
}

type Payload = Parameters<typeof actualizarDestino>[1];

/** Lo que la pantalla le pide al servidor. La ruta de desarrollo pasa uno en memoria. */
export interface ApiDestinos {
  crear(input: { nombre: string }): Promise<Resultado<{ id: string; slug: string }>>;
  actualizar(id: string, input: Payload): Promise<Resultado<null>>;
  reordenar(ids: string[]): Promise<Resultado<null>>;
  eliminar(id: string): Promise<Resultado<null>>;
}

const apiReal: ApiDestinos = {
  crear: crearDestino,
  actualizar: actualizarDestino,
  reordenar: reordenarDestinos,
  eliminar: eliminarDestino,
};

export const ESTADOS_DESTINO: Record<EstadoDestino, { label: string; clase: string; punto: string }> = {
  BORRADOR: { label: "Borrador", clase: "border-col-line text-col-slate bg-col-surface", punto: "bg-col-slate/40" },
  PUBLICADO: { label: "Publicado", clase: "border-col-ink bg-col-ink text-col-base", punto: "bg-col-gold" },
  PROXIMAMENTE: { label: "Próximamente", clase: "border-col-gold text-col-ink bg-col-surface", punto: "bg-col-gold" },
  ARCHIVADO: { label: "Archivado", clase: "border-col-line text-col-slate/70 bg-col-base", punto: "bg-col-line" },
};
const ORDEN_ESTADOS: EstadoDestino[] = ["BORRADOR", "PUBLICADO", "PROXIMAMENTE", "ARCHIVADO"];

function PillDestino({ estado, className }: { estado: EstadoDestino; className?: string }) {
  const e = ESTADOS_DESTINO[estado];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 text-[10.5px] uppercase tracking-[0.14em]",
        e.clase,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", e.punto)} />
      {e.label}
    </span>
  );
}

const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;

/** Tarjeta del mosaico, con la anatomía del sitio: imagen 4:5, dato, nombre y bajada. */
export function TarjetaDestino({
  d,
  sizes = "320px",
  admin,
}: {
  d: Pick<DestinoItem, "nombre" | "bajada" | "portada" | "estado" | "experiencias">;
  sizes?: string;
  admin?: boolean;
}) {
  const proximamente = d.estado === "PROXIMAMENTE";
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-col-line">
        {d.portada ? (
          <MedioImagen medio={d.portada} relleno sizes={sizes} imgClassName={admin ? "group-hover:scale-[1.03]" : undefined} />
        ) : (
          <div className="absolute inset-0" style={{ background: fondoDeColor(tonoDe(d.nombre || "destino")) }}>
            <span className="absolute bottom-4 left-5 font-col-display text-[72px] font-light italic leading-none text-col-base/50">
              {(d.nombre.trim()[0] ?? "·").toUpperCase()}
            </span>
          </div>
        )}
        {admin ? (
          <PillDestino estado={d.estado} className="absolute left-3 top-3 shadow-sm" />
        ) : (
          proximamente && (
            <span className="absolute left-4 top-4 bg-col-base px-3 py-2 text-[12px] font-medium uppercase tracking-[0.12em] text-col-ink">
              Próximamente
            </span>
          )
        )}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-col-slate">
          {proximamente ? "Destino · Próximamente" : `Destino · ${plural(d.experiencias, "experiencia", "experiencias")}`}
        </span>
        <span className={cn("font-col-display text-[30px] leading-[1.15]", d.nombre ? "text-col-ink" : "italic text-col-slate/50")}>
          {d.nombre || "Sin nombre"}
        </span>
        {d.bajada && <span className="line-clamp-2 text-[15px] leading-relaxed text-col-slate">{d.bajada}</span>}
      </div>
    </div>
  );
}

type Filtro = "todos" | EstadoDestino;

export function Destinos({
  inicial,
  paises,
  api = apiReal,
  abrirId = null,
}: {
  inicial: DestinoItem[] | { error: string };
  paises: PaisCatalogo[];
  api?: ApiDestinos;
  abrirId?: string | null;
}) {
  const avisar = useAviso();
  const { puede } = useCollection();
  const editable = puede("experiencias.editar");
  const sensores = useSensoresOrden();

  const [items, setItems] = useState<DestinoItem[]>(Array.isArray(inicial) ? inicial : []);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState<string | null>(abrirId);
  const error = Array.isArray(inicial) ? null : inicial.error;

  const actual = items.find((x) => x.id === abierto) ?? null;
  const guardado = useGuardadoDiferido(
    actual,
    abierto,
    (d) => (d ? api.actualizar(d.id, payload(d)) : Promise.resolve({ ok: true as const, data: null })),
    editable && !!actual,
  );
  const cambiar = (parcial: Partial<DestinoItem>) =>
    setItems((l) => l.map((x) => (x.id === abierto ? { ...x, ...parcial } : x)));
  const cerrar = () => {
    void guardado.ya();
    setAbierto(null);
  };

  const visibles = useMemo(() => items.filter((x) => filtro === "todos" || x.estado === filtro), [items, filtro]);
  const ordenable = editable && filtro === "todos";

  const crear = async (nombre: string) => {
    const r = await api.crear({ nombre });
    if (!r.ok) {
      avisar(r.error, "error");
      return false;
    }
    const nuevo: DestinoItem = {
      id: r.data.id,
      slug: r.data.slug,
      nombre,
      bajada: "",
      relato: "",
      portada: null,
      estado: "BORRADOR",
      orden: items.length,
      seoTitulo: "",
      seoDescripcion: "",
      paises: [],
      experiencias: 0,
    };
    setItems((l) => [...l, nuevo]);
    setFiltro("todos");
    setAbierto(nuevo.id);
    return true;
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
    avisar("Destino eliminado.");
    return null;
  };

  const conteo = (f: Filtro) => (f === "todos" ? items.length : items.filter((x) => x.estado === f).length);

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-10 flex flex-col gap-5 xl:flex-row xl:items-center">
        <div role="group" aria-label="Filtrar por estado" className="-mx-4 flex gap-2 overflow-x-auto px-4 xl:mx-0 xl:px-0">
          <ChipFiltro activo={filtro === "todos"} n={conteo("todos")} onClick={() => setFiltro("todos")}>
            Todos
          </ChipFiltro>
          {ORDEN_ESTADOS.map((e) => (
            <ChipFiltro key={e} activo={filtro === e} n={conteo(e)} onClick={() => setFiltro(e)}>
              {ESTADOS_DESTINO[e].label}
            </ChipFiltro>
          ))}
        </div>
        {editable && (
          <div className="xl:ml-auto">
            <NuevoEnLinea etiqueta="Nuevo destino" placeholder="Nombre del destino" onCrear={crear} />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-6 text-[14px] text-col-alerta">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="py-24 text-center font-col-display text-[28px] italic text-col-slate">
          {items.length ? "Nada con ese filtro." : "Todavía no hay destinos. Creá el primero."}
        </p>
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => void alSoltar(e)}>
          <SortableContext items={visibles.map((x) => x.id)} strategy={rectSortingStrategy} disabled={!ordenable}>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence initial={false}>
                {visibles.map((d, i) => (
                  <Item key={d.id} d={d} i={i} ordenable={ordenable} onAbrir={() => setAbierto(d.id)} />
                ))}
              </AnimatePresence>
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {ordenable && visibles.length > 1 && (
        <p className="mt-12 text-center text-[13px] text-col-slate/70">Arrastrá las tarjetas para cambiar el orden en el sitio.</p>
      )}

      <Hoja abierta={!!actual} titulo={actual?.nombre || "Destino"} estado={guardado.estado} onCerrar={cerrar}>
        {actual && (
          <EditorDestino
            d={actual}
            paises={paises}
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

function payload(d: DestinoItem): Payload {
  return {
    nombre: d.nombre,
    slug: d.slug,
    bajada: d.bajada,
    relato: d.relato,
    portadaId: d.portada?.id ?? null,
    estado: d.estado,
    paisIds: d.paises.map((p) => p.id),
    seoTitulo: d.seoTitulo,
    seoDescripcion: d.seoDescripcion,
  };
}

function Item({ d, i, ordenable, onAbrir }: { d: DestinoItem; i: number; ordenable: boolean; onAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: d.id, disabled: !ordenable });
  return (
    <motion.li
      ref={setNodeRef}
      layout={!isDragging}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 8) * 0.03 }}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className="group relative"
    >
      <button
        type="button"
        onClick={onAbrir}
        {...(ordenable ? { ...attributes, ...listeners } : {})}
        aria-label={`Editar ${d.nombre || "destino sin nombre"}`}
        className={cn("block w-full text-left", ordenable && "cursor-grab active:cursor-grabbing", isDragging && "opacity-90")}
      >
        <TarjetaDestino d={d} admin sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, 50vw" />
      </button>
    </motion.li>
  );
}

function EditorDestino({
  d,
  paises,
  editable,
  error,
  cambiar,
  onEliminar,
}: {
  d: DestinoItem;
  paises: PaisCatalogo[];
  editable: boolean;
  error: string | null;
  cambiar: (p: Partial<DestinoItem>) => void;
  onEliminar: () => Promise<string | null>;
}) {
  const ro = !editable;
  return (
    <>
      <div className="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-6 bg-col-base px-6 py-7">
        <TarjetaDestino d={d} sizes="200px" />
        <div className="flex flex-col gap-3 pt-1">
          <Eyebrow>Vista previa</Eyebrow>
          <p className="text-[14px] leading-relaxed text-col-slate">Así aparece en el mosaico de destinos del sitio.</p>
          <PillDestino estado={d.estado} className="self-start" />
          {error && (
            <p role="alert" className="text-[13px] text-col-alerta">
              {error}
            </p>
          )}
          {ro && <p className="text-[13px] text-col-slate">Solo lectura: te falta el permiso para editar destinos.</p>}
        </div>
      </div>

      <div className="flex flex-col gap-9 px-6 py-8">
        <Campo etiqueta="Nombre" htmlFor="d-nombre">
          <input
            id="d-nombre"
            value={d.nombre}
            maxLength={80}
            disabled={ro}
            onChange={(e) => cambiar({ nombre: e.target.value })}
            className={cn(inputLinea, "font-col-display text-[26px]")}
          />
        </Campo>

        <Campo etiqueta="Dirección web" htmlFor="d-slug">
          <div className="flex items-baseline border-b border-col-slate/40 focus-within:border-col-gold">
            <span className="shrink-0 py-2 text-[14px] text-col-slate/70">{DOMINIO_COLLECTION}/destinos/</span>
            <input
              id="d-slug"
              value={d.slug}
              maxLength={80}
              disabled={ro}
              onChange={(e) => cambiar({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })}
              onBlur={() => cambiar({ slug: slugify(d.slug) || slugify(d.nombre) })}
              className="min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-[15px] text-col-ink focus:outline-none focus:ring-0"
            />
          </div>
        </Campo>

        <Campo etiqueta="Bajada" htmlFor="d-bajada" accion={<Contador n={d.bajada.length} max={240} ideal={120} />}>
          <textarea
            id="d-bajada"
            rows={2}
            value={d.bajada}
            maxLength={240}
            disabled={ro}
            onChange={(e) => cambiar({ bajada: e.target.value })}
            placeholder="Una línea que invite. Templos, mercados y trenes nocturnos."
            className={cn(inputLinea, "resize-none")}
          />
        </Campo>

        <div className="flex flex-col gap-2">
          <span className={etiquetaCampo}>Relato</span>
          <EditorTexto
            etiqueta="Relato del destino"
            valor={d.relato}
            onCambio={(html) => cambiar({ relato: html })}
            placeholder="Contá el destino como lo contarías en persona."
            deshabilitado={ro}
            minAlto={160}
          />
        </div>

        <CampoPortada portada={d.portada} editable={editable} onCambio={(m) => cambiar({ portada: m })} />

        <Campo etiqueta="Países">
          <SelectorPaises
            elegidos={d.paises}
            paises={paises}
            deshabilitado={ro}
            onCambio={(ps) => cambiar({ paises: ps })}
          />
        </Campo>

        <div className="flex flex-col gap-3">
          <span className={etiquetaCampo}>Estado</span>
          <div role="radiogroup" aria-label="Estado" className="grid grid-cols-4 rounded-sm border border-col-line p-1">
            {ORDEN_ESTADOS.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={d.estado === e}
                disabled={ro}
                onClick={() => cambiar({ estado: e })}
                className={cn(
                  "h-10 rounded-sm text-[12px] uppercase tracking-[0.1em] transition-colors duration-200 ease-col disabled:cursor-not-allowed",
                  d.estado === e ? "bg-col-ink text-col-base" : "text-col-slate hover:text-col-ink",
                )}
              >
                {ESTADOS_DESTINO[e].label}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-col-slate/80">
            {d.estado === "PROXIMAMENTE"
              ? "Se ve en el mosaico, sin experiencias y sin entrar."
              : d.estado === "PUBLICADO"
                ? "Visible en el sitio con sus experiencias."
                : d.estado === "ARCHIVADO"
                  ? "Fuera del sitio. Sus experiencias no lo muestran."
                  : "Solo lo ve el equipo."}
          </p>
        </div>

        <section className="flex flex-col gap-7 border-t border-col-line pt-8">
          <h3 className="font-col-display text-[24px] leading-tight text-col-ink">Google y compartir</h3>
          <Campo etiqueta="Título" htmlFor="d-seo-t" accion={<Contador n={d.seoTitulo.length} max={60} ideal={50} />}>
            <input
              id="d-seo-t"
              value={d.seoTitulo}
              maxLength={70}
              disabled={ro}
              placeholder={d.nombre ? `${d.nombre} | Traveloz Collection` : ""}
              onChange={(e) => cambiar({ seoTitulo: e.target.value })}
              className={inputLinea}
            />
          </Campo>
          <Campo etiqueta="Descripción" htmlFor="d-seo-d" accion={<Contador n={d.seoDescripcion.length} max={155} ideal={130} />}>
            <textarea
              id="d-seo-d"
              rows={3}
              value={d.seoDescripcion}
              maxLength={170}
              disabled={ro}
              placeholder={d.bajada}
              onChange={(e) => cambiar({ seoDescripcion: e.target.value })}
              className={cn(inputLinea, "resize-none")}
            />
          </Campo>
        </section>

        {editable && (
          <ZonaEliminar texto={`¿Eliminar ${d.nombre || "este destino"}? No se puede deshacer.`} onEliminar={onEliminar} />
        )}
      </div>
    </>
  );
}

const RECORTES = [
  { label: "Mosaico 4:5", a: 4 / 5 },
  { label: "Listado 4:3", a: 4 / 3 },
  { label: "Portada 16:9", a: 16 / 9 },
];

/** Portada con los recortes que usa el sitio, respetando el foco del medio. */
function CampoPortada({
  portada,
  editable,
  onCambio,
}: {
  portada: MedioVista | null;
  editable: boolean;
  onCambio: (m: MedioVista | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className={etiquetaCampo}>Portada</span>
        {portada && editable && (
          <span className="flex gap-4">
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-col-slate hover:text-col-ink"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} /> Cambiar
            </button>
            <button
              type="button"
              onClick={() => onCambio(null)}
              className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-col-slate hover:text-col-alerta"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} /> Quitar
            </button>
          </span>
        )}
      </div>
      {portada ? (
        <>
          <div className="flex items-end gap-3">
            {RECORTES.map((r) => (
              <figure key={r.label} className="min-w-0" style={{ flexGrow: r.a, flexBasis: 0 }}>
                <MedioImagen medio={portada} aspecto={r.a} sizes="240px" className="w-full rounded-sm" />
                <figcaption className="mt-1.5 text-[11px] tracking-wide text-col-slate">{r.label}</figcaption>
              </figure>
            ))}
          </div>
          <p className="text-[13px] text-col-slate/80">El recorte sigue el punto de foco. Se ajusta desde la biblioteca.</p>
        </>
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => setAbierto(true)}
          className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-col-slate/30 bg-col-base text-col-slate transition-colors duration-200 ease-col hover:border-col-gold hover:text-col-ink disabled:pointer-events-none"
        >
          <ImagePlus className="h-5 w-5 text-col-gold" strokeWidth={1.4} aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.14em]">Elegir portada</span>
        </button>
      )}
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tipo="FOTO"
        titulo="Portada del destino"
        onElegir={(m) => onCambio(m[0] ?? null)}
      />
    </div>
  );
}

/** Multi-select de países del catálogo: busca, suma con clic o Enter, quita con la cruz. */
function SelectorPaises({
  elegidos,
  paises,
  deshabilitado,
  onCambio,
}: {
  elegidos: { id: string; nombre: string }[];
  paises: PaisCatalogo[];
  deshabilitado: boolean;
  onCambio: (ps: { id: string; nombre: string }[]) => void;
}) {
  const [q, setQ] = useState("");
  const [foco, setFoco] = useState(false);
  const lista = useId();
  const ya = new Set(elegidos.map((p) => p.id));
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const t = norm(q.trim());
  const opciones = t
    ? paises.filter((p) => !ya.has(p.id) && (norm(p.nombre).includes(t) || norm(p.regionNombre ?? "").includes(t))).slice(0, 8)
    : [];
  const sumar = (p: PaisCatalogo) => {
    if (elegidos.length >= 20) return;
    onCambio([...elegidos, { id: p.id, nombre: p.nombre }]);
    setQ("");
  };
  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 border-b border-col-slate/40 pb-2 focus-within:border-col-gold">
        {elegidos.map((p) => (
          <span key={p.id} className="flex h-8 items-center gap-1.5 rounded-sm bg-col-base pl-3 pr-1.5 text-[13px] text-col-ink">
            {p.nombre}
            {!deshabilitado && (
              <button
                type="button"
                aria-label={`Quitar ${p.nombre}`}
                onClick={() => onCambio(elegidos.filter((x) => x.id !== p.id))}
                className="flex h-5 w-5 items-center justify-center rounded-sm text-col-slate hover:bg-col-line hover:text-col-ink"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </span>
        ))}
        {!deshabilitado && (
          <label className="relative flex min-w-[180px] flex-1 items-center">
            <Search className="pointer-events-none absolute left-0 h-4 w-4 text-col-slate/60" strokeWidth={1.5} aria-hidden />
            <input
              role="combobox"
              aria-controls={lista}
              aria-expanded={foco && opciones.length > 0}
              aria-label="Buscar país"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFoco(true)}
              onBlur={() => window.setTimeout(() => setFoco(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (opciones[0]) sumar(opciones[0]);
                }
              }}
              placeholder={paises.length ? "Buscar país" : "Sin catálogo de países"}
              className="h-8 w-full border-0 bg-transparent py-0 pl-6 pr-0 text-[15px] text-col-ink placeholder:text-col-slate/60 focus:outline-none focus:ring-0"
            />
          </label>
        )}
        {deshabilitado && elegidos.length === 0 && <span className="py-1 text-[14px] text-col-slate/60">Sin países</span>}
      </div>
      {foco && opciones.length > 0 && (
        <ul
          id={lista}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-sm border border-col-line bg-col-surface p-1 shadow-[0_20px_40px_-20px_rgba(50,55,59,0.45)]"
        >
          {opciones.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => sumar(p)}
                className="flex h-10 w-full items-center justify-between gap-3 rounded-sm px-3 text-left text-[14px] text-col-ink hover:bg-col-base"
              >
                {p.nombre}
                {p.regionNombre && <span className="text-[12px] text-col-slate">{p.regionNombre}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
