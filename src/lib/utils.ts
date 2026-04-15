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
  OpcionHotelera,
  PaqueteAereo,
  PaqueteAlojamiento,
  PaqueteTraslado,
  PaqueteSeguro,
  PaqueteCircuito,
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
// Period-aware price resolution
// Dates stored as ISO YYYY-MM-DD strings; lexicographic comparison is safe.
// ---------------------------------------------------------------------------

function normalizeFecha(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  const trimmed = fecha.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function periodLengthDays(desde: string, hasta: string): number {
  const from = new Date(desde).getTime();
  const to = new Date(hasta).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/**
 * Pick the price whose period contains `fecha`. On overlap, the most specific
 * (shortest-range) period wins. Falls back to the first price if nothing matches
 * so the UI never shows a zero when data is partially seeded.
 */
export function resolvePrecioEnPeriodo<
  T extends { periodoDesde: string; periodoHasta: string },
>(precios: T[], fecha: string | null | undefined): T | undefined {
  if (precios.length === 0) return undefined;
  const target = normalizeFecha(fecha);
  if (!target) return precios[0];

  const matches = precios.filter((p) => {
    const desde = normalizeFecha(p.periodoDesde);
    const hasta = normalizeFecha(p.periodoHasta);
    if (!desde || !hasta) return false;
    return target >= desde && target <= hasta;
  });

  if (matches.length === 0) return precios[0];
  if (matches.length === 1) return matches[0];

  return [...matches].sort(
    (a, b) =>
      periodLengthDays(a.periodoDesde, a.periodoHasta) -
      periodLengthDays(b.periodoDesde, b.periodoHasta),
  )[0];
}

/** Resolve the price for a specific flight route on a given date. */
export function resolvePrecioAereo(
  precios: PrecioAereo[],
  aereoId: string,
  fecha: string | null | undefined,
): PrecioAereo | undefined {
  return resolvePrecioEnPeriodo(
    precios.filter((p) => p.aereoId === aereoId),
    fecha,
  );
}

/** Resolve the price for a specific hotel on a given date. */
export function resolvePrecioAlojamiento(
  precios: PrecioAlojamiento[],
  alojamientoId: string,
  fecha: string | null | undefined,
): PrecioAlojamiento | undefined {
  return resolvePrecioEnPeriodo(
    precios.filter((p) => p.alojamientoId === alojamientoId),
    fecha,
  );
}

/** Resolve the price for a specific circuit on a given date. */
export function resolvePrecioCircuito(
  precios: PrecioCircuito[],
  circuitoId: string,
  fecha: string | null | undefined,
): PrecioCircuito | undefined {
  return resolvePrecioEnPeriodo(
    precios.filter((p) => p.circuitoId === circuitoId),
    fecha,
  );
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
// computePaquetePrecios -- derive price range for a paquete from current state
// ---------------------------------------------------------------------------

/** Narrow slice of PackageProvider state used by computePaquetePrecios. */
export interface PackageStateSlice {
  paqueteAereos: PaqueteAereo[];
  paqueteAlojamientos: PaqueteAlojamiento[];
  paqueteTraslados: PaqueteTraslado[];
  paqueteSeguros: PaqueteSeguro[];
  paqueteCircuitos: PaqueteCircuito[];
}

/** Narrow slice of ServiceProvider state used by computePaquetePrecios. */
export interface ServiceStateSlice {
  aereos: Aereo[];
  preciosAereo: PrecioAereo[];
  alojamientos: Alojamiento[];
  preciosAlojamiento: PrecioAlojamiento[];
  traslados: Traslado[];
  seguros: Seguro[];
  circuitos: Circuito[];
  preciosCircuito: PrecioCircuito[];
}

export interface PaquetePrecios {
  /** true when the paquete has ≥1 OpcionHotelera. */
  hasOpciones: boolean;
  /** Lowest "desde" sale price. null when paquete has no opciones and no legacy fallback. */
  min: number | null;
  /** Highest "hasta" sale price. Equals min when one opción (or legacy fallback). */
  max: number | null;
  /** Per-opción computed prices in the order the opciones were provided. */
  opcionPrecios: number[];
  /** Per-opción factors in the same order. */
  opcionFactors: number[];
  /** Shared fixed cost total used by all opciones. */
  netoFijos: number;
}

/**
 * Resolve all service prices for a paquete (period-aware) and compute per-opción sale prices.
 * Falls back to `paquete.precioVenta` when there are no OpcionHotelera rows — keeps listings
 * working for legacy paquetes that haven't been migrated to the option model.
 */
export function computePaquetePrecios(
  paquete: Paquete,
  opciones: OpcionHotelera[],
  packageState: PackageStateSlice,
  serviceState: ServiceStateSlice,
): PaquetePrecios {
  const fecha = paquete.validezDesde;

  const paqueteAereos = packageState.paqueteAereos.filter((pa) => pa.paqueteId === paquete.id);
  const paqueteAlojamientos = packageState.paqueteAlojamientos.filter((pa) => pa.paqueteId === paquete.id);
  const paqueteTraslados = packageState.paqueteTraslados.filter((pt) => pt.paqueteId === paquete.id);
  const paqueteSeguros = packageState.paqueteSeguros.filter((ps) => ps.paqueteId === paquete.id);
  const paqueteCircuitos = packageState.paqueteCircuitos.filter((pc) => pc.paqueteId === paquete.id);

  const assignedAereos = paqueteAereos
    .map((pa) => {
      const aereo = serviceState.aereos.find((a) => a.id === pa.aereoId);
      if (!aereo) return null;
      return { aereo, precioAereo: resolvePrecioAereo(serviceState.preciosAereo, pa.aereoId, fecha) };
    })
    .filter((x): x is { aereo: Aereo; precioAereo: PrecioAereo | undefined } => x !== null);

  const assignedAlojamientos = paqueteAlojamientos
    .map((pa) => {
      const alojamiento = serviceState.alojamientos.find((a) => a.id === pa.alojamientoId);
      if (!alojamiento) return null;
      return {
        alojamiento,
        precioAlojamiento: resolvePrecioAlojamiento(serviceState.preciosAlojamiento, pa.alojamientoId, fecha),
        nochesEnEste: pa.nochesEnEste ?? undefined,
      };
    })
    .filter((x): x is { alojamiento: Alojamiento; precioAlojamiento: PrecioAlojamiento | undefined; nochesEnEste: number | undefined } => x !== null);

  const assignedTraslados = paqueteTraslados
    .map((pt) => serviceState.traslados.find((t) => t.id === pt.trasladoId))
    .filter((t): t is Traslado => Boolean(t));

  const assignedSeguros = paqueteSeguros
    .map((ps) => {
      const seguro = serviceState.seguros.find((s) => s.id === ps.seguroId);
      if (!seguro) return null;
      return { seguro, diasCobertura: ps.diasCobertura ?? undefined };
    })
    .filter((x): x is { seguro: Seguro; diasCobertura: number | undefined } => x !== null);

  const assignedCircuitos = paqueteCircuitos
    .map((pc) => {
      const circuito = serviceState.circuitos.find((c) => c.id === pc.circuitoId);
      if (!circuito) return null;
      return {
        circuito,
        precioCircuito: resolvePrecioCircuito(serviceState.preciosCircuito, pc.circuitoId, fecha),
      };
    })
    .filter((x): x is { circuito: Circuito; precioCircuito: PrecioCircuito | undefined } => x !== null);

  const netoFijos = calcularNetoFijos(
    assignedAereos,
    assignedTraslados,
    assignedSeguros,
    assignedCircuitos,
    paquete.noches,
  );

  const paqueteOpciones = opciones.filter((o) => o.paqueteId === paquete.id);

  if (paqueteOpciones.length === 0) {
    const legacy = paquete.precioVenta > 0 ? paquete.precioVenta : null;
    return {
      hasOpciones: false,
      min: legacy,
      max: legacy,
      opcionPrecios: [],
      opcionFactors: [],
      netoFijos,
    };
  }

  const opcionPrecios: number[] = [];
  const opcionFactors: number[] = [];
  for (const op of paqueteOpciones) {
    const netoAloj = calcularNetoAlojamientos(op.alojamientoIds, assignedAlojamientos, paquete.noches);
    opcionPrecios.push(calcularVentaOpcion(netoFijos, netoAloj, op.factor));
    opcionFactors.push(op.factor);
  }

  return {
    hasOpciones: true,
    min: Math.min(...opcionPrecios),
    max: Math.max(...opcionPrecios),
    opcionPrecios,
    opcionFactors,
    netoFijos,
  };
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
