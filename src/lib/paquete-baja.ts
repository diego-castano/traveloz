// ---------------------------------------------------------------------------
// Baja del paquete (`Paquete.validezHasta`) - automática por defecto, editable.
//
// Regla de producto: el paquete sale del sitio 15 días antes del inicio del
// viaje (validezHasta = viajeDesde - 15d). Ese cálculo sigue siendo el default
// y se recalcula solo cuando cambia el período del viaje.
//
// El operador puede pisarlo (una promo que dura una semana necesita otra baja).
// Igual que el slug (`src/lib/paquete-slug.ts`) y que el campo Salidas, no hay
// columna extra que marque "manual": una baja es manual cuando difiere de la
// que se derivaría del viajeDesde guardado. Si el operador borra el campo,
// vuelve a coincidir con la derivada y el automático se reactiva solo.
//
// Módulo puro (sin prisma, sin "use server"): lo usan el formulario de la
// pestaña Datos y el server action que persiste el paquete.
// ---------------------------------------------------------------------------

import { addDays, formatStoredDate, parseStoredDate } from "@/lib/date";

/** Días de anticipación con que el paquete se da de baja antes del viaje. */
export const DIAS_BAJA_AUTOMATICA = 15;

/**
 * Normaliza una fecha guardada a `YYYY-MM-DD`. La DB tiene tanto fechas planas
 * como timestamps ISO completos; comparar strings crudos daría falsos manuales.
 */
export function toDiaGuardado(value?: string | null): string | null {
  const d = parseStoredDate(value);
  return d ? formatStoredDate(d) ?? null : null;
}

/**
 * Baja automática que corresponde a un período de viaje: `viajeDesde - 15d`.
 * Sin viajeDesde no hay baja (el paquete queda activo por tiempo indefinido).
 */
export function bajaAutomatica(viajeDesde?: string | null): string | null {
  const d = parseStoredDate(viajeDesde);
  if (!d) return null;
  return formatStoredDate(addDays(d, -DIAS_BAJA_AUTOMATICA)) ?? null;
}

/**
 * ¿La baja guardada es la automática? Sin fecha guardada también cuenta como
 * automática: es el estado inicial de un paquete recién creado, y tratarlo como
 * "manual = sin baja" congelaría el paquete en el sitio para siempre.
 */
export function esBajaAutomatica(
  validezHasta?: string | null,
  viajeDesde?: string | null,
): boolean {
  const guardada = toDiaGuardado(validezHasta);
  if (!guardada) return true;
  return guardada === bajaAutomatica(viajeDesde);
}

/**
 * Decide qué `validezHasta` hay que persistir en un guardado. Devuelve
 * `undefined` cuando no hay nada que escribir (se deja la fila como está).
 *
 *   • El payload trae baja (el caso normal: el autosave manda el paquete
 *     entero) → manda lo que trae. Vacío significa "volver al automático", así
 *     que se reemplaza por la derivada del viaje entrante.
 *   • El payload trae sólo el período del viaje → recalcula la baja, salvo que
 *     la guardada esté pisada a mano: ahí no se toca.
 *   • El payload no trae ninguno de los dos → no se escribe nada.
 */
export function resolveBajaOnSave(params: {
  /** Valores guardados hoy en la fila. */
  viajeDesdeActual?: string | null;
  validezHastaActual?: string | null;
  /** Valores entrantes; `undefined` = el payload no trae el campo. */
  viajeDesdeEntrante?: string | null;
  validezHastaEntrante?: string | null;
}): string | null | undefined {
  const {
    viajeDesdeActual,
    validezHastaActual,
    viajeDesdeEntrante,
    validezHastaEntrante,
  } = params;

  const traeViaje = viajeDesdeEntrante !== undefined;
  const traeBaja = validezHastaEntrante !== undefined;
  if (!traeViaje && !traeBaja) return undefined;

  const viajeFinal = traeViaje ? viajeDesdeEntrante : viajeDesdeActual;
  const auto = bajaAutomatica(viajeFinal);

  if (traeBaja) {
    const entrante = toDiaGuardado(validezHastaEntrante);
    return entrante ?? auto;
  }

  // Sólo cambió el viaje: la baja pisada a mano sobrevive.
  if (!esBajaAutomatica(validezHastaActual, viajeDesdeActual)) return undefined;
  return auto;
}
