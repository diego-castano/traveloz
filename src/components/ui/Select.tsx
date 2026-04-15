"use client";

import { Select as RadixSelect } from "radix-ui";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/components/lib/cn";

/**
 * Select — modern opaque select with hairline border + 8px radius.
 * Matches Input.tsx visual style exactly for a consistent field row.
 */

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
  const hasError = !!error;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          className={cn(
            "text-label font-medium",
            hasError ? "text-[#CC2030]" : "text-neutral-500"
          )}
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
            "inline-flex h-9 w-full items-center justify-between px-3 text-[13.5px] text-neutral-900 outline-none transition-all",
            "focus:[box-shadow:0_0_0_3px_rgba(59,191,173,0.18)] focus:[border-color:#3BBFAD]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            hasError && "focus:[box-shadow:0_0_0_3px_rgba(231,76,95,0.18)]"
          )}
          style={{
            background: hasError ? "rgba(255,240,241,0.4)" : "#FFFFFF",
            border: hasError
              ? "1px solid #E74C5F"
              : "1px solid rgba(17,17,36,0.14)",
            borderRadius: "8px",
            boxShadow: "inset 0 1px 0 rgba(17,17,36,0.03)",
          }}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-neutral-400" strokeWidth={2} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="SelectContent z-[200] overflow-hidden"
            style={{
              minWidth: "var(--radix-select-trigger-width)",
              background: "#FFFFFF",
              border: "1px solid rgba(17,17,36,0.08)",
              borderRadius: "12px",
              boxShadow:
                "0 16px 40px -8px rgba(17,17,36,0.18), 0 4px 12px -4px rgba(17,17,36,0.08)",
            }}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative mx-0.5 flex cursor-pointer items-center rounded-md px-2.5 py-1.5 pr-8 text-[13px] text-neutral-700 outline-none",
                    "data-[highlighted]:bg-neutral-100",
                    "data-[state=checked]:text-neutral-900 data-[state=checked]:font-medium"
                  )}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2 flex items-center">
                    <Check
                      className="h-[14px] w-[14px] text-brand-teal-500"
                      strokeWidth={2.5}
                    />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {hasError && (
        <span className="text-[11.5px] font-medium text-[#CC2030]">
          {error}
        </span>
      )}
    </div>
  );
}
