"use client";

// Constructor de experiencias: pasos a la izquierda (riel de 200 px o de
// íconos, se recuerda), formulario al centro y vista previa a la derecha
// desde 1280 px (redimensionable, sin bajar el formulario de 560 px). Con
// menos lugar, la vista previa se abre como cajón desde la barra inferior.
// Guarda solo.

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Popover, Tooltip } from "radix-ui";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CloudOff,
  History,
  LoaderCircle,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCw,
} from "lucide-react";
import {
  PASOS,
  armarVista,
  completitudPorPaso,
  requisitos,
  type EspecialistaVista,
  type FotoCatalogo,
  type MedioVista,
  type PasoId,
} from "@/lib/collection/experiencia/contenido";
import type { ExperienciaDetalle } from "@/actions/collection/experiencias.actions";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton, Estado, Eyebrow, VerEnSitio, entradaSelect } from "../ui";
import { CheckAnimado, CheckExito, DUR, EASE, TextoCambiante, pasoConDireccion, useCambioTexto, useDireccion, useLogro } from "../movimiento";
import { rutaSitio } from "../sitio/tarjetas";
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
import { VistaPrevia } from "./VistaPrevia";
import { BotonPrevia, PanelPrevia, usePrevia } from "./marco";
import { PasoEsencial } from "./pasos/Esencial";
import { PasoPortada } from "./pasos/Portada";
import { PasoRelato } from "./pasos/Relato";
import { PasoRecorrido } from "./pasos/Recorrido";
import { PasoDias } from "./pasos/Dias";
import { PasoGaleria } from "./pasos/Galeria";
import { PasoDetalles } from "./pasos/Detalles";
import { PasoCompartir } from "./pasos/Compartir";
import { PasoPublicar } from "./pasos/Publicar";

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

const CLAVE_PASOS = "col.constructor.pasos";
const RIEL = { amplio: 200, compacto: 64 } as const;
// Lo mínimo que se le deja a la columna del formulario: 560 px de campos más el aire de los costados.
const MIN_FORMULARIO = 640;

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
  const { guardado, revision, revisionActual, guardarYa } = useAutoguardado({
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
  const tituloPaso = useRef<HTMLHeadingElement>(null);
  const [visitados, setVisitados] = useState<Set<PasoId>>(() => new Set([pasoInicial]));
  const irAPaso = useCallback((p: PasoId, enfocar = false) => {
    setPaso(p);
    setVisitados((v) => (v.has(p) ? v : new Set(v).add(p)));
    centro.current?.scrollTo({ top: 0 });
    // Desde la barra inferior, el foco va al título del paso nuevo (lectores de pantalla y teclado).
    if (enfocar) requestAnimationFrame(() => tituloPaso.current?.focus({ preventScroll: true }));
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

  // Riel amplio o de íconos. Sin preferencia guardada: de íconos por debajo de 1440 px.
  const [compacto, setCompacto] = useState(false);
  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE_PASOS);
      setCompacto(g ? g === "1" : window.innerWidth < 1440);
    } catch {
      setCompacto(window.innerWidth < 1440);
    }
  }, []);
  const alternarRiel = () =>
    setCompacto((c) => {
      try {
        localStorage.setItem(CLAVE_PASOS, c ? "0" : "1");
      } catch {
        // Queda en memoria.
      }
      return !c;
    });
  const anchoRiel = compacto ? RIEL.compacto : RIEL.amplio;

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
    revisionActual,
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

  const previa = usePrevia(CLAVE_PREVIA, 1280);
  const { prefs, cambiar: cambiarPrefs, setCajon } = previa;
  const seccion = PASOS[indice].seccion;
  const cerrarCajon = useCallback(() => setCajon(false), [setCajon]);

  // Qué falta en cada paso, para el globo del riel.
  const faltan = useMemo(() => {
    const req = requisitos(estado.borrador);
    return Object.fromEntries(
      PASOS.map((p) => [
        p.id,
        req.filter((r) => !r.ok && (p.id === "publicar" ? r.obligatorio : r.paso === p.id)).map((r) => r.texto),
      ]),
    ) as Record<PasoId, string[]>;
  }, [estado.borrador]);

  const Paso = COMPONENTES[paso];
  const reducido = useReducedMotion();
  const direccion = useDireccion(indice);
  const dirPaso = reducido ? 0 : direccion;

  // Al publicar, la píldora pasa a "Publicada" y aparece el tilde de logro un rato.
  const recienPublicada = useLogro(estadoExp === "PUBLICADA");
  const titulo = estado.borrador.campos.titulo.trim();

  return (
    <ApiProvider value={api}>
      <ConstructorCtx.Provider value={valor}>
        <div className={cn("flex min-h-0 bg-col-base lining-nums", className)}>
          {/* Riel de pasos: amplio (200 px) o de íconos (64 px) */}
          <aside
            className="hidden shrink-0 flex-col border-r border-col-line bg-col-surface transition-[width] duration-col-lento ease-col lg:flex"
            style={{ width: anchoRiel }}
          >
            {compacto ? (
              <div className="flex justify-center pb-3 pt-4">
                <Globo texto="Volver a experiencias" lado="right">
                  <Link
                    href="/backend/collection/experiencias"
                    aria-label="Volver a experiencias"
                    className="flex h-10 w-10 items-center justify-center rounded-col-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
                  >
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  </Link>
                </Globo>
              </div>
            ) : (
              <div className="px-4 pb-4 pt-5">
                <Link
                  href="/backend/collection/experiencias"
                  className="inline-flex items-center gap-1.5 text-col-sm font-medium text-col-slate transition-colors hover:text-col-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> Experiencias
                </Link>
                <p
                  className={cn(
                    "mt-4 line-clamp-3 break-words font-col-display text-col-xl leading-[1.1] text-col-ink",
                    !titulo && "italic text-col-subtle",
                  )}
                >
                  {titulo || "Sin título"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <EstadoPill estado={estadoExp} animado />
                  <AnimatePresence>
                    {recienPublicada && (
                      <motion.span key="ok" className="flex text-col-ok" exit={{ opacity: 0, transition: { duration: DUR.quick } }}>
                        <CheckExito />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {estadoExp === "PUBLICADA" && publicadoRevision !== revision && (
                    <Estado tono="aviso">Cambios sin publicar</Estado>
                  )}
                </div>
                {estadoExp === "PUBLICADA" && estado.borrador.campos.slug && (
                  <VerEnSitio ruta={rutaSitio.experiencia(estado.borrador.campos.slug)} className="mt-3 text-col-slate hover:text-col-ink" />
                )}
              </div>
            )}
            <nav aria-label="Pasos" className={cn("min-h-0 flex-1 overflow-y-auto pb-4", compacto ? "px-2" : "px-2.5")}>
              <ol className="space-y-0.5">
                {PASOS.map((p, i) => (
                  <li key={p.id}>
                    <ItemPaso
                      n={i + 1}
                      titulo={p.titulo}
                      valor={completitud[p.id]}
                      visitado={visitados.has(p.id)}
                      faltan={faltan[p.id]}
                      activo={p.id === paso}
                      compacto={compacto}
                      onClick={() => irAPaso(p.id)}
                    />
                  </li>
                ))}
              </ol>
              {!compacto && (
                <p className="mt-4 px-2.5 text-col-xs leading-relaxed text-col-muted">
                  <kbd className="font-col-text">Alt</kbd> + <kbd className="font-col-text">↑ ↓</kbd> para moverte entre pasos
                </p>
              )}
            </nav>
            <div className={cn("flex items-center gap-1 border-t border-col-line py-2", compacto ? "flex-col px-2" : "px-3")}>
              <Historial historial={historial} />
              {!compacto && <span className="flex-1" />}
              <Globo texto={compacto ? "Mostrar los nombres de los pasos" : "Achicar el riel de pasos"} lado="right">
                <button
                  type="button"
                  onClick={alternarRiel}
                  aria-label={compacto ? "Mostrar los nombres de los pasos" : "Achicar el riel de pasos"}
                  aria-expanded={!compacto}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-col-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
                >
                  {compacto ? <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </Globo>
            </div>
          </aside>

          {/* Centro */}
          <div className="flex min-w-0 flex-1 flex-col">
            <SelectorPasoMovil paso={paso} completitud={completitud} onPaso={irAPaso} guardado={guardado} editable={puedeEditar} />
            <AnimatePresence>
              {conflicto && (
                // Aviso: entra en 250, se va en 150.
                <motion.div
                  role="alert"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, transition: { duration: DUR.fast, ease: EASE } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: DUR.quick, ease: EASE } }}
                  className="shrink-0 overflow-hidden bg-col-ink text-col-base"
                >
                  <div className="flex items-center gap-4 px-6 py-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-col-gold" strokeWidth={1.5} aria-hidden />
                    <p className="flex-1 text-col-md leading-snug">
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
            {!puedeEditar && <FranjaLectura>Modo lectura: podés ver esta experiencia, pero tu usuario no tiene permiso para editarla.</FranjaLectura>}
            <div ref={centro} className="relative min-h-0 flex-1 overflow-y-auto">
              {/* Adelante entra por la derecha, atrás por la izquierda. */}
              <AnimatePresence mode="popLayout" initial={false} custom={dirPaso}>
              <motion.div
                key={paso}
                custom={dirPaso}
                variants={pasoConDireccion}
                initial="entra"
                animate="queda"
                exit="sale"
                className="mx-auto w-full max-w-[700px] px-5 pb-16 pt-8 md:px-10 md:pt-10"
              >
                <header className="mb-10">
                  <Eyebrow>
                    Paso {indice + 1} de {PASOS.length}
                  </Eyebrow>
                  <h2
                    ref={tituloPaso}
                    tabIndex={-1}
                    className="mt-4 font-col-display text-col-3xl font-normal leading-[1.05] text-col-ink focus:outline-none md:text-col-display"
                  >
                    {PASOS[indice].titulo}
                  </h2>
                  <p className="mt-2 text-col-cuerpo text-col-slate">{AYUDA[paso]}</p>
                </header>
                <fieldset
                  disabled={!editable && paso !== "publicar"}
                  className={cn("m-0 min-w-0 border-0 p-0", !editable && "[&_:disabled]:pointer-events-none")}
                >
                  <legend className="sr-only">{PASOS[indice].titulo}</legend>
                  <Paso />
                </fieldset>
              </motion.div>
              </AnimatePresence>
            </div>
            <footer className="flex shrink-0 items-center gap-2 border-t border-col-line bg-col-base/95 px-4 py-3 backdrop-blur-sm sm:gap-3 md:px-10">
              <Boton
                variante="fantasma"
                tam="sm"
                disabled={indice === 0}
                onClick={() => irAPaso(PASOS[indice - 1].id, true)}
                aria-label="Paso anterior"
                className="px-2"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> <span className="hidden sm:inline">Anterior</span>
              </Boton>
              <div className="hidden min-w-0 max-w-[220px] flex-1 lg:block">
                <IndicadorGuardado g={guardado} editable={puedeEditar} />
              </div>
              <span className="flex-1" />
              <BotonPrevia previa={previa} />
              {indice < PASOS.length - 1 && (
                <Boton tam="sm" onClick={() => irAPaso(PASOS[indice + 1].id, true)} className="min-w-0">
                  <span className="hidden text-col-base/60 sm:inline">Siguiente:</span>
                  <span className="truncate">{PASOS[indice + 1].titulo}</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Boton>
              )}
            </footer>
          </div>

          <PanelPrevia
            previa={previa}
            reserva={anchoRiel + 8 + MIN_FORMULARIO}
            render={(c) => <PreviaMemo vista={vista} seccion={seccion} actualizando={actualizando} {...c} onCerrar={c.onCerrar ? cerrarCajon : undefined} />}
          />
        </div>
      </ConstructorCtx.Provider>
    </ApiProvider>
  );
}

const PreviaMemo = memo(VistaPrevia);

/** Franja de solo lectura: candado y fondo gris, para que no parezca un aviso más. */
export function FranjaLectura({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex shrink-0 items-center gap-2.5 border-b border-col-line bg-col-line/40 px-5 py-2.5 text-col-sm text-col-ink md:px-6">
      <Lock className="h-4 w-4 shrink-0 text-col-slate" strokeWidth={1.5} aria-hidden />
      {children}
    </p>
  );
}

/** Globo de ayuda (Radix), montado dentro del shell. */
function Globo({ texto, lado = "right", children }: { texto: React.ReactNode; lado?: "right" | "top"; children: React.ReactNode }) {
  const { raiz } = useCollection();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={raiz}>
        <Tooltip.Content
          side={lado}
          sideOffset={8}
          className="col-globo z-[95] max-w-[260px] rounded-col bg-col-ink px-3 py-2 font-col-text text-col-xs leading-snug text-col-base shadow-col-3"
        >
          {texto}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ── Riel ──────────────────────────────────────────────────────────────────

/**
 * Tres estados del paso: completo (tilde sobre dorado), incompleto (número con
 * un punto ámbar: ya se tocó y falta algo) y sin tocar (número gris).
 */
function Marca({ estado, n, activo, valor }: { estado: "completo" | "incompleto" | "sin-tocar"; n: number; activo: boolean; valor: number }) {
  const completo = estado === "completo";
  return (
    <span
      className={cn(
        "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-col-xs tabular-nums lining-nums transition-[background-color,border-color,color] duration-col-panel ease-col",
        completo ? "border-col-gold bg-col-gold text-col-ink" : activo ? "border-col-ink text-col-ink" : "border-col-line text-col-slate",
        estado === "incompleto" && !activo && "border-col-aviso/50",
      )}
    >
      {/* Anillo de avance: se llena en 400 a medida que se completa el paso. */}
      <svg aria-hidden viewBox="0 0 28 28" className="pointer-events-none absolute -inset-px -rotate-90 overflow-visible">
        <circle
          cx="14"
          cy="14"
          r="13.5"
          fill="none"
          stroke="#F4B860"
          strokeWidth="1.5"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: 1 - Math.min(Math.max(valor, 0), 1) }}
          className="transition-[stroke-dashoffset] duration-col-panel ease-col"
        />
      </svg>
      <AnimatePresence mode="popLayout" initial={false}>
        {completo ? (
          <motion.span key="ok" className="flex" exit={{ opacity: 0, transition: { duration: DUR.quick } }}>
            <CheckExito fondo={false} className="h-3.5 w-3.5" />
          </motion.span>
        ) : (
          <motion.span key="n" className="flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR.quick }}>
            {n}
          </motion.span>
        )}
      </AnimatePresence>
      {estado === "incompleto" && (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-col-aviso ring-2 ring-col-surface" />
      )}
    </span>
  );
}

function ItemPaso({
  n,
  titulo,
  valor,
  visitado,
  faltan,
  activo,
  compacto,
  onClick,
}: {
  n: number;
  titulo: string;
  valor: number;
  visitado: boolean;
  faltan: string[];
  activo: boolean;
  compacto: boolean;
  onClick: () => void;
}) {
  const estado = valor >= 1 ? "completo" : valor > 0 || visitado ? "incompleto" : "sin-tocar";
  const detalle = estado === "completo" ? "Completo" : estado === "incompleto" ? `Falta: ${faltan.join(", ")}` : "Sin empezar";
  const boton = (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "step" : undefined}
      aria-label={`${n}. ${titulo}. ${detalle}`}
      className={cn(
        "relative flex w-full items-center rounded-col-sm text-left text-col-md transition-colors duration-col ease-col",
        compacto ? "h-11 justify-center" : "min-h-11 gap-2.5 px-2.5 py-1.5",
        activo ? "bg-col-base text-col-ink" : "text-col-slate hover:bg-col-base/60 hover:text-col-ink",
      )}
    >
      {activo && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 bg-col-gold" />}
      <Marca estado={estado} n={n} activo={activo} valor={valor} />
      {!compacto && <span className="min-w-0 flex-1 leading-snug">{titulo}</span>}
    </button>
  );
  // Compacto: el globo dice el nombre y el estado. Amplio: solo si falta algo.
  if (!compacto && estado !== "incompleto") return boton;
  return (
    <Globo
      texto={
        <>
          {compacto && <span className="block font-medium">{titulo}</span>}
          <span className={cn("block", compacto && "text-col-base/75")}>{detalle}</span>
        </>
      }
    >
      {boton}
    </Globo>
  );
}

export function IndicadorGuardado({ g, editable }: { g: EstadoGuardado; editable: boolean }) {
  const cambio = useCambioTexto();
  const [, tic] = useState(0);
  useEffect(() => {
    if (g.tipo !== "guardado" || !g.en) return;
    const t = window.setInterval(() => tic((x) => x + 1), 5000);
    return () => window.clearInterval(t);
  }, [g]);

  let icono: React.ReactNode = <Check className="h-3.5 w-3.5 text-col-ok" strokeWidth={2} />;
  let texto = "Todo guardado";
  let clase = "text-col-slate";
  if (!editable) {
    texto = "Solo lectura";
    icono = null;
  } else if (g.tipo === "guardado" && g.en) {
    const s = Math.round((Date.now() - g.en) / 1000);
    texto = s < 5 ? "Guardado" : s < 60 ? `Guardado hace ${s} s` : `Guardado ${haceTiempo(g.en)}`;
    icono = <CheckAnimado className="text-col-ok" />;
  } else if (g.tipo === "pendiente") {
    texto = "Cambios sin guardar";
    icono = <span className="h-1.5 w-1.5 rounded-full bg-col-aviso" />;
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
      className={cn("flex min-w-0 flex-1 items-center gap-2 text-col-xs", clase)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={g.tipo} className="flex shrink-0 items-center" {...cambio}>
          {icono}
        </motion.span>
      </AnimatePresence>
      <TextoCambiante texto={texto} />
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
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-col-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
      >
        <History className="h-4 w-4" strokeWidth={1.5} />
      </Popover.Trigger>
      <Popover.Portal container={raiz}>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className="col-desplegable z-50 max-h-[420px] w-80 overflow-y-auto rounded-col-sm border border-col-line bg-col-surface p-2 shadow-col-3"
        >
          <p className="px-3 pb-2 pt-2 text-col-xs uppercase tracking-[0.16em] text-col-slate">Historial</p>
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
          className={cn(entradaSelect, "min-h-10 py-[7px] text-col-md")}
        >
          {PASOS.map((p, n) => (
            <option key={p.id} value={p.id}>
              {n + 1}. {p.titulo}
              {completitud[p.id] >= 1 ? "  ✓" : ""}
            </option>
          ))}
        </select>
      </label>
      <span className="text-col-xs tabular-nums lining-nums text-col-slate">
        {i + 1}/{PASOS.length}
      </span>
      <div className="w-[150px]">
        <IndicadorGuardado g={guardado} editable={editable} />
      </div>
    </div>
  );
}
