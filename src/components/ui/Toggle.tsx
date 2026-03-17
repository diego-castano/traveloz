"use client";

import { motion } from "motion/react";
import { cn } from "@/components/lib/cn";
import { springs } from "@/components/lib/animations";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  className,
}: ToggleProps) {
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
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-pill",
          "outline-none transition-colors duration-200 ease-in-out",
          "focus-visible:shadow-focus-teal",
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={{
          background: checked
            ? "linear-gradient(135deg, #3BBFAD, #2A9E8E)"
            : "#D2D5E5",
        }}
      >
        <motion.div
          className="absolute h-[18px] w-[18px] rounded-full bg-white shadow-elevation-4"
          layout
          transition={springs.bouncy}
          style={{
            left: checked ? 23 : 3,
            top: "50%",
            translateY: "-50%",
          }}
        />
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
