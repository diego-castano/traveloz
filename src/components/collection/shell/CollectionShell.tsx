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
import { PaletaComandos, type BuscarCollection } from "./PaletaComandos";
import { buscarEnCollection } from "@/actions/collection/buscar.actions";
import { MarcaCollection } from "./MarcaCollection";
import { DIST, DUR, EASE, Numero, insignia as insigniaMov, transiciones } from "../movimiento";

const CLAVE_RIEL = "col.riel.plegado";

export function CollectionShell({
  acceso,
  usuario,
  ruta,
  contarNuevas = contarConsultasNuevas,
  buscar = buscarEnCollection,
  children,
}: {
  acceso: MiAccesoCollection;
  usuario: UsuarioCollection;
  /** Solo para las rutas de desarrollo: hace de cuenta que estamos en esta ruta. */
  ruta?: string;
  /** Las rutas de desarrollo lo cambian por uno en memoria. */
  contarNuevas?: () => Promise<Resultado<number>>;
  /** Búsqueda de la paleta ⌘K; las rutas de desarrollo la cambian por una en memoria. */
  buscar?: BuscarCollection;
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
        <Tooltip.Provider delayDuration={80} skipDelayDuration={300}>
          <AvisosProvider>
            <div ref={setRaiz} className="flex min-h-screen">
              {/* Primer foco de la página: salta el riel y la barra. */}
              <a
                href="#contenido"
                className="sr-only rounded-col bg-col-ink px-4 py-3 text-col-md font-medium text-col-base shadow-col-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100]"
              >
                Saltar al contenido
              </a>
              {/* Riel de escritorio */}
              <motion.aside
                initial={false}
                animate={{ width: plegado ? 64 : 216 }}
                // Panel: se despliega en 400 y se pliega en 350.
                transition={quieto ? { duration: 0 } : { duration: plegado ? DUR.medium : DUR.slow, ease: EASE }}
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
                        <motion.div className="fixed inset-0 z-50 bg-col-noche/50 backdrop-blur-[2px] lg:hidden" {...transiciones.velo} />
                      </Dialog.Overlay>
                      <Dialog.Content asChild forceMount>
                        <motion.div
                          className="fixed inset-y-0 left-0 z-50 flex w-[248px] max-w-[85vw] flex-col overflow-hidden bg-col-noche text-white shadow-col-3 focus:outline-none lg:hidden"
                          initial={{ x: "-100%" }}
                          animate={{ x: 0, transition: { duration: DUR.slow, ease: EASE } }}
                          exit={{ x: "-100%", transition: { duration: DUR.medium, ease: EASE } }}
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
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-col-sm text-white/60 transition-colors duration-col ease-col hover:bg-col-noche-2 hover:text-white"
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
                    className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-col-sm text-col-slate transition-colors duration-col ease-col hover:text-col-ink lg:hidden"
                  >
                    <Menu className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                  <p className="flex min-w-0 flex-1 items-center gap-2 text-col-sm text-col-slate">
                    <Link href="/backend/collection" className="hidden h-10 shrink-0 items-center transition-colors duration-col ease-col hover:text-col-ink sm:inline-flex">
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
                    aria-label="Buscar en Collection"
                    aria-keyshortcuts="Meta+K Control+K"
                    title="Buscar (⌘K)"
                    className="group flex h-10 shrink-0 items-center gap-2.5 rounded-col-sm border border-col-line bg-col-surface px-2.5 text-col-sm text-col-slate transition-[border-color,color,box-shadow] duration-col ease-col hover:border-col-slate/40 hover:text-col-ink hover:shadow-col-2 xl:w-64 xl:px-3"
                  >
                    <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    <span className="hidden flex-1 text-left xl:inline">Buscar…</span>
                    <kbd className="hidden rounded-col-sm border border-col-line px-1.5 py-0.5 font-col-text text-col-xs text-col-slate md:inline">
                      ⌘K
                    </kbd>
                  </button>
                </header>
                <main id="contenido" tabIndex={-1} className={cn("min-w-0 flex-1 focus:outline-none", !enConstructor && "px-4 pb-24 pt-6 md:px-8 lg:px-12")}>
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: DIST.base }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DUR.fast, ease: EASE }}
                  >
                    {children}
                  </motion.div>
                </main>
              </div>
            </div>
            <PaletaComandos abierta={paleta} onAbiertaChange={setPaleta} superAdmin={acceso.superAdmin} buscar={buscar} />
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
        className={cn("flex h-[76px] shrink-0 items-center", plegado ? "justify-center" : "px-5")}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={plegado ? "c" : "m"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.quick }}
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
    <nav aria-label="Módulos de Collection" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3">
      {GRUPOS_NAV.map((g, i) => {
        const modulos = g.modulos.filter(visibles);
        if (modulos.length === 0) return null;
        return (
          <div key={i} className={cn(i > 0 && "mt-5")}>
            {g.titulo && (
              <div className="mb-1.5 flex h-4 items-center px-2.5">
                {plegado ? (
                  <span aria-hidden className="mx-auto h-px w-6 bg-col-noche-linea" />
                ) : (
                  <Etiqueta className="whitespace-nowrap text-col-xs uppercase tracking-[0.16em] text-white/60">{g.titulo}</Etiqueta>
                )}
              </div>
            )}
            <ul className="space-y-0.5">
              {modulos.map((m) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, x: -DIST.base }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: DUR.slow, ease: EASE, delay: Math.min(n++, 6) * DUR.stagger }}
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
      animate={{ opacity: 1, transition: { duration: DUR.quick, delay: DUR.micro } }}
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
          className="col-globo z-[80] rounded-col-sm bg-col-noche px-3 py-1.5 font-col-text text-col-sm text-white shadow-col-3 ring-1 ring-col-noche-linea"
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
    "group relative flex h-9 items-center gap-2.5 rounded-col-sm text-col-md transition-colors duration-col ease-col",
    plegado ? "justify-center px-0" : "px-2.5",
  );
  const icono = (
    <Icono
      className="relative h-[18px] w-[18px] shrink-0 transition-transform duration-col ease-col group-hover:translate-x-0.5"
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
              <Etiqueta className="rounded-col-sm border border-white/15 px-1.5 py-0.5 text-col-xs uppercase tracking-[0.16em] text-white/60">
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
            className="absolute inset-0 rounded-col-sm bg-col-noche-2 ring-1 ring-inset ring-col-noche-linea"
            transition={{ duration: DUR.fast, ease: EASE }}
          >
            <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-col-gold shadow-none" />
          </motion.span>
        )}
        {icono}
        {plegado ? <span className="sr-only">{m.label}</span> : <Etiqueta className="relative flex-1 whitespace-nowrap">{m.label}</Etiqueta>}
        <AnimatePresence initial={false}>
          {!!insignia && (
            <motion.span
              key="insignia"
              {...insigniaMov}
              aria-label={`${insignia} ${insignia === 1 ? "nueva" : "nuevas"}`}
              className={cn(
                "relative flex h-5 min-w-5 items-center justify-center rounded-full bg-col-gold px-1.5 text-col-xs font-bold tabular-nums leading-none text-col-noche",
                plegado && "absolute right-1 top-0.5 h-4 min-w-4 px-1 text-col-xs",
              )}
            >
              <Numero valor={insignia} formato={(n) => (n > 99 ? "99+" : String(n))} />
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </ConGlobo>
  );
}

/** Pie del riel en una sola fila: sesión, volver a Traveloz y plegar. Plegado, en columna y con globos. */
function PieRiel({ plegado, usuario, pie }: { plegado: boolean; usuario: UsuarioCollection; pie: React.ReactNode }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1 border-t border-col-noche-linea px-2.5 py-2.5", plegado && "flex-col")}>
      <ConGlobo texto={usuario.nombre || "Sesión"} activo={plegado}>
        <span
          aria-label={`Sesión de ${usuario.nombre}`}
          tabIndex={plegado ? 0 : undefined}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-col-display text-col-sm text-white ring-1 ring-col-gold ring-offset-2 ring-offset-col-noche",
            plegado ? "my-1" : "ml-1 mr-1.5",
          )}
        >
          {iniciales(usuario.nombre)}
        </span>
      </ConGlobo>
      {!plegado && <Etiqueta className="min-w-0 flex-1 truncate text-col-sm text-white/80">{usuario.nombre}</Etiqueta>}
      <ConGlobo texto="Volver a Traveloz" activo>
        <Link
          href="/backend/dashboard"
          aria-label="Volver a Traveloz"
          className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-col-sm text-white/55 transition-colors duration-col ease-col hover:bg-col-noche-2 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-col ease-col group-hover:-translate-x-0.5" strokeWidth={1.5} aria-hidden />
        </Link>
      </ConGlobo>
      {pie}
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
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-col-sm text-white/55 transition-colors duration-col ease-col hover:bg-col-noche-2 hover:text-white"
      >
        <Icono className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
      </button>
    </ConGlobo>
  );
}
