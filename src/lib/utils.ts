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
  PaqueteDestino,
  OpcionHotel,
} from './types';

// ---------------------------------------------------------------------------
// formatCurrency -- canonical USD formatter for the entire application
// ---------------------------------------------------------------------------

// de-DE locale gives us dot as thousands separator; style:"decimal" avoids the
// "$" symbol so we can prepend an explicit "USD " label per client request.
const usdFormatter = new Intl.NumberFormat('de-DE', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a numeric amount as a USD currency string.
 * @example formatCurrency(1234.5) // "USD 1.235"
 * @example formatCurrency(0) // "USD 0"
 */
export function formatCurrency(amount: number): string {
  return `USD ${usdFormatter.format(Math.round(amount))}`;
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
 * Result of a period-aware resolution plus a flag telling whether the returned
 * price is a genuine period match or the silent "first tariff" fallback.
 *
 * `fallback` is true when the price exists but no period actually covered the
 * anchor date (either the date was missing/invalid, or no period matched) and we
 * fell back to `precios[0]`. It is false when a period matched, and false when
 * there is no price at all (`precio === undefined`).
 */
export interface PrecioResueltoMeta<T> {
  precio: T | undefined;
  fallback: boolean;
}

/**
 * Like {@link resolvePrecioEnPeriodo} but also reports whether the result came
 * from the "first tariff" fallback. The price value returned is identical to
 * `resolvePrecioEnPeriodo` — this is purely additive metadata for the UI.
 */
export function resolvePrecioEnPeriodoConMeta<
  T extends { periodoDesde: string; periodoHasta: string },
>(precios: T[], fecha: string | null | undefined): PrecioResueltoMeta<T> {
  if (precios.length === 0) return { precio: undefined, fallback: false };
  const target = normalizeFecha(fecha);
  if (!target) return { precio: precios[0], fallback: true };

  const matches = precios.filter((p) => {
    const desde = normalizeFecha(p.periodoDesde);
    const hasta = normalizeFecha(p.periodoHasta);
    if (!desde || !hasta) return false;
    return target >= desde && target <= hasta;
  });

  if (matches.length === 0) return { precio: precios[0], fallback: true };
  if (matches.length === 1) return { precio: matches[0], fallback: false };

  const best = [...matches].sort(
    (a, b) =>
      periodLengthDays(a.periodoDesde, a.periodoHasta) -
      periodLengthDays(b.periodoDesde, b.periodoHasta),
  )[0];
  return { precio: best, fallback: false };
}

/**
 * Pick the price whose period contains `fecha`. On overlap, the most specific
 * (shortest-range) period wins. Falls back to the first price if nothing matches
 * so the UI never shows a zero when data is partially seeded.
 */
export function resolvePrecioEnPeriodo<
  T extends { periodoDesde: string; periodoHasta: string },
>(precios: T[], fecha: string | null | undefined): T | undefined {
  return resolvePrecioEnPeriodoConMeta(precios, fecha).precio;
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

/** Like {@link resolvePrecioAereo}, plus whether the price is the fallback. */
export function resolvePrecioAereoConMeta(
  precios: PrecioAereo[],
  aereoId: string,
  fecha: string | null | undefined,
): PrecioResueltoMeta<PrecioAereo> {
  return resolvePrecioEnPeriodoConMeta(
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

/** Like {@link resolvePrecioAlojamiento}, plus whether the price is the fallback. */
export function resolvePrecioAlojamientoConMeta(
  precios: PrecioAlojamiento[],
  alojamientoId: string,
  fecha: string | null | undefined,
): PrecioResueltoMeta<PrecioAlojamiento> {
  return resolvePrecioEnPeriodoConMeta(
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

/** Like {@link resolvePrecioCircuito}, plus whether the price is the fallback. */
export function resolvePrecioCircuitoConMeta(
  precios: PrecioCircuito[],
  circuitoId: string,
  fecha: string | null | undefined,
): PrecioResueltoMeta<PrecioCircuito> {
  return resolvePrecioEnPeriodoConMeta(
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
  destinos: PaqueteDestino[];
  opcionHoteles: OpcionHotel[];
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
  // Prefer the actual travel start date (viajeDesde) over the listing window
  // start (validezDesde). Older paquetes that haven't been backfilled with
  // viajeDesde fall back to validezDesde so their pricing still resolves.
  const fecha = paquete.viajeDesde ?? paquete.validezDesde;

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
      };
    })
    .filter((x): x is { alojamiento: Alojamiento; precioAlojamiento: PrecioAlojamiento | undefined } => x !== null);

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

  // Noches totales: sum of destinos.noches. Used by calcularNetoFijos for
  // seguros (días × precio/día) and as the historical fallback for empty paquetes.
  const paqueteDestinos = packageState.destinos.filter(
    (d) => d.paqueteId === paquete.id,
  );
  const nochesTotales = computeNochesTotales(paqueteDestinos);

  const netoFijos = calcularNetoFijos(
    assignedAereos,
    assignedTraslados,
    assignedSeguros,
    assignedCircuitos,
    nochesTotales,
  );

  const paqueteOpciones = opciones.filter((o) => o.paqueteId === paquete.id);

  if (paqueteOpciones.length === 0) {
    // Modalidad CIRCUITO: el precio NO depende de opciones hoteleras. El neto son
    // los costos fijos (circuito por persona vigente + aéreos + traslados +
    // seguros) y la venta se deriva del markup del paquete (factor divisor,
    // misma semántica que calcularVentaOpcion). La duración de referencia para
    // los seguros sin diasCobertura es la del circuito asignado (fuente de verdad
    // de duración en esta modalidad), con fallback a paquete.noches.
    if (paquete.modalidad === 'CIRCUITO') {
      const nochesCircuito =
        assignedCircuitos[0]?.circuito.noches ?? paquete.noches ?? nochesTotales;
      const netoFijosCircuito = calcularNetoFijos(
        assignedAereos,
        assignedTraslados,
        assignedSeguros,
        assignedCircuitos,
        nochesCircuito,
      );
      const venta = calcularVenta(netoFijosCircuito, paquete.markup);
      const precio = venta > 0 ? venta : null;
      return {
        hasOpciones: false,
        min: precio,
        max: precio,
        opcionPrecios: [],
        opcionFactors: [],
        netoFijos: netoFijosCircuito,
      };
    }
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
    const netoAloj = calcularNetoAlojamientosPorOpcion(
      op.id,
      packageState.opcionHoteles,
      paqueteDestinos,
      serviceState.preciosAlojamiento,
      fecha,
    );
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
// computePaquetePreciosIndexed -- same math as computePaquetePrecios, but
// reads from pre-built Maps instead of scanning the full arrays per paquete.
// computePaquetePrecios does `.filter`/`.find` over the *entire*
// packageState/serviceState arrays for every relation, for every paquete —
// O(paquetes * relations) linear scans. When pricing many paquetes in the
// same pass (list/table views), build the index once via
// buildPaquetePreciosIndex and reuse it — O(n) to build, O(1) lookups after.
// Any change here must mirror computePaquetePrecios exactly; the two must
// always return identical results for the same inputs.
// ---------------------------------------------------------------------------

export interface PaquetePreciosIndex {
  aereoById: Map<string, Aereo>;
  preciosAereoByAereoId: Map<string, PrecioAereo[]>;
  alojamientoById: Map<string, Alojamiento>;
  preciosAlojamientoByAlojamientoId: Map<string, PrecioAlojamiento[]>;
  trasladoById: Map<string, Traslado>;
  seguroById: Map<string, Seguro>;
  circuitoById: Map<string, Circuito>;
  preciosCircuitoByCircuitoId: Map<string, PrecioCircuito[]>;
  paqueteAereosByPaqueteId: Map<string, PaqueteAereo[]>;
  paqueteAlojamientosByPaqueteId: Map<string, PaqueteAlojamiento[]>;
  paqueteTrasladosByPaqueteId: Map<string, PaqueteTraslado[]>;
  paqueteSegurosByPaqueteId: Map<string, PaqueteSeguro[]>;
  paqueteCircuitosByPaqueteId: Map<string, PaqueteCircuito[]>;
  destinosByPaqueteId: Map<string, PaqueteDestino[]>;
  opcionesByPaqueteId: Map<string, OpcionHotelera[]>;
  opcionHotelesByOpcionId: Map<string, OpcionHotel[]>;
}

function groupByKey<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function indexByKey<T>(arr: T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of arr) map.set(key(item), item);
  return map;
}

/**
 * Build the lookup indices consumed by {@link computePaquetePreciosIndexed}.
 * Call once per state snapshot (memoize on the underlying array slices) and
 * reuse it across every paquete being priced in the same pass.
 */
export function buildPaquetePreciosIndex(
  opciones: OpcionHotelera[],
  packageState: PackageStateSlice,
  serviceState: ServiceStateSlice,
): PaquetePreciosIndex {
  return {
    aereoById: indexByKey(serviceState.aereos, (a) => a.id),
    preciosAereoByAereoId: groupByKey(serviceState.preciosAereo, (p) => p.aereoId),
    alojamientoById: indexByKey(serviceState.alojamientos, (a) => a.id),
    preciosAlojamientoByAlojamientoId: groupByKey(serviceState.preciosAlojamiento, (p) => p.alojamientoId),
    trasladoById: indexByKey(serviceState.traslados, (t) => t.id),
    seguroById: indexByKey(serviceState.seguros, (s) => s.id),
    circuitoById: indexByKey(serviceState.circuitos, (c) => c.id),
    preciosCircuitoByCircuitoId: groupByKey(serviceState.preciosCircuito, (p) => p.circuitoId),
    paqueteAereosByPaqueteId: groupByKey(packageState.paqueteAereos, (pa) => pa.paqueteId),
    paqueteAlojamientosByPaqueteId: groupByKey(packageState.paqueteAlojamientos, (pa) => pa.paqueteId),
    paqueteTrasladosByPaqueteId: groupByKey(packageState.paqueteTraslados, (pt) => pt.paqueteId),
    paqueteSegurosByPaqueteId: groupByKey(packageState.paqueteSeguros, (ps) => ps.paqueteId),
    paqueteCircuitosByPaqueteId: groupByKey(packageState.paqueteCircuitos, (pc) => pc.paqueteId),
    destinosByPaqueteId: groupByKey(packageState.destinos, (d) => d.paqueteId),
    opcionesByPaqueteId: groupByKey(opciones, (o) => o.paqueteId),
    opcionHotelesByOpcionId: groupByKey(packageState.opcionHoteles, (oh) => oh.opcionHoteleraId),
  };
}

/**
 * Indexed variant of {@link calcularNetoAlojamientosPorOpcion} — identical
 * math, but reads the opción's hoteles from the pre-grouped index instead of
 * filtering the full opcionHoteles array.
 */
function calcularNetoAlojamientosPorOpcionIndexed(
  opcionId: string,
  index: PaquetePreciosIndex,
  destinos: PaqueteDestino[],
  fechaReferencia?: string | null,
): number {
  const hotelesDeOpcion = index.opcionHotelesByOpcionId.get(opcionId) ?? [];
  let total = 0;
  for (const oh of hotelesDeOpcion) {
    const destino = destinos.find((d) => d.id === oh.destinoId);
    if (!destino) continue;
    const precios = index.preciosAlojamientoByAlojamientoId.get(oh.alojamientoId) ?? [];
    const precio = resolvePrecioEnPeriodo(precios, fechaReferencia);
    if (!precio) continue;
    total += precio.precioPorNoche * destino.noches;
  }
  return total;
}

/**
 * Indexed variant of {@link computePaquetePrecios}. Same formulas, same
 * fallback rules, same return shape — only the data-access pattern differs.
 * Use this (with a shared {@link buildPaquetePreciosIndex} index) when pricing
 * many paquetes in the same render pass; use computePaquetePrecios for
 * one-off lookups where building the index isn't worth it.
 */
export function computePaquetePreciosIndexed(
  paquete: Paquete,
  index: PaquetePreciosIndex,
): PaquetePrecios {
  const fecha = paquete.viajeDesde ?? paquete.validezDesde;

  const paqueteAereos = index.paqueteAereosByPaqueteId.get(paquete.id) ?? [];
  const paqueteAlojamientos = index.paqueteAlojamientosByPaqueteId.get(paquete.id) ?? [];
  const paqueteTraslados = index.paqueteTrasladosByPaqueteId.get(paquete.id) ?? [];
  const paqueteSeguros = index.paqueteSegurosByPaqueteId.get(paquete.id) ?? [];
  const paqueteCircuitos = index.paqueteCircuitosByPaqueteId.get(paquete.id) ?? [];

  const assignedAereos = paqueteAereos
    .map((pa) => {
      const aereo = index.aereoById.get(pa.aereoId);
      if (!aereo) return null;
      const precios = index.preciosAereoByAereoId.get(pa.aereoId) ?? [];
      return { aereo, precioAereo: resolvePrecioEnPeriodo(precios, fecha) };
    })
    .filter((x): x is { aereo: Aereo; precioAereo: PrecioAereo | undefined } => x !== null);

  const assignedAlojamientos = paqueteAlojamientos
    .map((pa) => {
      const alojamiento = index.alojamientoById.get(pa.alojamientoId);
      if (!alojamiento) return null;
      const precios = index.preciosAlojamientoByAlojamientoId.get(pa.alojamientoId) ?? [];
      return {
        alojamiento,
        precioAlojamiento: resolvePrecioEnPeriodo(precios, fecha),
      };
    })
    .filter((x): x is { alojamiento: Alojamiento; precioAlojamiento: PrecioAlojamiento | undefined } => x !== null);

  const assignedTraslados = paqueteTraslados
    .map((pt) => index.trasladoById.get(pt.trasladoId))
    .filter((t): t is Traslado => Boolean(t));

  const assignedSeguros = paqueteSeguros
    .map((ps) => {
      const seguro = index.seguroById.get(ps.seguroId);
      if (!seguro) return null;
      return { seguro, diasCobertura: ps.diasCobertura ?? undefined };
    })
    .filter((x): x is { seguro: Seguro; diasCobertura: number | undefined } => x !== null);

  const assignedCircuitos = paqueteCircuitos
    .map((pc) => {
      const circuito = index.circuitoById.get(pc.circuitoId);
      if (!circuito) return null;
      const precios = index.preciosCircuitoByCircuitoId.get(pc.circuitoId) ?? [];
      return {
        circuito,
        precioCircuito: resolvePrecioEnPeriodo(precios, fecha),
      };
    })
    .filter((x): x is { circuito: Circuito; precioCircuito: PrecioCircuito | undefined } => x !== null);

  // Noches totales: sum of destinos.noches. Used by calcularNetoFijos for
  // seguros (días × precio/día) and as the historical fallback for empty paquetes.
  const paqueteDestinos = index.destinosByPaqueteId.get(paquete.id) ?? [];
  const nochesTotales = computeNochesTotales(paqueteDestinos);

  const netoFijos = calcularNetoFijos(
    assignedAereos,
    assignedTraslados,
    assignedSeguros,
    assignedCircuitos,
    nochesTotales,
  );

  const paqueteOpciones = index.opcionesByPaqueteId.get(paquete.id) ?? [];

  if (paqueteOpciones.length === 0) {
    if (paquete.modalidad === 'CIRCUITO') {
      const nochesCircuito =
        assignedCircuitos[0]?.circuito.noches ?? paquete.noches ?? nochesTotales;
      const netoFijosCircuito = calcularNetoFijos(
        assignedAereos,
        assignedTraslados,
        assignedSeguros,
        assignedCircuitos,
        nochesCircuito,
      );
      const venta = calcularVenta(netoFijosCircuito, paquete.markup);
      const precio = venta > 0 ? venta : null;
      return {
        hasOpciones: false,
        min: precio,
        max: precio,
        opcionPrecios: [],
        opcionFactors: [],
        netoFijos: netoFijosCircuito,
      };
    }
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
    const netoAloj = calcularNetoAlojamientosPorOpcionIndexed(
      op.id,
      index,
      paqueteDestinos,
      fecha,
    );
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

// ---------------------------------------------------------------------------
// Itinerario helpers — new model (PR 1)
// ---------------------------------------------------------------------------

/**
 * Total nights in a package = sum of its PaqueteDestino nights.
 * Returns 0 when the package has no destinos configured yet.
 */
export function computeNochesTotales(destinos: PaqueteDestino[]): number {
  return destinos.reduce((sum, d) => sum + (d.noches || 0), 0);
}

// ---------------------------------------------------------------------------
// deriveDestinoFromDestinos
//
// Derives a human-readable destino string for a Paquete from its itinerary
// (ordered PaqueteDestino rows). The destino is what shows up in listings, in
// search, and on the public site — historically the operator typed it by hand.
// With the itinerary editor, the city + country are already known, so this
// helper lets the form auto-suggest a destino when the field is empty.
//
// Rules:
//   - 1 ciudad           → "Ciudad, País"           (e.g. "Búzios, Brasil")
//   - 2 ciudades         → "Ciudad1 + Ciudad2"      (e.g. "Río + Búzios")
//   - 3+ ciudades        → "Ciudad1 + N destinos"   (e.g. "Río + 3 destinos")
//   - empty / missing    → ""                        (caller decides fallback)
// ---------------------------------------------------------------------------

interface CiudadResolverRow {
  id: string;
  nombre: string;
  paisId: string;
}

interface PaisResolverRow {
  id: string;
  nombre: string;
}

/**
 * Resolve a destino string from an ordered list of PaqueteDestino rows. Pass
 * the same `paises` / `ciudades` arrays the rest of the admin reads from
 * (e.g. usePaises() with its children).
 */
export function deriveDestinoFromDestinos(
  destinos: PaqueteDestino[],
  ciudades: CiudadResolverRow[],
  paises: PaisResolverRow[],
): string {
  if (destinos.length === 0) return '';

  const ordered = [...destinos].sort((a, b) => a.orden - b.orden);
  const resolved = ordered
    .map((d) => ciudades.find((c) => c.id === d.ciudadId) ?? null)
    .filter((c): c is CiudadResolverRow => c !== null);

  if (resolved.length === 0) return '';

  if (resolved.length === 1) {
    const ciudad = resolved[0];
    const pais = paises.find((p) => p.id === ciudad.paisId);
    return pais ? `${ciudad.nombre}, ${pais.nombre}` : ciudad.nombre;
  }

  if (resolved.length === 2) {
    return `${resolved[0].nombre} + ${resolved[1].nombre}`;
  }

  // 3+ destinos: lead with first city + count, keeps the listing line short.
  return `${resolved[0].nombre} + ${resolved.length - 1} destinos`;
}

/**
 * Effective nights for a hotel assignment within an opcion — equals the
 * destino nights since splits are no longer supported in the new model.
 */
export function nochesDeOpcionHotel(
  _opcionHotel: OpcionHotel,
  destino: PaqueteDestino,
): number {
  return destino.noches;
}

/**
 * Net accommodation cost for an opcion under the new model.
 * Sums (precioPorNoche × destino.noches) for each OpcionHotel of the opcion.
 */
export function calcularNetoAlojamientosPorOpcion(
  opcionId: string,
  opcionHoteles: OpcionHotel[],
  destinos: PaqueteDestino[],
  preciosAlojamiento: PrecioAlojamiento[],
  fechaReferencia?: string | null,
): number {
  const hotelesDeOpcion = opcionHoteles.filter(
    (oh) => oh.opcionHoteleraId === opcionId,
  );
  let total = 0;
  for (const oh of hotelesDeOpcion) {
    const destino = destinos.find((d) => d.id === oh.destinoId);
    if (!destino) continue;
    const precio = resolvePrecioAlojamiento(
      preciosAlojamiento,
      oh.alojamientoId,
      fechaReferencia,
    );
    if (!precio) continue;
    total += precio.precioPorNoche * destino.noches;
  }
  return total;
}
