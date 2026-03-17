"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/components/lib/cn";
import { interactions, springs } from "@/components/lib/animations";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  className,
}: CheckboxProps) {
  const handleToggle = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px]",
          "outline-none transition-colors duration-150",
          "focus-visible:shadow-focus-teal",
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={{
          background: checked
            ? "linear-gradient(135deg, #3BBFAD, #2A9E8E)"
            : "#FFFFFF",
          border: checked
            ? "1px solid transparent"
            : "1px solid #D2D5E5",
        }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              {...interactions.checkboxCheck}
              exit={{ scale: 0, opacity: 0 }}
            >
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="white"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>

      {label && (
        <span
          className={cn(
            "text-sm text-neutral-700",
            disabled && "opacity-50"
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
