"use client";

// Preguntas frecuentes de Collection: un acordeón que se edita en el lugar.
// Categorías como pestañas, filas ordenables que se abren para editar
// pregunta y respuesta con guardado automático, y a la derecha el bloque del
// sitio en vivo (solo las publicadas, en su orden).

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, LoaderCircle, Plus, X } from "lucide-react";
import {
  actualizarPregunta,
  crearPregunta,
  eliminarPregunta,
  reordenarPreguntas,
  type PreguntaItem } from "@/actions/collection/preguntas.actions";
import type { Resultado } from "@/lib/collection/ejecutar";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso, useDeshacer } from "../shell/Avisos";
import { IndicadorGuardado } from "../biblioteca/DetalleMedio";
import { Boton, EncabezadoPagina, Eyebrow, Filtros, Interruptor, etiquetaCampo, entradaSelect, entrada, entradaTitulo } from "../ui";
import { Campo, useSensoresOrden } from "../constructor/campos";
import { EditorTexto } from "../editor/EditorTexto";
import { ItemPregunta } from "../sitio/tarjetas";
import { Cabecera, ListaVacia } from "../sitio/bloques/comun";
import "../sitio/sitio.css";
import { ZonaEliminar, reponer, useGuardadoDiferido } from "../contenido/comun";

const EASE = [0.22, 1, 0.36, 1] as const;

type Payload = Parameters<typeof actualizarPregunta>[1];

/** Lo que la pantalla le pide al servidor. La ruta de desarrollo pasa uno en memoria. */
export interface ApiPreguntas {
  crear(input: { pregunta: string; categoria?: string }): Promise<Resultado<{ id: string }>>;
  actualizar(id: string, input: Payload): Promise<Resultado<null>>;
  reordenar(ids: string[]): Promise<Resultado<null>>;
  eliminar(id: string): Promise<Resultado<null>>;
}

const apiReal: ApiPreguntas = {
  crear: crearPregunta,
  actualizar: actualizarPregunta,
  reordenar: reordenarPreguntas,
  eliminar: eliminarPregunta };

const payload = (p: PreguntaItem): Payload => ({
  pregunta: p.pregunta,
  respuesta: p.respuesta,
  categoria: p.categoria,
  publicada: p.publicada });

const ordenar = (l: string[]) => Array.from(new Set(l)).sort((a, b) => a.localeCompare(b, "es"));

export function Preguntas({
  inicial,
  categorias,
  api = apiReal,
  abrirId = null }: {
  inicial: PreguntaItem[] | { error: string };
  categorias: string[];
  api?: ApiPreguntas;
  abrirId?: string | null;
}) {
  const avisar = useAviso();
  const deshacible = useDeshacer();
  const { puede } = useCollection();
  const editable = puede("sitio.editar");
  const sensores = useSensoresOrden();
  const error = Array.isArray(inicial) ? null : inicial.error;

  const [items, setItems] = useState<PreguntaItem[]>(Array.isArray(inicial) ? inicial : []);
  // Las categorías nuevas viven acá hasta que tienen su primera pregunta.
  const [nuevas, setNuevas] = useState<string[]>([]);
  const cats = useMemo(
    () => ordenar([...categorias, ...items.map((p) => p.categoria), ...nuevas, "General"]),
    [categorias, items, nuevas],
  );
  const [cat, setCat] = useState<string>(
    () => items.find((p) => p.id === abrirId)?.categoria ?? items[0]?.categoria ?? "General",
  );
  const [abierta, setAbierta] = useState<string | null>(abrirId);
  const [enVista, setEnVista] = useState<string | null>(abrirId);
  const [agregando, setAgregando] = useState(false);

  const actual = items.find((p) => p.id === abierta) ?? null;
  const guardado = useGuardadoDiferido(
    actual,
    abierta,
    (p) => (p ? api.actualizar(p.id, payload(p)) : Promise.resolve({ ok: true as const, data: null })),
    editable && !!actual,
  );
  const cambiar = (id: string, parcial: Partial<PreguntaItem>) =>
    setItems((l) => l.map((x) => (x.id === id ? { ...x, ...parcial } : x)));

  /** Antes de cambiar de fila, lo pendiente de la anterior sale. */
  const abrir = (id: string | null) => {
    void guardado.ya();
    setAbierta(id);
    if (id) setEnVista(id);
  };

  const visibles = items.filter((p) => p.categoria === cat);
  const publicadas = visibles.filter((p) => p.publicada);

  const elegirCat = (c: string) => {
    abrir(null);
    setAgregando(false);
    setCat(c);
  };

  const crear = async (pregunta: string) => {
    const r = await api.crear({ pregunta, categoria: cat });
    if (!r.ok) {
      avisar(r.error, "error");
      return false;
    }
    setItems((l) => [...l, { id: r.data.id, pregunta, respuesta: "", categoria: cat, publicada: false, orden: l.length }]);
    setNuevas((l) => l.filter((x) => x !== cat));
    setAgregando(false);
    abrir(r.data.id);
    return true;
  };

  const guardarVisible = async (p: PreguntaItem, publicada: boolean) => {
    // Si es la fila abierta, el guardado automático se encarga.
    if (p.id === abierta) return cambiar(p.id, { publicada });
    cambiar(p.id, { publicada });
    const r = await api.actualizar(p.id, payload({ ...p, publicada }));
    if (!r.ok) {
      cambiar(p.id, { publicada: !publicada });
      avisar(r.error, "error");
      return false;
    }
  };

  // Publicar u ocultar cambia el sitio al toque: el aviso ofrece volver atrás (acción inversa).
  const publicar = (p: PreguntaItem, publicada: boolean) =>
    deshacible({
      mensaje: publicada ? "La pregunta ya se ve en el sitio." : "La pregunta ya no se ve en el sitio.",
      aplicar: () => guardarVisible(p, publicada),
      deshacer: () => void guardarVisible({ ...p, publicada }, !publicada),
    });

  // Se ordena dentro de la categoría; al servidor va la lista completa.
  const alSoltar = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const enCat = arrayMove(
      visibles,
      visibles.findIndex((x) => x.id === e.active.id),
      visibles.findIndex((x) => x.id === e.over!.id),
    );
    const previo = items;
    let k = 0;
    const nuevo = items.map((x) => (x.categoria === cat ? enCat[k++] : x));
    setItems(nuevo);
    const r = await api.reordenar(nuevo.map((x) => x.id));
    if (!r.ok) {
      setItems(previo);
      avisar(r.error, "error");
    }
  };

  // Borrado diferido: sale de la lista al toque y el servidor se entera
  // cuando vence el aviso. "Deshacer" la repone sin llamar a nadie.
  const eliminar = async (id: string) => {
    const i = items.findIndex((y) => y.id === id);
    const x = items[i];
    if (!x) return null;
    setAbierta(null);
    void deshacible({
      mensaje: "Eliminaste la pregunta.",
      aplicar: () => setItems((l) => l.filter((y) => y.id !== id)),
      deshacer: () => setItems((l) => reponer(l, i, x)),
      confirmar: async () => {
        const r = await api.eliminar(id);
        if (!r.ok) {
          setItems((l) => reponer(l, i, x));
          avisar(r.error, "error");
        }
      },
    });
    return null;
  };

  const moverA = (p: PreguntaItem, c: string) => {
    cambiar(p.id, { categoria: c });
    setCat(c);
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoPagina
        titulo="Lo que nos preguntan"
        descripcion={`${items.length} ${items.length === 1 ? "pregunta" : "preguntas"} · ${items.filter((p) => p.publicada).length} en el sitio`}
      />

      {error && (
        <p role="alert" className="mb-6 text-col-md text-col-alerta">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <div className="min-w-0">
          <Filtros
            className="mb-8"
            etiqueta="Categoría"
            opciones={cats.map((c) => ({ id: c, label: c, n: items.filter((p) => p.categoria === c).length }))}
            valor={cat}
            onChange={elegirCat}
          >
            {editable && (
              <NuevaCategoria
                existentes={cats}
                onCrear={(c) => {
                  setNuevas((l) => [...l, c]);
                  elegirCat(c);
                  setAgregando(true);
                }}
              />
            )}
          </Filtros>

          <div className="mb-3 flex items-center justify-between gap-4">
            <span className={etiquetaCampo}>
              {visibles.length} en {cat} · {publicadas.length} publicadas
            </span>
            {actual && <IndicadorGuardado estado={guardado.estado} />}
          </div>

          <div className="border-t border-col-ink">
            {visibles.length === 0 && !agregando && (
              <p className="py-14 text-center font-col-display text-col-xl italic text-col-slate">
                Todavía no hay preguntas en {cat}.
              </p>
            )}
            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(e) => void alSoltar(e)}>
              <SortableContext items={visibles.map((x) => x.id)} strategy={verticalListSortingStrategy} disabled={!editable}>
                {visibles.map((p) => (
                  <Fila
                    key={p.id}
                    p={p}
                    abierta={abierta === p.id}
                    editable={editable}
                    cats={cats}
                    error={abierta === p.id ? guardado.error : null}
                    onAlternar={() => abrir(abierta === p.id ? null : p.id)}
                    onPublicar={(v) => void publicar(p, v)}
                    cambiar={(parcial) => cambiar(p.id, parcial)}
                    onMover={(c) => moverA(p, c)}
                    onEliminar={() => eliminar(p.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {agregando && <FilaNueva onCrear={crear} onCancelar={() => setAgregando(false)} />}
          </div>

          {editable && !agregando && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <Boton
                onClick={() => {
                  abrir(null);
                  setAgregando(true);
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Nueva pregunta
              </Boton>
              {visibles.length > 1 && <p className="text-col-sm text-col-muted">Arrastrá desde el asa para cambiar el orden.</p>}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <Eyebrow>Vista previa</Eyebrow>
            <span className="text-col-xs text-col-slate">Solo las publicadas, en este orden</span>
          </div>
          <div className="max-h-[calc(100vh-150px)] overflow-y-auto rounded-col-sm border border-col-line">
            <div className="cs-raiz" data-modo="preview" onClickCapture={(e) => (e.target as HTMLElement).closest("a") && e.preventDefault()}>
              <div className="cs-bloque bg-col-surface">
                <div className="cs-envolvente cs-preguntas">
                  <Cabecera eyebrow="Preguntas frecuentes" titulo={cat} preview className="cs-preguntas-cabecera" />
                  {publicadas.length ? (
                    <div className="border-t border-col-ink">
                      {publicadas.map((q) => (
                        <ItemPregunta
                          key={q.id}
                          p={q}
                          abierta={enVista === q.id}
                          onAlternar={() => setEnVista(enVista === q.id ? null : q.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <ListaVacia>Prendé el interruptor de una pregunta para que aparezca acá y en el sitio.</ListaVacia>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Fila({
  p,
  abierta,
  editable,
  cats,
  error,
  onAlternar,
  onPublicar,
  cambiar,
  onMover,
  onEliminar }: {
  p: PreguntaItem;
  abierta: boolean;
  editable: boolean;
  cats: string[];
  error: string | null;
  onAlternar: () => void;
  onPublicar: (v: boolean) => void;
  cambiar: (parcial: Partial<PreguntaItem>) => void;
  onMover: (c: string) => void;
  onEliminar: () => Promise<string | null>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled: !editable });
  const ro = !editable;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className={cn(
        "relative border-b border-col-line transition-[background-color,box-shadow] duration-col-lento ease-col",
        abierta ? "bg-col-surface shadow-col-2" : "hover:bg-col-surface/60",
        isDragging && "bg-col-surface shadow-col-2",
      )}
    >
      {abierta && <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-col-gold" />}
      <div className="flex items-center gap-2 py-4 pl-2 pr-4">
        {editable ? (
          <button
            type="button"
            aria-label={`Arrastrar ${p.pregunta}`}
            {...attributes}
            {...listeners}
            className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-col-sm text-col-subtle transition-colors hover:text-col-ink active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : (
          <span className="w-2" />
        )}
        {abierta && !ro ? (
          // Abierta, la pregunta se edita en el mismo lugar donde se lee.
          <input
            autoFocus={!p.pregunta}
            aria-label="Pregunta"
            value={p.pregunta}
            maxLength={300}
            onChange={(e) => cambiar({ pregunta: e.target.value })}
            placeholder="Escribí la pregunta"
            className={cn(entradaTitulo, "flex-1 border-transparent pb-1.5 text-col-xl leading-[1.25]")}
          />
        ) : (
          <button
            type="button"
            aria-expanded={abierta}
            onClick={onAlternar}
            className={cn(
              "min-w-0 flex-1 text-left font-col-display text-col-xl leading-[1.25] transition-colors duration-col ease-col",
              abierta ? "text-col-ink" : p.publicada ? "text-col-ink/90 hover:text-col-ink" : "text-col-muted hover:text-col-ink",
            )}
          >
            {p.pregunta || <span className="italic text-col-subtle">Pregunta sin texto</span>}
          </button>
        )}
        <Interruptor
          checked={p.publicada}
          onCheckedChange={onPublicar}
          disabled={ro}
          label={`Publicar ${p.pregunta}`}
          texto={p.publicada ? "Publicada" : "Oculta"}
        />
        <button
          type="button"
          aria-label={abierta ? "Cerrar" : "Editar"}
          onClick={onAlternar}
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-col-sm text-col-slate hover:text-col-ink"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-col-lento ease-col", abierta && "rotate-180")} strokeWidth={1.5} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-7 pb-8 pl-10 pr-6 pt-1">
              <div className="flex flex-col gap-2">
                <span className={etiquetaCampo}>Respuesta</span>
                <EditorTexto
                  etiqueta={`Respuesta a ${p.pregunta}`}
                  valor={p.respuesta}
                  onCambio={(html) => cambiar({ respuesta: html })}
                  placeholder="Contestá como lo harías por WhatsApp: corto y claro."
                  maximo={1500}
                  minAlto={110}
                  deshabilitado={ro}
                  compacto
                />
              </div>
              <Campo etiqueta="Categoría" htmlFor={`qc-${p.id}`} className="max-w-[280px]">
                <div className="relative">
                  <select
                    id={`qc-${p.id}`}
                    value={p.categoria}
                    disabled={ro}
                    onChange={(e) => onMover(e.target.value)}
                    className={entradaSelect}
                  >
                    {cats.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </Campo>
              {error && (
                <p role="alert" className="text-col-sm text-col-alerta">
                  {error}
                </p>
              )}
              {editable && <ZonaEliminar texto="¿Eliminar esta pregunta? Vas a tener unos segundos para deshacerlo." onEliminar={onEliminar} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Fila en modo edición para escribir la pregunta nueva; Enter la crea y la abre. */
function FilaNueva({ onCrear, onCancelar }: { onCrear: (texto: string) => Promise<boolean>; onCancelar: () => void }) {
  const [texto, setTexto] = useState("");
  const [creando, setCreando] = useState(false);
  const crear = async () => {
    const t = texto.trim();
    if (!t || creando) return;
    setCreando(true);
    const ok = await onCrear(t);
    if (!ok) setCreando(false);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void crear();
      }}
      className="relative flex items-center gap-3 border-b border-col-line bg-col-surface py-4 pl-10 pr-4"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-col-gold" />
      <input
        autoFocus
        aria-label="Pregunta nueva"
        value={texto}
        maxLength={300}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancelar()}
        placeholder="Escribí la pregunta y apretá Enter"
        className={cn(entradaTitulo, "flex-1 pb-1.5 text-col-xl leading-[1.25]")}
      />
      <Boton type="submit" tam="sm" disabled={!texto.trim() || creando}>
        {creando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
        Crear
      </Boton>
      <button
        type="button"
        aria-label="Cancelar"
        onClick={onCancelar}
        className="flex h-9 w-9 items-center justify-center rounded-col-sm text-col-slate hover:text-col-ink"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </form>
  );
}

/** "Nueva categoría": el chip se abre en un campo; Enter la suma y la elige. */
function NuevaCategoria({ existentes, onCrear }: { existentes: string[]; onCrear: (c: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const listo = () => {
    const c = nombre.trim().slice(0, 60);
    setNombre("");
    setAbierto(false);
    if (!c) return;
    const ya = existentes.find((x) => x.toLowerCase() === c.toLowerCase());
    onCrear(ya ?? c);
  };
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex h-10 items-center gap-1.5 rounded-col border border-dashed border-col-slate/40 px-3.5 text-col-md text-col-slate transition-colors duration-col ease-col hover:border-col-ink hover:text-col-ink"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Nueva categoría
      </button>
    );
  }
  return (
    <input
      autoFocus
      aria-label="Nombre de la categoría"
      value={nombre}
      maxLength={60}
      onChange={(e) => setNombre(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") listo();
        if (e.key === "Escape") setAbierto(false);
      }}
      onBlur={listo}
      placeholder="Ej.: Visados"
      className={cn(entrada, "min-h-9 w-52 px-3 py-[5px] text-col-md")}
    />
  );
}
