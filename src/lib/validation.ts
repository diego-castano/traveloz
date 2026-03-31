import type { Paquete, OpcionHotelera } from './types';

export interface ValidationResult {
  valid: boolean;
  missing: { key: string; label: string; completed: boolean }[];
  completionPercent: number;
}

/**
 * Validate a package for activation. Returns missing fields and completion percentage.
 * BORRADOR: only titulo required.
 * ACTIVO: titulo + destino + at least 1 aereo + at least 1 hotel option with factor > 0.
 */
export function validateForActivation(
  paquete: Paquete,
  assignedAereoCount: number,
  opciones: OpcionHotelera[],
): ValidationResult {
  const checks = [
    { key: 'titulo', label: 'Titulo del paquete', completed: !!paquete.titulo.trim() },
    { key: 'destino', label: 'Destino', completed: !!paquete.destino?.trim() },
    { key: 'aereo', label: 'Al menos 1 aereo asignado', completed: assignedAereoCount > 0 },
    { key: 'opcion', label: 'Al menos 1 opcion hotelera', completed: opciones.length > 0 },
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
