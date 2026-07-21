"use client";

import {
  useState,
  useRef,
  useEffect,
  useId,
  type KeyboardEvent,
} from "react";
import styles from "./SelectField.module.css";

export type SelectOption = { value: string; label: string };

type Props = {
  /** Nombre del campo enviado en el form (input hidden). */
  name: string;
  options: SelectOption[];
  placeholder?: string;
  /** Valor inicial (default: vacío = sin selección). */
  defaultValue?: string;
  /**
   * Tema del disparador. "default" = tarjeta blanca / borde gris (QuoteSidebar).
   * "onGradient" = disparador translúcido con borde blanco para /cotizar sobre
   * el degradado violeta. El dropdown queda blanco en ambos casos.
   */
  variant?: "default" | "onGradient";
  /** id opcional para asociar el <label> del form. */
  id?: string;
};

/**
 * Select accesible con tema coral de la marca. Reemplaza al <select> nativo
 * (que no se puede tematizar) en los formularios de cotización. Implementa el
 * patrón listbox de WAI-ARIA: teclado completo (flechas, Enter, Escape, Home/
 * End), aria-activedescendant, click-outside y foco gestionado. Full-width y
 * con targets táctiles cómodos para mobile.
 */
export function SelectField({
  name,
  options,
  placeholder = "Seleccioná una opción",
  defaultValue = "",
  variant = "default",
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  // Índice resaltado por teclado dentro del dropdown.
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  // Cerrar al click fuera.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Al abrir: llevar el foco al listbox y resaltar la opción seleccionada.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    // El foco al listbox permite navegar con flechas y que Escape vuelva.
    listRef.current?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mantener visible la opción activa al navegar con teclado.
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${baseId}-opt-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, baseId]);

  function choose(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    setValue(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div
      className={`${styles.select} ${variant === "onGradient" ? styles.onGradient : ""}`}
      ref={rootRef}
    >
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`${styles.value} ${selected ? "" : styles.placeholder}`}>
          {selected ? selected.label : placeholder}
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
        <div
          ref={listRef}
          className={styles.dropdown}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${baseId}-opt-${activeIndex}`}
          onKeyDown={onListKeyDown}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex;
            return (
              <div
                key={opt.value}
                id={`${baseId}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isActive ? styles.optionActive : ""} ${
                  isSelected ? styles.optionSelected : ""
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => choose(idx)}
              >
                <span>{opt.label}</span>
                <svg
                  className={styles.check}
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
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
