"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Popover } from "radix-ui";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { es } from "date-fns/locale";
import { format, differenceInCalendarDays } from "date-fns";
import { Calendar as CalendarIcon, X as XIcon } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { formatStoredDate, parseStoredDate } from "@/lib/date";

/**
 * PeriodPicker — single popover for a desde/hasta period pair.
 *
 * Two modes share the same popover:
 *
 * - "Mes": month-aligned shortcut. Click a month → entire month. Click two
 *   months → range from start-of-first to end-of-last. Ideal for tarifa
 *   periods that follow calendar months.
 *
 * - "Día": fine-grained range across two months side-by-side, with quick
 *   presets (Hoy, Próximos 30 días, Este mes, …) and paged navigation.
 *   Used for non-month boundaries (peak-season 12 Dec – 7 Jan).
 *
 * The picker auto-detects which mode to open in based on whether the
 * saved value is month-aligned. Stores values as `YYYY-MM-DD` strings.
 */

export interface PeriodPickerProps {
  valueFrom?: string | null;
  valueTo?: string | null;
  onChange?: (desde: string, hasta: string) => void;
  /** Optional inline label (matches DatePicker convention). */
  label?: string;
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
  return new Date(year, month + 1, 0);
}

function isLastDayOfMonth(date: Date): boolean {
  return date.getDate() === endOfMonth(date.getFullYear(), date.getMonth()).getDate();
}

function isMonthAligned(from?: Date, to?: Date): boolean {
  if (!from || !to) return false;
  return from.getDate() === 1 && isLastDayOfMonth(to);
}

function sameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

function formatTriggerLabel(from?: Date, to?: Date): string | null {
  if (!from || !to) return null;
  const monthAligned = isMonthAligned(from, to);
  const sameYear = from.getFullYear() === to.getFullYear();
  if (monthAligned) {
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
  if (sameYear) {
    return `${format(from, "dd MMM", { locale: es })} – ${format(to, "dd MMM yyyy", { locale: es })}`;
  }
  return `${format(from, "dd MMM yyyy", { locale: es })} – ${format(to, "dd MMM yyyy", { locale: es })}`;
}

interface Preset {
  key: string;
  label: string;
  build: () => { from: Date; to: Date };
}

function buildPresets(now: Date): Preset[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

  return [
    {
      key: "today",
      label: "Hoy",
      build: () => ({ from: today, to: today }),
    },
    {
      key: "next-7",
      label: "Próximos 7 días",
      build: () => ({ from: today, to: addDays(today, 6) }),
    },
    {
      key: "next-30",
      label: "Próximos 30 días",
      build: () => ({ from: today, to: addDays(today, 29) }),
    },
    {
      key: "this-month",
      label: "Este mes",
      build: () => ({
        from: startOfMonth(today.getFullYear(), today.getMonth()),
        to: endOfMonth(today.getFullYear(), today.getMonth()),
      }),
    },
    {
      key: "next-month",
      label: "Próximo mes",
      build: () => ({
        from: startOfMonth(today.getFullYear(), today.getMonth() + 1),
        to: endOfMonth(today.getFullYear(), today.getMonth() + 1),
      }),
    },
    {
      key: "next-3-months",
      label: "Próximos 3 meses",
      build: () => ({ from: today, to: addDays(addMonths(today, 3), -1) }),
    },
    {
      key: "next-6-months",
      label: "Próximos 6 meses",
      build: () => ({ from: today, to: addDays(addMonths(today, 6), -1) }),
    },
    {
      key: "next-12-months",
      label: "Próximos 12 meses",
      build: () => ({ from: today, to: addDays(addMonths(today, 12), -1) }),
    },
    {
      key: "this-year",
      label: "Año actual",
      build: () => ({
        from: new Date(today.getFullYear(), 0, 1),
        to: new Date(today.getFullYear(), 11, 31),
      }),
    },
  ];
}

export function PeriodPicker({
  valueFrom,
  valueTo,
  onChange,
  label,
  placeholder = "Seleccionar periodo...",
  disabled = false,
  className,
}: PeriodPickerProps) {
  const [open, setOpen] = useState(false);

  const parsedFrom = useMemo(() => parseStoredDate(valueFrom), [valueFrom]);
  const parsedTo = useMemo(() => parseStoredDate(valueTo), [valueTo]);

  // Auto-detect initial mode based on saved value:
  // - month-aligned (1st – last) → Mes (default + faster path)
  // - non-aligned → Día (so user can edit it where it was created)
  const [mode, setMode] = useState<"month" | "day">(() =>
    parsedFrom && parsedTo && !isMonthAligned(parsedFrom, parsedTo) ? "day" : "month",
  );

  // When the saved value changes externally and the popover is closed,
  // re-sync the mode so it lands in the right tool the next time it opens.
  useEffect(() => {
    if (!open) {
      setMode(
        parsedFrom && parsedTo && !isMonthAligned(parsedFrom, parsedTo)
          ? "day"
          : "month",
      );
    }
  }, [open, parsedFrom, parsedTo]);

  const now = new Date();
  const [year, setYear] = useState<number>(
    parsedFrom?.getFullYear() ?? now.getFullYear(),
  );
  const [monthAnchor, setMonthAnchor] = useState<number | null>(null);

  // ----- month-mode helpers -----

  const selectedMonthStart =
    parsedFrom && parsedFrom.getDate() === 1 && parsedFrom.getFullYear() === year
      ? parsedFrom.getMonth()
      : null;
  const selectedMonthEnd =
    parsedTo && isLastDayOfMonth(parsedTo) && parsedTo.getFullYear() === year
      ? parsedTo.getMonth()
      : null;
  const selectionIsMonthAligned =
    parsedFrom &&
    parsedTo &&
    isMonthAligned(parsedFrom, parsedTo) &&
    parsedFrom.getFullYear() === year &&
    parsedTo.getFullYear() === year;

  function isMonthSelected(m: number): boolean {
    if (!selectionIsMonthAligned) return false;
    if (selectedMonthStart === null || selectedMonthEnd === null) return false;
    return m >= selectedMonthStart && m <= selectedMonthEnd;
  }

  function handleMonthClick(m: number) {
    if (monthAnchor === null) {
      const from = startOfMonth(year, m);
      const to = endOfMonth(year, m);
      onChange?.(formatStoredDate(from)!, formatStoredDate(to)!);
      setMonthAnchor(m);
      return;
    }
    const start = Math.min(monthAnchor, m);
    const end = Math.max(monthAnchor, m);
    const from = startOfMonth(year, start);
    const to = endOfMonth(year, end);
    onChange?.(formatStoredDate(from)!, formatStoredDate(to)!);
    setMonthAnchor(null);
    setOpen(false);
  }

  // ----- day-mode helpers -----
  // Day-mode is a 2-click flow:
  //   Click 1 → only `range.from` is set; we keep it locally so the calendar
  //             shows the start highlight without committing a 0-day range.
  //   Click 2 → `range.to` is set; commit (desde, hasta) and close.
  //   Click 3 → with `resetOnSelect`, RDP resets to a new `from`-only range.
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);

  // Reset pending state whenever popover closes or external value changes.
  useEffect(() => {
    if (!open) setPendingRange(undefined);
  }, [open]);
  useEffect(() => {
    setPendingRange(undefined);
  }, [valueFrom, valueTo]);

  const dayPickerSelected: DateRange | undefined = pendingRange
    ? pendingRange
    : parsedFrom && parsedTo
    ? { from: parsedFrom, to: parsedTo }
    : undefined;

  function handleDayRangeSelect(range: DateRange | undefined) {
    if (!range?.from) {
      setPendingRange(undefined);
      onChange?.("", "");
      return;
    }
    if (!range.to || range.to.getTime() === range.from.getTime()) {
      // Mid-flow: store start locally, do NOT commit yet.
      setPendingRange({ from: range.from });
      return;
    }
    // Complete range — commit and close.
    setPendingRange(undefined);
    onChange?.(formatStoredDate(range.from)!, formatStoredDate(range.to)!);
    setOpen(false);
  }

  function applyPreset(preset: Preset) {
    const { from, to } = preset.build();
    onChange?.(formatStoredDate(from)!, formatStoredDate(to)!);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange?.("", "");
    setMonthAnchor(null);
  }

  const triggerLabel = formatTriggerLabel(parsedFrom, parsedTo);
  const hasValue = Boolean(parsedFrom && parsedTo);

  // Years range for selectors (currentYear - 2 .. + 4)
  const years = useMemo(() => {
    const base = now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => base - 2 + i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.getFullYear()]);

  const presets = useMemo(() => buildPresets(now), [now.getDate(), now.getMonth(), now.getFullYear()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight the active preset (if the current selection matches one).
  const activePresetKey = useMemo(() => {
    if (!parsedFrom || !parsedTo) return null;
    const fromKey = formatStoredDate(parsedFrom);
    const toKey = formatStoredDate(parsedTo);
    for (const p of presets) {
      const r = p.build();
      if (formatStoredDate(r.from) === fromKey && formatStoredDate(r.to) === toKey) {
        return p.key;
      }
    }
    return null;
  }, [parsedFrom, parsedTo, presets]);

  const nights = parsedFrom && parsedTo
    ? Math.max(0, differenceInCalendarDays(parsedTo, parsedFrom))
    : null;
  const days = parsedFrom && parsedTo
    ? differenceInCalendarDays(parsedTo, parsedFrom) + 1
    : null;

  const triggerButton = (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "group flex h-9 w-full items-center justify-between px-3 text-[13.5px] font-body outline-none transition-all",
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
      <span className="ml-2 inline-flex shrink-0 items-center gap-1.5">
        {hasValue && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Limpiar selección"
            onClick={handleClear}
            onMouseDown={(e) => e.preventDefault()}
            className="hidden h-5 w-5 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 group-hover:inline-flex"
          >
            <XIcon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        )}
        <CalendarIcon className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
      </span>
    </button>
  );

  const trigger = label ? (
    <div className={cn("flex flex-col gap-1.5")}>
      <label className="text-label font-medium text-neutral-500">{label}</label>
      <Popover.Trigger asChild>{triggerButton}</Popover.Trigger>
    </div>
  ) : (
    <Popover.Trigger asChild>{triggerButton}</Popover.Trigger>
  );

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMonthAnchor(null);
      }}
    >
      {trigger}

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="start"
          collisionPadding={8}
          className={cn(
            "z-[200]",
            mode === "day" ? "w-[700px] max-w-[calc(100vw-24px)]" : "w-[296px]",
          )}
          style={{
            // Solid white instead of a translucent gradient. The previous
            // rgba(0.98 → 0.96) + backdrop-filter combo rendered as visibly
            // transparent over the admin's blurred orb background — readable
            // for the calendar header but the lower portion of the popover
            // (especially in 700px "Día" mode) bled the page underneath.
            background: "#FFFFFF",
            border: "1px solid rgba(17,17,36,0.08)",
            borderRadius: "14px",
            boxShadow:
              "0 24px 64px -16px rgba(17,17,36,0.18), 0 8px 24px -8px rgba(17,17,36,0.06)",
            padding: "10px",
          }}
        >
          {/* Mode toggle + utility row */}
          <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
            <div
              className="relative inline-flex h-7 rounded-full bg-neutral-100/80 p-0.5 text-[11px] font-semibold"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "month"}
                onClick={() => setMode("month")}
                className={cn(
                  "rounded-full px-3 transition-all",
                  mode === "month"
                    ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(17,17,36,0.08)]"
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
                  "rounded-full px-3 transition-all",
                  mode === "day"
                    ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(17,17,36,0.08)]"
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
                className="h-7 rounded-full border border-neutral-200/70 bg-white px-2.5 text-[11px] font-semibold text-neutral-700 outline-none focus:border-[#3BBFAD] focus:ring-2 focus:ring-[#3BBFAD]/20"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
            {mode === "day" && hasValue && (
              <button
                type="button"
                onClick={() => onChange?.("", "")}
                className="text-[11px] font-medium text-neutral-400 hover:text-[#3BBFAD]"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Body */}
          {mode === "month" ? (
            <div className="px-0.5">
              <div className="grid grid-cols-4 gap-1">
                {MONTH_NAMES_SHORT.map((name, idx) => {
                  const selected = isMonthSelected(idx);
                  const anchor = monthAnchor === idx;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleMonthClick(idx)}
                      className={cn(
                        "h-8 rounded-lg text-[11.5px] font-semibold tracking-wide transition-all",
                        selected
                          ? "text-white shadow-[0_1px_2px_rgba(59,191,173,0.35)]"
                          : anchor
                          ? "bg-[rgba(59,191,173,0.10)] text-[#157d70] ring-1 ring-[#3BBFAD]/60"
                          : "text-neutral-600 hover:bg-[rgba(59,191,173,0.08)] hover:text-[#157d70]",
                      )}
                      style={
                        selected
                          ? {
                              background:
                                "linear-gradient(180deg, #4DCDB9 0%, #3BBFAD 100%)",
                            }
                          : undefined
                      }
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 px-1 text-[10.5px] leading-relaxed text-neutral-400">
                {monthAnchor !== null
                  ? `Elegí el mes final, o volvé a clicar ${MONTH_NAMES_SHORT[monthAnchor]} para mantenerlo solo.`
                  : "Un mes = ese mes completo. Dos meses = rango entre ambos."}
              </p>
            </div>
          ) : (
            <div className="flex gap-2.5">
              {/* Presets sidebar */}
              <div className="flex w-[122px] shrink-0 flex-col gap-px border-r border-neutral-100 pr-1.5">
                <p className="px-1.5 pb-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                  Atajos
                </p>
                {presets.map((p) => {
                  const isActive = activePresetKey === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={cn(
                        "group/preset flex h-6 items-center rounded-md px-2 text-left text-[11px] font-medium transition-all",
                        isActive
                          ? "bg-[rgba(59,191,173,0.10)] text-[#157d70]"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-[#157d70]",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Two-month calendar */}
              <div
                className="rdp-period min-w-0 flex-1"
                style={
                  {
                    fontSize: "12px",
                    lineHeight: 1,
                    "--rdp-accent-color": "#3BBFAD",
                    "--rdp-accent-background-color": "rgba(59,191,173,0.10)",
                    "--rdp-today-color": "#3BBFAD",
                    "--rdp-day-width": "30px",
                    "--rdp-day-height": "28px",
                    "--rdp-day_button-width": "28px",
                    "--rdp-day_button-height": "28px",
                    "--rdp-day_button-border": "1px solid transparent",
                    "--rdp-day_button-border-radius": "8px",
                    "--rdp-months-gap": "16px",
                    "--rdp-nav-height": "28px",
                    "--rdp-nav_button-width": "22px",
                    "--rdp-nav_button-height": "22px",
                    "--rdp-range_start-color": "#FFFFFF",
                    "--rdp-range_end-color": "#FFFFFF",
                    "--rdp-range_start-date-background-color": "#3BBFAD",
                    "--rdp-range_end-date-background-color": "#3BBFAD",
                    "--rdp-range_middle-background-color":
                      "rgba(59,191,173,0.12)",
                    "--rdp-range_middle-color": "#0F2F2A",
                    "--rdp-weekday-text-transform": "uppercase",
                    "--rdp-weekday-opacity": "0.5",
                    "--rdp-weekday-padding": "0.3rem 0",
                  } as React.CSSProperties
                }
              >
                <DayPicker
                  mode="range"
                  selected={dayPickerSelected}
                  onSelect={handleDayRangeSelect}
                  defaultMonth={parsedFrom ?? new Date(now.getFullYear(), now.getMonth(), 1)}
                  numberOfMonths={2}
                  pagedNavigation
                  resetOnSelect
                  navLayout="around"
                  locale={es}
                  startMonth={new Date(years[0], 0, 1)}
                  endMonth={new Date(years[years.length - 1], 11, 31)}
                  styles={{
                    months: {
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "nowrap",
                      gap: "16px",
                    },
                    month_caption: {
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#1a1a2e",
                      textTransform: "capitalize",
                      letterSpacing: "0.005em",
                      height: "28px",
                    },
                    caption_label: {
                      fontSize: "12.5px",
                      fontWeight: 600,
                    },
                    weekday: {
                      fontSize: "9.5px",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      color: "#9ca3af",
                    },
                    day: {
                      fontSize: "12px",
                    },
                    day_button: {
                      fontSize: "12px",
                      fontWeight: 500,
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer: current selection summary */}
          {parsedFrom && parsedTo && (
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-[rgba(59,191,173,0.06)] to-transparent px-2.5 py-1.5 text-[11px]">
              <span className="truncate font-medium text-neutral-700">
                {format(parsedFrom, "dd MMM yyyy", { locale: es })}
                <span className="mx-1.5 text-neutral-300">→</span>
                {format(parsedTo, "dd MMM yyyy", { locale: es })}
              </span>
              {days !== null && (
                <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-semibold text-[#157d70] ring-1 ring-[#3BBFAD]/15">
                  {days} {days === 1 ? "día" : "días"}
                  {nights !== null && nights > 0
                    ? ` · ${nights}n`
                    : ""}
                </span>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

PeriodPicker.displayName = "PeriodPicker";
