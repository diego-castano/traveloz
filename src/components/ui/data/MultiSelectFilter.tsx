"use client";

import * as React from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/components/lib/cn";

/**
 * MultiSelectFilter — popover-based multi-select with built-in search and
 * count badge. Replaces long horizontal chip rows for filter dimensions with
 * more than ~4 options.
 *
 * Design:
 *   - Trigger is a compact button showing `Label (· N)` when items are selected.
 *   - Panel opens below, has sticky search, scrollable checkbox list, and a
 *     footer with "Limpiar" to clear just this filter.
 *   - Closing the popover keeps the selection (no Cancel/Apply dance).
 *
 * Usage:
 *   <MultiSelectFilter
 *     label="Temporada"
 *     options={[{ value: "alta", label: "Temporada Alta" }, ...]}
 *     selected={selectedTemporadas}
 *     onChange={setSelectedTemporadas}
 *   />
 */

export interface FilterOption {
  value: string;
  label: string;
  /** Optional count shown in right column (e.g., 42). */
  count?: number;
  /** Optional color dot (e.g., temporada color). */
  color?: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Show a search box inside the popover. Default true if options.length > 8. */
  searchable?: boolean;
  /** Popover alignment. */
  align?: "start" | "center" | "end";
  className?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable,
  align = "start",
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const allowSearch = searchable ?? options.length > 8;
  const selectedCount = selected.length;
  const hasSelection = selectedCount > 0;

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12.5px] font-medium transition-colors",
            hasSelection
              ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/8 text-neutral-900"
              : "border-hairline bg-white text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50",
            className,
          )}
        >
          <span>{label}</span>

          {hasSelection ? (
            <>
              <span className="mx-0.5 h-3 w-px bg-[#8B5CF6]/30" />
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#8B5CF6] px-1 font-mono text-[10px] font-bold text-white tabular-nums">
                {selectedCount}
              </span>
              <button
                type="button"
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
                onClick={clearAll}
                aria-label={`Limpiar ${label}`}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <ChevronDown
              size={13}
              strokeWidth={2}
              className="text-neutral-400 transition-transform group-data-[state=open]:rotate-180"
            />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-64 overflow-hidden rounded-[10px] border border-hairline bg-white shadow-[0_10px_40px_-12px_rgba(17,17,36,0.22)]"
          onOpenAutoFocus={(e) => {
            // Prevent stealing focus if non-searchable
            if (!allowSearch) e.preventDefault();
          }}
        >
          {/* Header with title + search */}
          <div className="border-b border-hairline px-3 py-2.5">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                {label}
              </span>
              {hasSelection && (
                <button
                  type="button"
                  className="text-[11px] font-medium text-[#8B5CF6] hover:underline"
                  onClick={() => onChange([])}
                >
                  Limpiar
                </button>
              )}
            </div>
            {allowSearch && (
              <div className="relative mt-1.5">
                <Search
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="h-7 w-full rounded-[6px] border border-hairline bg-neutral-50 pl-7 pr-2 text-[12px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
                />
              </div>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-[260px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] text-neutral-400">
                Sin resultados
              </p>
            ) : (
              filtered.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggle(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-neutral-50",
                      isSelected ? "text-neutral-900" : "text-neutral-700",
                    )}
                  >
                    {/* Checkbox */}
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                        isSelected
                          ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                          : "border-neutral-300 bg-white",
                      )}
                    >
                      {isSelected && <Check size={10} strokeWidth={3.5} />}
                    </span>

                    {option.color && (
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: option.color }}
                      />
                    )}

                    <span className="flex-1 truncate">{option.label}</span>

                    {typeof option.count === "number" && (
                      <span className="font-mono text-[10px] text-neutral-400 tabular-nums">
                        {option.count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
