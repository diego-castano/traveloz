"use client";

// ---------------------------------------------------------------------------
// Primitivas compartidas por los dos formularios de datos.
//
// El sistema visual arranca del DynamicForm de los landings (tarjeta blanca,
// rojo de marca como único acento) y lo afina: el campo mide 46px en mobile y
// 42px con puntero fino, el radio es 10px en todos los controles y el foco va
// en violeta para no confundirse con un error. Toda la chapa del campo vive en
// formularios.css bajo .fx-input; acá solo se compone.
// ---------------------------------------------------------------------------

import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { motion } from "motion/react";

/**
 * Acento de marca por default (coral, igual que en los landings de
 * cotizador). Los componentes de acá abajo NO usan este valor directo: leen
 * `var(--form-acento, ACENTO)` — y `var(--form-acento-sombra, …)` para las
 * sombras — así un formulario puntual puede pisar el acento (ver PagoForm,
 * que lo pisa a violeta) sin que el resto herede el cambio. Se mantiene
 * exportado para no romper a quien ya importa ACENTO directamente.
 */
export const ACENTO = "#F43E55";

/** Clase única de todos los controles. Ver formularios.css. */
export const inputClass = "fx-input";

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
    <label
      htmlFor={htmlFor}
      className="mb-[5px] block text-[12.5px] font-medium leading-tight text-neutral-600"
    >
      {children}
      {/* El asterisco marca, no grita: acento de marca al 55%. Va por style
          (no clase Tailwind) porque el modificador de opacidad no puede
          resolver un color que vive en una variable CSS. */}
      {requerido && (
        <span
          className="ml-0.5"
          style={{ color: "color-mix(in srgb, var(--form-acento, #F43E55) 55%, transparent)" }}
        >
          *
        </span>
      )}
    </label>
  );
}

export function Ayuda({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-[11.5px] leading-snug text-neutral-400">{children}</p>;
}

/**
 * Título de sección. La barrita de color le da jerarquía sin subir el tamaño:
 * el protagonista de la pantalla son los campos, no los rótulos.
 */
export function Seccion({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-3 w-[3px] rounded-full"
        style={{ background: "var(--form-acento, #F43E55)" }}
      />
      <h2 className="text-[11.5px] font-bold uppercase tracking-[0.11em] text-neutral-500">
        {children}
      </h2>
    </div>
  );
}

/** Separador entre secciones. Hairline, no una línea gris marcada. */
export function Separador() {
  return <div aria-hidden className="h-px bg-neutral-900/[0.07]" />;
}

/** Campo de texto simple. Uncontrolado: el FormData lo lee del DOM. */
export function Campo({
  name,
  label,
  requerido,
  type = "text",
  ayuda,
  className,
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
      {/* className suma modificadores (fx-num, …), nunca reemplaza la base. */}
      <input
        id={name}
        name={name}
        type={type}
        {...rest}
        className={className ? `${inputClass} ${className}` : inputClass}
      />
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
  const bloqueado = pending || disabled;
  return (
    <button
      type="submit"
      disabled={bloqueado}
      style={{
        background: "var(--form-acento, #F43E55)",
        // Sombra teñida del propio botón: lo despega de la tarjeta sin el gris
        // sucio de una sombra neutra. Se apaga cuando está bloqueado.
        boxShadow: bloqueado
          ? "none"
          : "0 8px 20px -10px var(--form-acento-sombra, rgba(244,62,85,0.85))",
      }}
      className="flex h-[50px] w-full items-center justify-center rounded-[12px] px-6 text-[15.5px] font-semibold tracking-[0.01em] text-white transition-all duration-150 hover:brightness-[1.06] active:translate-y-px active:brightness-95 disabled:cursor-not-allowed disabled:opacity-[0.55] sm:h-[46px] sm:text-[15px]"
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}

/** Pantalla de éxito inline: el formulario se reemplaza por el check. */
export function Exito({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col items-center rounded-[14px] border border-emerald-200/70 bg-emerald-50/60 px-6 py-12 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: "var(--form-acento, #F43E55)",
          boxShadow: "0 10px 24px -12px var(--form-acento-sombra, rgba(244,62,85,0.9))",
        }}
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.14, type: "spring", stiffness: 360, damping: 16 }}
        >
          <Check className="h-7 w-7 text-white" strokeWidth={2.6} />
        </motion.span>
      </motion.div>
      <p className="text-[17px] font-semibold text-neutral-900">{titulo}</p>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-neutral-500">{detalle}</p>
    </div>
  );
}

export function ErrorMsg({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="rounded-[10px] border border-red-200/80 bg-red-50/70 px-3.5 py-3 text-[13px] font-medium leading-snug text-red-700">
      {children}
    </p>
  );
}
