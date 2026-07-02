"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/components/lib/cn";

interface TextAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** Sugerencias existentes. El usuario puede elegir una o escribir una nueva. */
  options: string[];
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  leftIcon?: React.ReactNode;
  /** Máximo de sugerencias visibles. */
  maxResults?: number;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Input con autocompletado de texto libre ("creatable"): muestra un desplegable
 * con las opciones existentes y permite tipear una nueva. Pensado para campos
 * como el destino del aéreo, donde la lista crece con lo que se va cargando.
 */
export function TextAutocomplete({
  value,
  onChange,
  options,
  placeholder,
  readOnly,
  autoFocus,
  leftIcon,
  maxResults = 40,
}: TextAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(value);
    const base = q
      ? options.filter((o) => normalize(o).includes(q))
      : options;
    const sorted = [...base].sort((a, b) => {
      if (q) {
        const aStarts = normalize(a).startsWith(q) ? 0 : 1;
        const bStarts = normalize(b).startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
      }
      return a.localeCompare(b, "es", { sensitivity: "base" });
    });
    return sorted.slice(0, maxResults);
  }, [options, value, maxResults]);

  // ¿Lo tipeado coincide exactamente (ignorando mayúsculas/tildes) con alguna
  // opción? Si no, lo mostramos como "nuevo destino".
  const exactMatch = useMemo(
    () => options.some((o) => normalize(o) === normalize(value)),
    [options, value],
  );
  const showCreateHint = Boolean(value.trim()) && !exactMatch;

  useEffect(() => {
    setHighlight(0);
  }, [filtered.length, open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function pick(option: string) {
    onChange(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight]);
      } else {
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        autoFocus={autoFocus}
        leftIcon={leftIcon}
        className={value && !readOnly ? "pr-10" : undefined}
      />

      {value && !readOnly && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 z-10 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Borrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && !readOnly && (filtered.length > 0 || showCreateHint) && (
        <div
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-[10px] border border-hairline bg-white shadow-[0_12px_32px_-12px_rgba(17,17,36,0.18)]"
          role="listbox"
        >
          {filtered.map((opt, idx) => {
            const active = idx === highlight;
            const selected = normalize(opt) === normalize(value);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors",
                  active ? "bg-[#3BBFAD]/8" : "hover:bg-neutral-50",
                )}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => pick(opt)}
              >
                <span className="flex-1 truncate text-neutral-900">{opt}</span>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-[#3BBFAD]" />
                )}
              </button>
            );
          })}

          {showCreateHint && (
            <div className="flex items-center gap-2 border-t border-hairline px-3 py-2 text-[12.5px] text-neutral-500">
              <Plus className="h-3.5 w-3.5 text-[#3BBFAD]" />
              <span className="truncate">
                Nuevo destino:{" "}
                <span className="font-medium text-neutral-800">
                  {value.trim()}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
