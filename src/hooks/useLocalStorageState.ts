"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useLocalStorageState — like useState but persists to window.localStorage.
 *
 * Notes:
 *   - On the first render we use `initial` so SSR and the first client render
 *     stay in sync. After mount we hydrate from localStorage if there's a
 *     value, then keep it in sync on every set.
 *   - The setter accepts either a value or an updater function (matching the
 *     React useState signature).
 */
export function useLocalStorageState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* invalid JSON or quota → ignore */
    }
  }, [key]);

  const setAndPersist = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, setAndPersist];
}
