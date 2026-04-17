"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Globe, Building2, ChevronRight } from "lucide-react";
import { useRegiones } from "@/components/providers/CatalogProvider";
import { Input } from "@/components/ui/Input";
import { cn } from "@/components/lib/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tipo = "region" | "pais" | "ciudad";

interface DestinoOption {
  key: string;
  tipo: Tipo;
  nombre: string;
  /** Breadcrumb-style label for display (e.g. "Caribe > Rep. Dominicana > Punta Cana") */
  breadcrumb: string;
  /** Region name */
  regionNombre?: string;
  /** Pais name */
  paisNombre?: string;
}

interface DestinoAutocompleteProps {
  /** Current destino value (plain string stored on the Paquete). */
  value: string;
  /** Fires with the breadcrumb string whenever the user picks an option or types freely. */
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEPARATOR = " \u203A "; // " › "

function buildBreadcrumb(parts: string[]): string {
  return parts.filter(Boolean).join(SEPARATOR);
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DestinoAutocomplete({
  value,
  onChange,
  placeholder = "Buscar region, pais o ciudad...",
  readOnly,
  autoFocus,
}: DestinoAutocompleteProps) {
  const regiones = useRegiones();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten catalog into one searchable list
  const allOptions = useMemo<DestinoOption[]>(() => {
    const out: DestinoOption[] = [];
    for (const r of regiones) {
      out.push({
        key: `region:${r.id}`,
        tipo: "region",
        nombre: r.nombre,
        breadcrumb: r.nombre,
        regionNombre: r.nombre,
      });
      for (const p of r.paises) {
        out.push({
          key: `pais:${p.id}`,
          tipo: "pais",
          nombre: p.nombre,
          breadcrumb: buildBreadcrumb([r.nombre, p.nombre]),
          regionNombre: r.nombre,
          paisNombre: p.nombre,
        });
        for (const c of p.ciudades) {
          out.push({
            key: `ciudad:${c.id}`,
            tipo: "ciudad",
            nombre: c.nombre,
            breadcrumb: buildBreadcrumb([r.nombre, p.nombre, c.nombre]),
            regionNombre: r.nombre,
            paisNombre: p.nombre,
          });
        }
      }
    }
    return out;
  }, [regiones]);

  // Filter by current input value
  const filtered = useMemo(() => {
    const q = normalize(value.trim());
    if (!q) return allOptions.slice(0, 30);
    return allOptions
      .filter(
        (o) =>
          normalize(o.nombre).includes(q) ||
          normalize(o.breadcrumb).includes(q),
      )
      .slice(0, 30);
  }, [allOptions, value]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlight(0);
  }, [filtered.length, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function commit(option: DestinoOption) {
    onChange(option.breadcrumb);
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
        commit(filtered[highlight]);
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
        leftIcon={<MapPin className="w-4 h-4" />}
      />

      {open && !readOnly && (
        <div
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-[10px] border border-hairline bg-white shadow-[0_12px_32px_-12px_rgba(17,17,36,0.18)]"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-[13px] text-neutral-400">
              Sin resultados. El texto se guardara tal cual.
            </div>
          ) : (
            filtered.map((opt, idx) => {
              const Icon =
                opt.tipo === "region"
                  ? Globe
                  : opt.tipo === "pais"
                    ? Building2
                    : MapPin;
              const active = idx === highlight;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors",
                    active ? "bg-[#3BBFAD]/8" : "hover:bg-neutral-50",
                  )}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => commit(opt)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      opt.tipo === "region"
                        ? "text-[#3BBFAD]"
                        : opt.tipo === "pais"
                          ? "text-blue-500"
                          : "text-amber-500",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-neutral-900 font-medium">
                      {opt.regionNombre && opt.regionNombre !== opt.nombre && (
                        <>
                          <span className="text-[11.5px] font-normal text-neutral-400">
                            {opt.regionNombre}
                          </span>
                          <ChevronRight className="h-3 w-3 text-neutral-300" />
                        </>
                      )}
                      {opt.paisNombre &&
                        opt.paisNombre !== opt.nombre && (
                          <>
                            <span className="text-[11.5px] font-normal text-neutral-400">
                              {opt.paisNombre}
                            </span>
                            <ChevronRight className="h-3 w-3 text-neutral-300" />
                          </>
                        )}
                      <span className="truncate">{opt.nombre}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide",
                      opt.tipo === "region"
                        ? "bg-[#3BBFAD]/12 text-[#2a8d80]"
                        : opt.tipo === "pais"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-amber-500/10 text-amber-700",
                    )}
                  >
                    {opt.tipo}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
