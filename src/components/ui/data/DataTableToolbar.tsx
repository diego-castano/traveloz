"use client";

import React from "react";
import { Search, Plus } from "lucide-react";
import { cn } from "@/components/lib/cn";

/**
 * DataTableToolbar — unified command-row above every data list.
 *
 *   <DataTableToolbar
 *     search={{ value, onChange, placeholder: "Buscar proveedores..." }}
 *     filters={[
 *       { key: "TRASLADOS", label: "Traslados", icon: Bus },
 *       { key: "SEGUROS", label: "Seguros", icon: Shield },
 *       { key: "CIRCUITOS", label: "Circuitos", icon: Map },
 *     ]}
 *     activeFilter={filter}
 *     onFilterChange={setFilter}
 *     action={<Button>Nuevo Proveedor</Button>}
 *   />
 *
 * Replaces: SearchFilter, the 5 hand-rolled filter chip rows, and the
 * inline `<input>` used by traslados.
 */

import type { LucideIcon } from "lucide-react";

export interface ToolbarFilter {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface DataTableToolbarProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  filters?: ToolbarFilter[];
  activeFilter?: string | null;
  onFilterChange?: (key: string | null) => void;
  /** Right-aligned primary action (e.g. "Nuevo Proveedor"). */
  action?: React.ReactNode;
  /** Optional secondary content rendered between filters and action. */
  children?: React.ReactNode;
  className?: string;
  /** Keyboard hint shown in search. Default `⌘K`. */
  shortcutHint?: string;
}

export function DataTableToolbar({
  search,
  filters,
  activeFilter,
  onFilterChange,
  action,
  children,
  className,
  shortcutHint = "⌘K",
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        "border-b border-hairline",
        "px-1 pb-3",
        className
      )}
    >
      {search && (
        <div className="group relative flex flex-1 min-w-[260px] items-center">
          <div className="pointer-events-none absolute left-2.5 flex h-7 w-7 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-600 shadow-[0_1px_2px_rgba(17,17,36,0.04)] transition-colors group-focus-within:border-teal-200 group-focus-within:bg-teal-100">
            <Search className="h-4 w-4" strokeWidth={2.15} />
          </div>
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Buscar..."}
            className={cn(
              "h-10 w-full rounded-[12px] border border-neutral-200 bg-white pl-12 pr-14",
              "text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none",
              "shadow-[0_2px_8px_rgba(17,17,36,0.04)] transition-all",
              "hover:border-neutral-300 hover:shadow-[0_4px_12px_rgba(17,17,36,0.06)]",
              "focus:border-teal-300 focus:shadow-[0_0_0_4px_rgba(59,191,173,0.14),0_6px_16px_rgba(17,17,36,0.08)]",
              "focus:placeholder:text-neutral-300"
            )}
          />
          <kbd
            className={cn(
              "pointer-events-none absolute right-2.5 inline-flex h-6 items-center gap-1",
              "rounded-lg border border-neutral-200 bg-neutral-50 px-2",
              "font-mono text-[10px] font-semibold text-neutral-500",
              "shadow-[0_1px_2px_rgba(17,17,36,0.03)] opacity-100 transition-colors",
              "group-focus-within:border-teal-200 group-focus-within:bg-teal-50 group-focus-within:text-teal-600"
            )}
            aria-hidden="true"
          >
            {shortcutHint}
          </kbd>
        </div>
      )}

      {/* Segmented filters */}
      {filters && filters.length > 0 && (
        <div
          className="flex items-center overflow-hidden rounded-md"
          style={{ border: "1px solid rgba(17,17,36,0.08)" }}
        >
          {filters.map((f, i) => {
            const isActive = activeFilter === f.key;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() =>
                  onFilterChange?.(isActive ? null : f.key)
                }
              className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-1.5",
                  "text-[12px] font-medium transition-colors",
                  i > 0 && "border-l border-hairline",
                  isActive
                    ? "bg-neutral-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
                {f.label}
                {typeof f.count === "number" && (
                  <span
                    className={cn(
                      "ml-0.5 font-mono text-[10.5px]",
                      isActive ? "text-white/70" : "text-neutral-400"
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {children}

      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page title header block — paired with toolbar for consistent spacing
// ---------------------------------------------------------------------------

interface DataTablePageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function DataTablePageHeader({
  title,
  subtitle,
  action,
  className,
}: DataTablePageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-5 flex items-start justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h1
          className="font-display text-[26px] font-bold leading-tight tracking-tight text-neutral-900"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13.5px] text-neutral-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// Re-export Plus for easy "Nuevo X" button composition
export { Plus as ToolbarPlusIcon };
