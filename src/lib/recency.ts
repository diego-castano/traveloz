/**
 * Recency helpers — surface the latest-added items in backend lists.
 *
 * The client wants every admin table to default to "newest first" so the row
 * just created lands at the top, and to flag rows added in the last 24 hours
 * with a "Reciente" tag.
 */

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

type WithCreatedAt = { createdAt?: Date | string | null };

function ts(v: Date | string | null | undefined): number {
  if (!v) return 0;
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

/**
 * Returns a new array sorted by `createdAt` DESC (newest first). Items without
 * `createdAt` go to the end. Pure — does not mutate the input.
 */
export function sortByRecency<T extends WithCreatedAt>(items: T[]): T[] {
  return items.slice().sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
}

/**
 * True if the item was created within the last `windowMs` (default 24h).
 */
export function isRecent(
  createdAt: Date | string | null | undefined,
  windowMs: number = RECENT_WINDOW_MS,
): boolean {
  const t = ts(createdAt);
  if (!t) return false;
  return Date.now() - t < windowMs;
}
