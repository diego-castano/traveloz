"use client";

import { useState, useRef, useEffect } from "react";

type Counts = { adultos: number; ninos: number; infantes: number };

type Props = {
  /** Hidden field name — value submitted as "adultos:N|ninos:N|infantes:N" */
  name?: string;
  initial?: Counts;
};

/**
 * +/- counter for adultos / niños / infantes used in the Fase 6 quote forms
 * (QuoteSidebar, /cotizar). Renders the same .passenger-select markup the
 * original html_inicial CSS targets, plus a hidden input that serializes the
 * counts into a single form field.
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
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const total = counts.adultos + counts.ninos + counts.infantes;
  const adjust = (k: keyof Counts, delta: number) =>
    setCounts((c) => ({ ...c, [k]: Math.max(0, c[k] + delta) }));

  const serialized = `adultos:${counts.adultos}|ninos:${counts.ninos}|infantes:${counts.infantes}`;

  return (
    <div className="passenger-select" ref={ref}>
      <input type="hidden" name={name} value={serialized} />
      <div
        className="passenger-input"
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      >
        <span>{total > 0 ? `${total} Pasajeros` : "0 Pasajeros"}</span>
      </div>
      {open && (
        <div className="passenger-dropdown" style={{ display: "block" }}>
          {(
            [
              ["adultos", "Adultos"],
              ["ninos", "Niños (>2)"],
              ["infantes", "Menores (<2)"],
            ] as const
          ).map(([k, label]) => (
            <div className="counter" key={k}>
              <span>{label}</span>
              <button
                type="button"
                onClick={() => adjust(k, -1)}
                aria-label={`Restar ${label}`}
              >
                −
              </button>
              <span className={`${k}Count`}>{counts[k]}</span>
              <button
                type="button"
                onClick={() => adjust(k, 1)}
                aria-label={`Sumar ${label}`}
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
