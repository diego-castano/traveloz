"use client";

// Shell de Traveloz Collection: riel lateral plegable, barra superior con
// paleta de comandos y avisos propios. Va sin el chrome de Traveloz.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { Dialog, VisuallyHidden } from "radix-ui";
import { ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import type { MiAccesoCollection } from "@/actions/collection/equipo.actions";
import { cn } from "@/components/lib/cn";
import { CollectionContext, iniciales, type UsuarioCollection } from "./contexto";
import { AvisosProvider } from "./Avisos";
import { GRUPOS_NAV, moduloActivo, type ModuloNav } from "./nav";
import { PaletaComandos } from "./PaletaComandos";

const CLAVE_RIEL = "col.riel.plegado";

export function CollectionShell({
  acceso,
  usuario,
  children,
}: {
  acceso: MiAccesoCollection;
  usuario: UsuarioCollection;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [raiz, setRaiz] = useState<HTMLElement | null>(null);
  const [plegado, setPlegado] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [paleta, setPaleta] = useState(false);

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

  return (
    <CollectionContext.Provider value={{ acceso, usuario, raiz }}>
      <MotionConfig reducedMotion="user">
        <AvisosProvider>
          <div ref={setRaiz} className="flex min-h-screen">
            {/* Riel de escritorio */}
            <aside
              className={cn(
                "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-col-line bg-col-surface transition-[width] duration-500 ease-col lg:flex",
                plegado ? "w-[76px]" : "w-[248px]",
              )}
            >
              <Marca plegado={plegado} />
              <Navegacion plegado={plegado} activoId={activo?.id} visibles={visibles} />
              <div className={cn("border-t border-col-line p-3", plegado && "flex justify-center")}>
                <button
                  type="button"
                  onClick={alternarRiel}
                  aria-label={plegado ? "Desplegar menú" : "Plegar menú"}
                  aria-expanded={!plegado}
                  className="flex h-10 items-center gap-3 rounded-sm px-3 text-[13px] text-col-slate transition-colors duration-200 ease-col hover:bg-col-base hover:text-col-ink"
                >
                  {plegado ? (
                    <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <>
                      <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                      Plegar
                    </>
                  )}
                </button>
              </div>
            </aside>

            {/* Menú móvil como hoja lateral */}
            <Dialog.Root open={menuMovil} onOpenChange={setMenuMovil}>
              <Dialog.Portal container={raiz}>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-col-ink/40 lg:hidden" />
                <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-col-surface shadow-[12px_0_40px_-16px_rgba(50,55,59,0.35)] focus:outline-none lg:hidden">
                  <VisuallyHidden.Root>
                    <Dialog.Title>Menú de Collection</Dialog.Title>
                    <Dialog.Description>Módulos del panel</Dialog.Description>
                  </VisuallyHidden.Root>
                  <div className="flex items-start justify-between">
                    <Marca plegado={false} />
                    <Dialog.Close
                      aria-label="Cerrar menú"
                      className="m-4 flex h-9 w-9 items-center justify-center rounded-sm text-col-slate hover:text-col-ink"
                    >
                      <X className="h-5 w-5" strokeWidth={1.5} />
                    </Dialog.Close>
                  </div>
                  <Navegacion plegado={false} activoId={activo?.id} visibles={visibles} />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-col-line bg-col-base/90 px-4 backdrop-blur-sm md:px-8 lg:px-12">
                <button
                  type="button"
                  onClick={() => setMenuMovil(true)}
                  aria-label="Abrir menú"
                  className="-ml-1 flex h-10 w-10 items-center justify-center rounded-sm text-col-slate hover:text-col-ink lg:hidden"
                >
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <h1 className="min-w-0 flex-1 truncate font-col-display text-[26px] font-normal leading-none text-col-ink">
                  {activo?.label ?? "Collection"}
                </h1>
                <button
                  type="button"
                  onClick={() => setPaleta(true)}
                  aria-label="Buscar o ir a un módulo"
                  aria-keyshortcuts="Meta+K Control+K"
                  className="group flex h-10 items-center gap-3 rounded-sm border border-col-line bg-col-surface px-3 text-[13px] text-col-slate transition-colors duration-200 ease-col hover:border-col-slate/40 hover:text-col-ink md:w-60"
                >
                  <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  <span className="hidden flex-1 text-left md:inline">Ir a…</span>
                  <kbd className="hidden rounded-sm border border-col-line px-1.5 py-0.5 font-col-text text-[11px] text-col-slate md:inline">
                    ⌘K
                  </kbd>
                </button>
                <Link
                  href="/backend/dashboard"
                  className="hidden h-10 items-center gap-2 rounded-sm px-3 text-[13px] uppercase tracking-[0.12em] text-col-slate transition-colors duration-200 ease-col hover:text-col-ink md:flex"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Volver a Traveloz
                </Link>
                <span
                  title={usuario.nombre}
                  aria-label={`Sesión de ${usuario.nombre}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-col-ink font-col-display text-[17px] text-col-base"
                >
                  {iniciales(usuario.nombre)}
                </span>
              </header>
              <main className={cn("flex-1", !enConstructor && "px-4 pb-24 pt-8 md:px-8 lg:px-12 lg:pt-10")}>{children}</main>
            </div>
          </div>
          <PaletaComandos abierta={paleta} onAbiertaChange={setPaleta} superAdmin={acceso.superAdmin} />
        </AvisosProvider>
      </MotionConfig>
    </CollectionContext.Provider>
  );
}

function Marca({ plegado }: { plegado: boolean }) {
  return (
    <Link
      href="/backend/collection"
      aria-label="Traveloz Collection, inicio"
      className={cn("block px-6 pb-6 pt-7", plegado && "px-0 text-center")}
    >
      {plegado ? (
        <span className="font-col-display text-[30px] italic leading-none text-col-ink">C</span>
      ) : (
        <>
          <span className="block text-[11px] uppercase tracking-[0.24em] text-col-slate">Traveloz</span>
          <span className="mt-1 block font-col-display text-[30px] font-light italic leading-none text-col-ink">
            Collection
          </span>
        </>
      )}
    </Link>
  );
}

function Navegacion({
  plegado,
  activoId,
  visibles,
}: {
  plegado: boolean;
  activoId?: string;
  visibles: (m: ModuloNav) => boolean;
}) {
  return (
    <nav aria-label="Módulos de Collection" className="flex-1 overflow-y-auto px-3 pb-4">
      {GRUPOS_NAV.map((g, i) => {
        const modulos = g.modulos.filter(visibles);
        if (modulos.length === 0) return null;
        return (
          <div key={i} className={cn(i > 0 && "mt-6")}>
            {g.titulo &&
              (plegado ? (
                <div aria-hidden className="mx-auto mb-3 h-px w-6 bg-col-line" />
              ) : (
                <p className="mb-2 px-3 text-[11px] uppercase tracking-[0.18em] text-col-slate/70">{g.titulo}</p>
              ))}
            <ul className="space-y-0.5">
              {modulos.map((m) => (
                <li key={m.id}>
                  <ItemNav m={m} plegado={plegado} activo={m.id === activoId} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function ItemNav({ m, plegado, activo }: { m: ModuloNav; plegado: boolean; activo: boolean }) {
  const Icono = m.icono;
  const base = cn(
    "relative flex h-10 items-center gap-3 rounded-sm text-[14px] transition-colors duration-200 ease-col",
    plegado ? "justify-center px-0" : "px-3",
  );
  if (!m.href) {
    return (
      <span
        title={plegado ? `${m.label} (pronto)` : undefined}
        aria-disabled
        className={cn(base, "cursor-default text-col-slate/45")}
      >
        <Icono className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
        {plegado ? (
          <span className="sr-only">{m.label}, pronto</span>
        ) : (
          <>
            <span className="flex-1">{m.label}</span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-col-slate/55">Pronto</span>
          </>
        )}
      </span>
    );
  }
  return (
    <Link
      href={m.href}
      title={plegado ? m.label : undefined}
      aria-current={activo ? "page" : undefined}
      className={cn(
        base,
        activo ? "bg-col-base text-col-ink" : "text-col-slate hover:bg-col-base/70 hover:text-col-ink",
      )}
    >
      {activo && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 bg-col-gold" />}
      <Icono className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
      {plegado ? <span className="sr-only">{m.label}</span> : <span>{m.label}</span>}
    </Link>
  );
}
