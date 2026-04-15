"use client";

import React, { useState } from "react";
import { Popover } from "radix-ui";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/components/lib/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// DayPicker v9 classNames (Tailwind overrides)
// ---------------------------------------------------------------------------

const dayPickerClassNames: Record<string, string> = {
  root: "font-body text-[13px]",
  months: "flex flex-col",
  month: "space-y-2",
  month_caption: "flex justify-between items-center px-1 pb-1",
  caption_label: "text-[13px] font-semibold text-neutral-800 tracking-tight",
  nav: "flex gap-1",
  button_previous:
    "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors",
  button_next:
    "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "w-9 text-label font-medium text-neutral-400 text-center",
  weeks: "",
  week: "flex w-full mt-0.5",
  day: "w-9 h-9 text-center p-0",
  day_button:
    "h-9 w-9 rounded-md text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors inline-flex items-center justify-center cursor-pointer",
  selected: "text-white font-semibold",
  today: "font-bold text-brand-teal-500",
  outside: "text-neutral-300",
  disabled: "text-neutral-200 pointer-events-none",
};

// ---------------------------------------------------------------------------
// Selected day — flat teal, no clay shadow (cleaner + consistent)
// ---------------------------------------------------------------------------

const modifiersStyles = {
  selected: {
    background: "#3BBFAD",
    color: "#FFFFFF",
    borderRadius: "8px",
  },
};

// ---------------------------------------------------------------------------
// DatePicker Component
// ---------------------------------------------------------------------------

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "Seleccionar fecha",
      label,
      error,
      disabled = false,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);

    const handleSelect = (date: Date | undefined) => {
      onChange?.(date);
      setOpen(false);
    };

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label && (
          <label
            className={cn(
              "text-label font-medium",
              error ? "text-[#CC2030]" : "text-neutral-500",
            )}
          >
            {label}
          </label>
        )}

        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-9 w-full items-center justify-between px-3 text-[13.5px] font-body outline-none transition-all",
                "focus:[box-shadow:0_0_0_3px_rgba(59,191,173,0.18)] focus:[border-color:#3BBFAD]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                error && "focus:[box-shadow:0_0_0_3px_rgba(231,76,95,0.18)]",
              )}
              style={{
                background: error ? "rgba(255,240,241,0.4)" : "#FFFFFF",
                border: error
                  ? "1px solid #E74C5F"
                  : "1px solid rgba(17,17,36,0.10)",
                borderRadius: "8px",
                boxShadow: "inset 0 1px 0 rgba(17,17,36,0.02)",
              }}
            >
              <span
                className={cn(
                  "truncate",
                  value ? "text-neutral-900" : "text-neutral-400",
                )}
              >
                {value
                  ? format(value, "dd/MM/yyyy", { locale: es })
                  : placeholder}
              </span>
              <Calendar
                className="ml-2 h-4 w-4 shrink-0 text-neutral-400"
                strokeWidth={1.75}
              />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              sideOffset={6}
              align="start"
              className="z-[200] p-3"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(17,17,36,0.08)",
                borderRadius: "12px",
                boxShadow:
                  "0 20px 48px -8px rgba(17,17,36,0.20), 0 6px 16px -4px rgba(17,17,36,0.08)",
              }}
            >
              <DayPicker
                mode="single"
                selected={value}
                onSelect={handleSelect}
                locale={es}
                classNames={dayPickerClassNames}
                modifiersStyles={modifiersStyles}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {error && (
          <p className="text-[11.5px] font-medium text-[#CC2030]">{error}</p>
        )}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";

export { DatePicker };
