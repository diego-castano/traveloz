"use client";

import { parseAsIndex, parseAsString, useQueryStates } from "nuqs";

export const aereosParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsIndex.withDefault(0),
};

export function useAereosQueryState() {
  return useQueryStates(aereosParsers, {
    history: "replace",
    shallow: true,
  });
}
