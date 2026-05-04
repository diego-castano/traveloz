"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/lib/cn";

/**
 * EmptyState — shared empty-state component for lists and tables.
 *
 * Renders a centered card with a large icon, title, description and an
 * optional action button (typically "Nuevo X"). The card has a dashed border
 * + subtle gradient so it reads as a "drop here / get started" prompt rather
 * than just an absence of data.
 *
 *   <EmptyState
 *     icon={Building2}
 *     title="No hay proveedores registrados"
 *     description="Registra tu primer proveedor para poder asignarlo a servicios."
 *     action={<Button>Nuevo Proveedor</Button>}
 *   />
 */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 py-10 sm:py-14",
        className,
      )}
    >
      <div
        className="flex w-full max-w-[520px] flex-col items-center justify-center rounded-[18px] border-2 border-dashed bg-white px-8 py-12 text-center sm:py-14"
        style={{
          borderColor: "rgba(139,92,246,0.22)",
          background:
            "linear-gradient(180deg, rgba(139,92,246,0.04) 0%, rgba(255,255,255,1) 60%)",
          boxShadow: "0 1px 2px rgba(17,17,36,0.03)",
        }}
      >
        {Icon && (
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(59,191,173,0.14))",
              border: "1px solid rgba(139,92,246,0.18)",
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.7), 0 8px 22px -10px rgba(139,92,246,0.35)",
            }}
          >
            <Icon
              className="h-7 w-7"
              style={{ color: "#7c5fdc" }}
              strokeWidth={1.7}
            />
          </div>
        )}
        <h3 className="text-[16px] font-semibold tracking-tight text-neutral-900">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-neutral-500">
            {description}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
