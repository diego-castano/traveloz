/**
 * Clave de comparación de un hotel propio: sin tildes, en minúsculas y con los
 * espacios colapsados. La migración que importó los hoteles viejos usa la misma
 * regla en SQL, así que el unique (vendedor, nombre, ciudad) coincide.
 */
export function normHotel(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
