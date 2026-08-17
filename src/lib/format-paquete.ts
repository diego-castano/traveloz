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
// renglones derivados y el fallback legacy. Se exporta porque el encabezado
// de la ficha de detalle escribe las noches con el mismo formato.
export function textoNoches(nochesTotales: number): string {
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
//
// Si el texto habla de régimen pero no dice CUÁL, devolvemos null en vez del
// viejo "Régimen incluido": el cliente pidió suprimir ese renglón porque no
// dice nada (todos los paquetes incluyen algún régimen) y le comía un slot a
// un concepto que sí diferencia.
function regimenCorto(texto: string): string | null {
  if (/media\s*pensi[oó]n/i.test(texto)) return "Media pensión";
  if (/pensi[oó]n\s*completa/i.test(texto)) return "Pensión completa";
  if (/desayuno/i.test(texto)) return "Con desayuno";
  return null;
}

// --- Conectores que no aportan al concepto corto; se descartan al derivar un
// resumen genérico de un ítem que no matcheó ninguna categoría conocida.
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "y", "o", "u", "e",
  "en", "con", "a", "al", "un", "una", "para", "por", "su", "sus",
]);

// --- Ítem que no matcheó ninguna categoría: tomamos las primeras 2 palabras
// significativas y capitalizamos. Nunca devolvemos el texto largo (la tarjeta
// lo truncaría con "…", que es justo lo que estamos sacando). Los tokens sin
// letras ni dígitos (guiones sueltos, "·", "&"...) se descartan antes de
// elegir: "Montevideo - Madrid" da "Montevideo Madrid", no "Montevideo -".
// Si tras filtrar no queda ningún token con contenido, el ítem se descarta
// (null) en vez de devolver un bullet vacío.
function resumenGenerico(texto: string): string | null {
  const palabras = texto.split(/\s+/).filter(Boolean);
  // Sin flag "u" (el target de tsc en este proyecto no lo admite): cubrimos
  // letras/dígitos ASCII + Latin-1 Supplement y Latin Extended-A (tildes, ñ,
  // etc.), suficiente para descartar guiones sueltos, "·", "&"...
  const conContenido = palabras.filter((w) => /[a-zA-Z0-9À-ſ]/.test(w));
  if (conContenido.length === 0) return null;
  const significativas = conContenido.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const elegidas = (significativas.length ? significativas : conContenido).slice(0, 2);
  const frase = elegidas.join(" ");
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

// --- Bucket de equipaje de mano/bodega. Va en banda de prioridad baja (ver
// buildCardBullets): es el ítem que el operador casi siempre carga primero,
// pero el que menos diferencia un paquete de otro, así que cede el slot a
// conceptos más específicos (Seguros, All inclusive, régimen, excursiones...)
// cuando hay que elegir entre los 4 bullets de la tarjeta.
const EQUIPAJE_RE = /art[ií]culo\s*personal|valija|equipaje|mochila|carry[\s-]?on|bolso/i;

// --- Etiquetas que puede producir resumirConcepto y que pertenecen a la
// banda baja de prioridad (todo lo demás es banda alta). Se comparan en
// minúsculas contra el concepto ya resuelto.
const BANDA_BAJA = new Set(["artículo personal", "equipaje"]);

// --- Resume un ítem curado del "Incluye" a un concepto corto de tarjeta.
// El orden de los chequeos es la prioridad pedida por el cliente. Devuelve
// null para conceptos que no aportan en la tarjeta (cupos, tasas, impuestos)
// o cuyo texto no tiene ningún token con contenido tras filtrar (ver
// resumenGenerico).
function resumirConcepto(texto: string, nochesTotales: number): string | null {
  const t = texto.trim();
  if (!t) return null;
  if (/vuelo|pasaje|a[eé]reo/i.test(t)) return "Vuelos";
  if (/\bbus\b|[oó]mnibus|buquebus/i.test(t)) return "Bus";
  // Traslado antes que noche/hotel: "Traslado Aeropuerto - Hotel" menciona
  // "Hotel" pero es un traslado, no alojamiento.
  if (/traslado|transfer/i.test(t)) return "Traslados";
  // All inclusive antes que noche/hotel: "all inclusive en el hotel" es el
  // régimen, no el alojamiento. Las noches no se pierden: si el paquete tiene
  // nochesTotales y ningún ítem las cubrió, el derivado las repone al final.
  if (/all\s*inclusive/i.test(t)) return "All inclusive";
  if (/noche|alojamiento|hotel/i.test(t)) return nochesConcepto(t, nochesTotales);
  if (/seguro|asistencia/i.test(t)) return "Seguros";
  if (/desayuno|media\s*pensi[oó]n|pensi[oó]n\s*completa|r[eé]gimen/i.test(t)) {
    return regimenCorto(t);
  }
  if (/excursi[oó]n|paseo|city\s*tour/i.test(t)) return "Excursiones";
  if (/cupo|tasas?|impuesto/i.test(t)) return null;
  // Equipaje va justo antes del genérico: si nada más matcheó, es el último
  // chequeo específico antes de caer al resumen de palabras sueltas.
  if (EQUIPAJE_RE.test(t)) {
    return /art[ií]culo\s*personal/i.test(t) ? "Artículo personal" : "Equipaje";
  }
  return resumenGenerico(t);
}

/**
 * Servicios REALES cargados en el paquete (contadores de las relaciones
 * aereos/traslados/seguros). Sirven para no prometer nunca lo que el paquete
 * no tiene: el fallback viejo escribía "Pasaje · Traslados · Régimen incluido"
 * fijo, y así aparecían traslados en paquetes que sólo tienen tours.
 *
 * Opcional: si no se pasa, no se deriva ningún servicio (mejor una tarjeta con
 * menos renglones que una que miente).
 */
export type ServiciosPaquete = {
  vuelos?: boolean;
  traslados?: boolean;
  seguros?: boolean;
};

// --- ¿Este renglón ya le dice al viajero cuántas noches dura el paquete?
// Alcanza con que nombre la palabra: "07 Noches", "7 noches con desayuno".
const MENCIONA_NOCHES_RE = /noches?/i;

// --- Idem para el seguro/asistencia al viajero.
const MENCIONA_SEGURO_RE = /seguros?|asistencia/i;

// --- Transporte principal del paquete. Marca el lugar donde entra el renglón
// de noches cuando hay que reponerlo (ver garantizarNoches).
const TRANSPORTE_RE = /vuelo|\bbus\b|[oó]mnibus/i;

/**
 * Garantiza el renglón de noches en la tarjeta.
 *
 * El sitio público borra el sufijo "- 07 Noches" del título (stripNochesSuffix),
 * así que el bullet es el ÚNICO lugar de la tarjeta donde el viajero ve la
 * duración. Antes ese bullet competía por los 4 slots y perdía en dos casos
 * reales del catálogo:
 *
 *   1. Automático: un ítem como "7 noches de alojamiento con all inclusive"
 *      se resume como "All inclusive" (el régimen matchea antes que la noche),
 *      y con Vuelos + Traslados + All inclusive + Seguros los 4 slots ya están
 *      ocupados, así que el derivado de noches nunca entraba.
 *   2. Manual: el operador curó 4 renglones sin nombrar las noches (los Club
 *      Med son todos así).
 *
 * Ahora las noches entran sí o sí: se insertan después del renglón de
 * transporte (Vuelos/Bus), que es el orden que ya usa el operador en los
 * bullets manuales ("Vuelos · 07 Noches · Traslados · Seguros"). Si con eso
 * pasamos de 4, cae el renglón de menor valor: primero el equipaje, y si no
 * hay, el último.
 */
function garantizarNoches(bullets: string[], nochesTotales: number): string[] {
  if (nochesTotales <= 0) return bullets;
  if (bullets.some((b) => MENCIONA_NOCHES_RE.test(b))) return bullets;

  const idxTransporte = bullets.findIndex((b) => TRANSPORTE_RE.test(b));
  return insertarPrioritario(
    bullets,
    textoNoches(nochesTotales),
    idxTransporte >= 0 ? idxTransporte + 1 : 0,
  );
}

/**
 * Garantiza el renglón de seguro, a pedido del cliente ("priorizar seguro").
 *
 * El seguro es el ítem que el operador carga último en el "Incluye", así que
 * era el primero en caerse cuando la lista traía más de 4 conceptos. Entra al
 * final, que es donde el operador ya lo pone en sus renglones manuales.
 *
 * Sólo se repone si el paquete REALMENTE tiene seguro: o lo nombró la lista
 * curada (de ahí sale el concepto "Seguros"), o la relación `seguros` del
 * paquete trae algo.
 */
function garantizarSeguro(bullets: string[], tieneSeguro: boolean): string[] {
  if (!tieneSeguro) return bullets;
  if (bullets.some((b) => MENCIONA_SEGURO_RE.test(b))) return bullets;
  return insertarPrioritario(bullets, "Seguro", bullets.length);
}

// --- Orden de descarte cuando hay que hacerle lugar a un renglón garantizado.
// Se saca el renglón que MENOS diferencia un paquete de otro: el equipaje
// primero, después los traslados (casi todos los paquetes los incluyen). Si no
// hay ninguno de esos, cae el último. Así un Club Med conserva su "All
// inclusive", que es lo que lo distingue, en vez de perderlo contra un
// "Traslados" que dice lo mismo que el resto del catálogo.
const DESCARTABLES: RegExp[] = [EQUIPAJE_RE, /traslados?|transfer/i];

/**
 * Mete un renglón en `pos` respetando el tope de 4 renglones. Si con el nuevo
 * se pasa, cae el de menor valor según DESCARTABLES. Nunca el recién
 * insertado.
 */
function insertarPrioritario(
  bullets: string[],
  renglon: string,
  pos: number,
): string[] {
  const out = [...bullets];
  out.splice(pos, 0, renglon);
  if (out.length <= 4) return out;

  let idxACaer = -1;
  for (const re of DESCARTABLES) {
    idxACaer = out.findIndex((b, i) => i !== pos && re.test(b));
    if (idxACaer >= 0) break;
  }
  // Sin candidato: el último que no sea el que acabamos de insertar.
  if (idxACaer < 0) idxACaer = pos === out.length - 1 ? out.length - 2 : out.length - 1;
  out.splice(idxACaer, 1);
  return out;
}

/**
 * Renglones derivados de los servicios REALES del paquete, en el orden en que
 * el operador los escribe a mano ("Vuelos · 07 Noches · Traslados · Seguro").
 * Se usan cuando no hay lista "Incluye" curada, y para completar los slots que
 * a esa lista le sobran. Nunca inventan: un servicio sin cargar no aparece.
 */
function renglonesDeServicios(
  servicios: ServiciosPaquete | undefined,
  nochesTotales: number,
): string[] {
  const out: string[] = [];
  if (servicios?.vuelos) out.push("Vuelos");
  if (nochesTotales > 0) out.push(textoNoches(nochesTotales));
  if (servicios?.traslados) out.push("Traslados");
  if (servicios?.seguros) out.push("Seguro");
  return out;
}

/**
 * Renglones automáticos: lo que la tarjeta muestra cuando el operador no
 * escribió nada en ese slot.
 *
 * Con lista "Incluye" curada (JSON en `textoIncluye`), cada ítem se resume a
 * un concepto corto de una o dos palabras (Vuelos / Bus / 07 Noches /
 * Traslados / Seguro / All inclusive…) en vez de volcar el texto completo (que
 * la tarjeta truncaba con "…"). Se descartan los conceptos que no aportan
 * (cupos, tasas, "régimen incluido" a secas) y se deduplica.
 *
 * Priorización por especificidad: el equipaje de mano (Artículo personal /
 * Equipaje) es el ítem que el operador casi siempre carga primero pero el que
 * menos diferencia un paquete, así que va en banda baja y compite por los
 * slots sobrantes recién después de los conceptos de banda alta. Dentro de
 * cada banda se conserva el orden del operador. Es lo que hace que un paquete
 * de 3 servicios (vuelo + traslado + hotel) sume el equipaje, como pidió el
 * cliente. Si aun así sobran slots, se completan con los servicios REALES del
 * paquete que la lista no cubrió.
 *
 * Sin lista curada, los renglones salen enteros de esos servicios reales. El
 * fallback viejo era fijo ("Pasaje · Traslados · Régimen incluido") y por eso
 * aparecían traslados en paquetes que sólo tienen tours.
 */
function bulletsAutomaticos(
  textoIncluye: string | null,
  nochesTotales: number,
  servicios: ServiciosPaquete | undefined,
): string[] {
  const items = parseIncluyeItems(textoIncluye);
  const curados = (items ?? [])
    .map((it) => it.texto?.trim() ?? "")
    .filter((t) => t.length > 0);

  const derivados = renglonesDeServicios(servicios, nochesTotales);

  // Sin lista curada → sólo servicios reales.
  if (curados.length === 0) return derivados.slice(0, 4);

  // Resolvemos y deduplicamos TODOS los ítems curados primero (no solo los
  // primeros 4) para poder clasificarlos en banda alta/baja antes de elegir
  // qué entra en la tarjeta.
  const altos: string[] = [];
  const bajos: string[] = [];
  const vistos = new Set<string>();
  for (const texto of curados) {
    const concepto = resumirConcepto(texto, nochesTotales);
    if (!concepto) continue;
    const clave = concepto.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    (BANDA_BAJA.has(clave) ? bajos : altos).push(concepto);
  }

  const bullets: string[] = [...altos, ...bajos].slice(0, 4);

  // Completar hasta 4 con servicios reales que la lista curada no cubrió.
  for (const d of derivados) {
    if (bullets.length >= 4) break;
    const clave = d.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    bullets.push(d);
  }
  return bullets;
}

/**
 * Arma los (hasta 4) renglones de la tarjeta pública de un paquete.
 *
 * Los 4 slots son INDEPENDIENTES: cada uno es el renglón que escribió el
 * operador en la pestaña Publicación, o el automático de esa posición si lo
 * dejó vacío. El cliente pidió justamente esto — "que se complete de forma
 * automática pero sea editable para casos puntuales" —, porque antes tocar un
 * slot obligaba a reescribir los cuatro: la tarjeta mostraba sólo los que
 * tuvieran texto.
 *
 * Sobre el resultado se garantizan los dos renglones que el cliente considera
 * innegociables y que la competencia por slots se comía: las noches (el título
 * público ya no las trae, ver stripNochesSuffix) y el seguro.
 *
 * La validación de `cardBullets` es defensiva porque el valor viene de un Json
 * de DB (podría no ser un array de strings).
 */
export function buildCardBullets(input: {
  textoIncluye: string | null;
  nochesTotales: number;
  cardBullets?: unknown;
  servicios?: ServiciosPaquete;
}): string[] {
  const { textoIncluye, nochesTotales, cardBullets, servicios } = input;

  const auto = bulletsAutomaticos(textoIncluye, nochesTotales, servicios);

  // Merge slot a slot: el texto del operador manda; el vacío cae al automático
  // de ESA posición. Los arrays viejos venían compactados (sólo los no vacíos),
  // y con este merge siguen dando el mismo resultado.
  const custom = Array.isArray(cardBullets)
    ? cardBullets.map((b) => (typeof b === "string" ? b.trim().slice(0, 60) : ""))
    : [];
  const slots = Math.max(auto.length, custom.length, 0);
  const bullets: string[] = [];
  for (let i = 0; i < slots && bullets.length < 4; i++) {
    const renglon = custom[i] || auto[i];
    if (renglon) bullets.push(renglon);
  }

  const tieneSeguro =
    servicios?.seguros === true || auto.some((b) => MENCIONA_SEGURO_RE.test(b));
  return garantizarSeguro(
    garantizarNoches(bullets, nochesTotales),
    tieneSeguro,
  );
}
