"use client";

// Constructor de experiencias: pasos a la izquierda, formulario al centro y
// vista previa a la derecha (redimensionable y plegable; en pantallas de menos
// de 1440 px, o plegada, se abre como cajón). Guarda solo.

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Drawer } from "vaul";
import { Popover } from "radix-ui";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CloudOff,
  Eye,
  History,
  LoaderCircle,
  RotateCw,
} from "lucide-react";
import {
  PASOS,
  armarVista,
  completitudPorPaso,
  type EspecialistaVista,
  type FotoCatalogo,
  type MedioVista,
  type PasoId,
} from "@/lib/collection/experiencia/contenido";
import type { ExperienciaDetalle } from "@/actions/collection/experiencias.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton, Eyebrow } from "../ui";
import { apiReal, ApiProvider, type ApiConstructor } from "./api";
import { ConstructorCtx, type EventoHistorial, type ValorConstructor } from "./contexto";
import {
  mapasDeDetalle,
  reducirBorrador,
  sumarDestino,
  sumarEspecialista,
  sumarFotosHotel,
  sumarMedios,
  type DestinoOpcion,
  type MapasCliente,
} from "./estado";
import { EstadoPill, ListaHistorial, haceTiempo } from "./formato";
import { useAutoguardado, type EstadoGuardado } from "./useAutoguardado";
import { VistaPrevia, type Dispositivo } from "./VistaPrevia";
import { PasoEsencial } from "./pasos/Esencial";
import { PasoPortada } from "./pasos/Portada";
import { PasoRelato } from "./pasos/Relato";
import { PasoRecorrido } from "./pasos/Recorrido";
import { PasoDias } from "./pasos/Dias";
import { PasoGaleria } from "./pasos/Galeria";
import { PasoDetalles } from "./pasos/Detalles";
import { PasoCompartir } from "./pasos/Compartir";
import { PasoPublicar } from "./pasos/Publicar";

const EASE = [0.22, 1, 0.36, 1] as const;
const CLAVE_PREVIA = "col.constructor.previa";

const AYUDA: Record<PasoId, string> = {
  esencial: "Cómo se llama, de qué se trata y quién la acompaña.",
  portada: "La imagen que abre la página y la tarjeta en el sitio.",
  relato: "La voz de la experiencia: la frase, la intro y lo que no hay que perderse.",
  recorrido: "Cada parada del viaje, con su relato y el hotel que elegimos.",
  dias: "El viaje contado día por día.",
  galeria: "Las fotos que cuentan el viaje sin palabras.",
  detalles: "Qué incluye, información práctica y precio.",
  compartir: "Cómo se ve en Google y cuando alguien la manda por WhatsApp.",
  publicar: "Revisá lo que falta y ponela en el sitio.",
};

const COMPONENTES: Record<PasoId, () => JSX.Element> = {
  esencial: PasoEsencial,
  portada: PasoPortada,
  relato: PasoRelato,
  recorrido: PasoRecorrido,
  dias: PasoDias,
  galeria: PasoGaleria,
  detalles: PasoDetalles,
  compartir: PasoCompartir,
  publicar: PasoPublicar,
};

function useMedia(q: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(q);
    setOk(m.matches);
    const h = () => setOk(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, [q]);
  return ok;
}

interface PrefsPrevia {
  ancho: number;
  colapsada: boolean;
  dispositivo: Dispositivo;
}

function leerPrefs(): PrefsPrevia {
  const def: PrefsPrevia = { ancho: 42, colapsada: false, dispositivo: "escritorio" };
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PREVIA) ?? "null") as Partial<PrefsPrevia> | null;
    return { ...def, ...(p ?? {}), ancho: Math.min(55, Math.max(35, Number(p?.ancho) || def.ancho)) };
  } catch {
    return def;
  }
}

export function Constructor({
  detalle,
  proveedores,
  api = apiReal,
  pasoInicial = "esencial",
  className,
}: {
  detalle: ExperienciaDetalle;
  proveedores: { id: string; nombre: string }[];
  api?: ApiConstructor;
  pasoInicial?: PasoId;
  className?: string;
}) {
  const { puede, usuario, raiz: raizShell } = useCollection();
  const [estado, despachar] = useReducer(reducirBorrador, { borrador: detalle.borrador, cambios: 0 });
  const [mapas, setMapas] = useState<MapasCliente>(() => mapasDeDetalle(detalle));
  const [paso, setPaso] = useState<PasoId>(pasoInicial);
  const [estadoExp, setEstadoExp] = useState(detalle.estado);
  const [publicadoRevision, setPublicadoRevision] = useState(detalle.publicadoRevision);
  const [historial, setHistorial] = useState<EventoHistorial[]>(detalle.historial);

  const puedeEditar = puede("experiencias.editar");
  const { guardado, revision, guardarYa } = useAutoguardado({
    id: detalle.id,
    api,
    estado,
    revisionInicial: detalle.revision,
    activo: puedeEditar,
  });
  const conflicto = guardado.tipo === "conflicto";
  const editable = puedeEditar && !conflicto;

  // ── Pasos ──
  const centro = useRef<HTMLDivElement>(null);
  const irAPaso = useCallback((p: PasoId) => {
    setPaso(p);
    centro.current?.scrollTo({ top: 0 });
  }, []);
  const indice = PASOS.findIndex((p) => p.id === paso);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault();
      const i = PASOS.findIndex((p) => p.id === paso);
      const sig = PASOS[Math.min(PASOS.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
      irAPaso(sig.id);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [paso, irAPaso]);

  // ── Valor del contexto ──
  const setCampos = useCallback<ValorConstructor["setCampos"]>((c) => despachar({ t: "campos", c }), []);
  const setContenido = useCallback<ValorConstructor["setContenido"]>((f) => despachar({ t: "contenido", f }), []);
  const agregarMedios = useCallback((m: MedioVista[]) => setMapas((x) => sumarMedios(x, m)), []);
  const agregarDestino = useCallback((d: DestinoOpcion) => setMapas((x) => sumarDestino(x, d)), []);
  const agregarEspecialista = useCallback((e: EspecialistaVista) => setMapas((x) => sumarEspecialista(x, e)), []);
  const agregarFotosHotel = useCallback(
    (id: string, f: FotoCatalogo[]) => setMapas((x) => sumarFotosHotel(x, id, f)),
    [],
  );
  const refrescarMedios = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const r = await api.obtenerMediosVista(ids).catch(() => null);
      if (r?.ok) agregarMedios(r.data);
    },
    [api, agregarMedios],
  );
  const sumarHistorial = useCallback(
    (accion: string) =>
      setHistorial((h) => [
        { id: `local-${Date.now()}`, accion, userNombre: usuario.nombre || null, createdAt: new Date().toISOString() },
        ...h,
      ]),
    [usuario.nombre],
  );

  const valor: ValorConstructor = {
    id: detalle.id,
    borrador: estado.borrador,
    setCampos,
    setContenido,
    mapas,
    agregarMedios,
    agregarDestino,
    agregarEspecialista,
    agregarFotosHotel,
    refrescarMedios,
    proveedores,
    editable,
    puedePublicar: puede("experiencias.publicar") && !conflicto,
    estado: estadoExp,
    setEstado: setEstadoExp,
    revision,
    publicadoRevision,
    setPublicadoRevision,
    historial,
    sumarHistorial,
    guardarYa,
    irAPaso,
    api,
  };

  // ── Vista previa ──
  const completitud = useMemo(() => completitudPorPaso(estado.borrador), [estado.borrador]);
  const borradorDiferido = useDeferredValue(estado.borrador);
  const mapasDiferidos = useDeferredValue(mapas);
  const vista = useMemo(() => armarVista(borradorDiferido, mapasDiferidos), [borradorDiferido, mapasDiferidos]);
  const actualizando = borradorDiferido !== estado.borrador;

  const ancha = useMedia("(min-width: 1440px)");
  const escritorio = useMedia("(min-width: 1024px)");
  const [prefs, setPrefs] = useState<PrefsPrevia>({ ancho: 42, colapsada: false, dispositivo: "escritorio" });
  useEffect(() => setPrefs(leerPrefs()), []);
  const cambiarPrefs = useCallback((c: Partial<PrefsPrevia>) => {
    setPrefs((p) => {
      const n = { ...p, ...c };
      try {
        localStorage.setItem(CLAVE_PREVIA, JSON.stringify(n));
      } catch {
        // Sin localStorage: queda en memoria.
      }
      return n;
    });
  }, []);
  const [cajon, setCajon] = useState(false);
  const enLinea = ancha && !prefs.colapsada;
  useEffect(() => {
    if (enLinea) setCajon(false);
  }, [enLinea]);

  const raiz = useRef<HTMLDivElement>(null);
  const arrastrarBorde = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = raiz.current?.getBoundingClientRect();
    if (!rect) return;
    const mover = (ev: PointerEvent) => {
      const pct = ((rect.right - ev.clientX) / rect.width) * 100;
      setPrefs((p) => ({ ...p, ancho: Math.min(55, Math.max(35, pct)) }));
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setPrefs((p) => {
        cambiarPrefs({ ancho: p.ancho });
        return p;
      });
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };
  const teclasBorde = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") cambiarPrefs({ ancho: Math.min(55, prefs.ancho + 2) });
    if (e.key === "ArrowRight") cambiarPrefs({ ancho: Math.max(35, prefs.ancho - 2) });
  };

  const seccion = PASOS[indice].seccion;
  const onDispositivo = useCallback((d: Dispositivo) => cambiarPrefs({ dispositivo: d }), [cambiarPrefs]);
  const colapsar = useCallback(() => cambiarPrefs({ colapsada: true }), [cambiarPrefs]);
  const cerrarCajon = useCallback(() => setCajon(false), []);

  const Paso = COMPONENTES[paso];
  const reducido = useReducedMotion();
  const titulo = estado.borrador.campos.titulo.trim();

  return (
    <ApiProvider value={api}>
      <ConstructorCtx.Provider value={valor}>
        <div ref={raiz} className={cn("flex min-h-0 bg-col-base lining-nums", className)}>
          {/* Riel de pasos */}
          <aside className="hidden w-[260px] shrink-0 flex-col border-r border-col-line bg-col-surface lg:flex">
            <div className="px-5 pb-5 pt-5">
              <Link
                href="/backend/collection/experiencias"
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-col-slate transition-colors hover:text-col-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> Experiencias
              </Link>
              <p
                className={cn(
                  "mt-4 line-clamp-3 font-col-display text-[24px] leading-[1.1] text-col-ink",
                  !titulo && "italic text-col-slate/50",
                )}
              >
                {titulo || "Sin título"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <EstadoPill estado={estadoExp} />
                {estadoExp === "PUBLICADA" && publicadoRevision !== revision && (
                  <span className="text-[11px] text-[#B07A2A]">Cambios sin publicar</span>
                )}
              </div>
            </div>
            <nav aria-label="Pasos" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <ol className="space-y-0.5">
                {PASOS.map((p, i) => (
                  <li key={p.id}>
                    <ItemPaso
                      n={i + 1}
                      titulo={p.titulo}
                      valor={completitud[p.id]}
                      activo={p.id === paso}
                      onClick={() => irAPaso(p.id)}
                    />
                  </li>
                ))}
              </ol>
              <p className="mt-4 px-3 text-[11px] leading-relaxed text-col-slate/60">
                <kbd className="font-col-text">Alt</kbd> + <kbd className="font-col-text">↑ ↓</kbd> para moverte entre pasos
              </p>
            </nav>
            <div className="flex items-center gap-2 border-t border-col-line px-4 py-3">
              <IndicadorGuardado g={guardado} editable={puedeEditar} />
              <Historial historial={historial} />
            </div>
          </aside>

          {/* Centro */}
          <div className="flex min-w-0 flex-1 flex-col">
            <SelectorPasoMovil paso={paso} completitud={completitud} onPaso={irAPaso} guardado={guardado} editable={puedeEditar} />
            <AnimatePresence>
              {conflicto && (
                <motion.div
                  role="alert"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="shrink-0 overflow-hidden bg-col-ink text-col-base"
                >
                  <div className="flex items-center gap-4 px-6 py-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-col-gold" strokeWidth={1.5} aria-hidden />
                    <p className="flex-1 text-[14px] leading-snug">
                      Alguien más guardó cambios. Recargá para ver la última versión.
                      <span className="block text-col-base/60">Lo que escribiste después de eso no se guardó.</span>
                    </p>
                    <Boton tam="sm" className="bg-col-gold text-col-ink hover:bg-col-base" onClick={() => window.location.reload()}>
                      <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} /> Recargar
                    </Boton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!puedeEditar && (
              <p className="shrink-0 border-b border-col-line bg-col-surface px-6 py-2.5 text-[13px] text-col-slate">
                Estás viendo esta experiencia en modo lectura: tu usuario no tiene permiso para editarla.
              </p>
            )}
            <div ref={centro} className="min-h-0 flex-1 overflow-y-auto">
              <motion.div
                key={paso}
                initial={reducido ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="mx-auto w-full max-w-[700px] px-5 pb-16 pt-8 md:px-10 md:pt-10"
              >
                <header className="mb-10">
                  <Eyebrow>
                    Paso {indice + 1} de {PASOS.length}
                  </Eyebrow>
                  <h2 className="mt-4 font-col-display text-[42px] font-normal leading-[1.05] text-col-ink">
                    {PASOS[indice].titulo}
                  </h2>
                  <p className="mt-2 text-[15px] text-col-slate">{AYUDA[paso]}</p>
                </header>
                <fieldset disabled={!editable && paso !== "publicar"} className="m-0 min-w-0 border-0 p-0">
                  <legend className="sr-only">{PASOS[indice].titulo}</legend>
                  <Paso />
                </fieldset>
              </motion.div>
            </div>
            <footer className="flex shrink-0 items-center gap-3 border-t border-col-line bg-col-base/95 px-5 py-3 backdrop-blur-sm md:px-10">
              <Boton
                variante="fantasma"
                tam="sm"
                disabled={indice === 0}
                onClick={() => irAPaso(PASOS[indice - 1].id)}
                className="px-2"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Anterior
              </Boton>
              <span className="flex-1" />
              {indice < PASOS.length - 1 && (
                <Boton tam="sm" onClick={() => irAPaso(PASOS[indice + 1].id)}>
                  <span className="hidden text-col-base/60 sm:inline">Siguiente:</span> {PASOS[indice + 1].titulo}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Boton>
              )}
            </footer>
          </div>

          {/* Vista previa en línea */}
          {enLinea && (
            <>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Ancho de la vista previa"
                aria-valuemin={35}
                aria-valuemax={55}
                aria-valuenow={Math.round(prefs.ancho)}
                tabIndex={0}
                onPointerDown={arrastrarBorde}
                onKeyDown={teclasBorde}
                className="group relative z-10 -mr-1 w-2 shrink-0 cursor-col-resize"
              >
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-col-line transition-colors group-hover:bg-col-gold group-focus-visible:bg-col-gold" />
              </div>
              <section aria-label="Vista previa" className="min-w-0 shrink-0" style={{ width: `${prefs.ancho}%` }}>
                <PreviaMemo
                  vista={vista}
                  seccion={seccion}
                  dispositivo={prefs.dispositivo}
                  onDispositivo={onDispositivo}
                  onColapsar={colapsar}
                  actualizando={actualizando}
                />
              </section>
            </>
          )}
        </div>

        {/* Vista previa como cajón */}
        {!enLinea && (
          <>
            <button
              type="button"
              onClick={() => setCajon(true)}
              aria-expanded={cajon}
              className={cn(
                "fixed bottom-[76px] right-5 z-40 flex h-12 items-center gap-2 rounded-sm bg-col-ink px-5 text-[12px] uppercase tracking-[0.14em] text-col-base shadow-[0_16px_40px_-16px_rgba(50,55,59,0.6)] transition-[transform,opacity] duration-300 ease-col hover:-translate-y-0.5",
                cajon && "pointer-events-none translate-y-2 opacity-0",
              )}
            >
              <Eye className="h-4 w-4 text-col-gold" strokeWidth={1.5} aria-hidden /> Vista previa
            </button>
            <Drawer.Root open={cajon} onOpenChange={setCajon} direction="right" modal={!escritorio} handleOnly container={raizShell}>
              <Drawer.Portal container={raizShell}>
                {!escritorio && <Drawer.Overlay className="fixed inset-0 z-40 bg-col-ink/40" />}
                <Drawer.Content
                  aria-describedby={undefined}
                  className="fixed bottom-0 right-0 top-0 z-50 flex w-screen flex-col bg-col-surface shadow-[-24px_0_60px_-30px_rgba(50,55,59,0.5)] !outline-none lg:w-[min(860px,60vw)]"
                >
                  <Drawer.Title className="sr-only">Vista previa</Drawer.Title>
                  <PreviaMemo
                    vista={vista}
                    seccion={seccion}
                    dispositivo={escritorio ? prefs.dispositivo : "celular"}
                    onDispositivo={onDispositivo}
                    onCerrar={cerrarCajon}
                    actualizando={actualizando}
                  />
                  {ancha && prefs.colapsada && (
                    <button
                      type="button"
                      onClick={() => cambiarPrefs({ colapsada: false })}
                      className="absolute bottom-4 left-4 flex h-9 items-center gap-2 rounded-sm bg-col-ink/85 px-3 text-[11px] uppercase tracking-[0.14em] text-col-base backdrop-blur-sm hover:bg-col-ink"
                    >
                      Fijar al costado
                    </button>
                  )}
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </>
        )}
      </ConstructorCtx.Provider>
    </ApiProvider>
  );
}

const PreviaMemo = memo(VistaPrevia);

// ── Riel ──────────────────────────────────────────────────────────────────

function Anillo({ valor, n, activo }: { valor: number; n: number; activo: boolean }) {
  const r = 12;
  const c = 2 * Math.PI * r;
  const listo = valor >= 1;
  return (
    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
      <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="14" cy="14" r={r} fill={listo ? "#F4B860" : "none"} stroke="#DCDCDC" strokeWidth="1.5" />
        {!listo && valor > 0 && (
          <circle
            cx="14"
            cy="14"
            r={r}
            fill="none"
            stroke="#F4B860"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${c * valor} ${c}`}
            className="transition-[stroke-dasharray] duration-500 ease-col"
          />
        )}
      </svg>
      {listo ? (
        <Check className="relative h-3.5 w-3.5 text-col-ink" strokeWidth={2.25} aria-hidden />
      ) : (
        <span className={cn("relative text-[12px] tabular-nums lining-nums", activo ? "text-col-ink" : "text-col-slate")}>{n}</span>
      )}
    </span>
  );
}

function ItemPaso({
  n,
  titulo,
  valor,
  activo,
  onClick,
}: {
  n: number;
  titulo: string;
  valor: number;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "step" : undefined}
      aria-label={`${titulo}, ${valor >= 1 ? "completo" : `${Math.round(valor * 100)} por ciento`}`}
      className={cn(
        "relative flex h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-[14px] transition-colors duration-200 ease-col",
        activo ? "bg-col-base text-col-ink" : "text-col-slate hover:bg-col-base/60 hover:text-col-ink",
      )}
    >
      {activo && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 bg-col-gold" />}
      <Anillo valor={valor} n={n} activo={activo} />
      <span className="truncate">{titulo}</span>
    </button>
  );
}

function IndicadorGuardado({ g, editable }: { g: EstadoGuardado; editable: boolean }) {
  const [, tic] = useState(0);
  useEffect(() => {
    if (g.tipo !== "guardado" || !g.en) return;
    const t = window.setInterval(() => tic((x) => x + 1), 5000);
    return () => window.clearInterval(t);
  }, [g]);

  let icono: React.ReactNode = <Check className="h-3.5 w-3.5 text-col-gold" strokeWidth={2} />;
  let texto = "Todo guardado";
  let clase = "text-col-slate";
  if (!editable) {
    texto = "Solo lectura";
    icono = null;
  } else if (g.tipo === "guardado" && g.en) {
    const s = Math.round((Date.now() - g.en) / 1000);
    texto = s < 5 ? "Guardado" : s < 60 ? `Guardado hace ${s} s` : `Guardado ${haceTiempo(g.en)}`;
  } else if (g.tipo === "pendiente") {
    texto = "Cambios sin guardar";
    icono = <span className="h-1.5 w-1.5 rounded-full bg-col-gold" />;
  } else if (g.tipo === "guardando") {
    texto = "Guardando…";
    icono = <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />;
  } else if (g.tipo === "sin-conexion") {
    texto = "Sin conexión, reintentando";
    icono = <CloudOff className="h-3.5 w-3.5" strokeWidth={1.75} />;
    clase = "text-col-alerta";
  } else if (g.tipo === "error") {
    texto = "No se pudo guardar";
    icono = <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />;
    clase = "text-col-alerta";
  } else if (g.tipo === "conflicto") {
    texto = "Guardado en pausa";
    icono = <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />;
    clase = "text-col-alerta";
  }
  return (
    <p
      role="status"
      aria-live="polite"
      title={g.tipo === "error" ? g.mensaje : undefined}
      className={cn("flex min-w-0 flex-1 items-center gap-2 text-[12px]", clase)}
    >
      {icono}
      <span className="truncate">{texto}</span>
    </p>
  );
}

function Historial({ historial }: { historial: EventoHistorial[] }) {
  const { raiz } = useCollection();
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Historial"
        title="Historial"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
      >
        <History className="h-4 w-4" strokeWidth={1.5} />
      </Popover.Trigger>
      <Popover.Portal container={raiz}>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 max-h-[420px] w-80 overflow-y-auto rounded-sm border border-col-line bg-col-surface p-2 shadow-[0_20px_50px_-24px_rgba(50,55,59,0.5)]"
        >
          <p className="px-3 pb-2 pt-2 text-[11px] uppercase tracking-[0.16em] text-col-slate">Historial</p>
          <ListaHistorial historial={historial} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SelectorPasoMovil({
  paso,
  completitud,
  onPaso,
  guardado,
  editable,
}: {
  paso: PasoId;
  completitud: Record<PasoId, number>;
  onPaso: (p: PasoId) => void;
  guardado: EstadoGuardado;
  editable: boolean;
}) {
  const i = PASOS.findIndex((p) => p.id === paso);
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-col-line bg-col-surface px-4 py-2.5 lg:hidden">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Paso</span>
        <select
          value={paso}
          onChange={(e) => onPaso(e.target.value as PasoId)}
          className="h-10 w-full appearance-none rounded-sm border border-col-line bg-col-base pl-3 pr-9 text-[14px] text-col-ink focus:border-col-gold focus:outline-none focus:ring-0"
        >
          {PASOS.map((p, n) => (
            <option key={p.id} value={p.id}>
              {n + 1}. {p.titulo}
              {completitud[p.id] >= 1 ? "  ✓" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} />
      </label>
      <span className="text-[12px] tabular-nums lining-nums text-col-slate">
        {i + 1}/{PASOS.length}
      </span>
      <div className="w-[150px]">
        <IndicadorGuardado g={guardado} editable={editable} />
      </div>
    </div>
  );
}
