"use client";

// Biblioteca de medios de Collection: subir arrastrando a cualquier parte,
// pegando o con el botón; grilla justificada con filtros, búsqueda y scroll
// infinito; selección múltiple y hoja de detalle.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, Upload, X } from "lucide-react";
import { eliminarMedio, listarMedios, type ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { useAviso } from "../shell/Avisos";
import { Boton } from "../ui";
import { ColaSubidas } from "./ColaSubidas";
import { DetalleMedio } from "./DetalleMedio";
import { Grilla, GrillaSkeleton } from "./Grilla";
import { useSubidas } from "./useSubidas";

export type FiltroBiblioteca = "todo" | "fotos" | "videos" | "sin-alt" | "sin-credito";

const FILTROS: { id: FiltroBiblioteca; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "fotos", label: "Fotos" },
  { id: "videos", label: "Videos" },
  { id: "sin-alt", label: "Sin alt" },
  { id: "sin-credito", label: "Sin crédito" },
];

const ACEPTA = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime";
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
  subidoPor,
}: {
  inicial: { items: ColMedioDto[]; nextCursor: string | null } | { error: string };
  filtroInicial: FiltroBiblioteca;
  abrirId: string | null;
  subidoPor: Record<string, string>;
}) {
  const { puede } = useCollection();
  const avisar = useAviso();
  const editable = puede("medios.editar");

  const [filtro, setFiltro] = useState<FiltroBiblioteca>(filtroInicial);
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ColMedioDto[]>("items" in inicial ? inicial.items : []);
  const [cursor, setCursor] = useState<string | null>("items" in inicial ? inicial.nextCursor : null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>("error" in inicial ? inicial.error : null);
  const [abierto, setAbierto] = useState<string | null>(abrirId);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const pedido = useRef(0);
  const ancla = useRef<number | null>(null);
  const inputArchivos = useRef<HTMLInputElement>(null);
  const centinela = useRef<HTMLDivElement>(null);
  const primeraCarga = useRef(true);

  // --- Carga ---------------------------------------------------------------

  const cargar = useCallback(
    async (desde: string | null) => {
      const n = ++pedido.current;
      setCargando(true);
      const r = await listarMedios({ ...parametros(filtro, q), cursor: desde ?? undefined, take: POR_PAGINA });
      if (n !== pedido.current) return;
      setCargando(false);
      if (!r.ok) {
        setError(r.error);
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
    // La primera página ya vino del servidor.
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    setSeleccion(new Set());
    void cargar(null);
  }, [cargar]);

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
  const { subidas, agregar, reintentar, limpiar } = useSubidas(alListo);

  const subir = useCallback(
    (files: File[]) => {
      if (!editable || files.length === 0) return;
      agregar(files);
    },
    [editable, agregar],
  );

  useEffect(() => {
    if (!editable) return;
    let profundidad = 0;
    const conArchivos = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
    const enter = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      e.preventDefault();
      profundidad++;
      setArrastrando(true);
    };
    const over = (e: DragEvent) => {
      if (conArchivos(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      profundidad = Math.max(0, profundidad - 1);
      if (profundidad === 0) setArrastrando(false);
    };
    const drop = (e: DragEvent) => {
      if (!conArchivos(e)) return;
      e.preventDefault();
      profundidad = 0;
      setArrastrando(false);
      subir(Array.from(e.dataTransfer?.files ?? []));
    };
    const pegar = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      // Las capturas pegadas llegan como "image.png": les damos un nombre útil.
      const sello = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
      subir(
        files.map((f, i) =>
          /^image\.\w+$/.test(f.name) ? new File([f], `pegada-${sello}-${i + 1}.${f.name.split(".")[1]}`, { type: f.type }) : f,
        ),
      );
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

  const eliminarSeleccion = async () => {
    setBorrando(true);
    const ids = Array.from(seleccion);
    const fallidos: string[] = [];
    let ultimoError = "";
    for (const id of ids) {
      const r = await eliminarMedio(id);
      if (!r.ok) {
        fallidos.push(id);
        ultimoError = r.error;
      }
    }
    const borrados = new Set(ids.filter((id) => !fallidos.includes(id)));
    setItems((prev) => prev.filter((m) => !borrados.has(m.id)));
    setSeleccion(new Set(fallidos));
    setBorrando(false);
    setConfirmar(false);
    if (fallidos.length) avisar(`${fallidos.length} sin eliminar: ${ultimoError}`, "error");
    else avisar(borrados.size === 1 ? "Medio eliminado." : `${borrados.size} medios eliminados.`);
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
      const siguiente = items[i + 1] ?? items[i - 1] ?? null;
      setItems((prev) => prev.filter((m) => m.id !== id));
      setAbierto(siguiente?.id ?? null);
    },
    [items],
  );

  const vacia = !cargando && !error && items.length === 0;
  const sinFiltros = filtro === "todo" && !q;
  const enSeleccion = seleccion.size > 0;

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center">
        <div role="group" aria-label="Filtros" className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                "h-9 shrink-0 rounded-sm border px-4 text-[13px] uppercase tracking-[0.12em] transition-colors duration-200 ease-col",
                filtro === f.id
                  ? "border-col-ink bg-col-ink text-col-base"
                  : "border-col-line text-col-slate hover:border-col-slate/50 hover:text-col-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 lg:ml-auto">
          <label className="relative flex-1 lg:w-72 lg:flex-none">
            <span className="sr-only">Buscar en la biblioteca</span>
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} aria-hidden />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por nombre, alt o etiqueta"
              className="h-10 w-full border-0 border-b border-col-slate/40 bg-transparent pl-7 pr-2 text-[15px] text-col-ink placeholder:text-col-slate/60 transition-colors duration-200 ease-col focus:border-col-gold focus:outline-none focus:ring-0 focus-visible:outline-none"
            />
          </label>
          {editable && (
            <>
              <Boton onClick={() => inputArchivos.current?.click()}>
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
          )}
        </div>
      </div>

      <AnimatePresence>
        {enSeleccion && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="sticky top-20 z-20 mb-6 flex flex-wrap items-center gap-3 rounded bg-col-ink px-4 py-2.5 text-col-base shadow-[0_16px_32px_-20px_rgba(50,55,59,0.6)]"
          >
            <button
              type="button"
              onClick={() => {
                setSeleccion(new Set());
                setConfirmar(false);
              }}
              aria-label="Salir de la selección"
              className="flex h-8 w-8 items-center justify-center rounded-sm text-col-base/70 hover:text-col-base"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <p className="text-[14px]" aria-live="polite">
              {seleccion.size === 1 ? "1 seleccionado" : `${seleccion.size} seleccionados`}
            </p>
            <p className="hidden text-[12px] text-col-base/60 md:block">Shift + clic para elegir un rango</p>
            <div className="ml-auto flex items-center gap-2">
              {confirmar ? (
                <>
                  <span className="text-[14px]">¿Eliminar {seleccion.size === 1 ? "este medio" : `estos ${seleccion.size} medios`}? No se puede deshacer.</span>
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
        <div role="alert" className="mb-6 flex items-center gap-4 rounded-sm border border-col-alerta/30 px-4 py-3 text-[14px] text-col-alerta">
          <span className="flex-1">{error}</span>
          <Boton tam="sm" variante="secundario" onClick={() => void cargar(null)}>
            Reintentar
          </Boton>
        </div>
      )}

      {vacia && sinFiltros ? (
        <Vacia editable={editable} onSubir={() => inputArchivos.current?.click()} />
      ) : vacia ? (
        <div className="py-24 text-center">
          <p className="font-col-display text-[34px] font-light italic text-col-ink">
            {filtro === "sin-alt" && !q
              ? "Todas las fotos tienen su alt."
              : filtro === "sin-credito" && !q
                ? "Todos los medios tienen crédito."
                : "Nada por acá."}
          </p>
          <p className="mt-2 text-[14px] text-col-slate">
            {q ? "Probá con otra palabra o sacá el filtro." : "Probá con otro filtro."}
          </p>
        </div>
      ) : cargando && items.length === 0 ? (
        <GrillaSkeleton />
      ) : (
        <div className={cn("transition-opacity duration-200 ease-col", cargando && !cursor && "opacity-60")}>
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
        <p className="py-8 text-center text-[13px] uppercase tracking-[0.12em] text-col-slate">Cargando más</p>
      )}

      <AnimatePresence>
        {arrastrando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-col-ink/80 p-6 backdrop-blur-sm"
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded border border-dashed border-col-gold/80">
              <Upload className="h-8 w-8 text-col-gold" strokeWidth={1.25} aria-hidden />
              <p className="mt-6 font-col-display text-[48px] font-light italic leading-none text-col-base md:text-[64px]">
                Soltá para subir
              </p>
              <p className="mt-4 text-[14px] text-col-base/70">Fotos JPG, PNG, WebP o AVIF hasta 30 MB. Videos MP4, WebM o MOV hasta 200 MB.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ColaSubidas subidas={subidas} onReintentar={reintentar} onLimpiar={limpiar} />

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

function Vacia({ editable, onSubir }: { editable: boolean; onSubir: () => void }) {
  if (!editable) {
    return (
      <div className="py-28 text-center">
        <p className="font-col-display text-[44px] font-light italic text-col-ink">Todavía no hay medios.</p>
        <p className="mt-3 text-[15px] text-col-slate">Cuando el equipo suba fotos y videos, aparecen acá.</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onSubir}
      className="group flex min-h-[60vh] w-full flex-col items-center justify-center rounded border border-dashed border-col-slate/30 px-6 text-center transition-colors duration-500 ease-col hover:border-col-gold hover:bg-col-surface"
    >
      <Upload
        className="h-8 w-8 text-col-slate transition-colors duration-200 ease-col group-hover:text-col-gold"
        strokeWidth={1.25}
        aria-hidden
      />
      <span className="mt-8 font-col-display text-[44px] font-light leading-[1.05] text-col-ink md:text-[64px]">
        Tu biblioteca <em className="italic">empieza acá</em>
      </span>
      <span className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-col-slate">
        Arrastrá fotos y videos a cualquier parte de la pantalla, pegalos con ⌘V o hacé clic para elegirlos.
      </span>
      <span className="mt-8 inline-flex h-12 items-center rounded-sm bg-col-ink px-6 text-[13px] uppercase tracking-[0.12em] text-col-base transition-colors duration-200 ease-col group-hover:bg-col-slate">
        Elegir archivos
      </span>
    </button>
  );
}
