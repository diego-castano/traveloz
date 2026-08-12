import type { Paquete, OpcionHotelera, PaqueteDestino } from './types';
import { computeNochesTotales } from './utils';

export interface ValidationResult {
  valid: boolean;
  missing: { key: string; label: string; completed: boolean }[];
  completionPercent: number;
}

/**
 * Validate a package for activation. Returns missing fields and completion percentage.
 * BORRADOR: only titulo required.
 * ACTIVO: titulo + destino + at least 1 aereo + at least 1 hotel option with factor > 0
 *         + total destino nights match `paquete.noches` (when noches > 0).
 *
 * El aéreo sólo cuenta en modalidad CLASICO, igual que en el gate del server
 * (`src/lib/paquete-publicable.ts`). En CIRCUITO el producto y el precio salen
 * del circuito asignado y hay circuitos terrestres sin vuelo, así que mostrar
 * el ítem en rojo era pedir algo que el gate ya no bloquea.
 */
export function validateForActivation(
  paquete: Paquete,
  assignedAereoCount: number,
  opciones: OpcionHotelera[],
  destinos: PaqueteDestino[] = [],
): ValidationResult {
  const nochesPaquete = paquete.noches ?? 0;
  const nochesDestinos = computeNochesTotales(destinos);
  // Only check this when the paquete declares a target nights count — otherwise
  // we'd block activation on legacy packages where noches was never set.
  const nochesOk =
    nochesPaquete === 0 ? true : nochesDestinos === nochesPaquete;

  const exigeAereo = paquete.modalidad !== 'CIRCUITO';

  const checks = [
    { key: 'titulo', label: 'Titulo del paquete', completed: !!paquete.titulo.trim() },
    { key: 'destino', label: 'Destino', completed: !!paquete.destino?.trim() },
    ...(exigeAereo
      ? [
          {
            key: 'aereo',
            label: 'Al menos 1 aereo asignado',
            completed: assignedAereoCount > 0,
          },
        ]
      : []),
    { key: 'opcion', label: 'Al menos 1 opcion hotelera', completed: opciones.length > 0 },
    {
      key: 'noches',
      label:
        nochesPaquete === 0
          ? 'Noches del paquete declaradas'
          : `Noches por destino suman ${nochesPaquete} (actual: ${nochesDestinos})`,
      completed: nochesOk,
    },
    {
      key: 'precio',
      label: 'Precio de venta > 0',
      completed: opciones.some((o) => o.precioVenta > 0) || paquete.precioVenta > 0,
    },
  ];

  const completedCount = checks.filter((c) => c.completed).length;
  const completionPercent = Math.round((completedCount / checks.length) * 100);

  return {
    valid: checks.every((c) => c.completed),
    missing: checks,
    completionPercent,
  };
}
