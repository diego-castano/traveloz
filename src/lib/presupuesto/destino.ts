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
