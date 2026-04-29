"use client";

import { parseAsIndex, parseAsString, useQueryStates } from "nuqs";

/**
 * URL state for /backend/alojamientos. Same minimum surface as the listing
 * itself: a free-text query and the 1-based page index.
 */
export const alojamientosParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsIndex.withDefault(0),
};

export function useAlojamientosQueryState() {
  return useQueryStates(alojamientosParsers, {
    history: "replace",
    shallow: true,
  });
}
