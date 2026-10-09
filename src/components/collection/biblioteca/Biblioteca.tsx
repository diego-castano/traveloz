"use client";

// Biblioteca de medios de Collection: subir arrastrando a cualquier parte,
// pegando o con el botón; grilla justificada con filtros, búsqueda y scroll
// infinito; selección múltiple y hoja de detalle.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Upload, X } from "lucide-react";
import { eliminarMedio, listarMedios, type ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { errorAmigable, useAviso, useDeshacer } from "../shell/Avisos";
import { reponer } from "../contenido/comun";
import { Boton, Buscador, EncabezadoPagina, Filtros, barraHerramientas } from "../ui";
import { ColaSubidas } from "./ColaSubidas";
import { DetalleMedio } from "./DetalleMedio";
import { Grilla, GrillaSkeleton } from "./Grilla";
import { useSubidas } from "./useSubidas";
import { ACEPTA_TODO, ZonaSubida, nombrarPegados, revisarArchivos } from "./ZonaSubida";
import { resorteSuave } from "../movimiento";

export type FiltroBiblioteca = "todo" | "fotos" | "videos" | "sin-alt" | "sin-credito";

const FILTROS: { id: FiltroBiblioteca; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "fotos", label: "Fotos" },
  { id: "videos", label: "Videos" },
  { id: "sin-alt", label: "Sin descripción" },
  { id: "sin-credito", label: "Sin autor" },
];

const ACEPTA = ACEPTA_TODO;
const POR_PAGINA = 48;

function parametros(filtro: FiltroBiblioteca, q: string) {
  return {
    tipo: filtro === "fotos" ? ("FOTO" as const) : filtro === "videos" ? ("VIDEO" as const) : undefined,
    filtro: filtro === "sin-alt" || filtro === "sin-credito" ? filtro : undefined,
    q: q.trim() || undefined,
  };
}

function coincide(m: ColMedioDto, filtro: FiltroBiblioteca) {
  if (filtro === "fotos") return m.tipo === "FOTO";
  if (filtro === "videos") return m.tipo === "VIDEO";
  if (filtro === "sin-alt") return !m.alt;
  if (filtro === "sin-credito") return !m.credito;
  return true;
}

export function Biblioteca({
  inicial,
  filtroInicial,
  abrirId,
  subirAlEntrar = false,
  subidoPor,
}: {
  inicial: { items: ColMedioDto[]; nextCursor: string | null } | { error: string };
  filtroInicial: FiltroBiblioteca;
  abrirId: string | null;
  /** Desde la paleta ("Subir fotos"): enfoca Subir y abre el selector de archivos si el navegador lo deja. */
  subirAlEntrar?: boolean;
  subidoPor: Record<string, string>;
}) {
  const { puede } = useCollection();
  const avisar = useAviso();
  const deshacible = useDeshacer();
  const editable = puede("medios.editar");

  const [filtro, setFiltro] = useState<FiltroBiblioteca>(filtroInicial);
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ColMedioDto[]>("items" in inicial ? inicial.items : []);
  const [cursor, setCursor] = useState<string | null>("items" in inicial ? inicial.nextCursor : null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>("error" in inicial ? errorAmigable(inicial.error) : null);
  const [abierto, setAbierto] = useState<string | null>(abrirId);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [arrastrando, setArrastrando] = useState(0);

  const pedido = useRef(0);
  const ancla = useRef<number | null>(null);
  const inputArchivos = useRef<HTMLInputElement>(null);
  const botonSubir = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!subirAlEntrar) return;
    botonSubir.current?.focus();
    inputArchivos.current?.click();
  }, [subirAlEntrar]);
  const centinela = useRef<HTMLDivElement>(null);
  // Qué filtro y búsqueda muestra la grilla. Arranca con lo que vino del
  // servidor; así el doble efecto de StrictMode no vuelve a pedir la página.
  const mostrado = useRef(`${filtroInicial}|`);

  // --- Carga ---------------------------------------------------------------

  const cargar = useCallback(
    async (desde: string | null) => {
      const n = ++pedido.current;
      setCargando(true);
      const r = await listarMedios({ ...parametros(filtro, q), cursor: desde ?? undefined, take: POR_PAGINA });
      if (n !== pedido.current) return;
      setCargando(false);
      if (!r.ok) {
        setError(errorAmigable(r.error));
        return;
      }
      setError(null);
      setItems((prev) => (desde ? [...prev, ...r.data.items.filter((m) => !prev.some((p) => p.id === m.id))] : r.data.items));
      setCursor(r.data.nextCursor);
    },
    [filtro, q],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setQ(texto), 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    if (mostrado.current === `${filtro}|${q}`) return;
    mostrado.current = `${filtro}|${q}`;
    setSeleccion(new Set());
    void cargar(null);
  }, [cargar, filtro, q]);

  useEffect(() => {
    const el = centinela.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !cargando) void cargar(cursor);
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, cargando, cargar]);

  // --- Subidas -------------------------------------------------------------

  const alListo = useCallback(
    (m: ColMedioDto) => {
      if (q || !coincide(m, filtro)) return;
      setItems((prev) => (prev.some((p) => p.id === m.id) ? prev : [m, ...prev]));
    },
    [filtro, q],
  );
  const { subidas, agregar, reintentar, reintentarTodo, limpiar } = useSubidas(alListo);

  const subir = useCallback(
    (files: File[]) => {
      if (!editable || files.length === 0) return;
      const { validos, motivos } = revisarArchivos(files, ACEPTA_TODO);
      if (motivos.length) avisar(motivos.length === 1 ? motivos[0] : `${motivos[0]} (y ${motivos.length - 1} más)`, "error");
      if (validos.length) agregar(validos);
    },
    [editable, agregar, avisar],
  );

  useEffect(() => {
    if (!editable) return;
    let profundidad = 0;
    const conArchivos = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
    const enter = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      e.preventDefault();
      profundidad++;
      setArrastrando(Math.max(1, Array.from(e.dataTransfer?.items ?? []).filter((i) => i.kind === "file").length));
    };
    const over = (e: DragEvent) => {
      if (conArchivos(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      profundidad = Math.max(0, profundidad - 1);
      if (profundidad === 0) setArrastrando(0);
    };
    const drop = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      profundidad = 0;
      setArrastrando(0);
      // Si cayó sobre una zona de subida, ella ya lo tomó.
      if (e.defaultPrevented) return;
      e.preventDefault();
      subir(Array.from(e.dataTransfer?.files ?? []));
    };
    const pegar = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      subir(nombrarPegados(files));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", pegar);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", pegar);
    };
  }, [editable, subir]);

  // --- Selección -----------------------------------------------------------

  const alternar = useCallback(
    (indice: number, rango: boolean) => {
      setSeleccion((prev) => {
        const sig = new Set(prev);
        const id = items[indice]?.id;
        if (!id) return prev;
        if (rango && ancla.current !== null) {
          const [a, b] = [Math.min(ancla.current, indice), Math.max(ancla.current, indice)];
          items.slice(a, b + 1).forEach((m) => sig.add(m.id));
        } else if (sig.has(id)) {
          sig.delete(id);
        } else {
          sig.add(id);
        }
        return sig;
      });
      ancla.current = indice;
      setConfirmar(false);
    },
    [items],
  );

  // Borrado diferido: los medios salen de la grilla al toque y el servidor
  // recién los borra cuando vence el aviso. "Deshacer" los repone.
  const eliminarSeleccion = () => {
    const ids = new Set(seleccion);
    const previos = items;
    setSeleccion(new Set());
    setConfirmar(false);
    void deshacible({
      mensaje: ids.size === 1 ? "Eliminaste el medio." : `Eliminaste ${ids.size} medios.`,
      aplicar: () => setItems((prev) => prev.filter((m) => !ids.has(m.id))),
      deshacer: () => setItems(previos),
      confirmar: async () => {
        setBorrando(true);
        const fallidos: ColMedioDto[] = [];
        let ultimoError = "";
        for (const id of Array.from(ids)) {
          const r = await eliminarMedio(id);
          if (!r.ok) {
            fallidos.push(previos.find((m) => m.id === id)!);
            ultimoError = r.error;
          }
        }
        setBorrando(false);
        if (fallidos.length) {
          setItems((prev) => fallidos.reduce((l, m) => reponer(l, previos.indexOf(m), m), prev));
          avisar(`${fallidos.length} sin eliminar: ${errorAmigable(ultimoError)}`, "error");
        }
      },
    });
  };

  // --- Detalle -------------------------------------------------------------

  const indiceAbierto = useMemo(() => items.findIndex((m) => m.id === abierto), [items, abierto]);
  const medioAbierto = indiceAbierto >= 0 ? items[indiceAbierto] : null;

  const alCambiar = useCallback((m: ColMedioDto) => {
    setItems((prev) => prev.map((p) => (p.id === m.id ? m : p)));
  }, []);

  const alEliminar = useCallback(
    (id: string) => {
      const i = items.findIndex((m) => m.id === id);
      const medio = items[i];
      const siguiente = items[i + 1] ?? items[i - 1] ?? null;
      setAbierto(siguiente?.id ?? null);
      void deshacible({
        mensaje: "Eliminaste el medio.",
        aplicar: () => setItems((prev) => prev.filter((m) => m.id !== id)),
        deshacer: () => setItems((prev) => reponer(prev, i, medio)),
        confirmar: async () => {
          const r = await eliminarMedio(id);
          if (!r.ok) {
            setItems((prev) => reponer(prev, i, medio));
            avisar(r.error, "error");
          }
        },
      });
    },
    [items, deshacible, avisar],
  );

  const vacia = !cargando && !error && items.length === 0;
  const sinFiltros = filtro === "todo" && !q;
  const enSeleccion = seleccion.size > 0;

  return (
    <div className="mx-auto max-w-[1600px]">
      <EncabezadoPagina
        titulo="Fotos y videos"
        descripcion="Arrastrá archivos a cualquier parte de la página para subirlos."
        acciones={
          editable && (
            <>
              <Boton ref={botonSubir} onClick={() => inputArchivos.current?.click()}>
                <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Subir
              </Boton>
              <input
                ref={inputArchivos}
                type="file"
                multiple
                accept={ACEPTA}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  subir(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </>
          )
        }
      />
      <div className={barraHerramientas}>
        <Filtros etiqueta="Mostrar" opciones={FILTROS} valor={filtro} onChange={setFiltro} />
        <Buscador valor={texto} onChange={setTexto} placeholder="Buscar por nombre, descripción o etiqueta" etiqueta="Buscar en la biblioteca" />
      </div>

      <AnimatePresence>
        {enSeleccion && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="sticky top-20 z-20 mb-6 flex flex-wrap items-center gap-3 rounded-col bg-col-ink px-4 py-2.5 text-col-base shadow-col-3"
          >
            <button
              type="button"
              onClick={() => {
                setSeleccion(new Set());
                setConfirmar(false);
              }}
              aria-label="Salir de la selección"
              className="flex h-8 w-8 items-center justify-center rounded-col-sm text-col-base/70 hover:text-col-base"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <p className="text-col-md" aria-live="polite">
              {seleccion.size === 1 ? "1 seleccionado" : `${seleccion.size} seleccionados`}
            </p>
            <p className="hidden text-col-xs text-col-base/60 md:block">Shift + clic para elegir un rango</p>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {confirmar ? (
                <>
                  <span className="text-col-md">¿Eliminar {seleccion.size === 1 ? "este medio" : `estos ${seleccion.size} medios`}? Vas a tener unos segundos para deshacerlo.</span>
                  <Boton tam="sm" variante="fantasma" className="text-col-base/70 hover:text-col-base" onClick={() => setConfirmar(false)} disabled={borrando}>
                    Cancelar
                  </Boton>
                  <Boton tam="sm" variante="peligro" onClick={eliminarSeleccion} disabled={borrando} autoFocus>
                    {borrando ? "Eliminando" : "Sí, eliminar"}
                  </Boton>
                </>
              ) : (
                <>
                  <Boton
                    tam="sm"
                    variante="fantasma"
                    className="text-col-base/70 hover:text-col-base"
                    onClick={() => setSeleccion(new Set(items.map((m) => m.id)))}
                  >
                    Elegir todo
                  </Boton>
                  <Boton tam="sm" variante="peligro" onClick={() => setConfirmar(true)}>
                    Eliminar
                  </Boton>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div role="alert" className="mb-6 flex items-center gap-4 rounded-col-sm border border-col-alerta/30 px-4 py-3 text-col-md text-col-alerta">
          <span className="flex-1">{error}</span>
          <Boton tam="sm" variante="secundario" onClick={() => void cargar(null)}>
            Reintentar
          </Boton>
        </div>
      )}

      {vacia && sinFiltros ? (
        <Vacia editable={editable} onArchivos={subir} />
      ) : vacia ? (
        <div className="py-24 text-center">
          <p className="font-col-display text-col-3xl font-light italic text-col-ink">
            {filtro === "sin-alt" && !q
              ? "Todas las fotos tienen su descripción."
              : filtro === "sin-credito" && !q
                ? "Todos los medios tienen su autor."
                : "Nada por acá."}
          </p>
          <p className="mt-2 text-col-md text-col-slate">
            {q ? "Probá con otra palabra o sacá el filtro." : "Probá con otro filtro."}
          </p>
        </div>
      ) : cargando && items.length === 0 ? (
        <GrillaSkeleton />
      ) : (
        <div className={cn("transition-opacity duration-col ease-col", cargando && !cursor && "opacity-60")}>
          <Grilla
            items={items}
            seleccion={seleccion}
            modoSeleccion={enSeleccion}
            puedeSeleccionar={editable}
            onAbrir={(i) => setAbierto(items[i]?.id ?? null)}
            onAlternar={alternar}
          />
        </div>
      )}

      <div ref={centinela} aria-hidden className="h-px" />
      {cargando && items.length > 0 && cursor && (
        <p className="py-8 text-center text-col-sm text-col-slate">Cargando más</p>
      )}

      <AnimatePresence>
        {arrastrando > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-col-noche/80 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={resorteSuave}
              className="flex h-full w-full flex-col items-center justify-center rounded-md border-[1.5px] border-dashed border-col-gold/80"
            >
              <motion.span
                initial={{ y: 8 }}
                animate={{ y: 0 }}
                transition={resorteSuave}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-col-gold text-col-noche"
              >
                <Upload className="h-7 w-7" strokeWidth={1.5} aria-hidden />
              </motion.span>
              <p className="mt-6 font-col-display text-col-display font-light italic leading-none text-col-base md:text-col-display-lg">
                Soltá {arrastrando === 1 ? "para subir" : `${arrastrando} archivos`}
              </p>
              <p className="mt-4 text-col-md text-col-base/70">Fotos JPG, PNG, WebP o AVIF hasta 30 MB. Videos MP4, WebM o MOV hasta 200 MB.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ColaSubidas subidas={subidas} onReintentar={reintentar} onReintentarTodo={reintentarTodo} onLimpiar={limpiar} />

      <DetalleMedio
        medio={medioAbierto}
        posicion={indiceAbierto >= 0 ? `${indiceAbierto + 1} de ${items.length}${cursor ? "+" : ""}` : ""}
        subidoPor={subidoPor}
        onCerrar={() => setAbierto(null)}
        onAnterior={indiceAbierto > 0 ? () => setAbierto(items[indiceAbierto - 1].id) : null}
        onSiguiente={indiceAbierto >= 0 && indiceAbierto < items.length - 1 ? () => setAbierto(items[indiceAbierto + 1].id) : null}
        onCambio={alCambiar}
        onEliminado={alEliminar}
      />
    </div>
  );
}

function Vacia({ editable, onArchivos }: { editable: boolean; onArchivos: (files: File[]) => void }) {
  if (!editable) {
    return (
      <div className="py-28 text-center">
        <p className="font-col-display text-col-display font-light italic text-col-ink">Todavía no hay medios.</p>
        <p className="mt-3 text-col-cuerpo text-col-slate">Cuando el equipo suba fotos y videos, aparecen acá.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[880px] py-6">
      <p className="mb-6 text-center font-col-display text-col-display font-light leading-[1.05] text-col-ink md:text-col-display-lg">
        Tu biblioteca <em className="italic">empieza acá</em>
      </p>
      <ZonaSubida onArchivos={onArchivos} className="[&>button]:min-h-[320px]" />
    </div>
  );
}
