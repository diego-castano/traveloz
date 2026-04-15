"use client";

import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@/components/lib/cn";

export interface ColumnDefinition<K extends string> {
  key: K;
  label: string;
  /** If true, can't be toggled off (always visible). */
  locked?: boolean;
}

interface ColumnVisibilityMenuProps<K extends string> {
  columns: ColumnDefinition<K>[];
  visible: Record<K, boolean>;
  onChange: (next: Record<K, boolean>) => void;
  className?: string;
}

/**
 * ColumnVisibilityMenu — dropdown that lets the user toggle which columns of a
 * data table are shown. Locked columns (like the primary Title) stay fixed.
 *
 * Follows the same visual pattern as RowActions (DropdownMenu.Portal, 12px
 * radius, teal-tinted highlights).
 */
export function ColumnVisibilityMenu<K extends string>({
  columns,
  visible,
  onChange,
  className,
}: ColumnVisibilityMenuProps<K>) {
  function toggle(key: K) {
    onChange({ ...visible, [key]: !visible[key] });
  }

  const activeCount = columns.filter((c) => visible[c.key]).length;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-hairline bg-white px-2.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:border-neutral-200 hover:bg-neutral-50",
            className,
          )}
          aria-label="Columnas visibles"
          title="Columnas visibles"
        >
          <SlidersHorizontal size={13} strokeWidth={2} />
          <span>Columnas</span>
          <span className="font-mono text-[10px] text-neutral-400 tabular-nums">
            {activeCount}/{columns.length}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 min-w-[200px] overflow-hidden rounded-[10px] border border-hairline bg-white p-1 shadow-[0_10px_40px_-12px_rgba(17,17,36,0.22)]"
        >
          <div className="px-2 pb-1 pt-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Columnas visibles
            </span>
          </div>
          {columns.map((col) => {
            const isVisible = visible[col.key];
            return (
              <DropdownMenu.Item
                key={col.key}
                disabled={col.locked}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!col.locked) toggle(col.key);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none transition-colors",
                  "data-[highlighted]:bg-neutral-100/80",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-60",
                  col.locked ? "text-neutral-400" : "text-neutral-700",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                    isVisible
                      ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                      : "border-neutral-300 bg-white",
                  )}
                >
                  {isVisible && <Check size={10} strokeWidth={3.5} />}
                </span>
                <span className="flex-1">{col.label}</span>
                {col.locked && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-300">
                    fijo
                  </span>
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
