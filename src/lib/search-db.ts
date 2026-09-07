import { ciudadKey } from "./ciudad-nombre";

/**
 * Patrón LIKE para comparar contra `geo_key(columna)` en SQL: mismo plegado
 * (NFD, sin diacríticos, minúsculas, solo [a-z0-9]) que `ciudadKey`. Devuelve
 * `null` cuando el texto no deja nada buscable (solo signos o espacios).
 *
 * `ciudadKey` solo deja pasar [a-z0-9], así que el patrón no puede traer `%`
 * ni `_` provenientes del usuario.
 */
export function patronGeoKey(texto: string): string | null {
  const clave = ciudadKey(texto);
  return clave ? `%${clave}%` : null;
}
