"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/lib/cn";

/* -------------------------------------------------------------------------- */
/*  CVA size variants (Tailwind classes for sizing/layout)                     */
/* -------------------------------------------------------------------------- */

const badgeSizeVariants = cva(
  "inline-flex items-center justify-center font-semibold rounded-sm",
  {
    variants: {
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        md: "h-6 px-2.5 text-[11px]",
        lg: "h-7 px-3 text-[12.5px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

/* -------------------------------------------------------------------------- */
/*  Glass inline styles per variant (exact values from design.json)            */
/* -------------------------------------------------------------------------- */

const variantStyles: Record<string, React.CSSProperties> = {
  confirmed: {
    background: "rgba(237,250,243,0.8)",
    color: "#1F8A54",
    border: "1px solid rgba(46,173,107,0.15)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  pending: {
    background: "rgba(254,245,235,0.8)",
    color: "#D07520",
    border: "1px solid rgba(232,145,58,0.15)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  draft: {
    background: "rgba(236,237,245,0.6)",
    color: "#6B6F99",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  active: {
    background: "rgba(230,248,245,0.8)",
    color: "#1F7D70",
    border: "1px solid rgba(59,191,173,0.15)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  inactive: {
    background: "rgba(236,237,245,0.5)",
    color: "#8A8DB5",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  removed: {
    background: "rgba(255,224,227,0.6)",
    color: "#CC2030",
    textDecoration: "line-through",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  new: {
    background: "rgba(230,248,245,0.8)",
    color: "#1F7D70",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  temporada: {
    background: "rgba(255,251,235,0.8)",
    color: "#D4A800",
    border: "1px solid rgba(240,192,0,0.15)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  promo: {
    background: "rgba(255,224,227,0.8)",
    color: "#A8192A",
    border: "1px solid rgba(204,32,48,0.15)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type BadgeVariant =
  | "confirmed"
  | "pending"
  | "draft"
  | "active"
  | "inactive"
  | "removed"
  | "new"
  | "temporada"
  | "promo";

export interface BadgeProps extends VariantProps<typeof badgeSizeVariants> {
  /** Visual variant — determines glass colors */
  variant?: BadgeVariant;
  /** Badge content */
  children: React.ReactNode;
  /** Additional classes for overrides */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function Badge({
  variant = "active",
  size,
  children,
  className,
}: BadgeProps) {
  const style = variantStyles[variant] ?? variantStyles.active;
  const isNew = variant === "new";

  return (
    <span
      className={cn(
        badgeSizeVariants({ size }),
        isNew && "animate-[microBounce_0.6s_ease-in-out]",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
