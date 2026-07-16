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

import { parseIncluyeItems } from "@/lib/incluye";

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

/**
 * Resuelve las noches TOTALES a mostrar en una tarjeta pública.
 *
 * Un paquete puede no tener el campo `noches` cargado (típicamente los de
 * modalidad CIRCUITO, que no tienen destinos con noches propias): en ese caso
 * las noches reales viven en el circuito asignado. Orden de resolución:
 *   1. suma de `destinos[].noches` si es > 0
 *   2. `p.noches` si es > 0
 *   3. `circuitoNoches` si es > 0
 *   4. 0 (no hay dato — la UI omite el renglón de noches, nunca "0 noches")
 */
export function resolveNochesTotales(p: {
  noches?: number | null;
  destinos?: { noches: number | null }[] | null;
  circuitoNoches?: number | null;
}): number {
  const sumaDestinos = (p.destinos ?? []).reduce(
    (sum, d) => sum + (d.noches || 0),
    0,
  );
  if (sumaDestinos > 0) return sumaDestinos;
  if (p.noches && p.noches > 0) return p.noches;
  if (p.circuitoNoches && p.circuitoNoches > 0) return p.circuitoNoches;
  return 0;
}

// --- Concepto de noches para la tarjeta. El cliente pidió el formato
// "07 Noches" (N mayúscula, cero a la izquierda si es un solo dígito), no
// "7 noches". Se usa tanto en el resumen de la lista curada como en los
// renglones derivados y el fallback legacy.
function textoNoches(nochesTotales: number): string {
  const nn = nochesTotales < 10 ? `0${nochesTotales}` : `${nochesTotales}`;
  return `${nn} ${nochesTotales === 1 ? "Noche" : "Noches"}`;
}

// --- Noches a mostrar cuando un ítem curado habla de alojamiento/hotel/noches.
// Preferimos las noches reales del paquete (nochesTotales); si no hay dato,
// intentamos leer el número del propio texto; en último caso, "Alojamiento".
function nochesConcepto(texto: string, nochesTotales: number): string {
  if (nochesTotales > 0) return textoNoches(nochesTotales);
  const m = texto.match(/(\d+)\s*noches?/i);
  if (m) return textoNoches(parseInt(m[1], 10));
  return "Alojamiento";
}

// --- Régimen resumido a etiqueta corta. Se chequean media/completa antes que
// "desayuno" para que "media pensión con desayuno" caiga en "Media pensión".
function regimenCorto(texto: string): string {
  if (/media\s*pensi[oó]n/i.test(texto)) return "Media pensión";
  if (/pensi[oó]n\s*completa/i.test(texto)) return "Pensión completa";
  if (/desayuno/i.test(texto)) return "Con desayuno";
  return "Régimen incluido";
}

// --- Conectores que no aportan al concepto corto; se descartan al derivar un
// resumen genérico de un ítem que no matcheó ninguna categoría conocida.
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "y", "o", "u", "e",
  "en", "con", "a", "al", "un", "una", "para", "por", "su", "sus",
]);

// --- Ítem que no matcheó ninguna categoría: tomamos las primeras 2 palabras
// significativas y capitalizamos. Nunca devolvemos el texto largo (la tarjeta
// lo truncaría con "…", que es justo lo que estamos sacando).
function resumenGenerico(texto: string): string {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const significativas = palabras.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const elegidas = (significativas.length ? significativas : palabras).slice(0, 2);
  const frase = elegidas.join(" ");
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

// --- Resume un ítem curado del "Incluye" a un concepto corto de tarjeta.
// El orden de los chequeos es la prioridad pedida por el cliente. Devuelve
// null para conceptos que no aportan en la tarjeta (cupos, tasas, impuestos).
function resumirConcepto(texto: string, nochesTotales: number): string | null {
  const t = texto.trim();
  if (!t) return null;
  if (/vuelo|pasaje|a[eé]reo/i.test(t)) return "Vuelos";
  if (/\bbus\b|[oó]mnibus|buquebus/i.test(t)) return "Bus";
  // Traslado antes que noche/hotel: "Traslado Aeropuerto - Hotel" menciona
  // "Hotel" pero es un traslado, no alojamiento.
  if (/traslado|transfer/i.test(t)) return "Traslados";
  if (/noche|alojamiento|hotel/i.test(t)) return nochesConcepto(t, nochesTotales);
  if (/seguro|asistencia/i.test(t)) return "Seguros";
  if (/all\s*inclusive/i.test(t)) return "All inclusive";
  if (/desayuno|media\s*pensi[oó]n|pensi[oó]n\s*completa|r[eé]gimen/i.test(t)) {
    return regimenCorto(t);
  }
  if (/excursi[oó]n|paseo|city\s*tour/i.test(t)) return "Excursiones";
  if (/cupo|tasas?|impuesto/i.test(t)) return null;
  return resumenGenerico(t);
}

/**
 * Arma los (hasta 4) renglones de la tarjeta pública de un paquete.
 *
 * Regla de negocio: si el operador curó una lista "Incluye" (JSON en
 * `textoIncluye`), cada ítem se resume a un concepto corto de una o dos
 * palabras (Vuelos / Bus / 07 Noches / Traslados / Seguros / All inclusive…)
 * en vez de volcar el texto completo (que la tarjeta truncaba con "…"). Se
 * descartan los conceptos que no aportan (cupos/tasas), se deduplica y se
 * toman los primeros 4 en el orden del operador. Si quedan menos de 4, se
 * completa con derivados clásicos (noches / Vuelos / Traslados) sin duplicar.
 * Sin lista curada, fallback legacy con los renglones fijos, omitiendo el de
 * noches cuando `nochesTotales === 0` (para no mostrar nunca "0 noches").
 */
export function buildCardBullets(input: {
  textoIncluye: string | null;
  nochesTotales: number;
}): string[] {
  const { textoIncluye, nochesTotales } = input;
  const items = parseIncluyeItems(textoIncluye);
  const curados = (items ?? [])
    .map((it) => it.texto?.trim() ?? "")
    .filter((t) => t.length > 0);

  // Sin lista curada → fallback legacy (omite noches si son 0).
  if (curados.length === 0) {
    const legacy: string[] = ["Pasaje"];
    if (nochesTotales > 0) legacy.push(textoNoches(nochesTotales));
    legacy.push("Traslados", "Régimen incluido");
    return legacy;
  }

  // Con lista curada: cada ítem se resume a su concepto corto; se descartan los
  // que no aportan y se deduplica preservando el orden del operador.
  const bullets: string[] = [];
  const vistos = new Set<string>();
  const agregar = (concepto: string | null): boolean => {
    if (!concepto) return false;
    const clave = concepto.toLowerCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    bullets.push(concepto);
    return true;
  };

  for (const texto of curados) {
    agregar(resumirConcepto(texto, nochesTotales));
    if (bullets.length >= 4) return bullets;
  }

  // Completar hasta 4 con derivados clásicos que la lista curada no cubrió.
  const derivados: string[] = [];
  if (nochesTotales > 0) derivados.push(textoNoches(nochesTotales));
  derivados.push("Vuelos", "Traslados");
  for (const d of derivados) {
    agregar(d);
    if (bullets.length >= 4) break;
  }
  return bullets;
}
