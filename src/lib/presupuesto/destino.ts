/**
 * "Caribe › Jamaica › Jamaica" → "Jamaica".
 *
 * El panel guarda el destino del paquete como "Región › País › Ciudad", y ese
 * camino entero terminaba de título en la cotización ("Caribe › Jamaica,
 * Noviembre 2026"). El cliente pidió el 26/08 que quede solo el destino final:
 * "Jamaica, Noviembre 2026". El mes y el año no se tocan acá.
 *
 * Sin separador el texto vuelve tal cual: un título que el vendedor escribió a
 * mano ("Luna de miel en Europa") no se recorta. Tolera el ">" que dejó alguna
 * carga vieja, además del "›" que usa el panel hoy.
 */
export function destinoFinal(s: unknown): string {
  const partes = String(s ?? "")
    .split(/[›>]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return partes.length ? partes[partes.length - 1] : "";
}

/* Los meses tal cual los escribe `textoDestino` en el espejo de la fila. Es la
   misma lista que MESES en el cotizador (_mockup/data.js); acá va aparte para
   que este módulo, que también corre en el server, no dependa del mockup. */
const MESES_ESPEJO = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * "Punta Cana, Noviembre 2026" → `{ destino: "Punta Cana", periodo: "Noviembre 2026" }`.
 *
 * La columna espejo de la fila pega destino y período con una coma, y los
 * filtros de la lista partían por la PRIMERA. Con un combinado —"Roma,
 * Florencia y Venecia, Marzo 2027"— el destino quedaba en "Roma" y el mes en
 * "Florencia", así que esas cotizaciones no aparecían con ningún mes elegido.
 *
 * El período es siempre lo que va después de la ÚLTIMA coma, y solo cuenta como
 * período si arranca con un mes: un título escrito a mano con comas
 * ("Luna de miel, Europa") vuelve entero como destino.
 */
export function partirDestinoPeriodo(s: unknown): { destino: string; periodo: string } {
  const txt = String(s ?? "").trim();
  const corte = txt.lastIndexOf(",");
  if (corte < 0) return { destino: txt, periodo: "" };
  const periodo = txt.slice(corte + 1).trim();
  /* El año solo también es período: una cotización con año y sin mes se
     guarda como "Cancún, 2027". */
  const esPeriodo = /^\d{4}$/.test(periodo)
    || MESES_ESPEJO.some((m) => periodo === m || periodo.startsWith(`${m} `));
  return esPeriodo
    ? { destino: txt.slice(0, corte).trim(), periodo }
    : { destino: txt, periodo: "" };
}
