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
  /**
   * Filtro extra que aplica el listado (ej. "solo los que no llegaron al CRM").
   * Corre antes del buscador, así se pueden combinar los dos.
   */
  filter?: (row: T) => boolean;
  /** Contenido al lado del buscador, alineado a la derecha (ej. un contador). */
  toolbar?: ReactNode;
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
  filter,
  toolbar,
}: Props<T>) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const base = filter ? rows.filter(filter) : rows;
    if (!q.trim() || !searchableFields) return base;
    const needle = q.toLowerCase();
    return base.filter((r) =>
      searchableFields.some((f) => {
        const v = r[f];
        return v != null && String(v).toLowerCase().includes(needle);
      }),
    );
  }, [rows, q, searchableFields, filter]);

  return (
    <div className="space-y-3">
      {(searchableFields || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {searchableFields ? (
            <div className="relative flex-1 min-w-[11rem] max-w-sm">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          ) : (
            <span />
          )}
          {toolbar}
        </div>
      )}

      {/*
        `overflow-x-auto` en vez de `overflow-hidden`: con la columna CRM el
        listado de leads pasa de 8 columnas y, en pantallas angostas, las
        últimas quedaban recortadas sin forma de llegar a ellas. Ahora la tabla
        scrollea de costado.
      */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-x-auto">
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
        {filtered.length !== rows.length && ` (filtrado de ${rows.length})`}
      </div>
    </div>
  );
}

// Zona horaria fija de Uruguay. Sin esto, el formato sale en la zona de quien
// renderiza: el contenedor de Railway corre en UTC, así que un lead de las 23:17
// del sábado se mostraría como las 02:17 del domingo, y encima con otra fecha.
const TZ_UY = "America/Montevideo";

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
  return d.toLocaleDateString("es-UY", { day: "numeric", month: "short", timeZone: TZ_UY });
}

/** Hora exacta del lead ("23:17"), en hora de Uruguay. */
export function horaUY(d: Date): string {
  return d.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ_UY,
  });
}

/** Día y hora completos para el tooltip ("sábado, 8 de agosto, 23:17"). */
export function fechaHoraLargaUY(d: Date): string {
  return d.toLocaleString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ_UY,
  });
}

/**
 * Celda de fecha de los listados de leads: arriba el "hace cuánto" (que es lo
 * que se mira de un vistazo) y abajo la hora exacta, que el equipo necesita para
 * saber a qué hora entró cada consulta. El título muestra el día completo.
 */
export function CeldaFecha({ fecha }: { fecha: Date }) {
  return (
    <span
      className="flex flex-col leading-tight tabular-nums"
      title={fechaHoraLargaUY(fecha)}
    >
      <span className="text-[11px] text-neutral-400">{relativeTime(fecha)}</span>
      <span className="text-[11px] font-medium text-neutral-600">
        {horaUY(fecha)}
      </span>
    </span>
  );
}
