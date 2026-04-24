export function normalizeSearchValue(value: unknown): string {
  if (typeof value === "string") return value.toLowerCase();
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

export function matchesSearch(query: string, ...values: unknown[]): boolean {
  const normalizedQuery = normalizeSearchValue(query).trim();
  if (!normalizedQuery) return true;
  return values.some((value) =>
    normalizeSearchValue(value).includes(normalizedQuery),
  );
}
