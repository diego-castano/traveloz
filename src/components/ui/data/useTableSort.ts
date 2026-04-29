"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

/**
 * useTableSort — minimal headless sort hook on top of `@tanstack/react-table`.
 *
 * Why so thin?
 *   The admin already renders rows with custom JSX (cells span multiple
 *   columns, conditional visibility, action buttons). Migrating to a fully
 *   declarative `flexRender` approach would mean rewriting every page. This
 *   hook gives us the *state machine* and the *sorted data* without forcing
 *   that rewrite — sortable headers can adopt it incrementally.
 *
 * Usage:
 *   const sort = useTableSort(paquetes, [
 *     { id: "titulo",  accessorKey: "titulo" },
 *     { id: "precio",  accessorFn: row => row.precioVenta },
 *   ]);
 *
 *   // In a header:
 *   <SortableHead
 *     direction={sort.direction("titulo")}
 *     onSort={() => sort.toggle("titulo")}
 *   >Paquete</SortableHead>
 *
 *   // In the body:
 *   sort.rows.map(row => …)
 */
export function useTableSort<T>(data: T[], columns: ColumnDef<T>[]) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = React.useMemo(
    () => table.getRowModel().rows.map((r) => r.original),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, sorting, table],
  );

  function direction(id: string): "asc" | "desc" | false {
    const entry = sorting.find((s) => s.id === id);
    if (!entry) return false;
    return entry.desc ? "desc" : "asc";
  }

  /** Cycles a column through asc → desc → unsorted. */
  function toggle(id: string) {
    setSorting((prev) => {
      const current = prev.find((s) => s.id === id);
      if (!current) return [{ id, desc: false }];
      if (current.desc === false) return [{ id, desc: true }];
      return [];
    });
  }

  function clear() {
    setSorting([]);
  }

  return { rows, direction, toggle, clear, sorting };
}
