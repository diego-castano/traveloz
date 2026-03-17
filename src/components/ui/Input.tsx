"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/components/lib/cn";

/* -------------------------------------------------------------------------- */
/*  Size variants                                                              */
/* -------------------------------------------------------------------------- */

const sizeClasses = {
  sm: "h-[34px] px-3 text-[12.5px]",
  md: "h-10 px-3.5 text-sm",
  lg: "h-[46px] px-[18px] text-[15px]",
} as const;

/* -------------------------------------------------------------------------- */
/*  Glass inline styles (cannot be expressed in Tailwind v3)                   */
/* -------------------------------------------------------------------------- */

const baseGlassStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(228,230,242,0.8)",
  boxShadow:
    "inset 0 2px 4px rgba(26,26,46,0.04), 0 1px 2px rgba(26,26,46,0.04)",
};

const focusGlassStyle: React.CSSProperties = {
  borderColor: "#3BBFAD",
  boxShadow:
    "0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px rgba(59,191,173,0.4)",
  background: "rgba(255,255,255,0.85)",
};

const errorGlassStyle: React.CSSProperties = {
  borderColor: "#E74C5F",
  boxShadow:
    "0 0 0 2px rgba(255,255,255,0.8), 0 0 0 4px rgba(231,76,95,0.3)",
  background: "rgba(255,240,241,0.7)",
};

const disabledGlassStyle: React.CSSProperties = {
  background: "rgba(236,237,245,0.5)",
  color: "#B0B4CD",
  cursor: "not-allowed",
};

const readOnlyGlassStyle: React.CSSProperties = {
  background: "rgba(245,246,250,0.6)",
};

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

export interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "size" | "onDrag" | "onDragStart" | "onDragEnd"
  > {
  /** Label rendered above the input */
  label?: string;
  /** Error message rendered below the input (triggers error state) */
  error?: string;
  /** Icon rendered at the left inside the input */
  leftIcon?: React.ReactNode;
  /** Icon rendered at the right inside the input */
  rightIcon?: React.ReactNode;
  /** Input size variant */
  size?: "sm" | "md" | "lg";
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      leftIcon,
      rightIcon,
      size = "md",
      disabled,
      readOnly,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const hasError = !!error;

    /** Compute inline style based on state priority: disabled > readOnly > error > base */
    const computeInputStyle = (): React.CSSProperties => {
      if (disabled) return { ...baseGlassStyle, ...disabledGlassStyle };
      if (readOnly) return { ...baseGlassStyle, ...readOnlyGlassStyle };
      if (hasError) return { ...baseGlassStyle, ...errorGlassStyle };
      return baseGlassStyle;
    };

    return (
      <div className="flex flex-col">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 font-body font-medium text-[#2D2F4D]"
            style={{ fontSize: "12.5px" }}
          >
            {label}
          </label>
        )}

        {/* Input wrapper -- handles focus-within for double-ring + error shake */}
        <motion.div
          key={error || "no-error"}
          animate={hasError ? { x: [0, -4, 4, -2, 2, 0] } : undefined}
          transition={{ duration: 0.4, delay: 0.05 }}
          className={cn(
            "group relative flex items-center rounded-clay transition-all",
            !disabled && !readOnly && !hasError &&
              "hover:[&>input]:border-neutral-300 focus-within:ring-0"
          )}
        >
          {/* Left icon */}
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              "w-full rounded-clay font-body text-neutral-900 placeholder:text-neutral-400 transition-all outline-none",
              sizeClasses[size],
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              !disabled && !readOnly && !hasError &&
                "focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:border-[#3BBFAD] focus:bg-[rgba(255,255,255,0.85)]",
              hasError && "border-[#E74C5F]",
              className
            )}
            style={computeInputStyle()}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError && inputId ? `${inputId}-error` : undefined}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <span className="pointer-events-none absolute right-3 flex items-center text-neutral-400">
              {rightIcon}
            </span>
          )}
        </motion.div>

        {/* Error text with microBounce animation */}
        {hasError && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="mt-1.5 animate-[microBounce_0.3s_ease-in-out] font-medium text-[#CC2030]"
            style={{ fontSize: "11px" }}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
