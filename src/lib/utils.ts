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
 * Calculate the sale price by dividing net cost by a factor.
 * @example calcularVenta(1000, 0.77) // 1299
 * @example calcularVenta(0, 0.88) // 0
 */
export function calcularVenta(neto: number, factor: number): number {
  if (factor <= 0 || factor > 1) return neto;
  return Math.round(neto / factor);
}

// ---------------------------------------------------------------------------
// calcularNetoFijos -- fixed costs shared across all hotel options
// ---------------------------------------------------------------------------

/**
 * Calculate fixed costs shared across all hotel options (flights + transfers + insurance + circuits).
 */
export function calcularNetoFijos(
  assignedAereos: { aereo: Aereo; precioAereo?: PrecioAereo }[],
  assignedTraslados: Traslado[],
  assignedSeguros: { seguro: Seguro; diasCobertura?: number }[],
  assignedCircuitos: { circuito: Circuito; precioCircuito?: PrecioCircuito }[],
  noches: number,
): number {
  let neto = 0;
  neto += assignedAereos.reduce((sum, a) => sum + (a.precioAereo?.precioAdulto ?? 0), 0);
  neto += assignedTraslados.reduce((sum, t) => sum + t.precio, 0);
  neto += assignedSeguros.reduce((sum, s) => {
    const dias = s.diasCobertura ?? noches;
    return sum + s.seguro.costoPorDia * dias;
  }, 0);
  neto += assignedCircuitos.reduce((sum, c) => sum + (c.precioCircuito?.precio ?? 0), 0);
  return neto;
}

// ---------------------------------------------------------------------------
// calcularNetoAlojamientos -- accommodation cost for a specific hotel option
// ---------------------------------------------------------------------------

/**
 * Calculate accommodation cost for a specific hotel option.
 */
export function calcularNetoAlojamientos(
  alojamientoIds: string[],
  allAssignedAlojamientos: {
    alojamiento: Alojamiento;
    precioAlojamiento?: PrecioAlojamiento;
    nochesEnEste?: number;
  }[],
  defaultNoches: number,
): number {
  return alojamientoIds.reduce((sum, id) => {
    const found = allAssignedAlojamientos.find(a => a.alojamiento.id === id);
    if (!found) return sum;
    const noches = found.nochesEnEste ?? defaultNoches;
    return sum + (found.precioAlojamiento?.precioPorNoche ?? 0) * noches;
  }, 0);
}

// ---------------------------------------------------------------------------
// calcularVentaOpcion -- sale price for a hotel option
// ---------------------------------------------------------------------------

/**
 * Calculate sale price for a hotel option: (fixed costs + accommodation costs) / factor
 */
export function calcularVentaOpcion(netoFijos: number, netoAloj: number, factor: number): number {
  if (factor <= 0 || factor > 1) return netoFijos + netoAloj;
  return Math.round((netoFijos + netoAloj) / factor);
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
