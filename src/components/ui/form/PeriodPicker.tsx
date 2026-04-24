"use client";

import React, { useMemo, useState } from "react";
import { Popover } from "radix-ui";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { formatStoredDate, parseStoredDate } from "@/lib/date";

/**
 * PeriodPicker — single popover for a desde/hasta period pair.
 *
 * Defaults to MONTH mode (fast path for common monthly pricing periods):
 *   - Click a single month  → desde = 1st, hasta = last day of that month.
 *   - Click one month then a second (in month grid) → spans start-of-first
 *     through end-of-last.
 *
 * Day mode is an escape hatch for non-month boundaries (e.g. peak-season
 * 12 Dec – 7 Jan). Uses react-day-picker range mode.
 *
 * All dates are stored as `YYYY-MM-DD` strings in the DB; callers receive
 * them via `onChange(desde, hasta)`.
 */

export interface PeriodPickerProps {
  valueFrom?: string | null;
  valueTo?: string | null;
  onChange?: (desde: string, hasta: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0); // day 0 of next = last of current
}

function sameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

function formatTriggerLabel(from?: Date, to?: Date): string | null {
  if (!from || !to) return null;
  const fromIsStart = from.getDate() === 1;
  const toIsEnd = to.getDate() === endOfMonth(to.getFullYear(), to.getMonth()).getDate();
  const sameYear = from.getFullYear() === to.getFullYear();
  if (fromIsStart && toIsEnd) {
    // Month-aligned period → compact label
    if (sameMonth(to, from.getFullYear(), from.getMonth())) {
      return format(from, "LLLL yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    }
    if (sameYear) {
      const a = format(from, "LLL", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
      const b = format(to, "LLL yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
      return `${a} – ${b}`;
    }
    const a = format(from, "LLL yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    const b = format(to, "LLL yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    return `${a} – ${b}`;
  }
  // Day-level period → explicit dates
  return `${format(from, "dd MMM", { locale: es })} – ${format(to, "dd MMM yyyy", { locale: es })}`;
}

export function PeriodPicker({
  valueFrom,
  valueTo,
  onChange,
  placeholder = "Seleccionar periodo...",
  disabled = false,
  className,
}: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "day">("month");

  const parsedFrom = useMemo(() => parseStoredDate(valueFrom), [valueFrom]);
  const parsedTo = useMemo(() => parseStoredDate(valueTo), [valueTo]);

  // Month-mode state: currently displayed year + transient selection
  const now = new Date();
  const [year, setYear] = useState<number>(
    parsedFrom?.getFullYear() ?? now.getFullYear(),
  );
  // Transient: first click in month mode before second click (for ranges).
  const [monthAnchor, setMonthAnchor] = useState<number | null>(null);

  const selectedMonthStart =
    parsedFrom && parsedFrom.getDate() === 1 ? parsedFrom.getMonth() : null;
  const selectedMonthEnd =
    parsedTo &&
    parsedTo.getDate() ===
      endOfMonth(parsedTo.getFullYear(), parsedTo.getMonth()).getDate()
      ? parsedTo.getMonth()
      : null;
  const selectionIsMonthAligned =
    parsedFrom &&
    parsedTo &&
    parsedFrom.getDate() === 1 &&
    parsedTo.getDate() ===
      endOfMonth(parsedTo.getFullYear(), parsedTo.getMonth()).getDate() &&
    parsedFrom.getFullYear() === year &&
    parsedTo.getFullYear() === year;

  function isMonthSelected(m: number): boolean {
    if (!selectionIsMonthAligned) return false;
    if (selectedMonthStart === null || selectedMonthEnd === null) return false;
    return m >= selectedMonthStart && m <= selectedMonthEnd;
  }

  function isMonthAnchor(m: number): boolean {
    return monthAnchor !== null && monthAnchor === m;
  }

  function handleMonthClick(m: number) {
    // First click: set single month (Mes 1 → Mes último) AND remember anchor so
    // a second click can extend into a range.
    if (monthAnchor === null) {
      const from = startOfMonth(year, m);
      const to = endOfMonth(year, m);
      onChange?.(formatStoredDate(from)!, formatStoredDate(to)!);
      setMonthAnchor(m);
      return;
    }
    // Second click: extend to range [min..max] of anchor + this.
    const start = Math.min(monthAnchor, m);
    const end = Math.max(monthAnchor, m);
    const from = startOfMonth(year, start);
    const to = endOfMonth(year, end);
    onChange?.(formatStoredDate(from)!, formatStoredDate(to)!);
    setMonthAnchor(null);
    setOpen(false);
  }

  function handleDayRangeSelect(range: DateRange | undefined) {
    if (!range?.from) return;
    const to = range.to ?? range.from;
    if (parsedFrom && !range.to && formatStoredDate(range.from) === valueFrom) {
      // Same-click, skip
      return;
    }
    onChange?.(formatStoredDate(range.from)!, formatStoredDate(to)!);
    if (range.to) setOpen(false);
  }

  const triggerLabel = formatTriggerLabel(parsedFrom, parsedTo);

  // Year list: current ± 3 years (travel prices usually near-term)
  const years = useMemo(() => {
    const base = now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => base - 2 + i);
  }, [now]);

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMonthAnchor(null); }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between px-3 text-[13.5px] font-body outline-none transition-all",
            "focus:[box-shadow:0_0_0_3px_rgba(59,191,173,0.18)] focus:[border-color:#3BBFAD]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(17,17,36,0.10)",
            borderRadius: "8px",
            boxShadow: "inset 0 1px 0 rgba(17,17,36,0.02)",
          }}
        >
          <span className={cn("truncate", triggerLabel ? "text-neutral-900" : "text-neutral-400")}>
            {triggerLabel ?? placeholder}
          </span>
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-[200] p-3 w-[320px]"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(17,17,36,0.08)",
            borderRadius: "12px",
            boxShadow:
              "0 20px 48px -8px rgba(17,17,36,0.20), 0 6px 16px -4px rgba(17,17,36,0.08)",
          }}
        >
          {/* Mode toggle */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div
              className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-[12px] font-medium"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "month"}
                onClick={() => setMode("month")}
                className={cn(
                  "px-3 py-1 rounded-md transition-colors",
                  mode === "month"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700",
                )}
              >
                Mes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "day"}
                onClick={() => setMode("day")}
                className={cn(
                  "px-3 py-1 rounded-md transition-colors",
                  mode === "day"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700",
                )}
              >
                Día
              </button>
            </div>
            {mode === "month" && (
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-7 rounded-md border border-neutral-200 bg-white px-2 text-[12px] font-medium text-neutral-800 outline-none focus:border-[#3BBFAD]"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>

          {/* Body */}
          {mode === "month" ? (
            <div>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTH_NAMES_SHORT.map((name, idx) => {
                  const selected = isMonthSelected(idx);
                  const anchor = isMonthAnchor(idx);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleMonthClick(idx)}
                      className={cn(
                        "h-10 rounded-md text-[12.5px] font-medium transition-colors",
                        selected
                          ? "text-white"
                          : anchor
                          ? "bg-[rgba(59,191,173,0.15)] text-[#158a7b] ring-1 ring-[#3BBFAD]"
                          : "text-neutral-700 hover:bg-neutral-100",
                      )}
                      style={selected ? { background: "#3BBFAD" } : undefined}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-neutral-400">
                {monthAnchor !== null
                  ? `Elegí el mes final (o volvé a clicar ${MONTH_NAMES_SHORT[monthAnchor]} para mantener 1 mes).`
                  : "Clicá un mes para aplicar ese mes completo, o dos meses para un rango."}
              </p>
            </div>
          ) : (
            <DayPicker
              mode="range"
              selected={parsedFrom && parsedTo ? { from: parsedFrom, to: parsedTo } : undefined}
              onSelect={handleDayRangeSelect}
              defaultMonth={parsedFrom ?? new Date(year, 0, 1)}
              locale={es}
              captionLayout="dropdown"
              startMonth={new Date(years[0], 0, 1)}
              endMonth={new Date(years[years.length - 1], 11, 31)}
              classNames={{
                root: "font-body text-[13px]",
                month_caption: "flex justify-between items-center px-1 pb-1 gap-2",
                caption_label: "text-[13px] font-semibold text-neutral-800",
                dropdowns: "flex gap-1",
                months_dropdown:
                  "h-7 rounded-md border border-neutral-200 bg-white px-1 text-[12px] font-medium text-neutral-800 outline-none",
                years_dropdown:
                  "h-7 rounded-md border border-neutral-200 bg-white px-1 text-[12px] font-medium text-neutral-800 outline-none",
                nav: "flex gap-1",
                button_previous:
                  "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500",
                button_next:
                  "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500",
                weekday: "w-9 text-[11px] font-medium text-neutral-400 text-center",
                day: "w-9 h-9 text-center p-0",
                day_button:
                  "h-9 w-9 rounded-md text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 inline-flex items-center justify-center cursor-pointer",
                range_start: "text-white",
                range_end: "text-white",
                range_middle: "bg-[rgba(59,191,173,0.15)]",
                today: "font-bold text-[#3BBFAD]",
                outside: "text-neutral-300",
                disabled: "text-neutral-200 pointer-events-none",
              }}
              modifiersStyles={{
                range_start: { background: "#3BBFAD", color: "#FFFFFF", borderRadius: "8px 0 0 8px" },
                range_end: { background: "#3BBFAD", color: "#FFFFFF", borderRadius: "0 8px 8px 0" },
              }}
            />
          )}

          {/* Footer: current selection summary */}
          {parsedFrom && parsedTo && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-2 text-[11.5px] text-neutral-600">
              <span>
                {format(parsedFrom, "dd MMM yyyy", { locale: es })} → {format(parsedTo, "dd MMM yyyy", { locale: es })}
              </span>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

PeriodPicker.displayName = "PeriodPicker";
