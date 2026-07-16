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

// Renglones derivados de fallback, en el orden histórico del template, cada uno
// con el regex que detecta si la lista curada ya cubre ese concepto (para no
// duplicar). El de noches se maneja aparte porque su texto depende del número.
const DERIVADO_PASAJE = { texto: "Pasaje", re: /pasaje|a[eé]reo|vuelo/i };
const DERIVADO_TRASLADOS = { texto: "Traslados", re: /traslado/i };
const DERIVADO_REGIMEN = {
  texto: "Régimen incluido",
  re: /r[eé]gimen|desayuno|pensi[oó]n|all\s*inclusive/i,
};

function textoNoches(nochesTotales: number): string {
  return `${nochesTotales} ${nochesTotales === 1 ? "noche" : "noches"}`;
}

/**
 * Arma los (hasta 4) renglones de la tarjeta pública de un paquete.
 *
 * Regla de negocio: si el operador curó una lista "Incluye" (JSON en
 * `textoIncluye`), esos textos mandan — se muestran los primeros 4 en su orden.
 * Si la lista tiene menos de 4 items, se completa con renglones derivados
 * clásicos (noches / Pasaje / Traslados / Régimen) evitando duplicar conceptos
 * que la lista curada ya mencione. Sin lista curada, fallback legacy con los 4
 * renglones fijos, omitiendo el de noches cuando `nochesTotales === 0` (para no
 * mostrar nunca "0 noches").
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

  // Con lista curada: primeros 4 en orden del operador.
  const bullets = curados.slice(0, 4);
  if (bullets.length >= 4) return bullets;

  // Completar hasta 4 con derivados que no dupliquen conceptos ya presentes.
  const yaCubre = (re: RegExp) => curados.some((t) => re.test(t));
  const derivados: string[] = [];
  if (nochesTotales > 0 && !yaCubre(/noche/i)) {
    derivados.push(textoNoches(nochesTotales));
  }
  if (!yaCubre(DERIVADO_PASAJE.re)) derivados.push(DERIVADO_PASAJE.texto);
  if (!yaCubre(DERIVADO_TRASLADOS.re)) derivados.push(DERIVADO_TRASLADOS.texto);
  if (!yaCubre(DERIVADO_REGIMEN.re)) derivados.push(DERIVADO_REGIMEN.texto);

  for (const d of derivados) {
    if (bullets.length >= 4) break;
    bullets.push(d);
  }
  return bullets;
}
