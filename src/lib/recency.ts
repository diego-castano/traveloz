/**
 * Recency helpers — surface the latest-added items in backend lists.
 *
 * The client wants every admin table to default to "newest first" so the row
 * just created lands at the top, and to flag rows added in the last 24 hours
 * with a "Reciente" tag.
 */

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

type WithCreatedAt = {
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

function ts(v: Date | string | null | undefined): number {
  if (!v) return 0;
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

/**
 * Most recent activity on a row: the later of `updatedAt` (last edit) and
 * `createdAt`. So both a freshly created row and a just-edited one bubble up.
 */
function lastTouched(item: WithCreatedAt): number {
  return Math.max(ts(item.updatedAt), ts(item.createdAt));
}

/**
 * Returns a new array sorted by latest activity DESC (newest first), where
 * "activity" is the most recent of edit or creation — so editing a row also
 * sends it to the top. Items without timestamps go to the end. Pure — does not
 * mutate the input.
 */
export function sortByRecency<T extends WithCreatedAt>(items: T[]): T[] {
  return items.slice().sort((a, b) => lastTouched(b) - lastTouched(a));
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
