"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ICON_OPTIONS, ServiceIcon } from "@/components/ui/ServiceIcon";

// Searchable icon picker for Incluye rows / catalog services. Shows the current
// icon as a button; clicking opens a filterable grid of the curated Lucide set.
// Dependency-free: a fixed transparent backdrop closes it on outside click.
export function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_OPTIONS;
    return ICON_OPTIONS.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.key.includes(q) ||
        o.keywords.includes(q),
    );
  }, [query]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title="Elegir ícono"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 transition-colors hover:border-violet-300 hover:text-violet-600 disabled:opacity-50"
      >
        <ServiceIcon icon={value} size={18} />
      </button>

      {open && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
            aria-hidden
          />
          <div className="absolute left-0 top-11 z-50 w-72 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ícono…"
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-2 text-sm focus:border-violet-300 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
              {filtered.map((opt) => {
                const active = opt.key === value;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    title={opt.label}
                    onClick={() => {
                      onChange(opt.key);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
                      active
                        ? "bg-violet-100 text-violet-700 ring-1 ring-violet-300"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <ServiceIcon icon={opt.key} size={22} />
                    <span className="line-clamp-2 text-center text-[9px] leading-tight text-neutral-500">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-4 py-4 text-center text-xs text-neutral-400">
                  Sin resultados
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
