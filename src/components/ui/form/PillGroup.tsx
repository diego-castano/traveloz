"use client";

import * as React from "react";
import { cn } from "@/components/lib/cn";

export interface PillOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  tone?: "neutral" | "sky" | "teal" | "amber" | "violet" | "rose";
}

interface PillGroupProps<T extends string> {
  value: T | "";
  onValueChange: (value: T) => void;
  options: PillOption<T>[];
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

export function PillGroup<T extends string>({
  value,
  onValueChange,
  options,
  disabled,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: PillGroupProps<T>) {
  const toneClasses: Record<NonNullable<PillOption["tone"]>, string> = {
    neutral: "border-neutral-200 bg-white text-neutral-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-2 sm:grid-cols-3",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const tone = opt.tone ?? "neutral";
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(opt.value)}
            title={opt.description}
            className={cn(
              "flex min-h-[78px] flex-col items-start justify-between gap-1.5 rounded-[14px] border px-3 py-2.5 text-left transition-all",
              "shadow-[0_1px_2px_rgba(17,17,36,0.04)]",
              size === "sm" && "min-h-[68px]",
              active
                ? cn(
                    toneClasses[tone],
                    "shadow-[0_10px_22px_rgba(17,17,36,0.08)]",
                    "ring-1 ring-offset-0",
                  )
                : "border-hairline bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold">{opt.label}</span>
              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                  active ? "bg-current opacity-80" : "bg-neutral-300",
                )}
              />
            </div>

            {opt.description && (
              <span
                className={cn(
                  "text-[11.5px] leading-snug",
                  active ? "opacity-100" : "text-neutral-400",
                )}
              >
                {opt.description}
              </span>
            )}

            {active && (
              <span className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-current">
                Seleccionado
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
