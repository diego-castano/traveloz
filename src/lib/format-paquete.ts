/**
 * Helpers de formato de paquete a nivel de UI. NO tocan la DB.
 *
 * El sufijo "- NN Noches" o "- N Noche" en el campo `paquete.titulo` es
 * data heredada de cuando el admin lo tipeaba manualmente al crear un
 * paquete. El número de noches vive hoy en el campo dedicado `noches`,
 * así que para los listados visuales en grid (cards de RegionExplorer,
 * RelatedPackages, /destinos?tipo=) queremos mostrar solo el nombre
 * limpio del paquete.
 *
 * Estos helpers son puros, idempotentes y nunca rompen títulos que no
 * matchean el patrón: si no hay sufijo, devuelven el título tal cual.
 */

const NOCHES_TAIL_RE = /\s*[-–—]\s*\d+\s*noches?\s*$/i;

/**
 * Saca el sufijo "- NN Noches" (o "N Noche" sin tilde) del final del título.
 * Tolera guiones (-), en-dash (–) y em-dash (—), y mayúsculas.
 * "Rio de Janeiro & Buzios - 07 Noches" → "Rio de Janeiro & Buzios"
 * "Madrid  —  5 noches"                    → "Madrid"
 * "Salvador"                                → "Salvador"
 */
export function stripNochesSuffix(titulo: string | null | undefined): string {
  if (!titulo) return "";
  return titulo.replace(NOCHES_TAIL_RE, "").trim();
}
