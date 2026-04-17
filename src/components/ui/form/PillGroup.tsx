"use client";

import * as React from "react";
import { cn } from "@/components/lib/cn";

export interface PillOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
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
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-[10px] border border-hairline bg-rail p-1",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(opt.value)}
            title={opt.description}
            className={cn(
              "rounded-[8px] font-medium transition-colors whitespace-nowrap",
              size === "sm"
                ? "h-7 px-2.5 text-[12px]"
                : "h-8 px-3 text-[13px]",
              active
                ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(17,17,36,0.08),0_0_0_1px_rgba(17,17,36,0.08)]"
                : "text-neutral-500 hover:bg-white/60 hover:text-neutral-800",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
