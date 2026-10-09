"use client";

// Piezas base del design system de Collection.

import { forwardRef, useContext, useEffect, useRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Popover, Switch } from "radix-ui";
import { Check, ChevronDown, ExternalLink, Search } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { urlAbsoluta } from "@/lib/collection/sitio";
import { CollectionContext } from "./shell/contexto";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 text-[13px] uppercase tracking-[0.12em] text-col-slate", className)}>
      <span aria-hidden className="h-px w-6 bg-col-gold" />
      {children}
    </p>
  );
}

export const boton = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[13px] uppercase tracking-[0.12em] transition-[background-color,color,border-color,transform] duration-200 ease-col active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variante: {
        primario: "bg-col-ink text-col-base hover:bg-col-slate",
        secundario: "border border-col-ink/25 text-col-ink hover:border-col-ink",
        fantasma: "text-col-slate hover:text-col-ink",
        peligro: "bg-col-alerta text-col-base hover:bg-[#86321F]",
      },
      tam: {
        md: "h-12 px-6",
        sm: "h-9 px-4 text-[12px]",
      },
    },
    defaultVariants: { variante: "primario", tam: "md" },
  },
);

type BotonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof boton>;

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { className, variante, tam, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(boton({ variante, tam }), className)} {...props} />;
});

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("col-skeleton rounded-sm", className)} style={style} />;
}

export const etiquetaCampo = "text-[13px] uppercase tracking-[0.12em] text-col-slate";
export const inputLinea =
  "w-full border-0 border-b border-col-slate/40 bg-transparent px-0 py-2 text-[15px] text-col-ink placeholder:text-col-slate/60 transition-colors duration-200 ease-col focus:border-col-gold focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-60";

export function Interruptor({
  checked,
  onCheckedChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  id?: string;
}) {
  return (
    <Switch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-col-line transition-colors duration-200 ease-col data-[state=checked]:bg-col-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-col-surface shadow-sm transition-transform duration-200 ease-col data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-col-gold" />
    </Switch.Root>
  );
}

/** Cabecera de cada módulo: eyebrow dorado, título en Cormorant, una línea y acciones a la derecha. */
export function EncabezadoPagina({
  eyebrow,
  titulo,
  descripcion,
  acciones,
  className,
}: {
  eyebrow: React.ReactNode;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-6", className)}>
      <div className="min-w-0 max-w-[760px] flex-[1_1_360px]">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 font-col-display text-[40px] font-light leading-[1.02] text-col-ink md:text-[46px]">{titulo}</h1>
        {descripcion && <p className="mt-3 text-[15px] leading-relaxed text-col-slate">{descripcion}</p>}
      </div>
      {acciones && <div className="flex max-w-full flex-wrap items-center gap-3">{acciones}</div>}
    </header>
  );
}

export function EncabezadoSkeleton({ acciones = 1 }: { acciones?: number }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
      <div className="min-w-0 flex-[1_1_360px]">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="mt-5 h-11 w-[min(380px,80%)]" />
        <Skeleton className="mt-4 h-4 w-[min(300px,70%)]" />
      </div>
      {acciones > 0 && <Skeleton className="h-12 w-52" />}
    </div>
  );
}

/** Fila de herramientas bajo la cabecera: filtros y búsqueda. Envuelve, nunca desborda. */
export const barraHerramientas = "mb-10 flex flex-wrap items-center gap-x-8 gap-y-4";

/** Elevación suave de tarjetas al pasar el mouse (va en el hijo de un `group`). */
export const tarjetaElevable =
  "transition-[transform,box-shadow] duration-200 ease-col group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_44px_-26px_rgba(50,55,59,0.5)]";

export function Buscador({
  valor,
  onChange,
  placeholder,
  etiqueta,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  etiqueta: string;
}) {
  return (
    <label className="relative ml-auto min-w-[200px] flex-[1_1_240px] sm:max-w-[320px]">
      <span className="sr-only">{etiqueta}</span>
      <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} aria-hidden />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full border-0 border-b border-col-slate/40 bg-transparent pl-7 pr-2 text-[15px] text-col-ink placeholder:text-col-slate/60 transition-colors duration-200 ease-col focus:border-col-gold focus:outline-none focus:ring-0 focus-visible:outline-none"
      />
    </label>
  );
}

export interface OpcionFiltro<T extends string> {
  id: T;
  label: string;
  n?: number;
}

const chip =
  "flex h-9 shrink-0 items-center gap-2 rounded-sm border px-4 text-[13px] uppercase tracking-[0.12em] transition-colors duration-200 ease-col";

function Conteo({ n, activo }: { n?: number; activo: boolean }) {
  if (!n) return null;
  return <span className={cn("text-[11px] tabular-nums lining-nums", activo ? "text-col-gold" : "text-col-slate/60")}>{n}</span>;
}

/**
 * Filtros en chips que bajan a un segundo renglón si no entran. Si harían
 * falta más de dos renglones (o son muchos), se pliegan en un desplegable con
 * la opción actual y su conteo. Nunca hay scroll horizontal.
 */
export function Filtros<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
  className,
  children,
}: {
  opciones: OpcionFiltro<T>[];
  valor: T;
  onChange: (v: T) => void;
  etiqueta: string;
  className?: string;
  /** Algo más al final de la fila de chips (por ejemplo "Nueva categoría"). */
  children?: React.ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const medida = useRef<HTMLDivElement>(null);
  const [plegado, setPlegado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const raiz = useContext(CollectionContext)?.raiz;

  useEffect(() => {
    const medir = () => {
      const disponible = caja.current?.clientWidth ?? 0;
      const necesario = medida.current?.scrollWidth ?? 0;
      if (disponible) setPlegado(opciones.length > 8 || necesario > disponible * 2 - 16);
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (caja.current) ro.observe(caja.current);
    if (medida.current) ro.observe(medida.current);
    return () => ro.disconnect();
  }, [opciones.length]);

  const actual = opciones.find((o) => o.id === valor) ?? opciones[0];
  const chips = (medir: boolean) =>
    opciones.map((o) => (
      <button
        key={o.id}
        type="button"
        tabIndex={medir ? -1 : undefined}
        aria-pressed={medir ? undefined : valor === o.id}
        onClick={medir ? undefined : () => onChange(o.id)}
        className={cn(
          chip,
          valor === o.id ? "border-col-ink bg-col-ink text-col-base" : "border-col-line text-col-slate hover:border-col-slate/50 hover:text-col-ink",
        )}
      >
        {o.label}
        <Conteo n={o.n} activo={valor === o.id} />
      </button>
    ));

  return (
    <div ref={caja} className={cn("relative min-w-0 flex-[1_1_440px]", className)}>
      {/* Copia invisible en una sola línea para medir cuánto ocupan los chips. */}
      <div aria-hidden className="invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div ref={medida} className="flex w-max gap-2">
          {chips(true)}
        </div>
      </div>
      {plegado ? (
        <div className="flex flex-wrap items-center gap-2">
          <Popover.Root open={abierto} onOpenChange={setAbierto}>
            <Popover.Trigger
              aria-label={`${etiqueta}: ${actual?.label}`}
              className={cn(chip, "group border-col-ink/25 bg-col-surface text-col-ink hover:border-col-ink data-[state=open]:border-col-ink")}
            >
              <span className="text-col-slate">{etiqueta}</span>
              <span aria-hidden className="h-3 w-px bg-col-line" />
              {actual?.label}
              <Conteo n={actual?.n} activo />
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 ease-col group-data-[state=open]:rotate-180" strokeWidth={1.5} aria-hidden />
            </Popover.Trigger>
            <Popover.Portal container={raiz}>
              <Popover.Content
                align="start"
                sideOffset={6}
                collisionPadding={16}
                className="z-50 w-[min(280px,calc(100vw-2rem))] rounded-sm border border-col-line bg-col-surface p-1 font-col-text shadow-[0_20px_40px_-20px_rgba(50,55,59,0.45)] focus:outline-none"
              >
                <ul aria-label={etiqueta}>
                  {opciones.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        aria-pressed={valor === o.id}
                        onClick={() => {
                          onChange(o.id);
                          setAbierto(false);
                        }}
                        className="flex h-10 w-full items-center gap-3 rounded-sm px-3 text-left text-[14px] text-col-ink transition-colors duration-150 ease-col hover:bg-col-base focus-visible:bg-col-base"
                      >
                        <span className="flex w-4 justify-center">
                          {valor === o.id && <Check className="h-4 w-4 text-col-gold" strokeWidth={2} aria-hidden />}
                        </span>
                        <span className="flex-1">{o.label}</span>
                        {!!o.n && <span className="text-[12px] tabular-nums lining-nums text-col-slate/70">{o.n}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          {children}
        </div>
      ) : (
        <div role="group" aria-label={etiqueta} className="flex flex-wrap items-center gap-2">
          {chips(false)}
          {children}
        </div>
      )}
    </div>
  );
}

/** Anillo de completitud (0..1) con el porcentaje al centro. */
export function AnilloCompletitud({ valor, tam = 64, className }: { valor: number; tam?: number; className?: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.round(valor * 100);
  return (
    <span
      role="img"
      aria-label={`${pct} por ciento completa`}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: tam, height: tam }}
    >
      <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="30" cy="30" r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="2" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke="#F4B860"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${c * Math.max(valor, 0.02)} ${c}`}
          className="transition-[stroke-dasharray] duration-500 ease-col"
        />
      </svg>
      <span className="font-col-display text-[19px] tabular-nums lining-nums leading-none">
        {pct}
        <span className="text-[12px]">%</span>
      </span>
    </span>
  );
}

/** "Ver en el sitio": abre lo publicado en collection.traveloz.com.uy en otra pestaña. */
export function VerEnSitio({ ruta, className }: { ruta: string; className?: string }) {
  return (
    <a
      href={urlAbsoluta(ruta)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] underline decoration-col-gold/60 underline-offset-4 transition-colors duration-200 ease-col hover:decoration-col-gold",
        className,
      )}
    >
      Ver en el sitio
      <ExternalLink aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 ease-col group-hover:-translate-y-px group-hover:translate-x-px" strokeWidth={1.5} />
    </a>
  );
}
