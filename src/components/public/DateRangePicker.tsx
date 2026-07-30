"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { useFloatingCtaSuppress } from "./useFloatingCtaSuppress";
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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Hoy" en la zona horaria del visitante, a medianoche local. Usar UTC haría
  // que de noche en Uruguay (UTC-3) el día en curso quedara bloqueado. El
  // cálculo corre en el cliente, donde el calendario existe (el popup solo se
  // monta tras un click), así que no hay riesgo de mismatch de hidratación.
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // El CTA flotante tapa el calendario abierto; se aparta mientras esté abierto.
  useFloatingCtaSuppress(open);

  const close = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(false);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // Cerrar solo cuando el rango queda completo (ida + vuelta). Con `min={1}`
  // el primer click deja `to` vacío, así que este handler no se dispara hasta
  // el segundo click; sin `min`, react-day-picker devuelve from === to en el
  // primer click y el calendario se cerraría antes de elegir la vuelta.
  //
  // El cierre espera un instante a propósito: react-day-picker recién marca
  // range_start / range_middle / range_end cuando el rango tiene ida Y vuelta,
  // así que cerrar en el mismo frame hacía que el período pintado nunca se
  // llegara a ver (lo que reportó el cliente). Con la pausa, el usuario ve el
  // tramo resaltado y después el calendario se va solo.
  const handleSelect = (next: DateRange | undefined) => {
    setRange(next);
    if (next?.from && next?.to) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        closeTimer.current = null;
        setOpen(false);
      }, 450);
    }
  };

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
        onClick={() => (open ? close() : setOpen(true))}
        placeholder={placeholder}
        className="date-range-display"
      />
      {open && (
        <div className="date-range-popup">
          <DayPicker
            mode="range"
            min={1}
            selected={range}
            onSelect={handleSelect}
            locale={es}
            numberOfMonths={1}
            // Un viaje no se cotiza para ayer: todo lo anterior a hoy queda
            // deshabilitado (hoy sí se puede elegir) y la navegación no baja
            // del mes en curso.
            disabled={{ before: today }}
            startMonth={today}
          />
          <div className="picker-done-row">
            <button type="button" className="picker-done" onClick={close}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
