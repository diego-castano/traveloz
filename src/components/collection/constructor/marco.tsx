"use client";

// Marco que comparten los editores (experiencias, páginas y journal): la
// vista previa al costado (redimensionable y plegable) o, si no entra, como
// cajón que se abre desde la barra inferior del editor. Nunca flota encima
// del formulario.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Drawer } from "vaul";
import { AlertTriangle, Eye, RotateCw } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { useCollection } from "../shell/contexto";
import { Boton } from "../ui";
import { DUR, EASE } from "../movimiento";
import type { Dispositivo } from "./VistaPrevia";


export function useMedia(q: string) {
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

interface Prefs {
  ancho: number;
  colapsada: boolean;
  dispositivo: Dispositivo;
}

export interface ControlesPrevia {
  dispositivo: Dispositivo;
  onDispositivo: (d: Dispositivo) => void;
  onColapsar?: () => void;
  onCerrar?: () => void;
}

// Celular por defecto: en un panel de 500 px el escritorio escalado no se lee.
const DEF: Prefs = { ancho: 42, colapsada: false, dispositivo: "celular" };
const acotar = (n: number) => Math.min(55, Math.max(30, n));

/** Estado de la vista previa de un editor. `desde`: ancho de pantalla a partir del cual va al costado. */
export function usePrevia(clave: string, desde = 1280) {
  const ancha = useMedia(`(min-width: ${desde}px)`);
  const escritorio = useMedia("(min-width: 1024px)");
  const [prefs, setPrefs] = useState<Prefs>(DEF);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(clave) ?? "null") as Partial<Prefs> | null;
      if (p) setPrefs({ ...DEF, ...p, ancho: acotar(Number(p.ancho) || DEF.ancho) });
    } catch {
      // Sin localStorage: valores por defecto.
    }
  }, [clave]);
  const cambiar = useCallback(
    (c: Partial<Prefs>) =>
      setPrefs((p) => {
        const n = { ...p, ...c };
        try {
          localStorage.setItem(clave, JSON.stringify(n));
        } catch {
          // Queda en memoria.
        }
        return n;
      }),
    [clave],
  );
  const [cajon, setCajon] = useState(false);
  const enLinea = ancha && !prefs.colapsada;
  useEffect(() => {
    if (enLinea) setCajon(false);
  }, [enLinea]);
  return { ancha, escritorio, prefs, setPrefs, cambiar, cajon, setCajon, enLinea };
}

export type EstadoPrevia = ReturnType<typeof usePrevia>;

/** Botón "Vista previa" para la barra inferior del editor. No se dibuja si la vista previa ya está al costado. */
export function BotonPrevia({ previa, className }: { previa: EstadoPrevia; className?: string }) {
  if (previa.enLinea) return null;
  return (
    <Boton
      variante="secundario"
      tam="sm"
      onClick={() => previa.setCajon(true)}
      aria-expanded={previa.cajon}
      aria-label="Vista previa"
      className={cn("shrink-0 px-2.5 sm:px-3", className)}
    >
      <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      <span className="hidden sm:inline">Vista previa</span>
    </Boton>
  );
}

/**
 * Va como último hijo de la fila flex del editor. `reserva`: píxeles que la
 * vista previa le deja al resto de la fila (riel + formulario), así el
 * formulario nunca queda más angosto que eso aunque el ancho guardado sea mayor.
 */
export function PanelPrevia({
  previa,
  reserva = 0,
  render,
}: {
  previa: EstadoPrevia;
  reserva?: number;
  render: (c: ControlesPrevia) => React.ReactNode;
}) {
  const { raiz: raizShell } = useCollection();
  const { ancha, escritorio, prefs, setPrefs, cambiar, cajon, setCajon, enLinea } = previa;

  const borde = useRef<HTMLDivElement>(null);
  const arrastrar = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = borde.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;
    let ancho = prefs.ancho;
    const mover = (ev: PointerEvent) => {
      ancho = acotar(((rect.right - ev.clientX) / rect.width) * 100);
      setPrefs((p) => ({ ...p, ancho }));
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      cambiar({ ancho });
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };
  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") cambiar({ ancho: acotar(prefs.ancho + 2) });
    if (e.key === "ArrowRight") cambiar({ ancho: acotar(prefs.ancho - 2) });
  };
  const onDispositivo = useCallback((d: Dispositivo) => cambiar({ dispositivo: d }), [cambiar]);

  if (enLinea) {
    return (
      <>
        <div
          ref={borde}
          role="separator"
          aria-orientation="vertical"
          aria-label="Ancho de la vista previa"
          aria-valuemin={30}
          aria-valuemax={55}
          aria-valuenow={Math.round(prefs.ancho)}
          tabIndex={0}
          onPointerDown={arrastrar}
          onKeyDown={teclas}
          className="group relative z-10 -mr-1 w-2 shrink-0 cursor-col-resize"
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-col-line transition-colors group-hover:bg-col-gold group-focus-visible:bg-col-gold" />
        </div>
        <section
          aria-label="Vista previa"
          className="min-w-0 shrink-0"
          style={{ width: reserva ? `min(${prefs.ancho}%, calc(100% - ${reserva}px))` : `${prefs.ancho}%` }}
        >
          {render({ dispositivo: prefs.dispositivo, onDispositivo, onColapsar: () => cambiar({ colapsada: true }) })}
        </section>
      </>
    );
  }

  return (
    <Drawer.Root open={cajon} onOpenChange={setCajon} direction="right" modal={!escritorio} handleOnly container={raizShell}>
      <Drawer.Portal container={raizShell}>
        {!escritorio && <Drawer.Overlay className="fixed inset-0 z-40 bg-col-ink/40" />}
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed bottom-0 right-0 top-0 z-50 flex w-screen flex-col bg-col-surface shadow-col-3 !outline-none lg:w-[min(860px,60vw)]"
        >
          <Drawer.Title className="sr-only">Vista previa</Drawer.Title>
          {cajon &&
            render({
              dispositivo: escritorio ? prefs.dispositivo : "celular",
              onDispositivo,
              onCerrar: () => setCajon(false),
            })}
          {ancha && prefs.colapsada && (
            <button
              type="button"
              onClick={() => cambiar({ colapsada: false })}
              className="absolute bottom-4 left-4 flex h-9 items-center gap-2 rounded-col-sm bg-col-ink/85 px-3 text-col-md font-medium text-col-base backdrop-blur-sm hover:bg-col-ink"
            >
              Fijar al costado
            </button>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function BannerConflicto({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="alert"
          // Aviso: entra en 250, se va en 150.
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
  );
}

