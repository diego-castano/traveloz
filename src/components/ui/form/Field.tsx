"use client";

import React, { createContext, useContext, useId } from "react";
import { cn } from "@/components/lib/cn";

/**
 * Field primitives — shadcn-style composable form rows.
 *
 * Replaces the `<div className="flex flex-col gap-4"><Input label="X" /></div>`
 * pattern with a semantic, accessible, data-invalid-cascade-aware group.
 *
 * Usage:
 *
 *   <FieldGroup columns={2}>
 *     <Field>
 *       <FieldLabel>Nombre</FieldLabel>
 *       <Input value={name} onChange={e => setName(e.target.value)} />
 *       <FieldDescription>Como aparecera en reportes.</FieldDescription>
 *     </Field>
 *     <Field invalid>
 *       <FieldLabel>Email</FieldLabel>
 *       <Input type="email" aria-invalid />
 *       <FieldError>Email invalido.</FieldError>
 *     </Field>
 *   </FieldGroup>
 *
 * Or grouped into a titled section:
 *
 *   <FieldSet>
 *     <FieldLegend>Contacto</FieldLegend>
 *     <FieldDescription>Datos opcionales para notificaciones.</FieldDescription>
 *     <FieldGroup>...</FieldGroup>
 *   </FieldSet>
 */

// ---------------------------------------------------------------------------
// Context — passes the field's id down to label + error for a11y wiring
// ---------------------------------------------------------------------------

interface FieldContextValue {
  id: string;
  invalid: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useFieldContext() {
  return useContext(FieldContext);
}

// ---------------------------------------------------------------------------
// FieldGroup — vertical stack with configurable columns
// ---------------------------------------------------------------------------

interface FieldGroupProps {
  children: React.ReactNode;
  /** Column count on md+ screens. 1 (default) = full width. */
  columns?: 1 | 2 | 3;
  className?: string;
}

export function FieldGroup({
  children,
  columns = 1,
  className,
}: FieldGroupProps) {
  return (
    <div
      className={cn(
        "grid gap-x-5 gap-y-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldSet — titled section wrapper (Stripe Dashboard pattern)
// ---------------------------------------------------------------------------

interface FieldSetProps {
  children: React.ReactNode;
  className?: string;
}

export function FieldSet({ children, className }: FieldSetProps) {
  return (
    <fieldset
      className={cn("flex flex-col gap-3 border-0 p-0", className)}
    >
      {children}
    </fieldset>
  );
}

export function FieldLegend({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <legend
      className={cn(
        "text-[13px] font-semibold text-neutral-900",
        className
      )}
    >
      {children}
    </legend>
  );
}

// ---------------------------------------------------------------------------
// Field — single form row, provides id + state to descendants
// ---------------------------------------------------------------------------

interface FieldProps {
  children: React.ReactNode;
  /** Layout: stacked (default) or horizontal (label + control side-by-side). */
  orientation?: "vertical" | "horizontal";
  invalid?: boolean;
  disabled?: boolean;
  /** Column span inside a FieldGroup. Defaults to 1. Use 2 to span a full row. */
  span?: 1 | 2;
  className?: string;
  /** Optional explicit id; otherwise auto-generated via useId(). */
  id?: string;
}

export function Field({
  children,
  orientation = "vertical",
  invalid = false,
  disabled = false,
  span = 1,
  className,
  id,
}: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <FieldContext.Provider value={{ id: fieldId, invalid, disabled }}>
      <div
        data-invalid={invalid ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
        className={cn(
          "flex",
          orientation === "vertical" ? "flex-col gap-1.5" : "items-center gap-3",
          span === 2 && "md:col-span-2",
          disabled && "opacity-60",
          className
        )}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// FieldLabel — uppercase micro-label, linked via htmlFor
// ---------------------------------------------------------------------------

interface FieldLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  /** Show optional `*` required marker. */
  required?: boolean;
}

export function FieldLabel({
  children,
  required,
  htmlFor,
  className,
  ...props
}: FieldLabelProps) {
  const ctx = useFieldContext();
  const id = htmlFor ?? ctx?.id;

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-1 text-label font-medium",
        ctx?.invalid ? "text-[#CC2030]" : "text-neutral-500",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-[#E74C5F]">
          *
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// FieldDescription — helper text below the control
// ---------------------------------------------------------------------------

export function FieldDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11.5px] leading-relaxed text-neutral-400",
        className
      )}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// FieldError — only renders when invalid
// ---------------------------------------------------------------------------

interface FieldErrorProps {
  children?: React.ReactNode;
  className?: string;
}

export function FieldError({ children, className }: FieldErrorProps) {
  const ctx = useFieldContext();
  if (!children) return null;
  return (
    <p
      role="alert"
      id={ctx ? `${ctx.id}-error` : undefined}
      className={cn(
        "text-[11.5px] font-medium text-[#CC2030]",
        className
      )}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Hook — let custom controls pull the field context to wire id + aria
// ---------------------------------------------------------------------------

export function useField() {
  const ctx = useFieldContext();
  return {
    id: ctx?.id,
    invalid: ctx?.invalid ?? false,
    disabled: ctx?.disabled ?? false,
    "aria-invalid": ctx?.invalid || undefined,
    "aria-describedby": ctx?.invalid ? `${ctx.id}-error` : undefined,
  } as const;
}
