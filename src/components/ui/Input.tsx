"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/components/lib/cn";

/* -------------------------------------------------------------------------- */
/*  Modern opaque input — hairline border, 8px radius, tight focus ring        */
/* -------------------------------------------------------------------------- */

const sizeClasses = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-9 px-3 text-[13.5px]",
  lg: "h-11 px-4 text-[14.5px]",
} as const;

const baseInputStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(17,17,36,0.14)",
  borderRadius: "8px",
  boxShadow: "inset 0 1px 0 rgba(17,17,36,0.03)",
  color: "#1A1A2E",
};

export interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "size" | "onDrag" | "onDragStart" | "onDragEnd"
  > {
  /** Label rendered above the input (uppercase micro-type). */
  label?: string;
  /** Error message — triggers red border + shake. */
  error?: string;
  /** Icon rendered at the left inside the input. */
  leftIcon?: React.ReactNode;
  /** Icon rendered at the right inside the input. */
  rightIcon?: React.ReactNode;
  /** Size variant. */
  size?: "sm" | "md" | "lg";
}

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
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label — uppercase micro-type on light bg */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-label font-medium",
              hasError ? "text-[#CC2030]" : "text-neutral-500"
            )}
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <motion.div
          key={error || "no-error"}
          animate={hasError ? { x: [0, -3, 3, -2, 2, 0] } : undefined}
          transition={{ duration: 0.32, delay: 0.03 }}
          className="group relative flex items-center"
        >
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
              "w-full font-body outline-none transition-all placeholder:text-neutral-400",
              sizeClasses[size],
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              // Focus ring — thin, tight, teal
              !disabled &&
                !readOnly &&
                !hasError &&
                "focus:[box-shadow:0_0_0_3px_rgba(59,191,173,0.18)] focus:[border-color:#3BBFAD]",
              hasError &&
                "focus:[box-shadow:0_0_0_3px_rgba(231,76,95,0.18)]",
              disabled && "cursor-not-allowed opacity-60",
              readOnly && "bg-neutral-50",
              className
            )}
            style={{
              ...baseInputStyle,
              ...(hasError && {
                borderColor: "#E74C5F",
                background: "rgba(255,240,241,0.4)",
              }),
              ...(readOnly && { background: "rgba(236,237,245,0.5)" }),
            }}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError && inputId ? `${inputId}-error` : undefined}
            {...props}
          />

          {rightIcon && (
            <span className="pointer-events-none absolute right-3 flex items-center text-neutral-400">
              {rightIcon}
            </span>
          )}
        </motion.div>

        {/* Error text */}
        {hasError && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="text-[11.5px] font-medium text-[#CC2030]"
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
