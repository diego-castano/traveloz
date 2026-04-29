"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export interface ActiveFilterChip {
  /** Stable key for the chip — usually `${dimension}:${value}`. */
  key: string;
  /** Short dimension label, e.g. "Temporada". */
  dimension: string;
  /** Human-readable value, e.g. "Verano 2026". */
  value: string;
  /** Removes only this chip. */
  onRemove: () => void;
  /** Optional accent color (matches the dimension color in the toolbar). */
  color?: string;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  /** Removes every chip (and resets search/segmented). */
  onClearAll?: () => void;
  /** Total number of active filter atoms (incl. search/segmented). Used in the
   *  "Limpiar (n)" label when present. Defaults to chips.length. */
  totalCount?: number;
}

/**
 * ActiveFilterChips — single-line, removable representation of every filter
 * currently constraining the result set. Lives directly under the filter
 * toolbar so users see at a glance what's applied without opening every
 * popover.
 */
export function ActiveFilterChips({
  chips,
  onClearAll,
  totalCount,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  const count = totalCount ?? chips.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            initial={{ opacity: 0, scale: 0.92, y: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -2 }}
            transition={{ duration: 0.14 }}
            className="group inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[11.5px] font-medium transition-colors"
            style={{
              borderColor: chip.color
                ? `${chip.color}40`
                : "rgba(139,92,246,0.25)",
              background: chip.color
                ? `${chip.color}10`
                : "rgba(139,92,246,0.06)",
              color: "rgb(64,64,72)",
            }}
            aria-label={`Quitar filtro ${chip.dimension}: ${chip.value}`}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: chip.color ?? "rgb(139,92,246)" }}
            >
              {chip.dimension}
            </span>
            <span className="truncate max-w-[180px]">{chip.value}</span>
            <span
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors group-hover:bg-neutral-200"
              style={{ color: "rgb(120,120,128)" }}
            >
              <X size={10} strokeWidth={2.5} />
            </span>
          </motion.button>
        ))}
      </AnimatePresence>

      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-neutral-500 hover:text-neutral-900"
        >
          Limpiar todo
          <span className="font-mono text-[10px] text-neutral-400 tabular-nums">
            ({count})
          </span>
        </button>
      )}
    </div>
  );
}
