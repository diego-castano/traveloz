"use client";

// Aliados de Collection: muro de logos en fichas blancas (en gris hasta pasar
// el mouse, como en el sitio), filtro por tipo, orden arrastrando, interruptor
// de publicado y una hoja lateral con la fila del sitio en vivo.

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ImagePlus, RefreshCw, X } from "lucide-react";
import {
  actualizarAliado,
  crearAliado,
  eliminarAliado,
  reordenarAliados,
  type AliadoItem,
} from "@/actions/collection/aliados.actions";
import type { Resultado } from "@/lib/collection/ejecutar";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Eyebrow, Interruptor, etiquetaCampo, inputLinea } from "../ui";
import { Campo, Contador, useSensoresOrden } from "../constructor/campos";
import { SelectorMedios } from "../pickers/SelectorMedios";
import { LogoAliado } from "../sitio/tarjetas";
import "../sitio/sitio.css";
import { ChipFiltro, Escalado, Hoja, NuevoEnLinea, ZonaEliminar, useGuardadoDiferido } from "../contenido/comun";

const EASE = [0.22, 1, 0.36, 1] as const;
export const TIPOS_ALIADO = ["Hotel", "Naviera", "Aerolínea", "Operador", "Otro"];
const URL_OK = /^https?:\/\/\S+$/i;

type Payload = Parameters<typeof actualizarAliado>[1];

/** Lo que la pantalla le pide al servidor. La ruta de desarrollo pasa uno en memoria. */
export interface ApiAliados {
  crear(input: { nombre: string }): Promise<Resultado<{ id: string }>>;
  actualizar(id: string, input: Payload): Promise<Resultado<null>>;
  reordenar(ids: string[]): Promise<Resultado<null>>;
  eliminar(id: string): Promise<Resultado<null>>;
}

const apiReal: ApiAliados = {
  crear: crearAliado,
  actualizar: actualizarAliado,
  reordenar: reordenarAliados,
  eliminar: eliminarAliado,
};

function payload(a: AliadoItem): Payload {
  return {
    nombre: a.nombre,
    tipo: a.tipo,
    descripcion: a.descripcion,
    url: a.url,
    logoId: a.logo?.id ?? null,
    proveedorId: a.proveedorId,
    publicado: a.publicado,
  };
}

/** Los tipos de siempre más los que ya se usan, sin repetir. */
function tiposDe(items: AliadoItem[], extra = "") {
  const set = new Set(TIPOS_ALIADO);
  items.forEach((a) => a.tipo.trim() && set.add(a.tipo.trim()));
  if (extra.trim()) set.add(extra.trim());
  return Array.from(set);
}

export function Aliados({
  inicial,
  proveedores,
  api = apiReal,
  abrirId = null,
}: {
  inicial: AliadoItem[] | { error: string };
  proveedores: { id: string; nombre: string }[];
  api?: ApiAliados;
  abrirId?: string | null;
}) {
  const avisar = useAviso();
  const { puede } = useCollection();
  const editable = puede("sitio.editar");
  const sensores = useSensoresOrden();

  const [items, setItems] = useState<AliadoItem[]>(Array.isArray(inicial) ? inicial : []);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(abrirId);
  const error = Array.isArray(inicial) ? null : inicial.error;

  const actual = items.find((x) => x.id === abierto) ?? null;
  const guardado = useGuardadoDiferido(
    actual,
    abierto,
    (a) => {
      if (!a) return Promise.resolve({ ok: true as const, data: null });
      // Una dirección a medio escribir no viaja: se avisa y se guarda al corregirla.
      if (a.url.trim() && !URL_OK.test(a.url.trim())) {
        return Promise.resolve({ ok: false as const, error: "La dirección web debe empezar con http:// o https://." });
      }
      return api.actualizar(a.id, payload(a));
    },
    editable && !!actual,
  );
  const cambiar = (parcial: Partial<AliadoItem>) => setItems((l) => l.map((x) => (x.id === abierto ? { ...x, ...parcial } : x)));
  const cerrar = () => {
    void guardado.ya();
    setAbierto(null);
  };

  const tipos = useMemo(() => tiposDe(items), [items]);
  const visibles = useMemo(() => items.filter((x) => filtro === null || x.tipo === filtro), [items, filtro]);
  const ordenable = editable && filtro === null;

  const crear = async (nombre: string) => {
    const r = await api.crear({ nombre });
    if (!r.ok) {
      avisar(r.error, "error");
      return false;
    }
    const nuevo: AliadoItem = {
      id: r.data.id,
      nombre,
      tipo: filtro ?? "",
      descripcion: "",
      url: "",
      logo: null,
      publicado: false,
      orden: items.length,
      proveedorId: null,
    };
    setItems((l) => [...l, nuevo]);
    setAbierto(nuevo.id);
    return true;
  };

  // El interruptor de la ficha guarda al toque, con todo lo demás como está.
  const publicar = async (a: AliadoItem, publicado: boolean) => {
    setItems((l) => l.map((x) => (x.id === a.id ? { ...x, publicado } : x)));
    const r = await api.actualizar(a.id, payload({ ...a, publicado }));
    if (!r.ok) {
      setItems((l) => l.map((x) => (x.id === a.id ? { ...x, publicado: !publicado } : x)));
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
    avisar("Aliado eliminado.");
    return null;
  };

  const publicados = items.filter((x) => x.publicado).length;

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="font-col-display text-[34px] font-light leading-tight text-col-ink">Con quiénes viajamos</p>
          <p className="mt-2 text-[14px] text-col-slate">
            {items.length} {items.length === 1 ? "aliado" : "aliados"} · {publicados} en el sitio
          </p>
        </div>
        {editable && (
          <div className="xl:ml-auto">
            <NuevoEnLinea etiqueta="Nuevo aliado" placeholder="Nombre del aliado" onCrear={crear} />
          </div>
        )}
      </div>

      <div role="group" aria-label="Filtrar por tipo" className="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 xl:mx-0 xl:px-0">
        <ChipFiltro activo={filtro === null} n={items.length} onClick={() => setFiltro(null)}>
          Todos
        </ChipFiltro>
        {tipos.map((t) => (
          <ChipFiltro key={t} activo={filtro === t} n={items.filter((x) => x.tipo === t).length} onClick={() => setFiltro(t)}>
            {t}
          </ChipFiltro>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-6 text-[14px] text-col-alerta">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="py-24 text-center font-col-display text-[28px] italic text-col-slate">
          {items.length ? "Nada de ese tipo todavía." : "Todavía no hay aliados. Sumá el primero."}
        </p>
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => void alSoltar(e)}>
          <SortableContext items={visibles.map((x) => x.id)} strategy={rectSortingStrategy} disabled={!ordenable}>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              <AnimatePresence initial={false}>
                {visibles.map((a, i) => (
                  <Ficha
                    key={a.id}
                    a={a}
                    i={i}
                    ordenable={ordenable}
                    editable={editable}
                    onAbrir={() => setAbierto(a.id)}
                    onPublicar={(v) => void publicar(a, v)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {ordenable && visibles.length > 1 && (
        <p className="mt-12 text-center text-[13px] text-col-slate/70">Arrastrá las fichas para cambiar el orden en el sitio.</p>
      )}

      <Hoja abierta={!!actual} titulo={actual?.nombre || "Aliado"} estado={guardado.estado} onCerrar={cerrar}>
        {actual && (
          <EditorAliado
            a={actual}
            todos={items}
            tipos={tiposDe(items, actual.tipo)}
            proveedores={proveedores}
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

/** Logo en gris que toma color al pasar el mouse; sin archivo, el nombre en serif. */
function LogoFicha({ a, className }: { a: Pick<AliadoItem, "nombre" | "logo">; className?: string }) {
  return a.logo?.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={a.logo.url}
      alt={a.nombre}
      loading="lazy"
      className={cn(
        "max-h-[46%] w-auto max-w-[72%] object-contain opacity-70 grayscale transition-[filter,opacity] duration-300 ease-col group-hover:opacity-100 group-hover:grayscale-0",
        className,
      )}
    />
  ) : (
    <span className="px-4 text-center font-col-display text-[24px] leading-tight text-col-slate transition-colors duration-300 ease-col group-hover:text-col-ink">
      {a.nombre || "Sin nombre"}
    </span>
  );
}

function Ficha({
  a,
  i,
  ordenable,
  editable,
  onAbrir,
  onPublicar,
}: {
  a: AliadoItem;
  i: number;
  ordenable: boolean;
  editable: boolean;
  onAbrir: () => void;
  onPublicar: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id, disabled: !ordenable });
  return (
    <motion.li
      ref={setNodeRef}
      layout={!isDragging}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 10) * 0.03 }}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className="group relative"
    >
      <button
        type="button"
        onClick={onAbrir}
        {...(ordenable ? { ...attributes, ...listeners } : {})}
        aria-label={`Editar ${a.nombre || "aliado sin nombre"}`}
        className={cn(
          "relative flex aspect-[16/10] w-full items-center justify-center rounded-sm border border-col-line bg-col-surface transition-[border-color,box-shadow] duration-300 ease-col hover:border-col-slate/30 hover:shadow-[0_18px_40px_-28px_rgba(50,55,59,0.5)]",
          ordenable && "cursor-grab active:cursor-grabbing",
          !a.publicado && "bg-col-surface/60",
          isDragging && "shadow-[0_24px_50px_-24px_rgba(50,55,59,0.55)]",
        )}
      >
        <LogoFicha a={a} />
        {!a.publicado && (
          <span className="absolute left-2.5 top-2.5 rounded-sm border border-col-line bg-col-base px-2 py-1 text-[10.5px] uppercase tracking-[0.14em] text-col-slate">
            Oculto
          </span>
        )}
      </button>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] text-col-ink">{a.nombre || "Sin nombre"}</p>
          <p className="mt-0.5 truncate text-[11.5px] uppercase tracking-[0.12em] text-col-slate">{a.tipo || "Sin tipo"}</p>
        </div>
        <Interruptor checked={a.publicado} onCheckedChange={onPublicar} disabled={!editable} label={`Publicar ${a.nombre}`} />
      </div>
    </motion.li>
  );
}

/** La fila de aliados del sitio con este resaltado y, alrededor, los vecinos publicados. */
function VistaFila({ a, todos }: { a: AliadoItem; todos: AliadoItem[] }) {
  const fila = todos.filter((x) => x.publicado || x.id === a.id);
  const i = fila.findIndex((x) => x.id === a.id);
  const desde = Math.max(0, Math.min(i - 1, fila.length - 3));
  const ventana = fila.slice(desde, desde + 3);
  return (
    <Escalado ancho={720}>
      <div className="cs-raiz" data-modo="preview" onClickCapture={(e) => e.preventDefault()}>
        <div className="cs-envolvente py-6">
          <div className="cs-aliados">
            {ventana.map((x) => (
              <div
                key={x.id}
                className={cn("relative transition-opacity duration-300 ease-col", x.id !== a.id && "opacity-40")}
              >
                {x.id === a.id && <span aria-hidden className="absolute -left-4 inset-y-5 w-[3px] bg-col-gold" />}
                <LogoAliado a={x} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Escalado>
  );
}

function EditorAliado({
  a,
  todos,
  tipos,
  proveedores,
  editable,
  error,
  cambiar,
  onEliminar,
}: {
  a: AliadoItem;
  todos: AliadoItem[];
  tipos: string[];
  proveedores: { id: string; nombre: string }[];
  editable: boolean;
  error: string | null;
  cambiar: (p: Partial<AliadoItem>) => void;
  onEliminar: () => Promise<string | null>;
}) {
  const ro = !editable;
  const [otro, setOtro] = useState("");
  const urlMal = !!a.url.trim() && !URL_OK.test(a.url.trim());
  // Si el proveedor vinculado ya no está en el catálogo, igual se muestra.
  const opciones =
    a.proveedorId && !proveedores.some((p) => p.id === a.proveedorId)
      ? [...proveedores, { id: a.proveedorId, nombre: "Proveedor dado de baja" }]
      : proveedores;
  const sumarTipo = () => {
    if (otro.trim()) cambiar({ tipo: otro.trim().slice(0, 60) });
    setOtro("");
  };

  return (
    <>
      <div className="bg-col-base px-6 py-7">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <Eyebrow>Vista previa</Eyebrow>
          <span className="text-[12px] text-col-slate">
            {a.publicado ? "Así sale en la sección Aliados del sitio" : "Oculto: no sale en el sitio"}
          </span>
        </div>
        <VistaFila a={a} todos={todos} />
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-col-alerta">
            {error}
          </p>
        )}
        {ro && <p className="mt-3 text-[13px] text-col-slate">Solo lectura: te falta el permiso para editar el sitio.</p>}
      </div>

      <div className="flex flex-col gap-9 px-6 py-8">
        <Campo etiqueta="Nombre" htmlFor="a-nombre">
          <input
            id="a-nombre"
            value={a.nombre}
            maxLength={100}
            disabled={ro}
            onChange={(e) => cambiar({ nombre: e.target.value })}
            className={cn(inputLinea, "font-col-display text-[26px]")}
          />
        </Campo>

        <div className="flex flex-col gap-3">
          <span className={etiquetaCampo}>Tipo</span>
          <div role="radiogroup" aria-label="Tipo" className="flex flex-wrap items-center gap-2">
            {tipos.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={a.tipo === t}
                disabled={ro}
                onClick={() => cambiar({ tipo: a.tipo === t ? "" : t })}
                className={cn(
                  "h-9 rounded-sm border px-4 text-[12px] uppercase tracking-[0.12em] transition-colors duration-200 ease-col disabled:cursor-not-allowed",
                  a.tipo === t ? "border-col-ink bg-col-ink text-col-base" : "border-col-line text-col-slate hover:border-col-slate/50 hover:text-col-ink",
                )}
              >
                {t}
              </button>
            ))}
            {!ro && (
              <input
                aria-label="Otro tipo"
                value={otro}
                maxLength={60}
                onChange={(e) => setOtro(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sumarTipo();
                  }
                }}
                onBlur={sumarTipo}
                placeholder="+ Otro tipo"
                className="h-9 w-36 border-0 border-b border-dashed border-col-slate/40 bg-transparent px-1 text-[14px] text-col-ink placeholder:text-col-slate/60 focus:border-solid focus:border-col-gold focus:outline-none focus:ring-0"
              />
            )}
          </div>
        </div>

        <CampoLogo a={a} editable={editable} onCambio={(m) => cambiar({ logo: m })} />

        <Campo etiqueta="Descripción" htmlFor="a-desc" accion={<Contador n={a.descripcion.length} max={400} ideal={160} />}>
          <textarea
            id="a-desc"
            rows={3}
            value={a.descripcion}
            maxLength={400}
            disabled={ro}
            placeholder="Qué hacen y por qué viajamos con ellos, en una o dos líneas."
            onChange={(e) => cambiar({ descripcion: e.target.value })}
            className={cn(inputLinea, "resize-none")}
          />
        </Campo>

        <Campo
          etiqueta="Sitio web"
          htmlFor="a-url"
          ayuda="Opcional. El logo del sitio lleva a esta dirección."
          error={urlMal ? "Tiene que empezar con http:// o https://." : null}
        >
          <input
            id="a-url"
            type="url"
            inputMode="url"
            value={a.url}
            maxLength={300}
            disabled={ro}
            placeholder="https://"
            onChange={(e) => cambiar({ url: e.target.value })}
            // "calablanca.com" se completa solo con https://.
            onBlur={() => {
              const u = a.url.trim();
              if (u && !/^https?:\/\//i.test(u) && !/\s/.test(u)) cambiar({ url: `https://${u}` });
            }}
            className={cn(inputLinea, urlMal && "border-col-alerta")}
          />
        </Campo>

        <Campo etiqueta="Proveedor interno" htmlFor="a-prov" ayuda="Para el equipo: nunca se muestra en el sitio.">
          <div className="relative">
            <select
              id="a-prov"
              value={a.proveedorId ?? ""}
              disabled={ro}
              onChange={(e) => cambiar({ proveedorId: e.target.value || null })}
              className={cn(inputLinea, "cursor-pointer appearance-none bg-none pr-6")}
            >
              <option value="">Sin proveedor</option>
              {opciones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} aria-hidden />
          </div>
        </Campo>

        <div className="flex items-center justify-between gap-4 border-t border-col-line pt-8">
          <div>
            <p className="text-[15px] text-col-ink">Publicado</p>
            <p className="mt-1 text-[13px] text-col-slate">Apagado, no aparece en la sección Aliados del sitio.</p>
          </div>
          <Interruptor checked={a.publicado} onCheckedChange={(v) => cambiar({ publicado: v })} disabled={ro} label="Publicado" />
        </div>

        {editable && <ZonaEliminar texto={`¿Eliminar ${a.nombre || "este aliado"}? No se puede deshacer.`} onEliminar={onEliminar} />}
      </div>
    </>
  );
}

function CampoLogo({
  a,
  editable,
  onCambio,
}: {
  a: AliadoItem;
  editable: boolean;
  onCambio: (m: MedioVista | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className={etiquetaCampo}>Logo</span>
        {a.logo && editable && (
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
      {a.logo ? (
        <div className="grid grid-cols-2 gap-3">
          <figure className="group flex aspect-[2/1] items-center justify-center rounded-sm border border-col-line bg-col-surface">
            <LogoFicha a={a} />
          </figure>
          <figure className="flex aspect-[2/1] items-center justify-center rounded-sm border border-col-line bg-col-surface">
            <LogoFicha a={a} className="opacity-100 grayscale-0" />
          </figure>
          <figcaption className="col-span-2 -mt-1 grid grid-cols-2 gap-3 text-[11px] tracking-wide text-col-slate">
            <span>Como se ve en el sitio</span>
            <span>Al pasar el mouse</span>
          </figcaption>
        </div>
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => setAbierto(true)}
          className="flex aspect-[16/6] w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-col-slate/30 bg-col-surface text-col-slate transition-colors duration-200 ease-col hover:border-col-gold hover:text-col-ink disabled:pointer-events-none"
        >
          <ImagePlus className="h-5 w-5 text-col-gold" strokeWidth={1.4} aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.14em]">Elegir logo</span>
        </button>
      )}
      <p className="text-[13px] text-col-slate/80">PNG con fondo transparente se ve mejor. Sin logo, el sitio muestra el nombre.</p>
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tipo="FOTO"
        titulo="Logo del aliado"
        onElegir={(m) => onCambio(m[0] ?? null)}
      />
    </div>
  );
}
