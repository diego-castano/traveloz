/**
 * Helpers de admin para atribución de pauta — compartidos por el drawer de
 * leads (`LeadDetailDrawer`), las páginas de listado y la vista de leads de
 * un cotizador (`backend/cotizadores/[id]`).
 *
 * El `Json?` que guardan los leads (columnas `atribFirst`/`atribLast`) es
 * `Prisma.JsonValue`: mismo nivel de confianza que la cookie `tvz_attr` en
 * sí — el tipo de la columna no valida su forma. Por eso `parseAtribJson`
 * re-valida SIEMPRE con el `touchSchema` de `atribucion.ts` (la MISMA fuente
 * de verdad que usa la captura) antes de que el dato llegue a JSX o a un
 * CSV. Nunca se confía en el Json guardado tal cual.
 */

import { touchSchema, type Touch } from "@/lib/atribucion";

/**
 * Convierte el `Json?` de una columna `atribFirst`/`atribLast` a un `Touch`
 * validado, o `null` si no hay dato o no matchea el schema (registro viejo,
 * corrupto, etc). Nunca tira.
 */
export function parseAtribJson(value: unknown): Touch | null {
  if (value === null || value === undefined) return null;
  const parsed = touchSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// Click IDs por orden de prioridad — el primero presente gana. Mismo orden
// que usa `extraerTouch` en atribucion.ts al capturarlos.
const CLICK_ID_FIELDS: { field: "gclid" | "fbclid" | "gad"; label: string }[] = [
  { field: "gclid", label: "gclid" },
  { field: "fbclid", label: "fbclid" },
  { field: "gad", label: "gad_source" },
];

/**
 * Click ID coalescado de un touch: el primero presente entre gclid → fbclid
 * → gad_source, con la etiqueta de cuál es (un click ID sin saber de qué
 * plataforma es no le sirve a marketing).
 */
export function coalesceClickId(
  touch: Touch | null | undefined,
): { label: string; value: string } | null {
  if (!touch) return null;
  for (const { field, label } of CLICK_ID_FIELDS) {
    const value = touch[field];
    if (value) return { label, value };
  }
  return null;
}

/** Fecha de un touch (`ts`, epoch ms) en formato legible es-UY. */
export function formatTouchFecha(ts: number): string {
  return new Date(ts).toLocaleString("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
