"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/lib/cn";

/**
 * EmptyState — shared empty-state component for lists and tables.
 * Replaces the hand-rolled `<div className="flex flex-col items-center...">`
 * pattern duplicated across 6+ admin modules.
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
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-[12px]"
          style={{
            background: "rgba(17,17,36,0.04)",
            border: "1px solid rgba(17,17,36,0.07)",
          }}
        >
          <Icon className="h-5 w-5 text-neutral-400" strokeWidth={1.75} />
        </div>
      )}
      <h3
        className="text-[14px] font-semibold tracking-tight text-neutral-800"
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-[360px] text-[13px] leading-relaxed text-neutral-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
