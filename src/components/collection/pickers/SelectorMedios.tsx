"use client";

// Selector de medios de Collection: una sola vista con la biblioteca (buscar,
// filtrar, scroll infinito, elegir uno o varios con su orden) y la subida
// arriba de la grilla: una franja finita que se agranda al arrastrar archivos
// sobre el diálogo. Lo que sube aparece como tarjeta con progreso al principio
// y, al terminar, pasa a la grilla ya elegido. Devuelve MedioVista[] en el
// orden elegido.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog, VisuallyHidden } from "radix-ui";
import { AlertCircle, LoaderCircle, RotateCw, Search, X } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton, BotonIcono, Segmentado, entrada } from "../ui";
import { transiciones } from "../movimiento";
import { TarjetaSubida, ZonaSubida, aceptaDe, revisarArchivos } from "../biblioteca/ZonaSubida";
import { Grilla, GrillaSkeleton } from "../biblioteca/Grilla";
import { esReintentable, useSubidas } from "../biblioteca/useSubidas";
import { useApi } from "../constructor/api";

const POR_PAGINA = 36;

type Filtro = "todo" | "FOTO" | "VIDEO";

export function SelectorMedios({
  abierto,
  onCerrar,
  multiple = false,
  tipo,
  titulo,
  maximo,
  pestanaInicial,
  onElegir,
}: {
  abierto: boolean;
  /** "subir": abre con la zona de subida agrandada. */
  pestanaInicial?: "biblioteca" | "subir";
  onCerrar: () => void;
  multiple?: boolean;
  /** Restringe a fotos o videos. */
  tipo?: "FOTO" | "VIDEO";
  titulo?: string;
  /** Tope de elegidos en modo múltiple. */
  maximo?: number;
  onElegir: (medios: MedioVista[]) => void;
}) {
  const { raiz } = useCollection();
  return (
    <Dialog.Root open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <AnimatePresence>
        {abierto && (
          <Dialog.Portal forceMount container={raiz}>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[60] bg-col-noche/45 backdrop-blur-[3px]" {...transiciones.velo} />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // El foco va al panel y no al primer botón, así no se abre su globo.
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.target as HTMLElement | null)?.focus();
              }}
            >
              <motion.div
                className="col-anillo fixed inset-0 z-[60] m-auto flex h-[min(820px,calc(100dvh-32px))] w-[min(1080px,calc(100vw-24px))] flex-col overflow-hidden rounded-md bg-col-base shadow-col-3 focus:outline-none"
                {...transiciones.dialogo}
              >
                <Cuerpo
                  multiple={multiple}
                  tipo={tipo}
                  titulo={titulo}
                  maximo={maximo}
                  pestanaInicial={pestanaInicial}
                  onCerrar={onCerrar}
                  onElegir={onElegir}
                />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Cuerpo({
  multiple,
  tipo,
  titulo,
  maximo,
  pestanaInicial,
  onCerrar,
  onElegir,
}: {
  pestanaInicial?: "biblioteca" | "subir";
  multiple: boolean;
  tipo?: "FOTO" | "VIDEO";
  titulo?: string;
  maximo?: number;
  onCerrar: () => void;
  onElegir: (medios: MedioVista[]) => void;
}) {
  const api = useApi();
  const { puede } = useCollection();
  const puedeSubir = puede("medios.editar");
  const [filtro, setFiltro] = useState<Filtro>(tipo ?? "todo");
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ColMedioDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  // Archivos arrastrados sobre el diálogo: la franja de subida se agranda.
  const [arrastrando, setArrastrando] = useState(false);
  const [rechazados, setRechazados] = useState<string[]>([]);
  const profundidad = useRef(0);
  const pedido = useRef(0);
  const centinela = useRef<HTMLDivElement>(null);

  const cargar = useCallback(
    async (desde: string | null) => {
      const n = ++pedido.current;
      setCargando(true);
      const r = await api
        .listarMedios({
          tipo: filtro === "todo" ? undefined : filtro,
          q: q.trim() || undefined,
          cursor: desde ?? undefined,
          take: POR_PAGINA,
        })
        .catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
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
    [api, filtro, q],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setQ(texto), 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    void cargar(null);
  }, [cargar]);

  useEffect(() => {
    const el = centinela.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !cargando) void cargar(cursor);
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, cargando, cargar]);

  const alternarId = useCallback(
    (id: string) => {
      setElegidos((prev) => {
        if (!multiple) return prev[0] === id ? [] : [id];
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (maximo && prev.length >= maximo) return prev;
        return [...prev, id];
      });
    },
    [multiple, maximo],
  );

  const alternar = useCallback((indice: number) => {
    const id = items[indice]?.id;
    if (id) alternarId(id);
  }, [items, alternarId]);

  // Subidas: lo que termina se suma arriba de la grilla y queda elegido.
  const alListo = useCallback(
    (m: ColMedioDto) => {
      setItems((prev) => (prev.some((p) => p.id === m.id) ? prev : [m, ...prev]));
      setElegidos((prev) => (prev.includes(m.id) ? prev : multiple ? [...prev, m.id] : [m.id]));
    },
    [multiple],
  );
  const opcionesSubida = useMemo(
    () => ({ preparar: api.prepararSubidaMedio, registrar: api.registrarMedio, put: api.subirArchivo }),
    [api],
  );
  const { subidas, agregar, reintentar, reintentarTodo } = useSubidas(alListo, opcionesSubida);

  const acepta = aceptaDe(tipo);
  const agregarArchivos = useCallback((files: File[]) => agregar(multiple ? files : files.slice(0, 1)), [agregar, multiple]);
  // Soltar en cualquier parte de la grilla (la franja ya maneja lo suyo y marca el evento).
  const conArchivos = (e: React.DragEvent) => puedeSubir && Array.from(e.dataTransfer.types).includes("Files");
  const arrastre = {
    onDragEnter: (e: React.DragEvent) => {
      if (!conArchivos(e)) return;
      profundidad.current++;
      setArrastrando(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!conArchivos(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!conArchivos(e)) return;
      profundidad.current = Math.max(0, profundidad.current - 1);
      if (!profundidad.current) setArrastrando(false);
    },
    onDrop: (e: React.DragEvent) => {
      profundidad.current = 0;
      setArrastrando(false);
      if (e.defaultPrevented || !conArchivos(e)) return;
      e.preventDefault();
      const { validos, motivos } = revisarArchivos(Array.from(e.dataTransfer.files), acepta);
      setRechazados(motivos);
      if (validos.length) agregarArchivos(validos);
    },
  };

  const confirmar = async (ids = elegidos) => {
    if (!ids.length) return;
    setConfirmando(true);
    const r = await api
      .obtenerMediosVista(ids)
      .catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
    setConfirmando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const porId = new Map(r.data.map((m) => [m.id, m]));
    onElegir(ids.map((id) => porId.get(id)).filter((x): x is MedioVista => !!x));
    onCerrar();
  };

  const orden = useMemo(() => new Map(elegidos.map((id, i) => [id, i + 1])), [elegidos]);
  const seleccion = useMemo(() => new Set(elegidos), [elegidos]);
  // Lo que terminó ya está en la grilla: acá quedan las que suben y las que fallaron.
  const fantasmas = subidas.filter((s) => s.estado !== "listo");
  const reintentables = subidas.filter(esReintentable).length;
  const vacia = items.length === 0 && !cargando && !q && filtro === (tipo ?? "todo") && fantasmas.length === 0;
  const primerElegido = items.find((m) => m.id === elegidos[0]);

  const tituloDialogo = titulo ?? (multiple ? "Elegí fotos" : tipo === "VIDEO" ? "Elegí un video" : "Elegí una foto");

  const que = tipo === "VIDEO" ? "un video" : tipo === "FOTO" ? "una foto" : "una foto o un video";
  const pie = vacia ? (
    "La biblioteca está vacía: subí el primer archivo."
  ) : elegidos.length === 0 ? (
      multiple ? (
        "Elegí las fotos en el orden en que van a aparecer."
      ) : (
        <>
          Elegí {que}. <span className="hidden sm:inline">Con doble clic la elegís y cerrás.</span>
        </>
      )
    ) : multiple ? (
      <>
        <span className="text-col-ink">
          {elegidos.length} elegid{elegidos.length === 1 ? "a" : "as"}
        </span>
        {maximo ? ` de ${maximo} posibles` : ""}
      </>
    ) : (
      <>
        <span className="text-col-ink">1 elegida</span>
        {primerElegido && <span className="truncate">: {primerElegido.nombre}</span>}
      </>
    );

  return (
    <>
      <header className="shrink-0 border-b border-col-line bg-col-surface">
        <div className={cn("flex items-center gap-4 px-5 pt-3.5 sm:px-6", vacia && "pb-3.5")}>
          <div className="min-w-0 flex-1">
            <Dialog.Title className="truncate font-col-display text-col-2xl font-normal leading-tight text-col-ink">{tituloDialogo}</Dialog.Title>
            <VisuallyHidden.Root>
              <Dialog.Description>Biblioteca de medios de Collection. Podés elegir lo que ya está o subir archivos nuevos.</Dialog.Description>
            </VisuallyHidden.Root>
          </div>
          <Dialog.Close asChild>
            <BotonIcono etiqueta="Cerrar" lado="left" className="-mr-1">
              <X strokeWidth={1.5} />
            </BotonIcono>
          </Dialog.Close>
        </div>
        {/* Sin nada en la biblioteca, filtrar y buscar no tiene sentido. */}
        <div className={cn("flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6", vacia && "hidden")}>
          {!tipo && (
            <Segmentado
              etiqueta="Tipo"
              valor={filtro}
              onCambio={setFiltro}
              opciones={[
                { id: "todo", label: "Todo" },
                { id: "FOTO", label: "Fotos" },
                { id: "VIDEO", label: "Videos" },
              ]}
            />
          )}
          <label className="relative ml-auto min-w-[200px] flex-1 sm:max-w-[320px]">
            <span className="sr-only">Buscar en la biblioteca</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} aria-hidden />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por nombre, descripción o etiqueta"
              className={cn(entrada, "min-h-10 py-[7px] pl-10")}
            />
          </label>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto" {...arrastre}>
        <div className={cn("flex flex-col gap-5 px-5 pt-5 sm:px-6", vacia && puedeSubir ? "flex-1 pb-5" : "pb-10")}>
          {puedeSubir && (
            <ZonaSubida
              acepta={acepta}
              multiple={multiple}
              pegar
              compacta={!vacia && pestanaInicial !== "subir"}
              abierta={arrastrando}
              onArchivos={agregarArchivos}
              className={cn(vacia && "flex-1")}
            />
          )}
          {rechazados.length > 0 && (
            <ul role="alert" className="flex flex-col gap-1 rounded-col bg-col-alerta/[0.07] px-4 py-3 text-col-sm text-col-alerta">
              {rechazados.slice(0, 4).map((m) => (
                <li key={m} className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {m}
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="flex items-center gap-2 text-col-md text-col-alerta">
              <AlertCircle className="h-4 w-4" strokeWidth={1.5} /> {error}
            </p>
          )}

          {fantasmas.length > 0 && (
            <section aria-label="Subidas en curso" className="flex flex-col gap-3">
              {reintentables > 1 && (
                <div className="flex items-center gap-3 text-col-sm text-col-alerta">
                  <span className="flex-1">{reintentables} archivos no se pudieron subir.</span>
                  <Boton variante="secundario" tam="sm" onClick={reintentarTodo}>
                    <RotateCw strokeWidth={1.5} /> Reintentar todo
                  </Boton>
                </div>
              )}
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                <AnimatePresence initial={false}>
                  {fantasmas.map((s) => (
                    <TarjetaSubida key={s.id} s={s} onReintentar={reintentar} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}

          {items.length === 0 && cargando ? (
            <GrillaSkeleton />
          ) : items.length === 0 ? (
            !puedeSubir || q ? (
              <p className="py-16 text-center font-col-display text-col-2xl text-col-ink">
                {q ? "Nada coincide con esa búsqueda" : "La biblioteca está vacía"}
              </p>
            ) : null
          ) : (
            <Grilla
              items={items}
              seleccion={seleccion}
              modoSeleccion
              puedeSeleccionar={multiple}
              onAbrir={alternar}
              onAlternar={alternar}
              orden={multiple ? orden : undefined}
              onDobleClic={multiple ? undefined : (i) => items[i] && void confirmar([items[i].id])}
            />
          )}
          {!vacia && <div ref={centinela} className="h-px" />}
          {cargando && items.length > 0 && (
            <p className="flex items-center justify-center gap-2 text-col-sm text-col-slate">
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Cargando más
            </p>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-3 border-t border-col-line bg-col-surface px-5 py-3 sm:px-6">
        <p className="flex min-w-0 flex-1 text-col-md text-col-slate" aria-live="polite">
          <span className="min-w-0 truncate">{pie}</span>
        </p>
        {elegidos.length > 0 && (
          <Boton variante="fantasma" tam="sm" onClick={() => setElegidos([])}>
            Limpiar
          </Boton>
        )}
        <Boton
          onClick={() => void confirmar()}
          disabled={!elegidos.length}
          cargando={confirmando}
          motivo={multiple ? "Elegí al menos una" : `Elegí ${que} primero`}
        >
          {multiple ? "Agregar" : "Elegir"}
        </Boton>
      </footer>
    </>
  );
}
