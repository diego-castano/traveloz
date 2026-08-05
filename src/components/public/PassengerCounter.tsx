"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./PassengerCounter.module.css";
import { useFloatingCtaSuppress } from "./useFloatingCtaSuppress";

type Counts = { adultos: number; ninos: number; infantes: number };

type Props = {
  /** Hidden field name — value submitted as "adultos:N|ninos:N|infantes:N" */
  name?: string;
  initial?: Counts;
  /**
   * Tema del disparador. "default" = tarjeta blanca / borde gris (QuoteSidebar
   * del detalle de paquete). "onGradient" = disparador translúcido con borde
   * blanco para el form de /cotizar sobre el degradado violeta. El dropdown
   * queda blanco en ambos casos.
   */
  variant?: "default" | "onGradient";
};

const ROWS: Array<{
  key: keyof Counts;
  label: string;
  hint: string;
  /** Mínimo permitido (el viaje necesita al menos 1 adulto). */
  min: number;
}> = [
  { key: "adultos", label: "Adultos", hint: "Mayores de 18 años", min: 1 },
  { key: "ninos", label: "Niños", hint: "De 2 a 17 años", min: 0 },
  { key: "infantes", label: "Bebés", hint: "Menores de 2 años", min: 0 },
];

/** "2 adultos · 1 niño · 1 bebé" — resumen legible para el disparador. */
function summarize(c: Counts): string {
  const parts: string[] = [];
  if (c.adultos > 0)
    parts.push(`${c.adultos} ${c.adultos === 1 ? "adulto" : "adultos"}`);
  if (c.ninos > 0)
    parts.push(`${c.ninos} ${c.ninos === 1 ? "niño" : "niños"}`);
  if (c.infantes > 0)
    parts.push(`${c.infantes} ${c.infantes === 1 ? "bebé" : "bebés"}`);
  return parts.join(" · ");
}

/**
 * Selector de pasajeros (adultos / niños / bebés) para los formularios de
 * cotización (/cotizar, QuoteSidebar). Full-width, con stepper +/- por categoría
 * y un input oculto que serializa los conteos en un solo campo.
 */
export function PassengerCounter({
  name = "pasajeros",
  initial = { adultos: 1, ninos: 0, infantes: 0 },
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>(initial);
  // El campo arranca como un placeholder ("Cantidad de pasajeros") y recién
  // muestra el resumen cuando el visitante pasó por el panel: mostrar de entrada
  // "2 pasajeros" hacía creer que el dato ya estaba cargado (pedido del cliente).
  // El input oculto en cambio SIEMPRE manda los conteos, tocados o no, así la
  // cotización sigue llegando con el default de adultos como hasta ahora.
  const [elegido, setElegido] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Espejo de `open` para los listeners de documento, que se registran una sola
  // vez y de otro modo leerían el valor viejo del closure.
  const openRef = useRef(false);

  // El CTA flotante tapaba la fila de bebés (la última del panel) y no dejaba
  // tocar el stepper. Mientras el panel está abierto, los flotantes se apartan.
  useFloatingCtaSuppress(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Cerrar el panel cuenta como "ya elegí": el disparador pasa del placeholder
  // al resumen real, incluso si el visitante dejó los valores por defecto.
  const cerrar = () => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    setElegido(true);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        cerrar();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = counts.adultos + counts.ninos + counts.infantes;
  const adjust = (k: keyof Counts, delta: number, min: number) => {
    setCounts((c) => ({ ...c, [k]: Math.max(min, c[k] + delta) }));
    setElegido(true);
  };

  const serialized = `adultos:${counts.adultos}|ninos:${counts.ninos}|infantes:${counts.infantes}`;
  const summary = summarize(counts);

  return (
    <div
      className={`${styles.select} ${variant === "onGradient" ? styles.onGradient : ""}`}
      ref={ref}
    >
      <input type="hidden" name={name} value={serialized} />
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => {
          if (open) cerrar();
          else {
            openRef.current = true;
            setOpen(true);
          }
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className={elegido ? undefined : styles.placeholder}>
          {elegido
            ? `${total} ${total === 1 ? "pasajero" : "pasajeros"} · ${summary}`
            : "Cantidad de pasajeros"}
        </span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Pasajeros">
          {ROWS.map(({ key, label, hint, min }) => (
            <div className={styles.row} key={key}>
              <div>
                <span className={styles.label}>{label}</span>
                <span className={styles.hint}>{hint}</span>
              </div>
              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.step}
                  onClick={() => adjust(key, -1, min)}
                  disabled={counts[key] <= min}
                  aria-label={`Restar ${label}`}
                >
                  −
                </button>
                <span className={styles.count}>{counts[key]}</span>
                <button
                  type="button"
                  className={styles.step}
                  onClick={() => adjust(key, 1, min)}
                  aria-label={`Sumar ${label}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
          {/* Cierre explícito, igual que el calendario. En el celular no hay
              nada que indique que ya terminaste de elegir: el clic afuera
              funciona pero no se descubre solo (reporte del cliente). */}
          <div className="picker-done-row">
            <button type="button" className="picker-done" onClick={cerrar}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
