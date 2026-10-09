"use client";

// Grilla justificada: filas que llenan el ancho respetando el aspecto de cada
// medio (como un álbum de fotos). Al sumar páginas solo cambia la última fila.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ColMedioDto } from "@/actions/collection/medios.actions";
import { cn } from "@/components/lib/cn";
import { MedioImagen, aspectoDe, fmtDuracion, fmtPeso } from "./MedioImagen";
import { transiciones } from "../movimiento";

const GAP = 12;

interface Celda {
  medio: ColMedioDto;
  indice: number;
  w: number;
  h: number;
}

function armarFilas(items: ColMedioDto[], ancho: number, altoObjetivo: number): Celda[][] {
  const filas: Celda[][] = [];
  let fila: { medio: ColMedioDto; indice: number; a: number }[] = [];
  let suma = 0;
  items.forEach((medio, indice) => {
    const a = Math.min(Math.max(aspectoDe(medio), 0.4), 3);
    fila.push({ medio, indice, a });
    suma += a;
    const libre = ancho - GAP * (fila.length - 1);
    if (suma * altoObjetivo >= libre) {
      const h = libre / suma;
      filas.push(fila.map((c) => ({ medio: c.medio, indice: c.indice, w: c.a * h, h })));
      fila = [];
      suma = 0;
    }
  });
  if (fila.length) filas.push(fila.map((c) => ({ medio: c.medio, indice: c.indice, w: c.a * altoObjetivo, h: altoObjetivo })));
  return filas;
}

export function Grilla({
  items,
  seleccion,
  modoSeleccion,
  puedeSeleccionar,
  onAbrir,
  onAlternar,
  orden,
  onDobleClic,
}: {
  items: ColMedioDto[];
  seleccion: Set<string>;
  modoSeleccion: boolean;
  puedeSeleccionar: boolean;
  onAbrir: (indice: number) => void;
  onAlternar: (indice: number, rango: boolean) => void;
  /** Número de orden de cada elegido (selector múltiple): reemplaza el tilde. */
  orden?: Map<string, number>;
  /** Doble clic sobre un medio (el selector simple lo elige y cierra). */
  onDobleClic?: (indice: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setAncho(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const alto = ancho < 640 ? 150 : ancho < 1100 ? 210 : 250;
  const filas = useMemo(() => (ancho ? armarFilas(items, ancho, alto) : []), [items, ancho, alto]);

  return (
    <div ref={ref} className="w-full">
      {ancho === 0 ? (
        <GrillaSkeleton />
      ) : (
        <div className="flex flex-col" style={{ gap: GAP }}>
          {filas.map((fila) => (
            <div key={fila[0].medio.id} className="flex" style={{ gap: GAP }}>
              {fila.map((c) => (
                <Mosaico
                  key={c.medio.id}
                  celda={c}
                  seleccionado={seleccion.has(c.medio.id)}
                  modoSeleccion={modoSeleccion}
                  puedeSeleccionar={puedeSeleccionar}
                  onAbrir={onAbrir}
                  onAlternar={onAlternar}
                  numero={orden?.get(c.medio.id)}
                  onDobleClic={onDobleClic}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Mosaico({
  celda,
  seleccionado,
  modoSeleccion,
  puedeSeleccionar,
  onAbrir,
  onAlternar,
  numero,
  onDobleClic,
}: {
  numero?: number;
  onDobleClic?: (indice: number) => void;
  celda: Celda;
  seleccionado: boolean;
  modoSeleccion: boolean;
  puedeSeleccionar: boolean;
  onAbrir: (indice: number) => void;
  onAlternar: (indice: number, rango: boolean) => void;
}) {
  const { medio: m, indice, w, h } = celda;
  const faltaAlt = m.tipo === "FOTO" && !m.alt;
  const faltaCredito = !m.credito;
  return (
    <div
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-col-sm transition-[box-shadow,transform] duration-col ease-col hover:-translate-y-0.5 hover:shadow-col-2",
        seleccionado && "ring-2 ring-col-ink ring-offset-2 ring-offset-col-base",
      )}
      style={{ width: w, height: h }}
    >
      <button
        type="button"
        onClick={(e) => (modoSeleccion ? onAlternar(indice, e.shiftKey) : onAbrir(indice))}
        onDoubleClick={onDobleClic ? () => onDobleClic(indice) : undefined}
        aria-label={`${modoSeleccion ? "Elegir" : "Abrir"} ${m.alt || m.nombre}`}
        aria-pressed={modoSeleccion && !puedeSeleccionar ? seleccionado : undefined}
        className="absolute inset-0 block focus-visible:outline-offset-[-2px]"
      >
        <MedioImagen
          medio={m}
          sizes={`${Math.ceil(w)}px`}
          ancho={Math.ceil(w * 2)}
          aspecto={w / h}
          className="h-full w-full"
          imgClassName={cn("group-hover:scale-[1.02]", seleccionado && "scale-[0.97]")}
          // El pie con nombre, duración y peso la reemplaza cuando está a la vista.
          insigniaClassName={modoSeleccion ? "hidden" : "group-hover:opacity-0 group-focus-within:opacity-0"}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-t from-col-ink/75 via-col-ink/0 to-col-ink/0 opacity-0 transition-opacity duration-col ease-col group-hover:opacity-100 group-focus-within:opacity-100",
            // Al elegir, el nombre y las medidas quedan siempre a la vista.
            modoSeleccion && "opacity-100",
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 p-3 text-left opacity-0 transition-[opacity,transform] duration-col ease-col group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
            modoSeleccion && "translate-y-0 p-2.5 opacity-100",
          )}
        >
          <span className="block truncate text-col-sm text-col-base">{m.nombre}</span>
          {m.tipo === "VIDEO" ? (
            <span className="block text-col-xs tracking-wide text-col-base/70">
              {["Video", fmtDuracion(m.duracion), fmtPeso(m.peso)].filter(Boolean).join(" · ")}
            </span>
          ) : (
            m.ancho &&
            m.alto && (
              <span className="block text-col-xs tracking-wide text-col-base/70">
                {m.ancho} × {m.alto}
              </span>
            )
          )}
        </span>
        {(faltaAlt || faltaCredito) && (
          // Un punto discreto; el detalle va en el globo y en el nombre accesible.
          <span
            title={[faltaAlt && "Sin descripción", faltaCredito && "Sin autor"].filter(Boolean).join(" · ")}
            className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-col-surface ring-2 ring-col-aviso"
          >
            <span className="sr-only">{[faltaAlt && "Sin descripción", faltaCredito && "Sin autor"].filter(Boolean).join(", ")}</span>
          </span>
        )}
      </button>
      {/* Selección única: sin casilla, el elegido lleva borde y un tilde. */}
      {!puedeSeleccionar && seleccionado && (
        <span aria-hidden className="pointer-events-none absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-col-ink text-col-base shadow-col-1">
          <Check className="h-4 w-4" strokeWidth={2} />
        </span>
      )}
      {puedeSeleccionar && (
        <button
          type="button"
          role="checkbox"
          aria-checked={seleccionado}
          aria-label={`Seleccionar ${m.nombre}`}
          onClick={(e) => onAlternar(indice, e.shiftKey)}
          className={cn(
            "absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border transition-[opacity,background-color,transform] before:absolute before:-inset-2 before:content-[''] duration-col ease-col active:scale-90",
            seleccionado
              ? "border-col-gold bg-col-gold text-col-ink opacity-100"
              : "border-col-base/90 bg-col-ink/25 text-transparent backdrop-blur-sm",
            !seleccionado && !modoSeleccion && "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
          )}
        >
          {numero && seleccionado ? (
            <motion.span
              key={numero}
              {...transiciones.pop}
              className="text-col-xs font-bold leading-none"
            >
              {numero}
            </motion.span>
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}

export function GrillaSkeleton() {
  const filas = [
    [1.5, 0.8, 1.33, 1],
    [0.75, 1.78, 1, 1.2],
    [1.33, 1, 0.8, 1.5],
  ];
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {filas.map((f, i) => (
        <div key={i} className="flex h-[150px] gap-3 sm:h-[210px] xl:h-[250px]">
          {f.map((a, j) => (
            <div key={j} className="col-skeleton min-w-0 rounded-col-sm" style={{ flexGrow: a, flexBasis: 0 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
