"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { springs } from "@/components/lib/animations";
import { glassMaterials } from "@/components/lib/glass";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold rounded-clay transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "text-white relative overflow-hidden",
        danger: "text-white relative overflow-hidden",
        secondary: "text-neutral-700 border border-neutral-200",
        ghost: "text-neutral-600 hover:bg-neutral-100/60",
        ghostDanger: "text-brand-red-500 hover:bg-brand-red-100/50",
        icon: "text-neutral-400 hover:text-neutral-600 p-0 w-8 h-8",
      },
      size: {
        xs: "h-7 px-2.5 text-[11px]",
        sm: "h-[34px] px-3.5 text-[12.5px]",
        md: "h-10 px-[18px] text-sm",
        lg: "h-[46px] px-[22px] text-[15px]",
      },
    },
    compoundVariants: [
      {
        variant: "icon",
        class: "h-8 w-8 px-0",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

/** Clay inline styles for primary/danger variants (cannot be expressed in CVA) */
const clayStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(145deg, #45D4C0 0%, #2A9E8E 100%)",
    boxShadow:
      "6px 6px 16px rgba(42,158,142,0.25), -3px -3px 10px rgba(69,212,192,0.3), inset 0 1px 0 rgba(255,255,255,0.35)",
  },
  danger: {
    background: "linear-gradient(145deg, #E74C5F 0%, #CC2030 100%)",
    boxShadow:
      "6px 6px 16px rgba(204,32,48,0.25), -3px -3px 10px rgba(231,76,95,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
  },
  secondary: {
    background: glassMaterials.frostedSubtle.background,
    backdropFilter: glassMaterials.frostedSubtle.backdropFilter,
    WebkitBackdropFilter: glassMaterials.frostedSubtle.WebkitBackdropFilter,
  },
};

/**
 * Sheen pseudo-element styles for primary/danger hover effect.
 * Uses CSS ::after with transform translateX animation (GPU composited).
 */
const sheenClass =
  "after:absolute after:inset-0 after:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_45%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.15)_55%,transparent_60%)] after:bg-[length:200%_100%] after:animate-sheen-slide after:rounded-clay";

/** Omit conflicting drag event handlers between React HTML and Motion */
type MotionSafeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
>;

export interface ButtonProps
  extends MotionSafeButtonProps,
    VariantProps<typeof buttonVariants> {
  /** Show loading spinner and disable the button */
  loading?: boolean;
  /** Icon rendered before children */
  leftIcon?: React.ReactNode;
  /** Icon rendered after children */
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const isClayVariant = variant === "primary" || variant === "danger";
    const hasInlineStyle = variant && clayStyles[variant];

    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          isClayVariant && sheenClass,
          className
        )}
        style={hasInlineStyle ? clayStyles[variant] : undefined}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.01, y: -1 }}
        transition={springs.snappy}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
