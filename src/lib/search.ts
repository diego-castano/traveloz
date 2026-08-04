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

/**
 * Filtro para los desplegables de cmdk (`<Command filter={...}>`). El default
 * de cmdk ignora mayúsculas pero NO los diacríticos: tipear "mexico" no
 * encontraba "México". Acá normalizamos los dos lados con `normalizeSearchValue`
 * y comparamos por substring, igual que los listados del panel.
 *
 * cmdk espera un puntaje y descarta la opción con 0. Damos 1 al prefijo y 0.5
 * al substring, así "per" pone a Perú arriba de Chipre. Los `keywords` de un
 * item (sinónimos) puntúan igual que su texto visible.
 */
export function cmdkAccentFilter(
  value: string,
  search: string,
  keywords?: string[],
): number {
  const q = normalizeSearchValue(search).trim();
  if (!q) return 1;
  const candidatos = [value, ...(keywords ?? [])];
  let best = 0;
  for (const c of candidatos) {
    const v = normalizeSearchValue(c);
    if (v.startsWith(q)) return 1;
    if (v.includes(q)) best = Math.max(best, 0.5);
  }
  return best;
}

// Quita los ceros de relleno de un id secuencial ("003" → "3") sin dejar la
// cadena vacía ("000" → "0").
function stripPadding(s: string): string {
  return s.replace(/^0+(?=\d)/, "");
}

/**
 * ¿El término apunta a este ID? Es un match por PREFIJO, no por substring: el
 * ID de un aéreo es un secuencial corto ("177", "003"), y buscar "77" trayendo
 * 177, 277 y 770 es puro ruido. Con prefijo, "177" cae exacto y "17" abre el
 * rango 17x.
 *
 * Complementa a `matchesSearch` - nunca lo reemplaza. La búsqueda de un listado
 * se arma como `matchesId(q, row.id) || matchesSearch(q, ...campos de texto)`,
 * así que los catálogos que no lo usan siguen funcionando igual.
 *
 * Devuelve false con término vacío (al revés que `matchesSearch`, que ahí deja
 * pasar todo): es una condición extra dentro de un OR, no un filtro por sí sola.
 */
export function matchesId(query: string, id: unknown): boolean {
  const q = normalizeSearchValue(query).trim();
  if (!q) return false;
  const value = normalizeSearchValue(id).trim();
  if (!value) return false;
  // Caso normal: id secuencial numérico y término numérico. Se comparan sin
  // ceros de relleno para que "3" encuentre "003".
  if (/^\d+$/.test(q) && /^\d+$/.test(value)) {
    return stripPadding(value).startsWith(stripPadding(q));
  }
  // Ids no numéricos (cuid legacy): prefijo textual, sin acentos.
  return value.startsWith(q);
}
