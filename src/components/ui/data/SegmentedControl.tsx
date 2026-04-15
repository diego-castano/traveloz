"use client";

import * as React from "react";
import { cn } from "@/components/lib/cn";
import { motion } from "motion/react";

/**
 * SegmentedControl — compact pill group for a small, mutually exclusive (or
 * toggleable) set of options. Great for Estado filters (Todos / Activo /
 * Borrador / Inactivo) or view modes (Tabla / Grid).
 *
 * The active pill has an animated indicator that slides between options using
 * `layoutId` so transitions feel tactile.
 *
 * Usage:
 *   <SegmentedControl
 *     options={[
 *       { value: "all", label: "Todos", count: 183 },
 *       { value: "ACTIVO", label: "Activos", count: 121 },
 *       { value: "BORRADOR", label: "Borrador", count: 62 },
 *     ]}
 *     value={estadoFilter}
 *     onChange={setEstadoFilter}
 *   />
 */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Small color dot before label (used for Estado pills). */
  color?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Visual size — "sm" fits toolbars, "md" is standalone. */
  size?: "sm" | "md";
  className?: string;
  /** A11y label. */
  "aria-label"?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const layoutId = React.useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-[9px] border border-hairline bg-neutral-50 p-0.5",
        size === "sm" ? "h-8" : "h-9",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 font-medium transition-colors",
              size === "sm" ? "h-7 text-[12px]" : "h-8 text-[13px]",
              isActive ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700",
            )}
          >
            {/* Active pill background (animated between segments) */}
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[7px] bg-white shadow-[0_1px_3px_rgba(17,17,36,0.10),0_0_0_1px_rgba(17,17,36,0.04)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}

            {option.color && (
              <span
                className="relative h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: option.color }}
              />
            )}
            <span className="relative">{option.label}</span>
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "relative font-mono tabular-nums",
                  size === "sm" ? "text-[10px]" : "text-[11px]",
                  isActive ? "text-neutral-400" : "text-neutral-300",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
