/**
 * Shared dashboard metrics — pure functions that take provider state and
 * derive the counts / groupings used by both AdminDashboard and VendedorDashboard.
 * Keeping them here means the two dashboards can share logic without coupling
 * their JSX trees.
 */
import type {
  Paquete,
  Alojamiento,
  Aereo,
  Traslado,
  Seguro,
  Circuito,
  PaqueteAlojamiento,
  OpcionHotelera,
  PrecioAereo,
  PrecioAlojamiento,
  Temporada,
  TipoPaquete,
  Pais,
  Region,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Paquete → País resolution
// Looks at linked alojamientos (PaqueteAlojamiento junction) to find the
// dominant destination country. Used by the "Paquetes por Destino" chart.
// ---------------------------------------------------------------------------

export interface PaisResolver {
  /** Returns the dominant paisId for a paquete, or null if no links. */
  paisIdFor: (paqueteId: string) => string | null;
  /** Returns the paisNombre for a paquete (null if unresolved). */
  paisNombreFor: (paqueteId: string) => string | null;
  /** Returns the regionNombre for a paquete (null if pais has no region). */
  regionNombreFor: (paqueteId: string) => string | null;
  /** Returns the regionId for a paquete's dominant pais, or null. */
  regionIdFor: (paqueteId: string) => string | null;
}

export function buildPaisResolver(
  paqueteAlojamientos: PaqueteAlojamiento[],
  alojamientos: Alojamiento[],
  paises: Pais[],
  regiones: Array<{ id: string; nombre: string }> = [],
): PaisResolver {
  const aloById = new Map<string, Alojamiento>();
  for (const a of alojamientos) aloById.set(a.id, a);

  const paisById = new Map<string, Pais>();
  for (const p of paises) paisById.set(p.id, p);

  const regionNameById = new Map<string, string>();
  for (const r of regiones) regionNameById.set(r.id, r.nombre);

  const cache = new Map<string, string | null>();

  function paisIdFor(paqueteId: string): string | null {
    if (cache.has(paqueteId)) return cache.get(paqueteId) ?? null;

    const counts = new Map<string, number>();
    for (const pa of paqueteAlojamientos) {
      if (pa.paqueteId !== paqueteId) continue;
      const alo = aloById.get(pa.alojamientoId);
      if (!alo?.paisId) continue;
      counts.set(alo.paisId, (counts.get(alo.paisId) ?? 0) + 1);
    }

    let best: string | null = null;
    let bestCount = 0;
    counts.forEach((count, pid) => {
      if (count > bestCount) {
        best = pid;
        bestCount = count;
      }
    });
    cache.set(paqueteId, best);
    return best;
  }

  function paisNombreFor(paqueteId: string): string | null {
    const pid = paisIdFor(paqueteId);
    if (!pid) return null;
    return paisById.get(pid)?.nombre ?? null;
  }

  function regionNombreFor(paqueteId: string): string | null {
    const pid = paisIdFor(paqueteId);
    if (!pid) return null;
    const rid = paisById.get(pid)?.regionId;
    return rid ? regionNameById.get(rid) ?? null : null;
  }

  function regionIdFor(paqueteId: string): string | null {
    const pid = paisIdFor(paqueteId);
    if (!pid) return null;
    return paisById.get(pid)?.regionId ?? null;
  }

  return { paisIdFor, paisNombreFor, regionNombreFor, regionIdFor };
}

// ---------------------------------------------------------------------------
// Group-by helpers — return arrays sorted descending by count.
// ---------------------------------------------------------------------------

export interface GroupBucket {
  key: string;
  label: string;
  count: number;
}

export function groupPaquetesByPais(
  paquetes: Paquete[],
  resolver: PaisResolver,
): GroupBucket[] {
  const counts = new Map<string, number>();
  for (const p of paquetes) {
    const name = resolver.paisNombreFor(p.id) ?? "Sin destino";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

export function groupPaquetesByTemporada(
  paquetes: Paquete[],
  temporadas: Temporada[],
): GroupBucket[] {
  const byId = new Map<string, string>();
  for (const t of temporadas) byId.set(t.id, t.nombre);

  const counts = new Map<string, number>();
  for (const p of paquetes) {
    const name = p.temporadaId
      ? byId.get(p.temporadaId) ?? "Sin temporada"
      : "Sin temporada";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

export function groupPaquetesByTipo(
  paquetes: Paquete[],
  tipos: TipoPaquete[],
): GroupBucket[] {
  const byId = new Map<string, string>();
  for (const t of tipos) byId.set(t.id, t.nombre);

  const counts = new Map<string, number>();
  for (const p of paquetes) {
    const name = p.tipoPaqueteId
      ? byId.get(p.tipoPaqueteId) ?? "Sin tipo"
      : "Sin tipo";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

export interface RegionBucket extends GroupBucket {
  /** Region ID, or null for "Sin región" fallback. */
  regionId: string | null;
  /** Display order from the catalog. Null goes last. */
  orden: number;
}

/**
 * Groups paquetes by Region via their linked alojamientos' pais → region chain.
 * Paquetes whose dominant pais has no region fall into "Sin región".
 * Sort order: by catalog `orden` ascending, then by count descending as tiebreaker.
 */
export function groupPaquetesByRegion(
  paquetes: Paquete[],
  resolver: PaisResolver,
  regiones: Region[],
): RegionBucket[] {
  const regionById = new Map<string, Region>();
  for (const r of regiones) regionById.set(r.id, r);

  const counts = new Map<string, number>();
  for (const p of paquetes) {
    const rid = resolver.regionIdFor(p.id);
    const key = rid ?? "__sin_region__";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets: RegionBucket[] = [];
  counts.forEach((count, key) => {
    if (key === "__sin_region__") {
      buckets.push({
        key: "sin-region",
        label: "Sin región",
        count,
        regionId: null,
        orden: 9999,
      });
    } else {
      const r = regionById.get(key);
      buckets.push({
        key: r?.id ?? key,
        label: r?.nombre ?? "Sin región",
        count,
        regionId: r?.id ?? null,
        orden: r?.orden ?? 9999,
      });
    }
  });

  return buckets.sort((a, b) => a.orden - b.orden || b.count - a.count);
}

// ---------------------------------------------------------------------------
// Alert computations
// ---------------------------------------------------------------------------

/** Count ACTIVE paquetes without any opción hotelera (incomplete config). */
export function countPaquetesSinOpcion(
  paquetes: Paquete[],
  opciones: OpcionHotelera[],
): number {
  const withOpciones = new Set(opciones.map((o) => o.paqueteId));
  return paquetes.filter(
    (p) => p.estado === "ACTIVO" && !withOpciones.has(p.id),
  ).length;
}

/**
 * Count services whose last price period has already ended (periodoHasta < today).
 * Returns a single total of distinct services affected (aereos + alojamientos).
 */
export function countServiciosConPreciosVencidos(
  aereos: Aereo[],
  preciosAereo: PrecioAereo[],
  alojamientos: Alojamiento[],
  preciosAlojamiento: PrecioAlojamiento[],
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  // Group prices by service id and find the max periodoHasta
  function latestEnd(prices: Array<{ periodoHasta: string }>): number | null {
    if (prices.length === 0) return null;
    let max = 0;
    for (const p of prices) {
      const ts = new Date(p.periodoHasta).getTime();
      if (!Number.isNaN(ts) && ts > max) max = ts;
    }
    return max || null;
  }

  const aereoPriceMap = new Map<string, PrecioAereo[]>();
  for (const p of preciosAereo) {
    const arr = aereoPriceMap.get(p.aereoId) ?? [];
    arr.push(p);
    aereoPriceMap.set(p.aereoId, arr);
  }

  const aloPriceMap = new Map<string, PrecioAlojamiento[]>();
  for (const p of preciosAlojamiento) {
    const arr = aloPriceMap.get(p.alojamientoId) ?? [];
    arr.push(p);
    aloPriceMap.set(p.alojamientoId, arr);
  }

  let vencidos = 0;
  for (const a of aereos) {
    const prices = aereoPriceMap.get(a.id);
    if (!prices || prices.length === 0) continue;
    const last = latestEnd(prices);
    if (last !== null && last < todayTs) vencidos++;
  }
  for (const a of alojamientos) {
    const prices = aloPriceMap.get(a.id);
    if (!prices || prices.length === 0) continue;
    const last = latestEnd(prices);
    if (last !== null && last < todayTs) vencidos++;
  }
  return vencidos;
}

/** Paquetes ACTIVOS whose validezHasta is within the next 14 days (not already expired). */
export function paquetesProximosAVencer(paquetes: Paquete[]): Paquete[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return paquetes.filter((p) => {
    if (p.estado !== "ACTIVO") return false;
    if (!p.validezHasta) return false;
    const hasta = new Date(p.validezHasta);
    return hasta >= now && hasta <= in14;
  });
}

// ---------------------------------------------------------------------------
// Vendedor-specific helpers
// ---------------------------------------------------------------------------

/** Number of paquetes created in the last 7 days. */
export function countNuevosEstaSemana(paquetes: Paquete[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return paquetes.filter((p) => new Date(p.createdAt).getTime() >= cutoff)
    .length;
}

/**
 * Resolve the "current season" from the temporada list by matching keywords in
 * the nombre against the current month.
 *
 * Convention comes from the user's catalog spec:
 *   - Baja (Sep-Nov)
 *   - Media (Mar-May, Jun-Ago)
 *   - Alta (Dic-Feb)
 *   - Semana Santa (April)
 *   - Vacaciones de Julio (July)
 *   - Black Week / Black Friday (November, late)
 */
export function currentTemporada(temporadas: Temporada[]): Temporada | null {
  if (temporadas.length === 0) return null;
  const month = new Date().getMonth() + 1; // 1-12

  // Priority 1: seasonal events
  if (month === 4) {
    const t = temporadas.find((t) => /semana santa/i.test(t.nombre));
    if (t) return t;
  }
  if (month === 7) {
    const t = temporadas.find((t) => /vacaciones de julio/i.test(t.nombre));
    if (t) return t;
  }
  if (month === 11) {
    const bw = temporadas.find((t) => /black/i.test(t.nombre));
    if (bw) return bw;
  }

  // Priority 2: long seasons
  function findByKw(kw: RegExp): Temporada | undefined {
    return temporadas.find((t) => kw.test(t.nombre));
  }
  if (month === 12 || month === 1 || month === 2) {
    return findByKw(/\balta\b/i) ?? temporadas[0];
  }
  if (month >= 9 && month <= 11) {
    return findByKw(/\bbaja\b/i) ?? temporadas[0];
  }
  // Mar-May and Jun-Aug
  return findByKw(/\bmedia\b/i) ?? temporadas[0];
}

// ---------------------------------------------------------------------------
// Activity feed — unified across paquetes + services
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: string;
  type: "paquete" | "aereo" | "alojamiento" | "traslado" | "seguro" | "circuito";
  title: string;
  href: string;
  updatedAt: string;
  isNew: boolean;
}

export function buildActivityFeed(args: {
  paquetes: Paquete[];
  aereos: Aereo[];
  alojamientos: Alojamiento[];
  traslados: Traslado[];
  seguros: Seguro[];
  circuitos: Circuito[];
  limit?: number;
}): ActivityItem[] {
  const limit = args.limit ?? 8;
  const items: ActivityItem[] = [];

  for (const p of args.paquetes) {
    items.push({
      id: p.id,
      type: "paquete",
      title: p.titulo,
      href: `/paquetes/${p.id}`,
      updatedAt: p.updatedAt,
      isNew: p.createdAt === p.updatedAt,
    });
  }
  for (const a of args.aereos) {
    items.push({
      id: a.id,
      type: "aereo",
      title: a.ruta || a.destino || "Aéreo",
      href: `/aereos/${a.id}`,
      updatedAt: a.updatedAt,
      isNew: a.createdAt === a.updatedAt,
    });
  }
  for (const a of args.alojamientos) {
    items.push({
      id: a.id,
      type: "alojamiento",
      title: a.nombre,
      href: `/alojamientos/${a.id}`,
      updatedAt: a.updatedAt,
      isNew: a.createdAt === a.updatedAt,
    });
  }
  for (const t of args.traslados) {
    items.push({
      id: t.id,
      type: "traslado",
      title: t.nombre,
      href: `/traslados`,
      updatedAt: t.updatedAt,
      isNew: t.createdAt === t.updatedAt,
    });
  }
  for (const s of args.seguros) {
    items.push({
      id: s.id,
      type: "seguro",
      title: s.plan,
      href: `/seguros`,
      updatedAt: s.updatedAt,
      isNew: s.createdAt === s.updatedAt,
    });
  }
  for (const c of args.circuitos) {
    items.push({
      id: c.id,
      type: "circuito",
      title: c.nombre,
      href: `/circuitos/${c.id}`,
      updatedAt: c.updatedAt,
      isNew: c.createdAt === c.updatedAt,
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH < 24) return `Hace ${diffH}h`;
  if (diffD === 1) return "Ayer";
  if (diffD < 7) return `Hace ${diffD}d`;
  if (diffD < 30) return `Hace ${Math.floor(diffD / 7)}sem`;
  return `Hace ${Math.floor(diffD / 30)}mes`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function formatFecha(date: Date = new Date()): string {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Chart color palette — consistent across all dashboards and charts.
// Hand-tuned to work on light backgrounds with good contrast.
// ---------------------------------------------------------------------------

export const CHART_COLORS = [
  "#3BBFAD", // teal
  "#8B5CF6", // violet
  "#E8913A", // orange
  "#2B8AFF", // blue
  "#EC4899", // pink
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#6366F1", // indigo
  "#14B8A6", // teal-dark
  "#A855F7", // purple
  "#F97316", // orange-dark
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#EAB308", // yellow
  "#F43F5E", // rose
];

export function colorForIndex(idx: number): string {
  return CHART_COLORS[idx % CHART_COLORS.length];
}
