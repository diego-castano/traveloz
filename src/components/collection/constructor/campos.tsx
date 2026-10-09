"use client";

// Piezas de formulario del constructor, con el design system de Collection:
// etiqueta arriba en mayúscula, campos de caja (ui.tsx), foco dorado.

import { createContext, useContext, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Minus, Plus, RefreshCw, X } from "lucide-react";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";
import { cn } from "@/components/lib/cn";
import { Campo, Chips, Contador, entrada, entradaArea, entradaSelect, entradaTitulo, etiquetaCampo } from "../ui";
import { MedioFantasma, MedioImagen, fmtDuracion } from "../sitio/medios";
import { SelectorMedios } from "../pickers/SelectorMedios";
import { SoltarAqui } from "../biblioteca/ZonaSubida";
import { ConstructorCtx } from "./contexto";

export { Campo, Contador, entrada, entradaArea, entradaSelect, entradaTitulo, etiquetaCampo };

/**
 * Lo que necesitan SlotMedio y TiraMedios. Dentro del constructor sale de su
 * contexto; los editores de páginas y del journal lo dan con MediosCtx.
 */
export interface ValorMedios {
  medios: Map<string, MedioVista>;
  agregarMedios: (m: MedioVista[]) => void;
  editable: boolean;
}

export const MediosCtx = createContext<ValorMedios | null>(null);

function useMediosCampos(): ValorMedios {
  const propio = useContext(MediosCtx);
  const c = useContext(ConstructorCtx);
  if (propio) return propio;
  if (!c) throw new Error("SlotMedio fuera de un editor");
  return { medios: c.mapas.medios, agregarMedios: c.agregarMedios, editable: c.editable };
}

/** Bloque del formulario con título chico y separación generosa. */
export function Grupo({
  titulo,
  ayuda,
  children,
  className,
  accion,
}: {
  titulo?: string;
  ayuda?: string;
  children: React.ReactNode;
  className?: string;
  accion?: React.ReactNode;
}) {
  return (
    <section className={cn("border-t border-col-line pt-8", className)}>
      {(titulo || accion) && (
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            {titulo && <h3 className="font-col-display text-col-xl font-normal leading-tight text-col-ink">{titulo}</h3>}
            {ayuda && <p className="mt-1 text-col-md text-col-slate">{ayuda}</p>}
          </div>
          {accion}
        </div>
      )}
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

export function Stepper({
  valor,
  onCambio,
  min = 0,
  max = 60,
  label,
  sufijo,
  deshabilitado,
}: {
  valor: number;
  onCambio: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  sufijo?: (n: number) => string;
  deshabilitado?: boolean;
}) {
  const fijar = (n: number) => onCambio(Math.min(max, Math.max(min, Math.round(n || 0))));
  const btn =
    "col-anillo flex h-9 w-9 items-center justify-center rounded-col border border-col-line bg-col-surface text-col-slate transition-[border-color,color,transform] duration-col ease-col hover:border-col-ink hover:text-col-ink active:scale-[0.94] focus-visible:shadow-col-anillo disabled:opacity-30 disabled:hover:border-col-line";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" aria-label="Restar" disabled={deshabilitado || valor <= min} onClick={() => fijar(valor - 1)} className={btn}>
        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={valor}
        min={min}
        max={max}
        disabled={deshabilitado}
        onChange={(e) => fijar(Number(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(entrada, "h-9 min-h-9 w-14 px-1 py-0 text-center font-col-display text-col-xl tabular-nums lining-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none")}
      />
      <button type="button" aria-label="Sumar" disabled={deshabilitado || valor >= max} onClick={() => fijar(valor + 1)} className={btn}>
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      {sufijo && <span className="ml-1 text-col-sm text-col-slate">{sufijo(valor)}</span>}
    </div>
  );
}

/** Alias histórico: los chips viven en ui.tsx. */
export const ChipsTexto = Chips;

// ── Orden con arrastre ────────────────────────────────────────────────────

export function useSensoresOrden() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/** Lista ordenable genérica: render recibe las props del asa para arrastrar. */
export function ListaOrdenable<T extends { id: string }>({
  items,
  onOrden,
  render,
  grilla,
  className,
  deshabilitado,
}: {
  items: T[];
  onOrden: (items: T[]) => void;
  render: (item: T, i: number, asa: AsaProps) => React.ReactNode;
  grilla?: boolean;
  className?: string;
  deshabilitado?: boolean;
}) {
  const sensores = useSensoresOrden();
  const alSoltar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const de = items.findIndex((x) => x.id === e.active.id);
    const a = items.findIndex((x) => x.id === e.over!.id);
    if (de >= 0 && a >= 0) onOrden(arrayMove(items, de, a));
  };
  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={alSoltar}
    >
      <SortableContext items={items.map((x) => x.id)} strategy={grilla ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>
          {items.map((it, i) => (
            <ItemOrdenable key={it.id} id={it.id} deshabilitado={deshabilitado}>
              {(asa) => render(it, i, asa)}
            </ItemOrdenable>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export interface AsaProps {
  props: React.HTMLAttributes<HTMLElement>;
  arrastrando: boolean;
}

function ItemOrdenable({
  id,
  deshabilitado,
  children,
}: {
  id: string;
  deshabilitado?: boolean;
  children: (asa: AsaProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: deshabilitado });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={cn("relative", isDragging && "opacity-90")}
    >
      {children({ props: { ...attributes, ...listeners }, arrastrando: isDragging })}
    </div>
  );
}

export function Asa({ asa, label, className }: { asa: AsaProps; label: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`Arrastrar ${label}`}
      {...asa.props}
      className={cn(
        "relative flex h-8 w-6 shrink-0 cursor-grab touch-none before:absolute before:-inset-x-2 before:-inset-y-1 before:content-[''] items-center justify-center rounded-col-sm text-col-subtle transition-colors hover:text-col-ink active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

// ── Medios ────────────────────────────────────────────────────────────────

export function Miniatura({
  medio,
  aspecto,
  className,
  sizes = "200px",
}: {
  medio: MedioVista;
  aspecto?: number;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-col-sm", className)}>
      <MedioImagen medio={medio} aspecto={aspecto} sizes={sizes} className="h-full w-full" />
      {medio.tipo === "VIDEO" && (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-col-sm bg-col-ink/70 px-1.5 py-0.5 text-col-xs tracking-wide text-col-base">
          {fmtDuracion(medio.duracion) || "Video"}
        </span>
      )}
    </div>
  );
}

/**
 * Lugar para un medio: vacío invita a elegir; lleno muestra la foto con
 * Cambiar y Quitar. Al elegir, el medio se suma a los mapas de la vista previa.
 */
export function SlotMedio({
  medioId,
  onCambio,
  aspecto = 4 / 3,
  tipo,
  etiqueta,
  vacio = "Elegir foto",
  className,
}: {
  medioId: string | null | undefined;
  onCambio: (medio: MedioVista | null) => void;
  aspecto?: number;
  tipo?: "FOTO" | "VIDEO";
  etiqueta: string;
  vacio?: string;
  className?: string;
}) {
  const { medios, agregarMedios, editable } = useMediosCampos();
  const [abierto, setAbierto] = useState(false);
  const medio = medioId ? medios.get(medioId) ?? null : null;
  return (
    <SoltarAqui
      tipo={tipo}
      deshabilitado={!editable}
      onMedio={(m) => {
        agregarMedios([m]);
        onCambio(m);
      }}
      className={cn("group relative", className)}
    >
      {medio ? (
        <>
          <Miniatura medio={medio} aspecto={aspecto} sizes="320px" />
          {editable && (
            <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-0 transition-opacity duration-col ease-col focus-within:opacity-100 group-hover:opacity-100">
              <BotonSobreFoto label={`Cambiar ${etiqueta}`} onClick={() => setAbierto(true)}>
                <RefreshCw />
              </BotonSobreFoto>
              <BotonSobreFoto label={`Quitar ${etiqueta}`} onClick={() => onCambio(null)}>
                <X />
              </BotonSobreFoto>
            </div>
          )}
        </>
      ) : medioId ? (
        <MedioFantasma aspecto={aspecto} texto="No encontramos este medio" className="rounded-col-sm" />
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => setAbierto(true)}
          aria-label={`${vacio}: ${etiqueta}`}
          style={{ aspectRatio: String(aspecto) }}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-col border-[1.5px] border-dashed border-col-slate/30 bg-col-surface px-2 text-col-slate transition-colors duration-col ease-col hover:border-col-gold hover:bg-[#FDF8EF] hover:text-col-ink disabled:pointer-events-none"
        >
          <ImagePlus className="h-5 w-5 text-col-gold transition-transform duration-col ease-col group-hover:-translate-y-0.5" strokeWidth={1.4} aria-hidden />
          <span className="text-col-sm font-medium">{vacio}</span>
          {editable && <span className="text-col-xs text-col-muted">o soltá un archivo</span>}
        </button>
      )}
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        tipo={tipo}
        onElegir={(m) => {
          agregarMedios(m);
          onCambio(m[0] ?? null);
        }}
      />
    </SoltarAqui>
  );
}

export function BotonSobreFoto({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactElement;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-col-sm bg-col-ink/70 text-col-base backdrop-blur-sm transition-colors duration-col ease-col hover:bg-col-ink [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:stroke-[1.75]"
    >
      {children}
    </button>
  );
}

/** Varios medios en fila, ordenables, con un botón para sumar. */
export function TiraMedios({
  refs,
  onCambio,
  max,
  etiqueta,
  aspecto = 1,
}: {
  refs: { medioId: string; leyenda?: string }[];
  onCambio: (refs: { medioId: string; leyenda?: string }[]) => void;
  max: number;
  etiqueta: string;
  aspecto?: number;
}) {
  const { medios, agregarMedios, editable } = useMediosCampos();
  const [abierto, setAbierto] = useState(false);
  const items = refs.map((r) => ({ ...r, id: r.medioId }));
  return (
    <div>
      <ListaOrdenable
        grilla
        deshabilitado={!editable}
        items={items}
        onOrden={(xs) => onCambio(xs.map(({ id: _id, ...r }) => r))}
        className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2"
        render={(r, _i, asa) => {
          const m = medios.get(r.medioId);
          return (
            <div className="group relative cursor-grab touch-none active:cursor-grabbing" {...asa.props} aria-label={`Mover ${m?.alt || "foto"}`}>
              {m ? (
                <Miniatura medio={m} aspecto={aspecto} sizes="120px" />
              ) : (
                <MedioFantasma aspecto={aspecto} className="rounded-col-sm" />
              )}
              {editable && (
                <button
                  type="button"
                  aria-label={`Quitar ${m?.alt || "foto"}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onCambio(refs.filter((x) => x.medioId !== r.medioId))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-col-sm bg-col-ink/70 text-col-base opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              )}
            </div>
          );
        }}
      />
      {editable && refs.length < max && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className={cn(
            "flex h-10 items-center gap-2 text-col-sm font-medium text-col-slate transition-colors hover:text-col-ink",
            refs.length > 0 && "mt-3",
          )}
        >
          <ImagePlus className="h-4 w-4 text-col-gold" strokeWidth={1.5} /> Sumar fotos
          <span className="normal-case tracking-normal text-col-muted">
            ({refs.length} de {max})
          </span>
        </button>
      )}
      <SelectorMedios
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        multiple
        tipo="FOTO"
        titulo={etiqueta}
        maximo={max - refs.length}
        onElegir={(ms) => {
          agregarMedios(ms);
          const ya = new Set(refs.map((r) => r.medioId));
          onCambio([...refs, ...ms.filter((m) => !ya.has(m.id)).map((m) => ({ medioId: m.id }))]);
        }}
      />
    </div>
  );
}
