"use client";

import React from "react";
import { DropdownMenu, Tooltip } from "radix-ui";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";

/**
 * RowActions — hover-revealed icon cluster for data-table rows.
 *
 * Collapses the "Eye / Pencil / Copy / Trash" 4-icon row into:
 *   - primary action (always visible, reveals on row hover via parent `group-hover`)
 *   - overflow menu (...) with secondary actions
 *
 * Usage:
 *
 *   <RowActions
 *     primary={{ icon: Pencil, label: "Editar", onClick: () => edit(row) }}
 *     items={[
 *       { icon: Copy, label: "Clonar", onClick: () => clone(row) },
 *       { icon: Trash2, label: "Eliminar", onClick: () => del(row), destructive: true },
 *     ]}
 *   />
 *
 * Parent `<tr>` must have `className="group"` for opacity transitions.
 */

import type { LucideIcon } from "lucide-react";

export interface RowActionItem {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface RowActionsProps {
  primary?: RowActionItem;
  items?: RowActionItem[];
  /** Always show the primary button (not hover-reveal). Default: true for discoverability. */
  alwaysShowPrimary?: boolean;
  className?: string;
}

const iconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-400/30";

const INLINE_LIMIT = 3;

export function RowActions({
  primary,
  items = [],
  alwaysShowPrimary = true,
  className,
}: RowActionsProps) {
  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Render up to INLINE_LIMIT secondary items inline with individual radix
  // Tooltips (matching the paquetes list pattern). Anything beyond that goes
  // into the "…" overflow dropdown so rows don't blow up horizontally.
  const inlineItems = items.slice(0, INLINE_LIMIT);
  const overflowItems = items.slice(INLINE_LIMIT);

  const renderInlineButton = (item: RowActionItem, key: React.Key) => (
    <Tooltip.Provider key={key} delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={cn(
              iconBtn,
              item.destructive &&
                "hover:bg-[rgba(231,76,95,0.08)] hover:text-[#CC2030]",
            )}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick(e);
            }}
            aria-label={item.label}
            disabled={item.disabled}
          >
            <item.icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-[250] px-2 py-1 text-[11.5px] font-medium text-white rounded-md"
            style={{
              background: "rgba(26,26,46,0.92)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 24px -8px rgba(17,17,36,0.45)",
            }}
          >
            {item.label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );

  return (
    <div
      className={cn(
        "row-actions flex items-center gap-0.5 transition-opacity",
        !alwaysShowPrimary && "opacity-0 group-hover:opacity-100",
        className,
      )}
      onClick={stop}
    >
      {primary && renderInlineButton(primary, "primary")}
      {inlineItems.map((item, i) => renderInlineButton(item, i))}

      {overflowItems.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={iconBtn}
              onClick={stop}
              aria-label="Mas acciones"
              title="Mas acciones"
            >
              <MoreHorizontal className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={4}
              align="end"
              className="z-50 min-w-[180px] overflow-hidden p-1"
              style={{
                ...glassMaterials.frosted,
                borderRadius: "12px",
              }}
              onClick={stop}
            >
              {overflowItems.map((item, i) => (
                <DropdownMenu.Item
                  key={i}
                  disabled={item.disabled}
                  onSelect={(e) => {
                    item.onClick(e as unknown as React.MouseEvent);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] outline-none transition-colors",
                    "data-[highlighted]:bg-neutral-100/80",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    item.destructive
                      ? "text-[#CC2030] data-[highlighted]:bg-brand-red-50/80"
                      : "text-neutral-700",
                  )}
                >
                  <item.icon className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  {item.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}
