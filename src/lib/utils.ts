// ---------------------------------------------------------------------------
// Utility functions for the TravelOz data layer
// Source: docs/modulos_backend.md pricing formulas + Phase 3 research
// ---------------------------------------------------------------------------

import type {
  Paquete,
  Aereo,
  PrecioAereo,
  Alojamiento,
  PrecioAlojamiento,
  Traslado,
  Seguro,
  Circuito,
  PrecioCircuito,
} from './types';

// ---------------------------------------------------------------------------
// formatCurrency -- canonical USD formatter for the entire application
// ---------------------------------------------------------------------------

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a numeric amount as USD currency string.
 * @example formatCurrency(1234.5) // "$1,235"
 * @example formatCurrency(0) // "$0"
 */
export function formatCurrency(amount: number): string {
  return usdFormatter.format(Math.round(amount));
}

// ---------------------------------------------------------------------------
// calcularNeto -- sum all service costs for a package
// ---------------------------------------------------------------------------

/**
 * Calculate the net cost of a package by summing all assigned service costs.
 *
 * Formula from modulos_backend.md section 1.5:
 * netoCalculado = SUM(costoAereos + costoAlojamientos + costoTraslados + costoSeguros + costoCircuitos)
 */
export function calcularNeto(
  paquete: Paquete,
  assignedAereos: { aereo: Aereo; precioAereo?: PrecioAereo }[],
  assignedAlojamientos: {
    alojamiento: Alojamiento;
    precioAlojamiento?: PrecioAlojamiento;
    nochesEnEste?: number;
  }[],
  assignedTraslados: Traslado[],
  assignedSeguros: { seguro: Seguro; diasCobertura?: number }[],
  assignedCircuitos: { circuito: Circuito; precioCircuito?: PrecioCircuito }[],
): number {
  let neto = 0;

  // Aereos: sum precioAdulto for each assigned flight
  neto += assignedAereos.reduce(
    (sum, a) => sum + (a.precioAereo?.precioAdulto ?? 0),
    0,
  );

  // Alojamientos: precioPorNoche * noches (use nochesEnEste or package noches as fallback)
  neto += assignedAlojamientos.reduce((sum, a) => {
    const noches = a.nochesEnEste ?? paquete.noches;
    return sum + (a.precioAlojamiento?.precioPorNoche ?? 0) * noches;
  }, 0);

  // Traslados: flat price per transfer
  neto += assignedTraslados.reduce((sum, t) => sum + t.precio, 0);

  // Seguros: costoPorDia * dias (use diasCobertura or package noches as fallback)
  neto += assignedSeguros.reduce((sum, s) => {
    const dias = s.diasCobertura ?? paquete.noches;
    return sum + s.seguro.costoPorDia * dias;
  }, 0);

  // Circuitos: period price
  neto += assignedCircuitos.reduce(
    (sum, c) => sum + (c.precioCircuito?.precio ?? 0),
    0,
  );

  return neto;
}

// ---------------------------------------------------------------------------
// calcularVenta -- apply markup to net cost
// ---------------------------------------------------------------------------

/**
 * Calculate the sale price by applying a percentage markup to the net cost.
 * @example calcularVenta(1000, 35) // 1350
 * @example calcularVenta(0, 50) // 0
 */
export function calcularVenta(neto: number, markup: number): number {
  return Math.round(neto * (1 + markup / 100));
}

// ---------------------------------------------------------------------------
// slugify -- URL-safe slug from Spanish text
// ---------------------------------------------------------------------------

/**
 * Convert text to a URL-safe slug. Handles Spanish characters (accents, n with tilde).
 * @example slugify("Lunas de Miel") // "lunas-de-miel"
 * @example slugify("Black Friday 2026") // "black-friday-2026"
 * @example slugify("Promo Nordeste Marzo") // "promo-nordeste-marzo"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
