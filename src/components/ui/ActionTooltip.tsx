"use client";

import * as React from "react";
import { Tooltip } from "radix-ui";

/**
 * ActionTooltip — wraps a single trigger with the standard dark-glass tooltip
 * used across admin tables and toolbars. Removes ~25 lines of repeated
 * Tooltip.Root / Trigger / Portal / Content boilerplate per action button.
 *
 * Usage:
 *   <ActionTooltip label="Editar">
 *     <Button variant="icon" size="xs" onClick={…}><Pencil/></Button>
 *   </ActionTooltip>
 *
 * Must be rendered inside a <Tooltip.Provider> (admin pages already provide one).
 */
interface ActionTooltipProps {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Additional shortcut hint shown after the label (e.g., "⌘E"). */
  shortcut?: string;
}

export function ActionTooltip({
  label,
  children,
  side = "top",
  shortcut,
}: ActionTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={8}
          className="z-[200] flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white"
          style={{
            background: "rgba(26,26,46,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <span>{label}</span>
          {shortcut && (
            <kbd
              className="rounded border px-1 py-px font-mono text-[10px] tracking-tight"
              style={{
                borderColor: "rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.6)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {shortcut}
            </kbd>
          )}
          <Tooltip.Arrow style={{ fill: "rgba(26,26,46,0.92)" }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
