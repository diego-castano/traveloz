"use client";

import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { motion } from "motion/react";

export type ViewMode = "table" | "grid";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

/**
 * ViewToggle — compact icon segmented control for switching between a dense
 * table view and a photo-first grid view. Mirrors the layout of
 * SegmentedControl but with icon-only buttons for minimal toolbar footprint.
 */
export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const layoutId = React.useId();

  const options: Array<{ value: ViewMode; icon: typeof LayoutGrid; label: string }> =
    [
      { value: "table", icon: List, label: "Vista tabla" },
      { value: "grid", icon: LayoutGrid, label: "Vista grilla" },
    ];

  return (
    <div
      role="radiogroup"
      aria-label="Cambiar vista"
      className={cn(
        "inline-flex h-8 items-center rounded-[9px] border border-hairline bg-neutral-50 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors",
              isActive ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600",
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[7px] bg-white shadow-[0_1px_3px_rgba(17,17,36,0.10),0_0_0_1px_rgba(17,17,36,0.04)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon size={14} strokeWidth={1.9} className="relative" />
          </button>
        );
      })}
    </div>
  );
}
