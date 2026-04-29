"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/components/lib/cn";

interface BulkActionBarProps {
  count: number;
  /** Optional label override. Defaults to "N seleccionados". */
  label?: (count: number) => string;
  /** Renders the action buttons on the right side. */
  actions: React.ReactNode;
  onClear: () => void;
  className?: string;
}

/**
 * BulkActionBar — floating bar that materializes when one or more rows are
 * selected. Lives at the bottom of the viewport so it never pushes content.
 *
 * The parent owns selection state (typically a `Set<string>` of row ids or
 * the TanStack Table `rowSelection` object) and renders the action buttons
 * itself, so this component stays presentation-only.
 */
export function BulkActionBar({
  count,
  label,
  actions,
  onClear,
  className,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-bar"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "pointer-events-none fixed inset-x-0 bottom-6 z-[180] flex justify-center px-4",
            className,
          )}
          role="region"
          aria-label="Acciones para selección múltiple"
        >
          <div
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-full px-2 text-sm shadow-[0_18px_48px_-18px_rgba(17,17,36,0.45)]"
            style={{
              background: "rgba(26,26,46,0.92)",
              backdropFilter: "blur(14px) saturate(180%)",
              WebkitBackdropFilter: "blur(14px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              type="button"
              onClick={onClear}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Limpiar selección"
            >
              <X size={14} strokeWidth={2.25} />
            </button>
            <span className="px-1 text-[12.5px] font-medium tabular-nums text-white">
              {label ? label(count) : `${count} seleccionados`}
            </span>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <div className="flex items-center gap-1 pr-1">{actions}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
