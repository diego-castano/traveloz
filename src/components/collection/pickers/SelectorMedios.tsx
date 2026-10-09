"use client";

// Selector de medios de Collection: diálogo grande con la biblioteca (buscar,
// filtrar, scroll infinito, elegir uno o varios con su orden) y una pestaña
// para subir. Lo nuevo que se sube queda elegido. Devuelve MedioVista[] en el
// orden elegido. Lo usan el constructor y, más adelante, Destinos y
// Especialistas.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog, VisuallyHidden } from "radix-ui";
import { AlertCircle, ImagePlus, LoaderCircle, RotateCcw, Search, Upload, X } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton } from "../ui";
import { Grilla, GrillaSkeleton } from "../biblioteca/Grilla";
import { useSubidas } from "../biblioteca/useSubidas";
import { useApi } from "../constructor/api";

const EASE = [0.22, 1, 0.36, 1] as const;
const POR_PAGINA = 36;
const ACEPTA_FOTO = "image/jpeg,image/png,image/webp,image/avif";
const ACEPTA_VIDEO = "video/mp4,video/webm,video/quicktime";

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
  /** Abre directo en "Subir". */
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
              <motion.div
                className="fixed inset-0 z-[60] bg-col-ink/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-0 z-[60] m-auto flex h-[min(860px,calc(100dvh-48px))] w-[min(1180px,calc(100vw-32px))] flex-col overflow-hidden rounded bg-col-base shadow-[0_40px_120px_-40px_rgba(50,55,59,0.6)] focus:outline-none"
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                transition={{ duration: 0.4, ease: EASE }}
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
  const [pestana, setPestana] = useState<"biblioteca" | "subir">(
    pestanaInicial === "subir" && puedeSubir ? "subir" : "biblioteca",
  );
  const [filtro, setFiltro] = useState<Filtro>(tipo ?? "todo");
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ColMedioDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);
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
    if (!el || !cursor || pestana !== "biblioteca") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !cargando) void cargar(cursor);
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, cargando, cargar, pestana]);

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
  const { subidas, agregar, reintentar } = useSubidas(alListo, opcionesSubida);

  const acepta = tipo === "FOTO" ? ACEPTA_FOTO : tipo === "VIDEO" ? ACEPTA_VIDEO : `${ACEPTA_FOTO},${ACEPTA_VIDEO}`;
  const subir = (files: File[]) => {
    const validos = files.filter((f) => acepta.split(",").includes(f.type));
    if (validos.length) agregar(multiple ? validos : validos.slice(0, 1));
  };

  const confirmar = async () => {
    if (!elegidos.length) return;
    setConfirmando(true);
    const r = await api
      .obtenerMediosVista(elegidos)
      .catch(() => ({ ok: false as const, error: "Sin conexión. Probá de nuevo." }));
    setConfirmando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const porId = new Map(r.data.map((m) => [m.id, m]));
    onElegir(elegidos.map((id) => porId.get(id)).filter((x): x is MedioVista => !!x));
    onCerrar();
  };

  const orden = useMemo(() => new Map(elegidos.map((id, i) => [id, i + 1])), [elegidos]);
  const seleccion = useMemo(() => new Set(elegidos), [elegidos]);
  const enCurso = subidas.filter((s) => s.estado !== "listo" && s.estado !== "error").length;

  return (
    <>
      <header className="flex items-center gap-6 border-b border-col-line bg-col-surface px-6 py-4">
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-col-display text-[28px] font-normal leading-none text-col-ink">
            {titulo ?? (multiple ? "Elegí fotos" : tipo === "VIDEO" ? "Elegí un video" : "Elegí una foto")}
          </Dialog.Title>
          <VisuallyHidden.Root>
            <Dialog.Description>Biblioteca de medios de Collection</Dialog.Description>
          </VisuallyHidden.Root>
        </div>
        <div role="tablist" aria-label="Origen" className="flex gap-1 rounded-sm bg-col-base p-1">
          {(["biblioteca", "subir"] as const).map((p) => (
            <button
              key={p}
              role="tab"
              type="button"
              aria-selected={pestana === p}
              disabled={p === "subir" && !puedeSubir}
              onClick={() => setPestana(p)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-sm px-4 text-[12px] uppercase tracking-[0.12em] transition-colors duration-200 ease-col disabled:opacity-40",
                pestana === p ? "bg-col-surface text-col-ink shadow-[0_1px_2px_rgba(50,55,59,0.12)]" : "text-col-slate hover:text-col-ink",
              )}
            >
              {p === "biblioteca" ? "Biblioteca" : "Subir"}
              {p === "subir" && enCurso > 0 && (
                <span className="rounded-sm bg-col-gold px-1.5 text-[10px] text-col-ink">{enCurso}</span>
              )}
            </button>
          ))}
        </div>
        <Dialog.Close
          aria-label="Cerrar"
          className="flex h-10 w-10 items-center justify-center rounded-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </Dialog.Close>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {pestana === "biblioteca" ? (
          <div className="px-6 pb-10 pt-5">
            <div className="mb-5 flex flex-wrap items-center gap-4">
              {!tipo && (
                <div role="group" aria-label="Tipo" className="flex gap-2">
                  {(
                    [
                      ["todo", "Todo"],
                      ["FOTO", "Fotos"],
                      ["VIDEO", "Videos"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={filtro === id}
                      onClick={() => setFiltro(id)}
                      className={cn(
                        "h-9 rounded-sm border px-4 text-[12px] uppercase tracking-[0.12em] transition-colors duration-200 ease-col",
                        filtro === id
                          ? "border-col-ink bg-col-ink text-col-base"
                          : "border-col-line text-col-slate hover:border-col-slate/50 hover:text-col-ink",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <label className="relative ml-auto w-full max-w-xs">
                <span className="sr-only">Buscar en la biblioteca</span>
                <Search
                  className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <input
                  type="search"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Buscar por nombre, alt o etiqueta"
                  className="h-10 w-full border-0 border-b border-col-slate/40 bg-transparent pl-7 pr-2 text-[15px] text-col-ink placeholder:text-col-slate/60 focus:border-col-gold focus:outline-none focus:ring-0"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mb-4 flex items-center gap-2 text-[14px] text-col-alerta">
                <AlertCircle className="h-4 w-4" strokeWidth={1.5} /> {error}
              </p>
            )}

            {items.length === 0 && cargando ? (
              <GrillaSkeleton />
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <ImagePlus className="h-8 w-8 text-col-gold" strokeWidth={1.25} aria-hidden />
                <p className="mt-4 font-col-display text-[26px] text-col-ink">
                  {q ? "Nada coincide con esa búsqueda" : "La biblioteca está vacía"}
                </p>
                {puedeSubir && !q && (
                  <Boton className="mt-6" onClick={() => setPestana("subir")}>
                    <Upload className="h-4 w-4" strokeWidth={1.5} /> Subir archivos
                  </Boton>
                )}
              </div>
            ) : (
              <Grilla
                items={items}
                seleccion={seleccion}
                modoSeleccion
                puedeSeleccionar
                onAbrir={alternar}
                onAlternar={alternar}
                orden={multiple ? orden : undefined}
              />
            )}
            <div ref={centinela} className="h-px" />
            {cargando && items.length > 0 && (
              <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-col-slate">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Cargando más
              </p>
            )}
          </div>
        ) : (
          <ZonaSubida
            acepta={acepta}
            multiple={multiple}
            subidas={subidas}
            onArchivos={subir}
            onReintentar={reintentar}
          />
        )}
      </div>

      <footer className="flex items-center gap-4 border-t border-col-line bg-col-surface px-6 py-4">
        <p className="flex-1 text-[14px] text-col-slate" aria-live="polite">
          {elegidos.length === 0
            ? multiple
              ? "Tocá las fotos en el orden en que querés que aparezcan."
              : "Tocá una para elegirla."
            : multiple
              ? `${elegidos.length} elegid${elegidos.length === 1 ? "a" : "as"}${maximo ? ` de ${maximo} posibles` : ""}`
              : "1 elegida"}
        </p>
        {elegidos.length > 0 && (
          <Boton variante="fantasma" tam="sm" onClick={() => setElegidos([])}>
            Limpiar
          </Boton>
        )}
        <Boton onClick={confirmar} disabled={!elegidos.length || confirmando}>
          {confirmando && <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
          {multiple ? "Agregar" : "Elegir"}
        </Boton>
      </footer>
    </>
  );
}

function ZonaSubida({
  acepta,
  multiple,
  subidas,
  onArchivos,
  onReintentar,
}: {
  acepta: string;
  multiple: boolean;
  subidas: ReturnType<typeof useSubidas>["subidas"];
  onArchivos: (files: File[]) => void;
  onReintentar: (id: string) => void;
}) {
  const [encima, setEncima] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          onArchivos(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex min-h-[260px] flex-1 flex-col items-center justify-center gap-4 rounded border border-dashed transition-colors duration-200 ease-col",
          encima ? "border-col-gold bg-col-gold/10" : "border-col-slate/30 bg-col-surface hover:border-col-slate/60",
        )}
      >
        <Upload className="h-8 w-8 text-col-gold" strokeWidth={1.25} aria-hidden />
        <span className="font-col-display text-[28px] leading-none text-col-ink">
          Soltá {multiple ? "los archivos" : "el archivo"} acá
        </span>
        <span className="text-[14px] text-col-slate">
          o tocá para elegir desde tu computadora. Fotos hasta 30 MB, videos hasta 200 MB.
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple={multiple}
        accept={acepta}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onArchivos(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {subidas.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4" aria-label="Subidas">
          {subidas.map((s) => (
            <li key={s.id} className="overflow-hidden rounded-sm bg-col-surface">
              <div className="relative aspect-[4/3] bg-col-line">
                {s.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {s.estado !== "listo" && s.estado !== "error" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-col-ink/20">
                    <span
                      className="block h-full bg-col-gold transition-[width] duration-300 ease-col"
                      style={{ width: `${s.estado === "procesando" ? 100 : s.progreso}%` }}
                    />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-[12px]">
                <span className="min-w-0 flex-1 truncate text-col-ink">{s.file.name}</span>
                {s.estado === "error" ? (
                  <button
                    type="button"
                    onClick={() => onReintentar(s.id)}
                    aria-label={`Reintentar ${s.file.name}`}
                    title={s.error}
                    className="text-col-alerta"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                ) : (
                  <span className="text-col-slate">
                    {s.estado === "listo" ? "Elegida" : s.estado === "procesando" ? "Procesando" : `${s.progreso}%`}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
