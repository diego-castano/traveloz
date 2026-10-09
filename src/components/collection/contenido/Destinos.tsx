"use client";

// Destinos de Collection: mosaico de tarjetas como el del sitio, filtros por
// estado, orden arrastrando y una hoja lateral con vista previa en vivo y
// guardado automático.

import { forwardRef, useId, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { ImagePlus, MapPinned, RefreshCw, Search, X } from "lucide-react";
import {
  actualizarDestino,
  crearDestino,
  eliminarDestino,
  reordenarDestinos,
  type DestinoItem,
  type EstadoDestino } from "@/actions/collection/destinos.actions";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { Resultado } from "@/lib/collection/ejecutar";
import { slugify } from "@/lib/utils";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso, useDeshacer } from "../shell/Avisos";
import { EncabezadoPagina, Estado, Vacio, type TonoEstado, Eyebrow, Filtros, barraHerramientas, etiquetaCampo, entrada, entradaArea, entradaTitulo, tarjetaElevable, cajaCompuesta, entradaInterna } from "../ui";
import { MedioImagen, fondoDeColor } from "../sitio/medios";
import { Campo, Contador, claseLevantado, estiloOrden, useRefsUnidos, useSensoresOrden } from "../constructor/campos";
import { Numero, TRANSICION_SOLTAR, useEntradaLista } from "../movimiento";
import { EditorTexto } from "../editor/EditorTexto";
import { SelectorMedios } from "../pickers/SelectorMedios";
import { BotonEncuadre, useEditorEncuadre } from "../biblioteca/EditorEncuadre";
import type { Aspecto } from "@/lib/collection/recortes";
import { SoltarAqui } from "../biblioteca/ZonaSubida";
import { AsaTarjeta, Hoja, NuevoEnLinea, ZonaEliminar, reponer, tonoDe, useGuardadoDiferido } from "./comun";

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
  eliminar: eliminarDestino };

export const ESTADOS_DESTINO: Record<EstadoDestino, { label: string; tono: TonoEstado }> = {
  BORRADOR: { label: "Borrador", tono: "neutro" },
  PUBLICADO: { label: "Publicado", tono: "ok" },
  PROXIMAMENTE: { label: "Próximamente", tono: "info" },
  ARCHIVADO: { label: "Archivado", tono: "neutro" } };
const ORDEN_ESTADOS: EstadoDestino[] = ["BORRADOR", "PUBLICADO", "PROXIMAMENTE", "ARCHIVADO"];

function PillDestino({ estado, className }: { estado: EstadoDestino; className?: string }) {
  const e = ESTADOS_DESTINO[estado];
  return (
    <Estado tono={e.tono} className={className}>
      {e.label}
    </Estado>
  );
}

const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;

/** Tarjeta del mosaico, con la anatomía del sitio: imagen 4:5, dato, nombre y bajada. */
export function TarjetaDestino({
  d,
  sizes = "320px",
  admin }: {
  d: Pick<DestinoItem, "nombre" | "bajada" | "portada" | "estado" | "experiencias">;
  sizes?: string;
  admin?: boolean;
}) {
  const proximamente = d.estado === "PROXIMAMENTE";
  // En el admin y en celular, fila compacta: miniatura de 72 px, nombre y estado.
  return (
    <div className={cn(admin && "flex items-center gap-4 rounded-col-sm bg-col-surface p-2 pr-14 sm:block sm:bg-transparent sm:p-0")}>
      <div
        className={cn(
          "relative aspect-[4/5] overflow-hidden rounded-col-sm bg-col-line",
          admin && cn(tarjetaElevable, "aspect-square w-[72px] shrink-0 sm:aspect-[4/5] sm:w-auto"),
        )}
      >
        {d.portada ? (
          <MedioImagen medio={d.portada} relleno encuadre={ENCUADRES} sizes={sizes} imgClassName={admin ? "group-hover:scale-[1.03]" : undefined} />
        ) : (
          <div className="absolute inset-0" style={{ background: fondoDeColor(tonoDe(d.nombre || "destino")) }}>
            <span
              className={cn(
                "absolute bottom-4 left-5 font-col-display text-col-display-lg font-light italic leading-none text-col-base/70",
                admin && "bottom-2 left-3 text-col-3xl sm:bottom-4 sm:left-5 sm:text-col-display-lg",
              )}
            >
              {(d.nombre.trim()[0] ?? "·").toUpperCase()}
            </span>
          </div>
        )}
        {admin ? (
          <PillDestino estado={d.estado} className="absolute left-3 top-3 hidden shadow-sm sm:inline-flex" />
        ) : (
          proximamente && (
            <span className="absolute left-4 top-4 bg-col-base px-3 py-2 text-col-xs uppercase tracking-[0.14em] text-col-ink">
              Próximamente
            </span>
          )
        )}
      </div>
      <div className={cn("mt-5 flex flex-col gap-2", admin && "mt-0 min-w-0 flex-1 gap-1.5 sm:mt-5 sm:gap-2")}>
        <span className={cn("text-col-xs uppercase tracking-[0.14em] text-col-slate", admin && "hidden sm:block")}>
          {proximamente ? "Destino · Próximamente" : `Destino · ${plural(d.experiencias, "experiencia", "experiencias")}`}
        </span>
        <span
          className={cn(
            "font-col-display text-col-2xl leading-[1.15]",
            admin && "truncate text-col-xl sm:whitespace-normal sm:text-col-2xl",
            d.nombre ? "text-col-ink" : "italic text-col-subtle",
          )}
        >
          {d.nombre || "Sin nombre"}
        </span>
        {admin && <PillDestino estado={d.estado} className="self-start sm:hidden" />}
        {d.bajada && (
          <span className={cn("line-clamp-2 text-col-cuerpo leading-relaxed text-col-slate", admin && "hidden sm:[display:-webkit-box]")}>{d.bajada}</span>
        )}
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
  nuevoAlEntrar = false }: {
  inicial: DestinoItem[] | { error: string };
  paises: PaisCatalogo[];
  api?: ApiDestinos;
  abrirId?: string | null;
  /** Desde la paleta ("Nuevo destino"): arranca con el campo del nombre abierto. */
  nuevoAlEntrar?: boolean;
}) {
  const avisar = useAviso();
  const deshacible = useDeshacer();
  const { puede } = useCollection();
  const editable = puede("experiencias.editar");
  const sensores = useSensoresOrden();

  const [items, setItems] = useState<DestinoItem[]>(Array.isArray(inicial) ? inicial : []);
  const entrada = useEntradaLista(items.length > 0);
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
      experiencias: 0 };
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

  // Borrado diferido: sale de la grilla al toque y el servidor se entera
  // cuando vence el aviso. "Deshacer" lo repone sin llamar a nadie.
  const eliminar = async () => {
    if (!actual) return null;
    const x = actual;
    const i = items.findIndex((y) => y.id === x.id);
    setAbierto(null);
    void deshacible({
      mensaje: `Eliminaste ${x.nombre || "el destino"}.`,
      aplicar: () => setItems((l) => l.filter((y) => y.id !== x.id)),
      deshacer: () => setItems((l) => reponer(l, i, x)),
      confirmar: async () => {
        const r = await api.eliminar(x.id);
        if (!r.ok) {
          setItems((l) => reponer(l, i, x));
          avisar(r.error, "error");
        }
      },
    });
    return null;
  };

  const conteo = (f: Filtro) => (f === "todos" ? items.length : items.filter((x) => x.estado === f).length);

  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoPagina
        titulo="Adónde viajamos"
        descripcion={
          <>
            <Numero valor={items.length} /> {items.length === 1 ? "destino" : "destinos"} ·{" "}
            <Numero valor={items.filter((x) => x.estado === "PUBLICADO").length} /> en el sitio
          </>
        }
        acciones={editable && items.length > 0 && <NuevoEnLinea etiqueta="Nuevo destino" placeholder="Nombre del destino" onCrear={crear} abiertoInicial={nuevoAlEntrar} />}
      />
      {items.length > 0 && (
      <div className={barraHerramientas}>
        <Filtros
          etiqueta="Estado"
          opciones={[
            { id: "todos" as Filtro, label: "Todos", n: conteo("todos") },
            ...ORDEN_ESTADOS.map((e) => ({ id: e as Filtro, label: ESTADOS_DESTINO[e].label, n: conteo(e) })),
          ]}
          valor={filtro}
          onChange={setFiltro}
        />
      </div>
      )}

      {error && (
        <p role="alert" className="mb-6 text-col-md text-col-alerta">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        items.length ? (
          <Vacio compacto icono={MapPinned} titulo="Nada con ese filtro" />
        ) : (
          <Vacio
            icono={MapPinned}
            titulo="Todavía no hay destinos"
            texto="Cada destino agrupa sus experiencias y tiene su propia página en el sitio."
            accion={editable && <NuevoEnLinea etiqueta="Nuevo destino" placeholder="Nombre del destino" onCrear={crear} abiertoInicial={nuevoAlEntrar} />}
          />
        )
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => void alSoltar(e)}>
          <SortableContext items={visibles.map((x) => x.id)} strategy={rectSortingStrategy} disabled={!ordenable}>
            <ul className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-3 xl:grid-cols-4">
              <LayoutGroup>
              <AnimatePresence mode="popLayout">
                {visibles.map((d, i) => (
                  <Item key={d.id} d={d} i={i} entrada={entrada} ordenable={ordenable} onAbrir={() => setAbierto(d.id)} />
                ))}
              </AnimatePresence>
              </LayoutGroup>
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {ordenable && visibles.length > 1 && (
        <p className="mt-12 text-center text-col-sm text-col-muted">Arrastrá las tarjetas para cambiar el orden en el sitio.</p>
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
    seoDescripcion: d.seoDescripcion };
}

// forwardRef: AnimatePresence en modo popLayout necesita el nodo para sacar del flujo al que se va.
const Item = forwardRef<
  HTMLLIElement,
  { d: DestinoItem; i: number; ordenable: boolean; onAbrir: () => void; entrada: ReturnType<typeof useEntradaLista> }
>(function Item({ d, i, ordenable, onAbrir, entrada }, ref) {
  const orden = useSortable({ id: d.id, disabled: !ordenable, transition: TRANSICION_SOLTAR });
  const { setNodeRef, isDragging } = orden;
  const o = estiloOrden(orden);
  const nodo = useRefsUnidos(setNodeRef, ref);
  return (
    <motion.li
      ref={nodo}
      {...entrada(i, o.atenuado)}
      layout={!isDragging}
      style={o.style}
      className="group relative"
    >
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Editar ${d.nombre || "destino sin nombre"}`}
        className={cn("block w-full rounded-col-sm text-left transition-[transform,box-shadow] duration-col-abre ease-col", o.levantado && claseLevantado)}
      >
        <TarjetaDestino d={d} admin sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 72px" />
      </button>
      {ordenable && (
        <AsaTarjeta nombre={d.nombre || "destino sin nombre"} orden={orden} className="top-1/2 -translate-y-1/2 sm:top-3 sm:translate-y-0" />
      )}
    </motion.li>
  );
});

function EditorDestino({
  d,
  paises,
  editable,
  error,
  cambiar,
  onEliminar }: {
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
      <div className="grid grid-cols-1 items-start gap-6 bg-col-base px-5 py-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:px-6 sm:py-7 [&>:first-child]:max-w-[200px]">
        <TarjetaDestino d={d} sizes="200px" />
        <div className="flex flex-col gap-3 pt-1">
          <Eyebrow>Vista previa</Eyebrow>
          <p className="text-col-md leading-relaxed text-col-slate">Así aparece en el mosaico de destinos del sitio.</p>
          <PillDestino estado={d.estado} className="self-start" />
          {error && (
            <p role="alert" className="text-col-sm text-col-alerta">
              {error}
            </p>
          )}
          {ro && <p className="text-col-sm text-col-slate">Solo lectura: te falta el permiso para editar destinos.</p>}
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
            className={cn(entradaTitulo, "text-col-2xl leading-tight")}
          />
        </Campo>

        <Campo etiqueta="Dirección web" htmlFor="d-slug">
          <div className={cn(cajaCompuesta, "pl-3.5")}>
            <span className="shrink-0 text-col-md text-col-muted" title={`${DOMINIO_COLLECTION}/destinos/`}>
              …/destinos/
            </span>
            <input
              id="d-slug"
              value={d.slug}
              maxLength={80}
              disabled={ro}
              onChange={(e) => cambiar({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })}
              onBlur={() => cambiar({ slug: slugify(d.slug) || slugify(d.nombre) })}
              className={cn(entradaInterna, "pl-0")}
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
            placeholder="Ej.: Templos, mercados y trenes nocturnos."
            className={entradaArea}
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
          <div role="radiogroup" aria-label="Estado" className="grid grid-cols-4 rounded-col-sm border border-col-line p-1">
            {ORDEN_ESTADOS.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={d.estado === e}
                disabled={ro}
                onClick={() => cambiar({ estado: e })}
                className={cn(
                  "h-10 rounded-col-sm text-col-md font-medium transition-colors duration-col ease-col disabled:cursor-not-allowed",
                  d.estado === e ? "bg-col-ink text-col-base" : "text-col-slate hover:text-col-ink",
                )}
              >
                {ESTADOS_DESTINO[e].label}
              </button>
            ))}
          </div>
          <p className="text-col-sm text-col-muted">
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
          <h3 className="font-col-display text-col-xl leading-tight text-col-ink">Google y compartir</h3>
          <Campo
            etiqueta="Título"
            htmlFor="d-seo-t"
            accion={<Contador n={d.seoTitulo.length} max={60} ideal={50} />}
            ayuda={!d.seoTitulo && d.nombre ? `Si lo dejás vacío se usa: ${d.nombre} | Traveloz Collection` : undefined}
          >
            <input
              id="d-seo-t"
              value={d.seoTitulo}
              maxLength={70}
              disabled={ro}
              onChange={(e) => cambiar({ seoTitulo: e.target.value })}
              className={entrada}
            />
          </Campo>
          <Campo
            etiqueta="Descripción"
            htmlFor="d-seo-d"
            accion={<Contador n={d.seoDescripcion.length} max={155} ideal={130} />}
            ayuda={!d.seoDescripcion && d.bajada ? "Si la dejás vacía se usa la bajada." : undefined}
          >
            <textarea
              id="d-seo-d"
              rows={3}
              value={d.seoDescripcion}
              maxLength={170}
              disabled={ro}
              onChange={(e) => cambiar({ seoDescripcion: e.target.value })}
              className={entradaArea}
            />
          </Campo>
        </section>

        {editable && (
          <ZonaEliminar texto={`¿Eliminar ${d.nombre || "este destino"}? Vas a tener unos segundos para deshacerlo.`} onEliminar={onEliminar} />
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
const ENCUADRES: Aspecto[] = ["4:5", "16:9"];

/** Portada con los recortes que usa el sitio, respetando el foco del medio. */
function CampoPortada({
  portada,
  editable,
  onCambio }: {
  portada: MedioVista | null;
  editable: boolean;
  onCambio: (m: MedioVista | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const encuadre = useEditorEncuadre(ENCUADRES, onCambio);
  const elegir = (m: MedioVista | null) => {
    onCambio(m);
    encuadre.abrir(m, true);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className={etiquetaCampo}>Portada</span>
        {portada && editable && (
          <span className="flex gap-4">
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="flex items-center gap-1.5 text-col-sm font-medium text-col-slate hover:text-col-ink"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} /> Cambiar
            </button>
            <button
              type="button"
              onClick={() => onCambio(null)}
              className="flex items-center gap-1.5 text-col-sm font-medium text-col-slate hover:text-col-alerta"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} /> Quitar
            </button>
          </span>
        )}
      </div>
      <SoltarAqui tipo="FOTO" deshabilitado={!editable} onMedio={elegir}>
      {portada ? (
        <>
          <div className="flex items-end gap-3">
            {RECORTES.map((r) => (
              <figure key={r.label} className="min-w-0" style={{ flexGrow: r.a, flexBasis: 0 }}>
                <MedioImagen medio={portada} aspecto={r.a} encuadre={ENCUADRES} sizes="240px" className="w-full rounded-col-sm" />
                <figcaption className="mt-1.5 text-col-xs tracking-wide text-col-slate">{r.label}</figcaption>
              </figure>
            ))}
          </div>
          {editable ? (
            <BotonEncuadre onClick={() => encuadre.abrir(portada)} className="self-start" />
          ) : (
            <p className="text-col-sm text-col-muted">El recorte sigue el encuadre guardado en la foto o su punto de foco.</p>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => setAbierto(true)}
          className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-col-sm border border-dashed border-col-slate/30 bg-col-base text-col-slate transition-colors duration-col ease-col hover:border-col-gold hover:text-col-ink disabled:pointer-events-none"
        >
          <ImagePlus className="h-5 w-5 text-col-gold" strokeWidth={1.4} aria-hidden />
          <span className="text-col-sm font-medium">Elegir portada</span>
          {editable && <span className="text-col-xs text-col-muted">o soltá una foto</span>}
        </button>
      )}
      </SoltarAqui>
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tipo="FOTO"
        titulo="Portada del destino"
        onElegir={(m) => elegir(m[0] ?? null)}
      />
      {encuadre.editor}
    </div>
  );
}

/** Multi-select de países del catálogo: busca, suma con clic o Enter, quita con la cruz. */
function SelectorPaises({
  elegidos,
  paises,
  deshabilitado,
  onCambio }: {
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
      <div className={cn(cajaCompuesta, "flex-wrap gap-1.5 px-2 py-[7px]")}>
        {elegidos.map((p) => (
          <span key={p.id} className="flex h-7 items-center gap-1 rounded-col-sm bg-col-base pl-2.5 pr-1 text-col-sm text-col-ink">
            {p.nombre}
            {!deshabilitado && (
              <button
                type="button"
                aria-label={`Quitar ${p.nombre}`}
                onClick={() => onCambio(elegidos.filter((x) => x.id !== p.id))}
                className="flex h-5 w-5 items-center justify-center rounded-col-sm text-col-slate hover:bg-col-line hover:text-col-ink"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </span>
        ))}
        {!deshabilitado && (
          <label className="relative flex min-w-[180px] flex-1 items-center">
            <Search className="pointer-events-none absolute left-1.5 h-4 w-4 text-col-muted" strokeWidth={1.5} aria-hidden />
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
              className={cn(entradaInterna, "h-7 w-full py-0 pl-8 pr-1.5")}
            />
          </label>
        )}
        {deshabilitado && elegidos.length === 0 && <span className="py-1 text-col-md text-col-muted">Sin países</span>}
      </div>
      {foco && opciones.length > 0 && (
        <ul
          id={lista}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-col-sm border border-col-line bg-col-surface p-1 shadow-col-3"
        >
          {opciones.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => sumar(p)}
                className="flex h-10 w-full items-center justify-between gap-3 rounded-col-sm px-3 text-left text-col-md text-col-ink hover:bg-col-base"
              >
                {p.nombre}
                {p.regionNombre && <span className="text-col-xs text-col-slate">{p.regionNombre}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
