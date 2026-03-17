"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";

// ---------------------------------------------------------------------------
// Card variant classes (CVA)
// ---------------------------------------------------------------------------

const cardVariants = cva("rounded-glass-lg overflow-hidden relative", {
  variants: {
    variant: {
      default: "animate-breathe",
      liquid: "animate-liquid-float animate-border-glow",
      stat: "animate-liquid-float animate-border-glow",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

// ---------------------------------------------------------------------------
// Inline glass styles per variant (cannot be expressed in CVA)
// ---------------------------------------------------------------------------

const variantStyles: Record<string, React.CSSProperties> = {
  default: glassMaterials.frosted,
  liquid: glassMaterials.liquid,
  stat: glassMaterials.liquid,
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface CardProps
  extends VariantProps<typeof cardVariants> {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: () => void;
  /** Enable hover/tap motion — only use for clickable cards */
  interactive?: boolean;
  /** @deprecated use interactive instead */
  static?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, onClick, interactive, static: _static, style, ...props }, ref) => {
    const v = variant ?? "default";
    const isInteractive = interactive ?? !!onClick;

    return (
      <motion.div
        ref={ref}
        className={cn(cardVariants({ variant }), className)}
        style={{ ...variantStyles[v], ...style }}
        whileHover={isInteractive ? { y: -5, scale: 1.01 } : undefined}
        whileTap={isInteractive ? { scale: 0.995, y: 0 } : undefined}
        transition={springs.gentle}
        onClick={onClick}
        {...props}
      >
        {/* Top accent gradient bar (default variant) */}
        {v === "default" && (
          <div
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[2px] z-[1]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.12) 30%, rgba(59,191,173,0.12) 70%, transparent 100%)",
            }}
          />
        )}

        {/* Sheen overlay (liquid + stat variants) */}
        {(v === "liquid" || v === "stat") && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background:
                "linear-gradient(105deg, rgba(255,255,255,0.3) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.08) 100%)",
            }}
          />
        )}

        {children}
      </motion.div>
    );
  },
);
Card.displayName = "Card";

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-5 py-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// ---------------------------------------------------------------------------
// CardContent
// ---------------------------------------------------------------------------

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-5 pb-5", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

// ---------------------------------------------------------------------------
// CardFooter
// ---------------------------------------------------------------------------

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-5 py-4 border-t border-white/10", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// ---------------------------------------------------------------------------
// StatIcon (stat variant icon container)
// ---------------------------------------------------------------------------

const StatIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center w-10 h-10 rounded-glass-sm",
      className,
    )}
    style={{
      background:
        "linear-gradient(135deg, rgba(59,191,173,0.15), rgba(59,191,173,0.05))",
    }}
    {...props}
  />
));
StatIcon.displayName = "StatIcon";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Card, CardHeader, CardContent, CardFooter, StatIcon, cardVariants };
