"use client";

// Piezas base del design system de Collection.

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Switch } from "radix-ui";
import { cn } from "@/components/lib/cn";

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
