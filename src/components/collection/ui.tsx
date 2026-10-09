"use client";

// Piezas base del design system de Collection: botones, campos, filtros y
// cabeceras. Los módulos arman sus formularios solo con estas piezas.

import { forwardRef, useContext, useEffect, useId, useRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import { Popover, Select, Switch, Tooltip } from "radix-ui";
import { Check, ChevronDown, ExternalLink, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { EASE, resorteSuave, transiciones } from "./movimiento";
import { urlAbsoluta } from "@/lib/collection/sitio";
import { CollectionContext } from "./shell/contexto";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 text-col-xs uppercase tracking-[0.14em] text-col-slate", className)}>
      <span aria-hidden className="h-px w-6 bg-col-gold" />
      {children}
    </p>
  );
}

// ── Estados ───────────────────────────────────────────────────────────────
// Un solo componente para todo lo que tiene estado (publicado, borrador,
// consulta nueva, Bitrix, guardado). El color dice qué pasa; el dorado no
// aparece acá: es solo acento de marca.

export type TonoEstado = "ok" | "aviso" | "error" | "info" | "neutro";

const TONOS: Record<TonoEstado, { texto: string; punto: string }> = {
  ok: { texto: "text-col-ok ring-col-ok/25", punto: "bg-col-ok" },
  aviso: { texto: "text-col-aviso ring-col-aviso/30", punto: "bg-col-aviso" },
  error: { texto: "text-col-error ring-col-error/25", punto: "bg-col-error" },
  info: { texto: "text-col-info ring-col-info/25", punto: "bg-col-info" },
  neutro: { texto: "text-col-muted ring-col-line", punto: "bg-col-subtle" },
};

/** Píldora de estado: punto de color y texto corto en sentence case. Fondo blanco, así se lee igual sobre fotos. */
export function Estado({
  tono,
  children,
  className,
  title,
}: {
  tono: TonoEstado;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const t = TONOS[tono];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-col-surface px-2.5 text-col-xs font-medium ring-1 ring-inset",
        t.texto,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.punto)} />
      {children}
    </span>
  );
}

// ── Botones ───────────────────────────────────────────────────────────────

// El foco de botones, chips e interruptores lo dibuja collection.css (contorno
// dorado oscuro con aire). Los campos tienen el suyo: borde tinta y halo.

export const boton = cva(
  cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-col text-col-md font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-col ease-col active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0",
  ),
  {
    variants: {
      variante: {
        // Deshabilitado: gris sólido y legible (nada de opacidad), con el motivo en `motivo`.
        primario: "bg-col-ink text-col-base hover:bg-col-slate disabled:bg-col-line disabled:text-col-muted",
        secundario:
          "border border-col-ink/25 bg-col-surface/0 text-col-ink hover:border-col-ink hover:bg-col-surface disabled:border-col-line disabled:bg-transparent disabled:text-col-muted",
        fantasma: "text-col-slate hover:bg-col-ink/[0.05] hover:text-col-ink disabled:bg-transparent disabled:text-col-muted",
        peligro: "bg-col-alerta text-col-base hover:bg-[#86321F] disabled:bg-col-line disabled:text-col-muted",
      },
      tam: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5",
      },
    },
    defaultVariants: { variante: "primario", tam: "md" },
  },
);

/** Ruedita chica para estados de carga. */
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden strokeWidth={1.75} className={cn("h-4 w-4 animate-spin", className)} />;
}

type BotonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof boton> & {
    /** Muestra la ruedita, deshabilita y avisa a lectores de pantalla. */
    cargando?: boolean;
    /** Por qué está deshabilitado: globo nativo y texto para lectores de pantalla. */
    motivo?: string;
  };

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { className, variante, tam, type = "button", cargando, disabled, motivo, children, ...props },
  ref,
) {
  const conMotivo = disabled && !cargando && motivo;
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      title={conMotivo ? motivo : undefined}
      className={cn(boton({ variante, tam }), className)}
      {...props}
    >
      {cargando && <Spinner />}
      {children}
      {conMotivo && <span className="sr-only">. {motivo}</span>}
    </button>
  );
});

const botonIcono = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center rounded-col transition-[background-color,color,border-color,box-shadow,transform] duration-col ease-col active:scale-[0.94] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-col-subtle disabled:active:scale-100",
  ),
  {
    variants: {
      variante: {
        fantasma: "text-col-slate hover:bg-col-ink/[0.06] hover:text-col-ink",
        secundario: "border border-col-line bg-col-surface text-col-slate hover:border-col-slate/40 hover:text-col-ink",
        primario: "bg-col-ink text-col-base hover:bg-col-slate",
        peligro: "text-col-slate hover:bg-col-alerta/10 hover:text-col-alerta",
      },
      tam: {
        sm: "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4",
        md: "h-10 w-10 [&>svg]:h-[18px] [&>svg]:w-[18px]",
      },
    },
    defaultVariants: { variante: "fantasma", tam: "md" },
  },
);

/** Botón de solo ícono con globo: la etiqueta es el nombre accesible y el tooltip. */
export const BotonIcono = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof botonIcono> & { etiqueta: string; lado?: "top" | "bottom" | "left" | "right" }
>(function BotonIcono({ etiqueta, lado = "top", variante, tam, className, type = "button", ...props }, ref) {
  const raiz = useContext(CollectionContext)?.raiz;
  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button ref={ref} type={type} aria-label={etiqueta} className={cn(botonIcono({ variante, tam }), className)} {...props} />
        </Tooltip.Trigger>
        <Tooltip.Portal container={raiz}>
          <Tooltip.Content
            side={lado}
            sideOffset={6}
            className="z-[95] rounded-col bg-col-ink px-2.5 py-1.5 font-col-text text-col-xs text-col-base shadow-col-3 data-[state=delayed-open]:animate-[col-pop_160ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            {etiqueta}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
});

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("col-skeleton rounded-col-sm", className)} style={style} />;
}

// ── Campos ────────────────────────────────────────────────────────────────
// Dos variantes y nada más: "caja" (por defecto, 44 px) y "título" (Cormorant
// grande con subrayado, para el título de los editores). Ningún texto toca un
// borde: la caja lleva 14 px de aire a los lados y el título aire abajo.

export const etiquetaCampo = "text-col-sm font-medium text-col-ink";

export const entrada = cn(
  "col-anillo block w-full min-w-0 min-h-11 rounded-col border border-col-line bg-col-surface px-3.5 py-[9px] text-col-cuerpo leading-6 text-col-ink",
  "placeholder:text-col-slate/50 transition-[border-color,box-shadow,background-color] duration-col ease-col",
  "hover:border-col-slate/40 focus:border-col-ink focus:outline-none focus:ring-0 focus:shadow-col-anillo",
  "disabled:cursor-not-allowed disabled:border-col-line disabled:bg-col-base disabled:text-col-muted read-only:bg-col-base/60",
  "aria-[invalid=true]:border-col-alerta aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(158,61,47,0.14)]",
);

/** Select nativo con la misma caja y la flecha dibujada en collection.css. */
export const entradaSelect = cn(entrada, "col-select cursor-pointer appearance-none truncate pr-10");

/** Textarea de caja: crece con el texto. */
export const entradaArea = cn(entrada, "min-h-[88px] resize-none leading-relaxed [field-sizing:content]");

/** Título grande de los editores: Cormorant, solo subrayado. El tamaño lo pone quien lo usa. */
export const entradaTitulo =
  "col-anillo block w-full min-w-0 border-0 border-b border-col-line bg-transparent px-0 pb-3 pt-1 font-col-display text-col-ink placeholder:italic placeholder:text-col-slate/40 transition-colors duration-col ease-col hover:border-col-slate/40 focus:border-col-foco focus:outline-none focus:ring-0 disabled:opacity-60 aria-[invalid=true]:border-col-alerta";

/** Caja para campos compuestos (prefijo + input, chips + input): la caja se ilumina con el foco de adentro. */
export const cajaCompuesta =
  "flex min-h-11 w-full min-w-0 items-center rounded-col border border-col-line bg-col-surface transition-[border-color,box-shadow] duration-col ease-col hover:border-col-slate/40 focus-within:border-col-ink focus-within:shadow-col-anillo";

/** Input sin borde que va dentro de cajaCompuesta. */
export const entradaInterna =
  "col-anillo min-w-0 flex-1 border-0 bg-transparent px-3.5 py-[9px] text-col-cuerpo leading-6 text-col-ink placeholder:text-col-slate/50 focus:outline-none focus:ring-0";

/** Etiqueta arriba, el control, y abajo la ayuda o el error. A la derecha de la etiqueta, el contador o una acción. */
export function Campo({
  etiqueta,
  ayuda,
  htmlFor,
  accion,
  error,
  children,
  className,
}: {
  etiqueta: string;
  ayuda?: React.ReactNode;
  htmlFor?: string;
  accion?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex min-h-4 items-baseline justify-between gap-4">
        <label htmlFor={htmlFor} className={etiquetaCampo}>
          {etiqueta}
        </label>
        {accion}
      </div>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="e"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="-mt-0.5 text-col-sm leading-snug text-col-alerta"
          >
            {error}
          </motion.p>
        ) : (
          ayuda && (
            <p key="a" className="-mt-0.5 text-col-sm leading-relaxed text-col-muted">
              {ayuda}
            </p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

/** "12 / 60": verde dentro del rango ideal, rojo al pasarse. */
export function Contador({ n, ideal, max }: { n: number; ideal?: number; max: number }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "text-col-xs tabular-nums lining-nums text-col-muted transition-colors duration-col",
        ideal && n >= ideal * 0.6 && n <= max && "text-col-ok",
        n > max && "text-col-error",
      )}
    >
      {n} / {max}
    </span>
  );
}

export const Entrada = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean; variante?: "caja" | "titulo" }
>(function Entrada({ className, invalido, variante = "caja", ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalido || undefined}
      className={cn(variante === "titulo" ? entradaTitulo : entrada, className)}
      {...props}
    />
  );
});

export const AreaTexto = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalido?: boolean }>(
  function AreaTexto({ className, invalido, ...props }, ref) {
    return <textarea ref={ref} aria-invalid={invalido || undefined} className={cn(entradaArea, className)} {...props} />;
  },
);

export interface OpcionSelector {
  valor: string;
  label: string;
  deshabilitada?: boolean;
}

// Radix no acepta "" como valor de un ítem: "ninguno" viaja con esta marca.
const VACIO = "__vacio__";

/** Desplegable con la caja de los campos y una lista propia (Radix Select). */
export function Selector({
  id,
  valor,
  onCambio,
  opciones,
  placeholder = "Elegir",
  etiqueta,
  deshabilitado,
  invalido,
  className,
}: {
  id?: string;
  valor: string;
  onCambio: (v: string) => void;
  opciones: OpcionSelector[];
  placeholder?: string;
  /** Nombre accesible si no hay <label htmlFor>. */
  etiqueta?: string;
  deshabilitado?: boolean;
  invalido?: boolean;
  className?: string;
}) {
  const raiz = useContext(CollectionContext)?.raiz;
  return (
    <Select.Root value={valor === "" ? VACIO : valor} onValueChange={(v) => onCambio(v === VACIO ? "" : v)} disabled={deshabilitado}>
      <Select.Trigger
        id={id}
        aria-label={etiqueta}
        aria-invalid={invalido || undefined}
        className={cn(
          entrada,
          "group flex items-center justify-between gap-3 text-left data-[placeholder]:text-col-slate/50 data-[state=open]:border-col-ink data-[state=open]:shadow-col-anillo",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon asChild>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-col-slate transition-transform duration-col ease-col group-data-[state=open]:rotate-180"
            strokeWidth={1.5}
            aria-hidden
          />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={raiz}>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={16}
          className="z-[95] max-h-[min(360px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-[180px] overflow-hidden rounded-col border border-col-line bg-col-surface font-col-text shadow-col-3 data-[state=open]:animate-[col-pop_160ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          <Select.Viewport className="p-1">
            {opciones.map((o) => (
              <Select.Item
                key={o.valor || VACIO}
                value={o.valor === "" ? VACIO : o.valor}
                disabled={o.deshabilitada}
                className="col-anillo relative flex min-h-10 cursor-pointer select-none items-center rounded-col-sm py-2 pl-9 pr-3 text-col-md leading-snug text-col-ink outline-none transition-colors duration-col-rapido data-[disabled]:cursor-default data-[highlighted]:bg-col-base data-[disabled]:opacity-40"
              >
                <Select.ItemIndicator className="absolute left-3 flex">
                  <Check className="h-4 w-4 text-col-gold" strokeWidth={2} aria-hidden />
                </Select.ItemIndicator>
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function Interruptor({
  checked,
  onCheckedChange,
  disabled,
  label,
  id,
  texto,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  id?: string;
  /** Texto visible a la derecha ("Publicado" / "Oculto"). Tocarlo también cambia. */
  texto?: string;
}) {
  const propio = useId();
  const idSw = id ?? propio;
  const sw = (
    <Switch.Root
      id={idSw}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        // El ::before agranda el área táctil a 44 px de alto sin mover nada.
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-col-line transition-colors duration-col ease-col before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-[''] hover:bg-col-slate/30 data-[state=checked]:bg-col-ink disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <Switch.Thumb className="block h-[18px] w-[18px] translate-x-[3px] rounded-full bg-col-surface shadow-col-1 transition-transform duration-col-lento ease-col data-[state=checked]:translate-x-[19px] data-[state=checked]:bg-col-gold" />
    </Switch.Root>
  );
  if (!texto) return sw;
  // Etiqueta siempre a la derecha, igual en todos los módulos.
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5">
      {sw}
      <label htmlFor={idSw} aria-hidden className={cn("min-w-[52px] cursor-pointer select-none text-col-sm text-col-slate", disabled && "cursor-not-allowed")}>
        {texto}
      </label>
    </span>
  );
}

/** Control segmentado: una opción de pocas, con la píldora que se desliza. */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
  className,
}: {
  opciones: { id: T; label: React.ReactNode; deshabilitada?: boolean }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={etiqueta} className={cn("inline-flex max-w-full rounded-col bg-col-base p-1 ring-1 ring-inset ring-col-line", className)}>
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={o.deshabilitada}
            onClick={() => onCambio(o.id)}
            className={cn(
              "relative flex h-8 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-col-sm px-3.5 text-col-md transition-colors duration-col ease-col disabled:opacity-40",
              activo ? "text-col-ink" : "text-col-slate hover:text-col-ink",
            )}
          >
            {activo && (
              <motion.span
                layoutId={`seg-${id}`}
                aria-hidden
                className="absolute inset-0 rounded-col-sm bg-col-surface shadow-col-1"
                transition={resorteSuave}
              />
            )}
            <span className="relative flex items-center gap-2">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Chips de texto en una caja: Enter agrega, la cruz quita, Backspace borra el último. */
export function Chips({
  valores,
  onCambio,
  placeholder,
  max,
  maxLargo = 80,
  label,
  deshabilitado,
}: {
  valores: string[];
  onCambio: (v: string[]) => void;
  placeholder: string;
  max: number;
  maxLargo?: number;
  label: string;
  deshabilitado?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const agregar = () => {
    const t = texto.trim();
    if (!t || valores.length >= max || valores.includes(t)) return;
    onCambio([...valores, t.slice(0, maxLargo)]);
    setTexto("");
  };
  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-col border border-col-line bg-col-surface px-2 py-[7px] transition-[border-color,box-shadow] duration-col ease-col hover:border-col-slate/40 focus-within:border-col-ink focus-within:shadow-col-anillo",
        deshabilitado && "bg-col-base",
      )}
    >
      <AnimatePresence initial={false}>
        {valores.map((v) => (
          <motion.span
            key={v}
            layout
            {...transiciones.pop}
            className="flex h-7 items-center gap-1 rounded-col-sm bg-col-base pl-2.5 pr-1 text-col-sm text-col-ink"
          >
            {v}
            {!deshabilitado && (
              <button
                type="button"
                aria-label={`Quitar ${v}`}
                onClick={() => onCambio(valores.filter((x) => x !== v))}
                className="relative flex h-5 w-5 items-center justify-center rounded-col-sm text-col-slate transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-col-line hover:text-col-ink"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </motion.span>
        ))}
      </AnimatePresence>
      {!deshabilitado && valores.length < max && (
        <input
          aria-label={label}
          value={texto}
          maxLength={maxLargo}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            } else if (e.key === "Backspace" && !texto && valores.length) {
              onCambio(valores.slice(0, -1));
            }
          }}
          onBlur={agregar}
          placeholder={valores.length ? "" : placeholder}
          className="col-anillo h-7 min-w-[140px] flex-1 border-0 bg-transparent px-1.5 py-0 text-col-cuerpo text-col-ink placeholder:text-col-slate/50 focus:outline-none focus:ring-0"
        />
      )}
    </div>
  );
}

/**
 * Cabecera de cada módulo: título en Cormorant, una línea y acciones a la
 * derecha en la misma fila. Sin eyebrow: la miga de la barra ya dice el
 * módulo. `eyebrow` queda para pantallas sin miga (Inicio).
 */
export function EncabezadoPagina({
  eyebrow,
  titulo,
  descripcion,
  acciones,
  className,
}: {
  eyebrow?: React.ReactNode;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="min-w-0 max-w-[880px] flex-[1_1_360px]">
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        {/* La descripción corta va en la misma línea que el título; si no entra, baja. */}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 className="font-col-display text-col-3xl font-light text-col-ink">{titulo}</h1>
          {descripcion && <p className="text-col-cuerpo text-col-muted">{descripcion}</p>}
        </div>
      </div>
      {acciones && <div className="flex max-w-full flex-wrap items-center gap-3">{acciones}</div>}
    </header>
  );
}

export function EncabezadoSkeleton({ acciones = 1 }: { acciones?: number }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="flex min-w-0 flex-[1_1_360px] flex-wrap items-end gap-x-5 gap-y-2">
        <Skeleton className="h-9 w-[min(340px,80%)]" />
        <Skeleton className="h-4 w-[min(220px,60%)]" />
      </div>
      {acciones > 0 && <Skeleton className="h-10 w-48" />}
    </div>
  );
}

/**
 * Estado vacío de un módulo: ícono en un círculo, una frase, una ayuda corta y
 * la acción principal. Con `compacto`, para "nada con ese filtro".
 */
export function Vacio({
  icono: Icono,
  titulo,
  texto,
  accion,
  compacto,
}: {
  icono: LucideIcon;
  titulo: string;
  texto?: string;
  accion?: React.ReactNode;
  compacto?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compacto ? "py-16" : "rounded-col-lg border border-dashed border-col-line px-6 py-20")}>
      <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-col-surface text-col-slate shadow-col-1">
        <Icono className="h-6 w-6" strokeWidth={1.4} />
      </span>
      <p className="mt-5 max-w-[30ch] font-col-display text-col-2xl leading-tight text-col-ink">{titulo}</p>
      {texto && <p className="mt-2 max-w-[46ch] text-col-cuerpo text-col-muted">{texto}</p>}
      {accion && <div className="mt-6 flex flex-wrap justify-center gap-3">{accion}</div>}
    </div>
  );
}

/** Fila de herramientas bajo la cabecera: filtros y búsqueda. Envuelve, nunca desborda. */
export const barraHerramientas = "mb-6 flex flex-wrap items-center gap-x-6 gap-y-3";

/** Elevación suave de tarjetas al pasar el mouse (va en el hijo de un `group`). */
export const tarjetaElevable =
  "transition-[transform,box-shadow] duration-col ease-col group-hover:-translate-y-0.5 group-hover:shadow-col-2";

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
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-col-slate" strokeWidth={1.5} aria-hidden />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(entrada, "min-h-10 py-[7px] pl-10")}
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
  "flex h-10 shrink-0 items-center gap-2 rounded-col border px-3.5 text-col-md transition-[background-color,border-color,color,transform] duration-col ease-col active:scale-[0.98]";

function Conteo({ n, activo }: { n?: number; activo: boolean }) {
  if (!n) return null;
  return <span className={cn("text-col-xs tabular-nums lining-nums", activo ? "text-col-gold" : "text-col-muted")}>{n}</span>;
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
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-col ease-col group-data-[state=open]:rotate-180" strokeWidth={1.5} aria-hidden />
            </Popover.Trigger>
            <Popover.Portal container={raiz}>
              <Popover.Content
                align="start"
                sideOffset={6}
                collisionPadding={16}
                className="z-50 w-[min(280px,calc(100vw-2rem))] rounded-col-sm border border-col-line bg-col-surface p-1 font-col-text shadow-col-3 focus:outline-none"
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
                        className="flex h-10 w-full items-center gap-3 rounded-col-sm px-3 text-left text-col-md text-col-ink transition-colors duration-col-rapido ease-col hover:bg-col-base focus-visible:bg-col-base"
                      >
                        <span className="flex w-4 justify-center">
                          {valor === o.id && <Check className="h-4 w-4 text-col-gold" strokeWidth={2} aria-hidden />}
                        </span>
                        <span className="flex-1">{o.label}</span>
                        {!!o.n && <span className="text-col-xs tabular-nums lining-nums text-col-muted">{o.n}</span>}
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
          className="transition-[stroke-dasharray] duration-col-lento ease-col"
        />
      </svg>
      <span className="font-col-display text-col-xl tabular-nums lining-nums leading-none">
        {pct}
        <span className="text-col-xs">%</span>
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
        "group inline-flex items-center gap-1.5 text-col-sm underline decoration-col-gold/60 underline-offset-4 transition-colors duration-col ease-col hover:decoration-col-gold",
        className,
      )}
    >
      Ver en el sitio
      <ExternalLink aria-hidden className="h-3.5 w-3.5 transition-transform duration-col ease-col group-hover:-translate-y-px group-hover:translate-x-px" strokeWidth={1.5} />
    </a>
  );
}
