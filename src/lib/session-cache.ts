/**
 * sessionStorage helpers for persisting provider state across page reloads
 * within the same browser tab.
 *
 * Why sessionStorage and not localStorage:
 *   • clears when the user closes the tab → no stale data lingering
 *   • per-tab isolation → editing in tab A doesn't replay in tab B
 *   • no cross-origin / shared state surprises
 *
 * Why version + brandId in the key:
 *   • bump CACHE_VERSION whenever the persisted shape changes (avoids
 *     hydrating an old shape into new code that crashes on missing fields),
 *   • brandId ensures a user that switches brand mid-session sees a fresh
 *     fetch for the new brand instead of the old brand's cached blob.
 *
 * Stored payload includes a `ts` timestamp so callers can decide whether the
 * snapshot is fresh enough to keep, or stale enough to drop and refetch.
 *
 * All operations are wrapped in try/catch — sessionStorage can throw on
 * private-browsing, quota-exceeded, disabled cookies. We never let storage
 * errors crash the app; the worst case is "we re-fetch what we already had".
 */

const CACHE_VERSION = 1;

function makeKey(scope: string, brandId: string): string {
  return `traveloz.${scope}.v${CACHE_VERSION}.${brandId}`;
}

interface Envelope<T> {
  v: number;
  ts: number;
  data: T;
}

export function readSessionCache<T>(scope: string, brandId: string, maxAgeMs?: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(makeKey(scope, brandId));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (env.v !== CACHE_VERSION) return null;
    if (maxAgeMs && Date.now() - env.ts > maxAgeMs) return null;
    return env.data;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(scope: string, brandId: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const env: Envelope<T> = { v: CACHE_VERSION, ts: Date.now(), data };
    window.sessionStorage.setItem(makeKey(scope, brandId), JSON.stringify(env));
  } catch {
    // Quota exceeded or storage disabled — silently drop. The app keeps
    // working, we just lose the next-reload speedup.
  }
}

export function clearSessionCache(scope: string, brandId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(makeKey(scope, brandId));
  } catch {
    /* ignore */
  }
}
