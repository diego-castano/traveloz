"use client";

// Selector de medios de Collection: diálogo grande con la biblioteca (buscar,
// filtrar, scroll infinito, elegir uno o varios con su orden) y una pestaña
// para subir. Lo nuevo que se sube queda elegido. Devuelve MedioVista[] en el
// orden elegido. Lo usan el constructor y, más adelante, Destinos y
// Especialistas.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog, VisuallyHidden } from "radix-ui";
import { AlertCircle, ImagePlus, LoaderCircle, Search, Upload, X } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton, BotonIcono, Segmentado, entrada } from "../ui";
import { transiciones } from "../movimiento";
import { TarjetaSubida, ZonaSubida, aceptaDe } from "../biblioteca/ZonaSubida";
import { Grilla, GrillaSkeleton } from "../biblioteca/Grilla";
import { useSubidas } from "../biblioteca/useSubidas";
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

  const acepta = aceptaDe(tipo);

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
  const enCurso = subidas.filter((s) => s.estado !== "listo" && s.estado !== "error").length;

  const tituloDialogo = titulo ?? (multiple ? "Elegí fotos" : tipo === "VIDEO" ? "Elegí un video" : "Elegí una foto");

  return (
    <>
      <header className="shrink-0 border-b border-col-line bg-col-surface">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1 basis-40">
            <Dialog.Title className="truncate font-col-display text-col-2xl font-normal leading-tight text-col-ink">{tituloDialogo}</Dialog.Title>
            <VisuallyHidden.Root>
              <Dialog.Description>Biblioteca de medios de Collection</Dialog.Description>
            </VisuallyHidden.Root>
          </div>
          <Segmentado
            className="order-3 sm:order-2"
            etiqueta="Origen"
            valor={pestana}
            onCambio={setPestana}
            opciones={[
              { id: "biblioteca", label: "Biblioteca" },
              {
                id: "subir",
                deshabilitada: !puedeSubir,
                label: (
                  <>
                    Subir
                    {enCurso > 0 && <span className="rounded-full bg-col-gold px-1.5 text-col-xs leading-4 text-col-noche">{enCurso}</span>}
                  </>
                ),
              },
            ]}
          />
          <Dialog.Close asChild>
            <BotonIcono etiqueta="Cerrar" lado="left" className="order-2 -mr-1 sm:order-3">
              <X strokeWidth={1.5} />
            </BotonIcono>
          </Dialog.Close>
        </div>
        {pestana === "biblioteca" && (
          <div className="flex flex-wrap items-center gap-3 px-5 pb-3.5 sm:px-6">
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
            <label className="relative ml-auto w-full sm:max-w-[320px]">
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
        )}
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {pestana === "biblioteca" ? (
          <div className="px-5 pb-10 pt-5 sm:px-6">
            {error && (
              <p role="alert" className="mb-4 flex items-center gap-2 text-col-md text-col-alerta">
                <AlertCircle className="h-4 w-4" strokeWidth={1.5} /> {error}
              </p>
            )}

            {items.length === 0 && cargando ? (
              <GrillaSkeleton />
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <ImagePlus className="h-8 w-8 text-col-gold" strokeWidth={1.25} aria-hidden />
                <p className="mt-4 font-col-display text-col-2xl text-col-ink">
                  {q ? "Nada coincide con esa búsqueda" : "La biblioteca está vacía"}
                </p>
                {puedeSubir && !q && (
                  <Boton className="mt-6" onClick={() => setPestana("subir")}>
                    <Upload strokeWidth={1.5} /> Subir archivos
                  </Boton>
                )}
              </div>
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
            <div ref={centinela} className="h-px" />
            {cargando && items.length > 0 && (
              <p className="mt-6 flex items-center justify-center gap-2 text-col-sm text-col-slate">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Cargando más
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <ZonaSubida acepta={acepta} multiple={multiple} pegar onArchivos={agregar} />
            {subidas.length > 0 && (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4" aria-label="Subidas">
                <AnimatePresence initial={false}>
                  {subidas.map((s) => (
                    <TarjetaSubida key={s.id} s={s} onReintentar={reintentar} listo="Lista y elegida" />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        )}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-col-line bg-col-surface px-5 py-3 sm:px-6">
        <p className="min-w-0 flex-1 text-col-md text-col-slate" aria-live="polite">
          {elegidos.length === 0 ? (
            multiple ? (
              "Tocá las fotos en el orden en que querés que aparezcan."
            ) : (
              "Tocá una para elegirla, o doble clic para elegir y cerrar."
            )
          ) : (
            <>
              <span className="text-col-ink">
                {elegidos.length} elegid{elegidos.length === 1 ? "a" : "as"}
              </span>
              {multiple && maximo ? ` de ${maximo} posibles` : ""}
            </>
          )}
        </p>
        {elegidos.length > 0 && (
          <Boton variante="fantasma" tam="sm" onClick={() => setElegidos([])}>
            Limpiar
          </Boton>
        )}
        <Boton onClick={() => void confirmar()} disabled={!elegidos.length} cargando={confirmando}>
          {multiple ? "Agregar" : "Elegir"}
        </Boton>
      </footer>
    </>
  );
}
