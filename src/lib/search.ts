// Minúsculas + sin acentos/diacríticos, para que la búsqueda ignore tildes y
// caracteres especiales: "rio" encuentra "Río", "sao" encuentra "São",
// "peru" encuentra "Perú", etc.
function foldAccents(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSearchValue(value: unknown): string {
  if (typeof value === "string") return foldAccents(value);
  if (value === null || value === undefined) return "";
  return foldAccents(String(value));
}

export function matchesSearch(query: string, ...values: unknown[]): boolean {
  const normalizedQuery = normalizeSearchValue(query).trim();
  if (!normalizedQuery) return true;
  return values.some((value) =>
    normalizeSearchValue(value).includes(normalizedQuery),
  );
}
