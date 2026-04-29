"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/components/lib/cn";

export type SortDirection = "asc" | "desc" | false;

interface SortableHeadProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Direction the column is currently sorted in, or `false` if not sorted. */
  direction: SortDirection;
  /** Cycles through asc → desc → none. */
  onSort: () => void;
  /** Body alignment shorthand for the wrapper (matches DataTableHead). */
  align?: "left" | "right" | "center";
  children: React.ReactNode;
}

/**
 * SortableHead — clickable trigger inside a <TableHead> that toggles a column
 * between asc / desc / unsorted. Pure UI; the parent owns the sort state.
 *
 * Visuals match the rest of the admin: muted column label, ChevronsUpDown
 * placeholder when neutral, ChevronUp / ChevronDown when active, all
 * monochrome to avoid clashing with the Brand teal accent.
 */
export function SortableHead({
  direction,
  onSort,
  align = "left",
  className,
  children,
  ...rest
}: SortableHeadProps) {
  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        "group inline-flex items-center gap-1 select-none rounded-sm text-inherit outline-none transition-colors hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/30",
        align === "right" && "ml-auto flex-row-reverse",
        align === "center" && "mx-auto",
        className,
      )}
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
      {...rest}
    >
      <span>{children}</span>
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center transition-opacity",
          direction === false
            ? "opacity-0 group-hover:opacity-60"
            : "opacity-90",
        )}
      >
        {direction === "asc" ? (
          <ChevronUp size={12} strokeWidth={2.25} />
        ) : direction === "desc" ? (
          <ChevronDown size={12} strokeWidth={2.25} />
        ) : (
          <ChevronsUpDown size={12} strokeWidth={2.25} />
        )}
      </span>
    </button>
  );
}
