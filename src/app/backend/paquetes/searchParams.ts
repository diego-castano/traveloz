"use client";

import {
  parseAsArrayOf,
  parseAsIndex,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";

/**
 * URL-state schema for the /paquetes index page.
 *
 * Every filter, the active view (table/grid), the current page index, and the
 * region drill-down from the dashboard live here so refreshes preserve state
 * and links between users / tabs are shareable.
 */
export const paquetesParsers = {
  q: parseAsString.withDefault(""),
  estado: parseAsStringEnum<
    "all" | "ACTIVO" | "BORRADOR" | "EN_REVISION" | "ARCHIVADO" | "INACTIVO"
  >([
    "all",
    "ACTIVO",
    "BORRADOR",
    "EN_REVISION",
    "ARCHIVADO",
    "INACTIVO",
  ]).withDefault("all"),
  temporada: parseAsArrayOf(parseAsString).withDefault([]),
  tipo: parseAsArrayOf(parseAsString).withDefault([]),
  destino: parseAsArrayOf(parseAsString).withDefault([]),
  region: parseAsString.withDefault(""),
  view: parseAsStringEnum<"table" | "grid">(["table", "grid"]).withDefault(
    "table",
  ),
  /**
   * 1-based page number in the URL (`?page=2`), 0-based internally so the
   * existing `currentPage - 1` math stays unchanged. We expose `page` as the
   * 1-based index (`pageIndex + 1`) for ergonomics with the existing
   * <Pagination /> component.
   */
  page: parseAsIndex.withDefault(0),
};

export function usePaquetesQueryState() {
  // shallow:true keeps it client-only; no extra Server Component fetch.
  return useQueryStates(paquetesParsers, {
    history: "replace",
    shallow: true,
  });
}
