"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  label: string;
  cell: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  searchableFields?: (keyof T)[];
  searchPlaceholder?: string;
};

export function LeadsTable<T>({
  rows,
  columns,
  onRowClick,
  rowKey,
  emptyTitle = "Sin resultados",
  emptyDescription = "Cuando lleguen envíos de este formulario aparecerán acá.",
  searchableFields,
  searchPlaceholder = "Buscar…",
}: Props<T>) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim() || !searchableFields) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      searchableFields.some((f) => {
        const v = r[f];
        return v != null && String(v).toLowerCase().includes(needle);
      }),
    );
  }, [rows, q, searchableFields]);

  return (
    <div className="space-y-3">
      {searchableFields && (
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50/80 text-neutral-600 text-[11px] uppercase tracking-wider">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`text-left px-4 py-2.5 font-medium ${c.className ?? ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-neutral-400"
                >
                  <div className="text-sm font-medium text-neutral-500">
                    {emptyTitle}
                  </div>
                  <div className="text-xs mt-1">{emptyDescription}</div>
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={() => onRowClick?.(r)}
                className={`border-t border-neutral-100 ${
                  onRowClick
                    ? "hover:bg-violet-50/40 cursor-pointer"
                    : ""
                } transition-colors`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-neutral-400 px-1">
        {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
        {q && ` (filtrado de ${rows.length})`}
      </div>
    </div>
  );
}

// Helper for the relative-date column
export function relativeTime(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("es-UY", { day: "numeric", month: "short" });
}
