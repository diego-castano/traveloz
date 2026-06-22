"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/style.css";
import { Calendar, X } from "lucide-react";

function toISO(d: Date): string {
  // yyyy-mm-dd en hora local (sin desfase de zona).
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Selector de rango de fechas (Desde → Hasta) tipo check-in/check-out.
// Popover en desktop, sheet full-screen en mobile. Submite `${name}__desde` y
// `${name}__hasta` (el id del campo dinámico).
export function DateRangeField({ name, color }: { name: string; color: string }) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const label =
    range?.from && range?.to
      ? `${format(range.from, "d MMM", { locale: es })} → ${format(range.to, "d MMM yyyy", { locale: es })}`
      : range?.from
        ? `${format(range.from, "d MMM yyyy", { locale: es })} → …`
        : "Elegí las fechas";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-left text-base outline-none transition hover:border-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
      >
        <Calendar className="h-5 w-5 shrink-0 text-neutral-400" />
        <span className={range?.from ? "text-neutral-900" : "text-neutral-400"}>{label}</span>
      </button>

      <input type="hidden" name={`${name}__desde`} value={range?.from ? toISO(range.from) : ""} />
      <input type="hidden" name={`${name}__hasta`} value={range?.to ? toISO(range.to) : ""} />

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white sm:items-center sm:justify-center sm:bg-black/40 sm:p-4"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div
            className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-w-fit sm:rounded-2xl sm:shadow-2xl"
            style={{ ["--rdp-accent-color" as string]: color, ["--rdp-accent-background-color" as string]: `${color}1a` }}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <span className="text-sm font-semibold text-neutral-900">¿Cuándo viajás?</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 items-start justify-center overflow-y-auto p-3">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                locale={es}
                disabled={{ before: today }}
                excludeDisabled
                numberOfMonths={1}
                defaultMonth={range?.from ?? today}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setRange(undefined)}
                className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: color }}
                className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
