// ---------------------------------------------------------------------------
// Las secciones de la cotización que mide el tracking de lectura.
//
// Módulo aparte de links.ts por una razón concreta: links.ts importa `crypto`
// para generar tokens y el componente cliente de /c/<token> necesita este
// orden para decidir hasta dónde bajó el pasajero. Sin la separación, el
// bundle del navegador arrastraría el módulo de node.
// ---------------------------------------------------------------------------

/**
 * Orden en el que el pasajero baja por la cotización. `seccionMax` guarda la
 * más avanzada que vio, así que el orden ES el dato: si mañana se agrega una
 * sección en el medio, se inserta acá y el funnel del drawer la toma sola.
 *
 * Las claves son las que manda el cliente en el beacon (data-sec en la vista
 * del pasajero); el label es lo que se dibuja en el drawer.
 */
export const SECCIONES = [
  { clave: "encabezado", label: "Encabezado" },
  { clave: "servicios", label: "Servicios" },
  { clave: "vuelos", label: "Vuelos" },
  { clave: "hoteles", label: "Hoteles" },
  { clave: "notas", label: "Notas" },
  { clave: "condiciones", label: "Condiciones" },
  { clave: "pago", label: "Formas de pago" },
  { clave: "firma", label: "Firma" },
] as const;

export type ClaveSeccion = (typeof SECCIONES)[number]["clave"];

const INDICE = new Map<string, number>(SECCIONES.map((s, i) => [s.clave, i]));

/** Posición de una sección en el recorrido. -1 si el cliente mandó cualquier cosa. */
export function indiceSeccion(clave: unknown): number {
  const i = INDICE.get(String(clave ?? ""));
  return i === undefined ? -1 : i;
}

/** Se queda con la más avanzada de las dos. Tolera nulls y basura. */
export function seccionMasAvanzada(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const ia = indiceSeccion(a);
  const ib = indiceSeccion(b);
  if (ia < 0 && ib < 0) return null;
  return ib > ia ? String(b) : String(a);
}

/** Label legible de una sección para el drawer. null si no la conocemos. */
export function labelSeccion(clave: string | null | undefined): string | null {
  const i = indiceSeccion(clave);
  return i < 0 ? null : SECCIONES[i].label;
}

