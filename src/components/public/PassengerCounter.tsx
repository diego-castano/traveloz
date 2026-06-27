"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./PassengerCounter.module.css";

type Counts = { adultos: number; ninos: number; infantes: number };

type Props = {
  /** Hidden field name — value submitted as "adultos:N|ninos:N|infantes:N" */
  name?: string;
  initial?: Counts;
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
}: Props) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>(initial);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const total = counts.adultos + counts.ninos + counts.infantes;
  const adjust = (k: keyof Counts, delta: number, min: number) =>
    setCounts((c) => ({ ...c, [k]: Math.max(min, c[k] + delta) }));

  const serialized = `adultos:${counts.adultos}|ninos:${counts.ninos}|infantes:${counts.infantes}`;
  const summary = summarize(counts);

  return (
    <div className={styles.select} ref={ref}>
      <input type="hidden" name={name} value={serialized} />
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className={summary ? undefined : styles.placeholder}>
          {summary
            ? `${total} ${total === 1 ? "pasajero" : "pasajeros"} · ${summary}`
            : "Seleccioná los pasajeros"}
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
        </div>
      )}
    </div>
  );
}
