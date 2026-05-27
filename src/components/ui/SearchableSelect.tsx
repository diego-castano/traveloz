"use client";

import { useEffect, useRef, useState } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "cmdk";
import { Popover } from "radix-ui";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/components/lib/cn";

/**
 * SearchableSelect — single-select dropdown that the operator can filter by
 * typing on the keyboard. Mirrors the visual style of <Select> so it can
 * stand in for Radix Select in any field that grows past ~10 options.
 */

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface Props {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  label,
  error,
  disabled = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the query whenever the dropdown closes so reopening it shows the
  // full list, and autofocus the input when it opens so the user can type
  // immediately after pressing Enter / Space / arrow keys to open.
  useEffect(() => {
    if (!open) {
      setQuery("");
    } else {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Keyboard: while the trigger is focused (e.g. after TAB), a printable key
  // opens the dropdown AND seeds the filter with that character — operators
  // can land on the field and start typing the país/ciudad name without
  // clicking. Arrow Down / Enter / Space also open it (without seeding).
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (open) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      // Let Radix Popover handle these to open the popover.
      return;
    }
    // Single printable character (letter / digit / accented char). Excludes
    // modifier-prefixed shortcuts and navigation keys.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setQuery(e.key);
      setOpen(true);
    }
  };

  const selected = options.find((o) => o.value === value);
  const hasError = !!error;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          className={cn(
            "text-label font-medium",
            hasError ? "text-[#CC2030]" : "text-neutral-500",
          )}
        >
          {label}
        </label>
      )}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              "inline-flex h-9 w-full items-center justify-between px-3 text-[13.5px] text-neutral-900 outline-none transition-all",
              "focus:[box-shadow:0_0_0_3px_rgba(59,191,173,0.18)] focus:[border-color:#3BBFAD]",
              "disabled:cursor-not-allowed disabled:opacity-60",
              hasError && "focus:[box-shadow:0_0_0_3px_rgba(231,76,95,0.18)]",
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
            <span
              className={cn(
                "truncate text-left",
                !selected && "text-neutral-400",
              )}
            >
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-neutral-400"
              strokeWidth={2}
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align="start"
            className="z-[200] overflow-hidden"
            style={{
              width: "var(--radix-popover-trigger-width)",
              background: "#FFFFFF",
              border: "1px solid rgba(17,17,36,0.08)",
              borderRadius: "12px",
              boxShadow:
                "0 16px 40px -8px rgba(17,17,36,0.18), 0 4px 12px -4px rgba(17,17,36,0.08)",
            }}
          >
            <Command shouldFilter>
              <div className="border-b border-neutral-200/70 px-2 py-1.5">
                <CommandInput
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={searchPlaceholder}
                  className="h-7 w-full bg-transparent px-1 text-[13px] text-neutral-900 placeholder:text-neutral-400 outline-none"
                />
              </div>
              <CommandList className="max-h-64 overflow-y-auto p-1">
                <CommandEmpty className="px-3 py-3 text-center text-[13px] text-neutral-400">
                  {emptyText}
                </CommandEmpty>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      onValueChange?.(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative mx-0.5 flex cursor-pointer items-center rounded-md px-2.5 py-1.5 pr-8 text-[13px] text-neutral-700 outline-none",
                      "data-[selected=true]:bg-neutral-100",
                      o.value === value && "font-medium text-neutral-900",
                    )}
                  >
                    {o.label}
                    {o.value === value && (
                      <Check
                        className="absolute right-2 h-[14px] w-[14px] text-brand-teal-500"
                        strokeWidth={2.5}
                      />
                    )}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {hasError && (
        <span className="text-[11.5px] font-medium text-[#CC2030]">
          {error}
        </span>
      )}
    </div>
  );
}
