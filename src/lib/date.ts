const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Parses a stored date value into a local Date without shifting the calendar day.
 * Supports both `YYYY-MM-DD` and full ISO timestamps already saved in the DB.
 */
export function parseStoredDate(value?: string | null): Date | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  const match = DATE_ONLY_PATTERN.exec(trimmed.slice(0, 10));
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
}

/** Formats a Date as `YYYY-MM-DD` using the local calendar day. */
export function formatStoredDate(value?: Date | null): string | undefined {
  if (!value) return undefined;

  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join("-");
}

export function startOfLocalDay(value?: Date | null): Date | undefined {
  if (!value) return undefined;

  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
