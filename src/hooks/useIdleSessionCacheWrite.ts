"use client";

import { useEffect, useRef } from "react";
import { writeSessionCache } from "@/lib/session-cache";

type IdleHandle = number;

function scheduleIdle(cb: () => void): IdleHandle {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(cb) as unknown as IdleHandle;
  }
  // Safari (and older engines) don't implement requestIdleCallback.
  return window.setTimeout(cb, 0) as unknown as IdleHandle;
}

function cancelIdle(handle: IdleHandle): void {
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

/**
 * useIdleSessionCacheWrite — debounced, idle-time sessionStorage snapshot.
 *
 * Used by PackageProvider / ServiceProvider / CatalogProvider to persist
 * their (potentially multi-MB) state graph so a reload can hydrate instantly
 * instead of refetching everything. `JSON.stringify`-ing that graph isn't
 * free, so this hook layers three things on top of a plain `writeSessionCache`
 * call:
 *
 *   - Debounces ~800ms so a burst of dispatches (initial hydration, bulk
 *     edits) only triggers one write per quiet period — same interval the
 *     inline per-provider effects used before this was extracted.
 *   - Runs the actual write inside `requestIdleCallback` (falling back to
 *     `setTimeout(fn, 0)` on engines without it, e.g. Safari) so the
 *     serialize doesn't compete with an in-flight interaction on the main
 *     thread.
 *   - Skips the write entirely when `state` is referentially identical to
 *     the last snapshot actually written — guards against redundant
 *     serializes when the effect re-runs for a reason unrelated to `state`
 *     itself changing.
 *
 * Does NOT change what gets persisted or how it's read back — same
 * `writeSessionCache(scope, brandId, state)` call, same shape, so
 * `readSessionCache` and the hydration path are unaffected.
 *
 * @param enabled mirrors the guards each provider had inline (e.g.
 *   `!state.loading && sessionStatus === "authenticated"`) — pass `false`
 *   to skip scheduling entirely.
 */
export function useIdleSessionCacheWrite<T>(
  scope: string,
  brandId: string,
  state: T,
  enabled: boolean,
): void {
  const lastWritten = useRef<T | null>(null);
  const idleHandleRef = useRef<IdleHandle | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const debounceHandle = window.setTimeout(() => {
      if (lastWritten.current === state) return; // unchanged since last write

      idleHandleRef.current = scheduleIdle(() => {
        writeSessionCache(scope, brandId, state);
        lastWritten.current = state;
        idleHandleRef.current = null;
      });
    }, 800);

    return () => {
      window.clearTimeout(debounceHandle);
      if (idleHandleRef.current != null) {
        cancelIdle(idleHandleRef.current);
        idleHandleRef.current = null;
      }
    };
  }, [state, brandId, enabled, scope]);
}
