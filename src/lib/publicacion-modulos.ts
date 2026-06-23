// ---------------------------------------------------------------------------
// Orden de los módulos de la pestaña "Publicación" del editor de paquetes.
//
// El operador puede reordenar las secciones (Estado, Etiquetas, Slider, Textos,
// Incluye, Condiciones, SEO) con drag-and-drop. El orden se guarda GLOBAL (una
// sola fila en SiteSetting) y se aplica a todos los paquetes — al recargar, al
// crear uno nuevo o al emitirlo. Este módulo es la fuente de verdad de los ids
// canónicos y vive en `lib/` para que la server action (validación) y el
// componente cliente (render) compartan exactamente la misma lista sin drift.
// ---------------------------------------------------------------------------

/** Id estable de cada módulo. NO renombrar: se persiste en la DB. */
export type PublicacionModuloId =
  | "estado"
  | "etiquetas"
  | "slider"
  | "textos"
  | "incluye"
  | "condiciones"
  | "seo";

/** Orden por defecto (el histórico, antes de que fuera reordenable). */
export const DEFAULT_PUBLICACION_ORDEN: PublicacionModuloId[] = [
  "estado",
  "etiquetas",
  "slider",
  "textos",
  "incluye",
  "condiciones",
  "seo",
];

/** Key de la fila SiteSetting que guarda el orden (JSON array de ids). */
export const PUBLICACION_ORDEN_SETTING_KEY = "paquete_publicacion_modulos_orden";

const CANONICAL = new Set<string>(DEFAULT_PUBLICACION_ORDEN);

/**
 * Normaliza un orden arbitrario a una permutación válida de los ids canónicos:
 *   • descarta ids desconocidos (módulos eliminados / basura),
 *   • elimina duplicados,
 *   • agrega al final cualquier módulo canónico que falte (así un módulo NUEVO
 *     siempre aparece aunque el orden guardado sea viejo).
 * Siempre devuelve los 7 ids exactamente una vez.
 */
export function sanitizePublicacionOrden(
  input: unknown,
): PublicacionModuloId[] {
  const arr = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const result: PublicacionModuloId[] = [];
  for (const raw of arr) {
    if (typeof raw !== "string") continue;
    if (!CANONICAL.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    result.push(raw as PublicacionModuloId);
  }
  for (const id of DEFAULT_PUBLICACION_ORDEN) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}
