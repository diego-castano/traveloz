"use client";

import { Select as RadixSelect } from "radix-ui";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  options: SelectOption[];
  className?: string;
}

export function Select({
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  label,
  error,
  disabled = false,
  options,
  className,
}: SelectProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <label
          className="mb-1.5 text-[12.5px] font-medium"
          style={{ color: "#2D2F4D" }}
        >
          {label}
        </label>
      )}

      <RadixSelect.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          className={cn(
            "inline-flex h-10 w-full items-center justify-between rounded-glass-sm px-3.5 text-sm text-neutral-700",
            "outline-none transition-shadow",
            "focus:shadow-focus-teal",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(231,76,95,0.4)]"
          )}
          style={{
            background: error
              ? "rgba(255,240,241,0.7)"
              : "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: error
              ? "1px solid #E74C5F"
              : "1px solid rgba(228,230,242,0.8)",
          }}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="SelectContent z-[10] overflow-hidden rounded-clay shadow-elevation-16"
            style={{
              ...glassMaterials.frosted,
              minWidth: "var(--radix-select-trigger-width)",
            }}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative mx-1 flex cursor-pointer items-center rounded-md px-3 py-2 pr-8 text-sm text-neutral-700 outline-none",
                    "data-[highlighted]:bg-[rgba(59,191,173,0.06)]",
                    "data-[state=checked]:bg-[rgba(59,191,173,0.1)]"
                  )}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2 flex items-center">
                    <Check className="h-4 w-4 text-brand-teal-500" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {error && (
        <span
          className="mt-1 animate-[microBounce_0.3s_ease-in-out] text-[11px] font-medium"
          style={{ color: "#CC2030" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
