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
      {/* Search — flush underline, no rounded box */}
      {search && (
        <div className="group relative flex flex-1 min-w-[240px] items-center">
          <Search
            className="pointer-events-none absolute left-0 h-4 w-4 text-neutral-400 transition-colors group-focus-within:text-neutral-600"
            strokeWidth={2}
          />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Buscar..."}
            className={cn(
              "w-full bg-transparent pl-6 pr-12 py-2",
              "text-[14px] text-neutral-900 placeholder:text-neutral-400",
              "outline-none border-0",
              "focus:placeholder:text-neutral-300"
            )}
          />
          <kbd
            className={cn(
              "pointer-events-none absolute right-0 inline-flex h-5 items-center gap-0.5",
              "rounded-md border border-hairline bg-white px-1.5",
              "font-mono text-[10.5px] font-medium text-neutral-400",
              "opacity-0 transition-opacity group-focus-within:opacity-0 group-hover:opacity-100"
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
                    ? "bg-neutral-900 text-white"
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
