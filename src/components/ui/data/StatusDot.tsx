"use client";

import { cn } from "@/components/lib/cn";

/**
 * StatusDot — Linear/Height-style compact status indicator.
 * Replaces `<Badge>` in data-table contexts so rows stay dense.
 *
 *   <StatusDot variant="active">Activo</StatusDot>
 */

type StatusVariant =
  | "active"
  | "inactive"
  | "draft"
  | "pending"
  | "error"
  | "success"
  | "warning";

const variantConfig: Record<
  StatusVariant,
  { color: string; label: string }
> = {
  active: { color: "#2A9E8E", label: "text-[#2A9E8E]" },
  success: { color: "#2A9E8E", label: "text-[#2A9E8E]" },
  inactive: { color: "#B0B4CD", label: "text-neutral-400" },
  draft: { color: "#8A8DB5", label: "text-neutral-500" },
  pending: { color: "#F59E0B", label: "text-amber-600" },
  warning: { color: "#F59E0B", label: "text-amber-600" },
  error: { color: "#E74C5F", label: "text-[#CC2030]" },
};

interface StatusDotProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
  /** Hide the label, show the dot only (icon-slot usage). */
  dotOnly?: boolean;
}

export function StatusDot({
  variant,
  children,
  className,
  dotOnly = false,
}: StatusDotProps) {
  const config = variantConfig[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        className
      )}
      aria-label={typeof children === "string" ? children : undefined}
    >
      <span
        aria-hidden="true"
        className="inline-block h-[6px] w-[6px] shrink-0 rounded-full"
        style={{
          background: config.color,
          boxShadow: `0 0 0 2px ${config.color}1A`,
        }}
      />
      {!dotOnly && (
        <span
          className={cn(
            "text-[10.5px] uppercase tracking-[0.08em]",
            config.label
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}
