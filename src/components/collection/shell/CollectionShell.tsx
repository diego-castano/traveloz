"use client";

// Shell de Traveloz Collection: riel lateral azul noche plegable, barra
// superior liviana con paleta de comandos y avisos propios. Va sin el chrome
// de Traveloz.

import { useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { Dialog, Tooltip, VisuallyHidden } from "radix-ui";
import { ArrowLeft, ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import type { MiAccesoCollection } from "@/actions/collection/equipo.actions";
import { contarConsultasNuevas } from "@/actions/collection/consultas-admin.actions";
import type { Resultado } from "@/lib/collection/ejecutar";
import { EVENTO_CONSULTAS } from "../consultas/api";
import { cn } from "@/components/lib/cn";
import { CollectionContext, iniciales, type UsuarioCollection } from "./contexto";
import { AvisosProvider } from "./Avisos";
import { GRUPOS_NAV, moduloActivo, type ModuloNav } from "./nav";
import { PaletaComandos } from "./PaletaComandos";
import { MarcaCollection } from "./MarcaCollection";

const CLAVE_RIEL = "col.riel.plegado";
const EASE = [0.22, 1, 0.36, 1] as const;
const RESORTE = { type: "spring", stiffness: 380, damping: 36, mass: 0.9 } as const;

export function CollectionShell({
  acceso,
  usuario,
  ruta,
  contarNuevas = contarConsultasNuevas,
  children,
}: {
  acceso: MiAccesoCollection;
  usuario: UsuarioCollection;
  /** Solo para las rutas de desarrollo: hace de cuenta que estamos en esta ruta. */
  ruta?: string;
  /** Las rutas de desarrollo lo cambian por uno en memoria. */
  contarNuevas?: () => Promise<Resultado<number>>;
  children: React.ReactNode;
}) {
  const pathnameReal = usePathname();
  const pathname = ruta ?? pathnameReal;
  const [raiz, setRaiz] = useState<HTMLElement | null>(null);
  const [plegado, setPlegado] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const quieto = useReducedMotion();

  // Los editores (experiencias, páginas, journal) ocupan todo el alto y pliegan el riel para
  // dejarle lugar a la vista previa; al salir vuelve lo que estaba guardado.
  const enConstructor = /^\/backend\/collection\/(experiencias|paginas|journal)\/[^/]+/.test(pathname);

  useEffect(() => {
    if (enConstructor) {
      setPlegado(true);
      return;
    }
    try {
      setPlegado(localStorage.getItem(CLAVE_RIEL) === "1");
    } catch {
      // Sin localStorage (modo privado estricto): arranca desplegado.
    }
  }, [enConstructor]);

  const alternarRiel = useCallback(() => {
    setPlegado((p) => {
      try {
        localStorage.setItem(CLAVE_RIEL, p ? "0" : "1");
      } catch {
        // Ídem: el estado vive solo en memoria.
      }
      return !p;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaleta((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMenuMovil(false), [pathname]);

  const activo = moduloActivo(pathname);
  const visibles = (m: ModuloNav) => !m.soloSuperAdmin || acceso.superAdmin;
  const nuevas = useConsultasNuevas(acceso, contarNuevas);
  const insignias: Record<string, number> = { consultas: nuevas };

  return (
    <CollectionContext.Provider value={{ acceso, usuario, raiz }}>
      <MotionConfig reducedMotion="user">
        <Tooltip.Provider delayDuration={120} skipDelayDuration={300}>
          <AvisosProvider>
            <div ref={setRaiz} className="flex min-h-screen">
              {/* Riel de escritorio */}
              <motion.aside
                initial={false}
                animate={{ width: plegado ? 76 : 256 }}
                transition={quieto ? { duration: 0 } : RESORTE}
                className="sticky top-0 z-40 hidden h-screen shrink-0 flex-col overflow-hidden bg-col-noche text-white lg:flex"
              >
                <Riel
                  plegado={plegado}
                  activoId={activo?.id}
                  visibles={visibles}
                  insignias={insignias}
                  usuario={usuario}
                  idIndicador="riel"
                  pie={
                    <BotonRiel
                      plegado={plegado}
                      etiqueta={plegado ? "Desplegar menú" : "Plegar menú"}
                      onClick={alternarRiel}
                      expandido={!plegado}
                    />
                  }
                />
              </motion.aside>

              {/* Menú móvil: la misma navegación, como hoja lateral */}
              <Dialog.Root open={menuMovil} onOpenChange={setMenuMovil}>
                <AnimatePresence>
                  {menuMovil && (
                    <Dialog.Portal forceMount container={raiz}>
                      <Dialog.Overlay asChild forceMount>
                        <motion.div
                          className="fixed inset-0 z-50 bg-col-noche/50 backdrop-blur-[2px] lg:hidden"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        />
                      </Dialog.Overlay>
                      <Dialog.Content asChild forceMount>
                        <motion.div
                          className="fixed inset-y-0 left-0 z-50 flex w-[288px] max-w-[85vw] flex-col overflow-hidden bg-col-noche text-white shadow-[24px_0_60px_-24px_rgba(4,7,31,0.6)] focus:outline-none lg:hidden"
                          initial={{ x: "-100%" }}
                          animate={{ x: 0 }}
                          exit={{ x: "-100%" }}
                          transition={{ duration: 0.45, ease: EASE }}
                        >
                          <VisuallyHidden.Root>
                            <Dialog.Title>Menú de Collection</Dialog.Title>
                            <Dialog.Description>Módulos del panel</Dialog.Description>
                          </VisuallyHidden.Root>
                          <Riel
                            plegado={false}
                            activoId={activo?.id}
                            visibles={visibles}
                            insignias={insignias}
                            usuario={usuario}
                            idIndicador="hoja"
                            pie={
                              <Dialog.Close
                                aria-label="Cerrar menú"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-white/60 transition-colors duration-200 ease-col hover:bg-col-noche-2 hover:text-white"
                              >
                                <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
                              </Dialog.Close>
                            }
                          />
                        </motion.div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  )}
                </AnimatePresence>
              </Dialog.Root>

              <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-col-line bg-col-base/85 px-4 backdrop-blur-md md:px-8 lg:px-12">
                  <button
                    type="button"
                    onClick={() => setMenuMovil(true)}
                    aria-label="Abrir menú"
                    className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-col-slate transition-colors duration-200 ease-col hover:text-col-ink lg:hidden"
                  >
                    <Menu className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                  <p className="flex min-w-0 flex-1 items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-col-slate">
                    <Link href="/backend/collection" className="hidden shrink-0 transition-colors duration-200 ease-col hover:text-col-ink sm:inline">
                      Collection
                    </Link>
                    {activo && activo.id !== "inicio" && (
                      <>
                        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-col-gold sm:block" strokeWidth={1.5} aria-hidden />
                        <span className="truncate text-col-ink">{activo.label}</span>
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaleta(true)}
                    aria-label="Buscar o ir a un módulo"
                    aria-keyshortcuts="Meta+K Control+K"
                    title="Buscar o ir a… (⌘K)"
                    className="group flex h-10 shrink-0 items-center gap-2.5 rounded-sm border border-col-line bg-col-surface px-2.5 text-[13px] text-col-slate transition-[border-color,color,box-shadow] duration-200 ease-col hover:border-col-slate/40 hover:text-col-ink hover:shadow-[0_8px_20px_-14px_rgba(50,55,59,0.5)] xl:w-64 xl:px-3"
                  >
                    <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    <span className="hidden flex-1 text-left xl:inline">Ir a…</span>
                    <kbd className="hidden rounded-sm border border-col-line px-1.5 py-0.5 font-col-text text-[11px] text-col-slate md:inline">
                      ⌘K
                    </kbd>
                  </button>
                </header>
                <main className={cn("min-w-0 flex-1", !enConstructor && "px-4 pb-24 pt-8 md:px-8 lg:px-12 lg:pt-10")}>
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    {children}
                  </motion.div>
                </main>
              </div>
            </div>
            <PaletaComandos abierta={paleta} onAbiertaChange={setPaleta} superAdmin={acceso.superAdmin} />
          </AvisosProvider>
        </Tooltip.Provider>
      </MotionConfig>
    </CollectionContext.Provider>
  );
}

/** Consultas en NUEVA para la insignia del riel. Se recuenta al volver a la pestaña y cuando el panel cambia un estado. */
function useConsultasNuevas(acceso: MiAccesoCollection, contar: () => Promise<Resultado<number>>) {
  const [n, setN] = useState(0);
  const habilitado = acceso.superAdmin || (acceso.permisos.includes("panel") && acceso.permisos.includes("consultas.ver"));
  useEffect(() => {
    if (!habilitado) return;
    let vivo = true;
    const leer = () =>
      void contar()
        .then((r) => vivo && r.ok && setN(r.data))
        .catch(() => {});
    const alVolver = () => document.visibilityState === "visible" && leer();
    leer();
    window.addEventListener("focus", leer);
    window.addEventListener(EVENTO_CONSULTAS, leer);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      window.removeEventListener("focus", leer);
      window.removeEventListener(EVENTO_CONSULTAS, leer);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [habilitado, contar]);
  return n;
}

/** Contenido del riel: marca, navegación y pie con la sesión. Lo usan el riel y la hoja móvil. */
function Riel({
  plegado,
  activoId,
  visibles,
  insignias,
  usuario,
  idIndicador,
  pie,
}: {
  plegado: boolean;
  activoId?: string;
  visibles: (m: ModuloNav) => boolean;
  insignias: Record<string, number>;
  usuario: UsuarioCollection;
  idIndicador: string;
  pie: React.ReactNode;
}) {
  return (
    <>
      <Link
        href="/backend/collection"
        aria-label="Traveloz Collection, inicio"
        className={cn("flex h-[104px] shrink-0 items-center", plegado ? "justify-center" : "px-7")}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={plegado ? "c" : "m"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MarcaCollection compacta={plegado} />
          </motion.span>
        </AnimatePresence>
      </Link>
      <Navegacion plegado={plegado} activoId={activoId} visibles={visibles} insignias={insignias} idIndicador={idIndicador} />
      <PieRiel plegado={plegado} usuario={usuario} pie={pie} />
    </>
  );
}

function Navegacion({
  plegado,
  activoId,
  visibles,
  insignias,
  idIndicador,
}: {
  plegado: boolean;
  activoId?: string;
  visibles: (m: ModuloNav) => boolean;
  insignias: Record<string, number>;
  idIndicador: string;
}) {
  let n = 0;
  return (
    <nav aria-label="Módulos de Collection" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
      {GRUPOS_NAV.map((g, i) => {
        const modulos = g.modulos.filter(visibles);
        if (modulos.length === 0) return null;
        return (
          <div key={i} className={cn(i > 0 && "mt-7")}>
            {g.titulo && (
              <div className="mb-2 flex h-4 items-center px-3">
                {plegado ? (
                  <span aria-hidden className="mx-auto h-px w-6 bg-col-noche-linea" />
                ) : (
                  <Etiqueta className="whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-white/40">{g.titulo}</Etiqueta>
                )}
              </div>
            )}
            <ul className="space-y-0.5">
              {modulos.map((m) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, ease: EASE, delay: 0.04 + n++ * 0.03 }}
                >
                  <ItemNav m={m} plegado={plegado} activo={m.id === activoId} idIndicador={idIndicador} insignia={insignias[m.id]} />
                </motion.li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Texto del riel que se desvanece al plegar (sin moverse). */
function Etiqueta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2, delay: 0.1 } }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

/** Con el riel plegado, el nombre aparece en un globo a la derecha. */
function ConGlobo({ texto, activo, children }: { texto: string; activo: boolean; children: React.ReactElement }) {
  const raiz = useContext(CollectionContext)?.raiz;
  if (!activo) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={raiz}>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className="z-[80] rounded-sm bg-col-noche px-3 py-1.5 font-col-text text-[12px] uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_-12px_rgba(4,7,31,0.7)] ring-1 ring-col-noche-linea"
        >
          {texto}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function ItemNav({
  m,
  plegado,
  activo,
  idIndicador,
  insignia,
}: {
  m: ModuloNav;
  plegado: boolean;
  activo: boolean;
  idIndicador: string;
  insignia?: number;
}) {
  const Icono = m.icono;
  const base = cn(
    "group relative flex h-10 items-center gap-3 rounded-sm text-[14px] transition-colors duration-200 ease-col",
    plegado ? "justify-center px-0" : "px-3",
  );
  const icono = (
    <Icono
      className="relative h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-col group-hover:translate-x-0.5"
      strokeWidth={1.5}
      aria-hidden
    />
  );
  if (!m.href) {
    return (
      <ConGlobo texto={`${m.label} · pronto`} activo={plegado}>
        <span aria-disabled tabIndex={plegado ? 0 : undefined} className={cn(base, "cursor-default text-white/35")}>
          {icono}
          {plegado ? (
            <span className="sr-only">{m.label}, pronto</span>
          ) : (
            <>
              <Etiqueta className="flex-1 whitespace-nowrap">{m.label}</Etiqueta>
              <Etiqueta className="rounded-sm border border-white/15 px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.16em] text-white/45">
                Pronto
              </Etiqueta>
            </>
          )}
        </span>
      </ConGlobo>
    );
  }
  return (
    <ConGlobo texto={m.label} activo={plegado}>
      <Link
        href={m.href}
        aria-current={activo ? "page" : undefined}
        className={cn(base, activo ? "text-white" : "text-white/65 hover:bg-col-noche-2 hover:text-white")}
      >
        {activo && (
          <motion.span
            layoutId={`col-nav-${idIndicador}`}
            aria-hidden
            className="absolute inset-0 rounded-sm bg-col-noche-2 ring-1 ring-inset ring-col-noche-linea"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <span className="absolute inset-y-2.5 left-0 w-[2px] rounded-full bg-col-gold shadow-[0_0_10px_rgba(244,184,96,0.6)]" />
          </motion.span>
        )}
        {icono}
        {plegado ? <span className="sr-only">{m.label}</span> : <Etiqueta className="relative flex-1 whitespace-nowrap">{m.label}</Etiqueta>}
        {!!insignia && (
          <span
            aria-label={`${insignia} ${insignia === 1 ? "nueva" : "nuevas"}`}
            className={cn(
              "relative flex h-5 min-w-5 items-center justify-center rounded-full bg-col-gold px-1.5 text-[11px] font-medium tabular-nums leading-none text-col-noche",
              plegado && "absolute right-2 top-1 h-4 min-w-4 px-1 text-[10px]",
            )}
          >
            {insignia > 99 ? "99+" : insignia}
          </span>
        )}
      </Link>
    </ConGlobo>
  );
}

function PieRiel({ plegado, usuario, pie }: { plegado: boolean; usuario: UsuarioCollection; pie: React.ReactNode }) {
  const volver = (
    <Link
      href="/backend/dashboard"
      aria-label={plegado ? "Volver a Traveloz" : undefined}
      className={cn(
        "group flex h-9 items-center gap-2 rounded-sm text-[12px] uppercase tracking-[0.14em] text-white/55 transition-colors duration-200 ease-col hover:bg-col-noche-2 hover:text-white",
        plegado ? "w-10 justify-center" : "px-2",
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 ease-col group-hover:-translate-x-0.5" strokeWidth={1.5} aria-hidden />
      {!plegado && <Etiqueta className="whitespace-nowrap">Volver a Traveloz</Etiqueta>}
    </Link>
  );
  return (
    <div className={cn("shrink-0 border-t border-col-noche-linea p-3", plegado && "flex flex-col items-center gap-2")}>
      <div className={cn("flex items-center gap-3", !plegado && "px-1 pb-2")}>
        <ConGlobo texto={usuario.nombre || "Sesión"} activo={plegado}>
          <span
            aria-label={`Sesión de ${usuario.nombre}`}
            tabIndex={plegado ? 0 : undefined}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-col-display text-[15px] text-white ring-1 ring-col-gold ring-offset-2 ring-offset-col-noche"
          >
            {iniciales(usuario.nombre)}
          </span>
        </ConGlobo>
        {!plegado && (
          <>
            <Etiqueta className="min-w-0 flex-1 truncate text-[13px] text-white/85">{usuario.nombre}</Etiqueta>
            {pie}
          </>
        )}
      </div>
      {plegado ? (
        <>
          <ConGlobo texto="Volver a Traveloz" activo>
            {volver}
          </ConGlobo>
          {pie}
        </>
      ) : (
        volver
      )}
    </div>
  );
}

function BotonRiel({
  plegado,
  etiqueta,
  expandido,
  onClick,
}: {
  plegado: boolean;
  etiqueta: string;
  expandido: boolean;
  onClick: () => void;
}) {
  const Icono = plegado ? PanelLeftOpen : PanelLeftClose;
  return (
    <ConGlobo texto={etiqueta} activo>
      <button
        type="button"
        onClick={onClick}
        aria-label={etiqueta}
        aria-expanded={expandido}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-white/55 transition-colors duration-200 ease-col hover:bg-col-noche-2 hover:text-white"
      >
        <Icono className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
      </button>
    </ConGlobo>
  );
}
