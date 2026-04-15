"use client";

import React from "react";
import { cn } from "@/components/lib/cn";

/**
 * FormSection — Stripe Dashboard-style two-column form section.
 *
 * Left rail: section title + annotation (why/when/context).
 * Right column: the actual fields.
 *
 * Usage:
 *
 *   <FormSection
 *     title="Identificacion"
 *     description="Estos datos identifican al paquete en el listado y en el frontend publico."
 *   >
 *     <FieldGroup columns={2}>
 *       <Field>...</Field>
 *     </FieldGroup>
 *   </FormSection>
 *
 * Multiple sections stack with hairline dividers for long-form screens like
 * DatosTab (33 fields). On mobile the rail collapses above the content.
 */

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Custom width for the left rail (default 240px). */
  railWidth?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
  railWidth = "240px",
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "grid gap-6 py-10 first:pt-2",
        // Stronger divider than the near-invisible hairline so long forms
        // (DatosTab has 5 sections stacked) read as clearly separated blocks.
        "border-t first:border-t-0",
        className
      )}
      style={{
        gridTemplateColumns: `minmax(0, ${railWidth}) minmax(0, 1fr)`,
        borderTopColor: "rgba(17,17,36,0.14)",
      }}
    >
      {/* Left rail — title + annotation */}
      <div className="flex flex-col gap-1.5 md:sticky md:top-24 md:self-start">
        <div className="flex items-center gap-2.5">
          {/* Accent bar anchors the section visually without adding chrome. */}
          <span
            aria-hidden="true"
            className="inline-block h-4 w-[3px] rounded-full"
            style={{
              background:
                "linear-gradient(180deg, #45D4C0 0%, #7C3AED 100%)",
            }}
          />
          <h3
            className="text-[15px] font-semibold tracking-tight text-neutral-900"
            style={{ letterSpacing: "-0.01em" }}
          >
            {title}
          </h3>
        </div>
        {description && (
          <p className="text-[12.5px] leading-relaxed text-neutral-500 md:pl-[14px]">
            {description}
          </p>
        )}
      </div>

      {/* Right column — fields */}
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/**
 * FormSections — wrapper that enforces consistent spacing between sections.
 *
 *   <FormSections>
 *     <FormSection title="Identificacion">...</FormSection>
 *     <FormSection title="Clasificacion">...</FormSection>
 *     <FormSection title="Validez">...</FormSection>
 *   </FormSections>
 */
export function FormSections({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}
