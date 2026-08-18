"use client";

// ---------------------------------------------------------------------------
// Primitivas compartidas por los dos formularios de datos.
//
// Mismo sistema visual que el DynamicForm de los landings: tarjeta blanca,
// inputs redondeados de 16px (por debajo de eso iOS hace auto-zoom al enfocar)
// y el rojo de marca como único acento.
// ---------------------------------------------------------------------------

import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { motion } from "motion/react";

/** Acento de marca. Fijo, igual que en los landings de cotizador. */
export const ACENTO = "#F43E55";

export const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";

export function Label({
  children,
  requerido,
  htmlFor,
}: {
  children: React.ReactNode;
  requerido?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-neutral-600">
      {children}
      {requerido && <span className="text-red-500"> *</span>}
    </label>
  );
}

export function Ayuda({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-neutral-400">{children}</p>;
}

/** Campo de texto simple. Uncontrolado: el FormData lo lee del DOM. */
export function Campo({
  name,
  label,
  requerido,
  type = "text",
  ayuda,
  ...rest
}: {
  name: string;
  label: string;
  requerido?: boolean;
  type?: string;
  ayuda?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type">) {
  return (
    <div>
      <Label requerido={requerido} htmlFor={name}>
        {label}
      </Label>
      <input id={name} name={name} type={type} className={inputClass} {...rest} />
      <Ayuda>{ayuda}</Ayuda>
    </div>
  );
}

/** Honeypot: los bots completan todo, las personas nunca ven este input. */
export function Honeypot() {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
    />
  );
}

export function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      style={{ background: ACENTO }}
      className="mt-1 w-full rounded-full px-6 py-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}

/** Pantalla de éxito inline: el formulario se reemplaza por el check. */
export function Exito({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: ACENTO }}
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.14, type: "spring", stiffness: 360, damping: 16 }}
        >
          <Check className="h-8 w-8 text-white" strokeWidth={3} />
        </motion.span>
      </motion.div>
      <p className="text-lg font-semibold text-neutral-900">{titulo}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-neutral-500">{detalle}</p>
    </div>
  );
}

export function ErrorMsg({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {children}
    </p>
  );
}
