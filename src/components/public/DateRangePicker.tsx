"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

type Props = {
  /** Hidden form fields written as ISO strings */
  nameFrom?: string;
  nameTo?: string;
  placeholder?: string;
  /**
   * Tema del disparador. "default" = tarjeta blanca / borde gris (QuoteSidebar
   * del detalle de paquete). "onGradient" = input translúcido con borde blanco
   * para el form de /cotizar sobre el degradado violeta.
   */
  variant?: "default" | "onGradient";
};

/**
 * Date-range picker used in Fase 6 quote forms (QuoteSidebar, /cotizar).
 * Wraps react-day-picker v9 with a custom display input that opens a popup
 * calendar. Output is two hidden inputs with ISO strings so the server
 * action can read fechaDesde / fechaHasta directly from the FormData.
 */
export function DateRangePicker({
  nameFrom = "fechaDesde",
  nameTo = "fechaHasta",
  placeholder = "Seleccioná las fechas",
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const display =
    range?.from && range?.to
      ? `${format(range.from, "dd MMM yyyy", { locale: es })} - ${format(range.to, "dd MMM yyyy", { locale: es })}`
      : range?.from
        ? `${format(range.from, "dd MMM yyyy", { locale: es })} - …`
        : placeholder;

  return (
    <div
      className={`date-range-picker${variant === "onGradient" ? " on-gradient" : ""}`}
      ref={wrapperRef}
      style={{ position: "relative" }}
    >
      <input
        type="hidden"
        name={nameFrom}
        value={range?.from?.toISOString() ?? ""}
      />
      <input
        type="hidden"
        name={nameTo}
        value={range?.to?.toISOString() ?? ""}
      />
      <input
        type="text"
        readOnly
        value={display}
        onClick={() => setOpen(!open)}
        placeholder={placeholder}
        className="date-range-display"
      />
      {open && (
        <div className="date-range-popup">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            locale={es}
            numberOfMonths={1}
          />
          <div style={{ textAlign: "right", padding: 8 }}>
            <button type="button" onClick={() => setOpen(false)}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
