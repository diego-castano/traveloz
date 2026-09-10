// ---------------------------------------------------------------------------
// Ícono de cada línea de "Servicios incluidos" del cotizador. Mismo registro
// que la web pública (ServiceIcon): por categoría cuando es fija (aéreo,
// alojamiento, seguro, vehículo) o por el texto cuando la categoría es
// ambigua (traslado, opcionales). TS puro, sin React: lo importan tanto el
// editor como la ficha del pasajero (y de ahí el PDF, que es la misma vista).
// ---------------------------------------------------------------------------

import { ICON_KEYS } from "@/components/ui/ServiceIcon";
import { normalizeSearchValue } from "@/lib/search";

/** Ícono por categoría, para las que no dependen del texto de la línea. */
export const ICONO_POR_CATEGORIA: Record<string, string> = {
  aereo: "vuelo",
  traslado: "bus",
  alojamiento: "alojamiento",
  vehiculo: "traslado",
  seguro: "seguro",
  opcionales: "estrella",
};

const CATEGORIAS_FIJAS = new Set(["aereo", "alojamiento", "seguro", "vehiculo"]);

// Orden importa: la primera regla que matchea gana.
const REGLAS_TEXTO: Array<[RegExp, string]> = [
  [/buquebus|ferry|barco|catamar|crucero|navegaci/, "crucero"],
  [/velero/, "velero"],
  [/tren/, "tren"],
  [/bus|omnibus|micro/, "bus"],
  [/excursi|tour|paseo/, "excursion"],
  [/entrada|ticket/, "entradas"],
  [/desayuno/, "desayuno"],
  [/almuerzo|cena|comida|pension|all inclusive/, "comida"],
  [/tasa|impuesto/, "impuestos"],
  [/visa|documento/, "documentos"],
  [/equipaje|valija/, "equipaje"],
];

/**
 * Ícono "automático" para un servicio, sin mirar `icono`. Aéreo, alojamiento,
 * seguro y vehículo van siempre por categoría; traslado y opcionales se
 * deducen del texto (así "Buquebus" muestra un barco y no un ómnibus).
 */
export function iconoParaServicio(categoria: string, texto: string): string {
  if (CATEGORIAS_FIJAS.has(categoria)) {
    return ICONO_POR_CATEGORIA[categoria] ?? "check";
  }
  const t = normalizeSearchValue(texto);
  for (const [re, key] of REGLAS_TEXTO) {
    if (re.test(t)) return key;
  }
  return categoria === "traslado" ? "traslado" : "estrella";
}

export interface ServicioConIcono {
  categoria: string;
  texto: string;
  icono?: string | null;
}

/**
 * Ícono a dibujar para un servicio: el elegido a mano si es una clave válida
 * del registro, si no el automático por categoría/texto. Así cambiar el
 * texto de una línea sin ícono propio actualiza el dibujo solo.
 */
export function resolverIcono(servicio: ServicioConIcono): string {
  const icono = servicio.icono;
  if (icono && ICON_KEYS.includes(icono)) return icono;
  return iconoParaServicio(servicio.categoria, servicio.texto);
}
