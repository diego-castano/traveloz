"use client";

import React, { useState } from "react";
import { Popover } from "radix-ui";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";

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
  root: "font-body text-sm",
  months: "flex flex-col",
  month: "space-y-2",
  month_caption: "flex justify-between items-center px-1",
  caption_label: "text-sm font-semibold text-neutral-800",
  nav: "flex gap-1",
  button_previous:
    "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100/60 text-neutral-500 transition-colors",
  button_next:
    "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100/60 text-neutral-500 transition-colors",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "w-9 text-[11px] font-medium text-neutral-400 text-center",
  weeks: "",
  week: "flex w-full mt-1",
  day: "w-9 h-9 text-center p-0",
  day_button:
    "h-9 w-9 rounded-lg text-sm font-medium text-neutral-700 hover:bg-brand-teal-50 transition-colors inline-flex items-center justify-center cursor-pointer",
  selected: "text-white font-semibold rounded-lg",
  today: "font-bold text-brand-violet-500",
  outside: "text-neutral-300",
  disabled: "text-neutral-200 pointer-events-none",
};

// ---------------------------------------------------------------------------
// Selected day clay teal style (inline, via modifiersStyles)
// ---------------------------------------------------------------------------

const modifiersStyles = {
  selected: {
    background: "linear-gradient(145deg, #45D4C0 0%, #2A9E8E 100%)",
    boxShadow:
      "2px 2px 6px rgba(42,158,142,0.2), -1px -1px 4px rgba(69,212,192,0.2)",
    color: "#FFFFFF",
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
        {/* Label */}
        {label && (
          <label className="text-[12.5px] font-medium text-neutral-600">
            {label}
          </label>
        )}

        <Popover.Root open={open} onOpenChange={setOpen}>
          {/* Trigger styled like glass Input */}
          <Popover.Trigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              className={cn(
                "h-10 px-3.5 rounded-clay text-sm w-full flex items-center justify-between",
                "font-body transition-shadow duration-200",
                "focus:outline-none focus:shadow-focus-teal",
                "disabled:opacity-50 disabled:pointer-events-none",
                error && "shadow-[0_0_0_2px_rgba(231,76,95,0.4)]",
              )}
              style={{
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(228,230,242,0.8)",
              }}
            >
              <span
                className={cn(
                  "truncate",
                  value ? "text-neutral-800" : "text-neutral-400",
                )}
              >
                {value
                  ? format(value, "dd/MM/yyyy", { locale: es })
                  : placeholder}
              </span>
              <Calendar className="h-4 w-4 text-neutral-400 shrink-0 ml-2" />
            </button>
          </Popover.Trigger>

          {/* Calendar popup */}
          <Popover.Portal>
            <Popover.Content
              sideOffset={4}
              align="start"
              className="rounded-glass-lg p-3 z-[50] shadow-elevation-24"
              style={glassMaterials.liquid}
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

        {/* Error text */}
        {error && (
          <p className="text-[11.5px] text-brand-red-400 mt-0.5">{error}</p>
        )}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";

export { DatePicker };
