"use client";

// Vista previa del constructor: la misma página del sitio en modo "preview".
// Escritorio se dibuja a 1280 px y se escala con CSS para entrar en el panel
// (los @container siguen viendo 1280); celular va a 390 px. Al cambiar de
// paso hace scroll a la sección y la resalta. Con `children` dibuja otra
// página (bloques, artículo) y `selector` dice adónde hacer scroll.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Monitor, PanelRightClose, Smartphone, X } from "lucide-react";
import type { ExperienciaVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { ExperienciaPagina, SECCIONES_PAGINA } from "../sitio/experiencia/ExperienciaPagina";

export type Dispositivo = "celular" | "escritorio";

const ANCHO: Record<Dispositivo, number> = { celular: 390, escritorio: 1280 };
const MARGEN_CELULAR = 24;

export function VistaPrevia({
  vista,
  seccion,
  dispositivo,
  onDispositivo,
  onColapsar,
  onCerrar,
  actualizando,
  children,
  selector,
  pulso,
  titulo,
}: {
  vista?: ExperienciaVista;
  seccion?: string;
  dispositivo: Dispositivo;
  onDispositivo: (d: Dispositivo) => void;
  onColapsar?: () => void;
  onCerrar?: () => void;
  /** La vista va un paso atrás de lo que se escribe (useDeferredValue). */
  actualizando?: boolean;
  /** Lo que se dibuja en lugar de la página de experiencia. */
  children?: React.ReactNode;
  /** Elemento al que hace scroll (por defecto, la sección del paso). */
  selector?: string;
  /** Cambia para volver a hacer scroll al mismo elemento. */
  pulso?: number;
  /** Texto de la barra (por defecto, el nombre de la sección). */
  titulo?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const interno = useRef<HTMLDivElement>(null);
  const [anchoPanel, setAnchoPanel] = useState(0);
  const [altoInterno, setAltoInterno] = useState(0);
  const reducido = useReducedMotion();

  useLayoutEffect(() => {
    const s = scroller.current;
    const i = interno.current;
    if (!s || !i) return;
    const ro = new ResizeObserver(() => {
      setAnchoPanel(s.clientWidth);
      setAltoInterno(i.offsetHeight);
    });
    ro.observe(s);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  const base = ANCHO[dispositivo];
  const margen = dispositivo === "celular" ? MARGEN_CELULAR : 0;
  const escala = anchoPanel ? Math.min(1, (anchoPanel - margen * 2) / base) : 0;

  useEffect(() => {
    const s = scroller.current;
    if (!s || !escala) return;
    const raf = requestAnimationFrame(() => {
      const el = interno.current?.querySelector<HTMLElement>(selector ?? `[data-seccion="${seccion}"]`);
      if (!el) return;
      const top = el.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - margen;
      s.scrollTo({ top: Math.max(0, top), behavior: reducido ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
    // Solo al cambiar de sección o de dispositivo, no con cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, selector, pulso, dispositivo, escala > 0]);

  const nombreSeccion = titulo ?? SECCIONES_PAGINA.find((s) => s.id === seccion)?.titulo;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#E6E6E6]">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-col-line bg-col-surface px-3">
        <div role="radiogroup" aria-label="Dispositivo" className="flex gap-0.5 rounded-col-sm bg-col-base p-0.5">
          {(
            [
              ["celular", Smartphone, "Celular"],
              ["escritorio", Monitor, "Escritorio"],
            ] as const
          ).map(([id, Icono, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={dispositivo === id}
              onClick={() => onDispositivo(id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-col-sm px-2.5 text-col-md font-medium transition-colors duration-col ease-col",
                dispositivo === id ? "bg-col-surface text-col-ink shadow-col-1" : "text-col-slate hover:text-col-ink",
              )}
            >
              <Icono className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-col-xs text-col-slate" aria-live="polite">
          {nombreSeccion}
        </p>
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-col-gold transition-opacity duration-col-lento",
            actualizando ? "opacity-100" : "opacity-0",
          )}
        />
        {onColapsar && (
          <button
            type="button"
            onClick={onColapsar}
            aria-label="Plegar vista previa"
            title="Plegar vista previa"
            className="flex h-8 w-8 items-center justify-center rounded-col-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
          >
            <PanelRightClose className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar vista previa"
            className="flex h-8 w-8 items-center justify-center rounded-col-sm text-col-slate transition-colors hover:bg-col-base hover:text-col-ink"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div
          className={cn("mx-auto", dispositivo === "celular" && "my-6")}
          style={{ width: base * escala, height: altoInterno * escala }}
        >
          <div
            ref={interno}
            className={cn(
              "origin-top-left transition-opacity duration-col-lento",
              dispositivo === "celular" && "overflow-hidden rounded-col shadow-col-2",
              !escala && "opacity-0",
            )}
            style={{ width: base, transform: `scale(${escala || 1})` }}
          >
            {children ?? (vista && <ExperienciaPagina vista={vista} modo="preview" seccionResaltada={seccion} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
