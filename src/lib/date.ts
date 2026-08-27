const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Parses a stored date value into a local Date without shifting the calendar day.
 * Supports both `YYYY-MM-DD` and full ISO timestamps already saved in the DB.
 */
export function parseStoredDate(value?: string | null): Date | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  const match = DATE_ONLY_PATTERN.exec(trimmed.slice(0, 10));
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
}

/** Formats a Date as `YYYY-MM-DD` using the local calendar day. */
export function formatStoredDate(value?: Date | null): string | undefined {
  if (!value) return undefined;

  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join("-");
}

export function startOfLocalDay(value?: Date | null): Date | undefined {
  if (!value) return undefined;

  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Returns a new Date shifted by `days` (can be negative), preserving the local calendar day. */
export function addDays(value: Date, days: number): Date {
  const out = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

// ---------------------------------------------------------------------------
// Vencimiento de paquetes (validezHasta)
// Pedido de Gero 27/08: en el listado filtrado por "por vencer" hay que ver
// CUÁNDO vence cada paquete, no sólo cuáles están por vencer.
// ---------------------------------------------------------------------------

/** Zona horaria del negocio: el equipo opera desde Uruguay. */
const TZ_NEGOCIO = "America/Montevideo";

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Día civil de hoy en Montevideo como `YYYY-MM-DD` (en-CA ya emite ese formato). */
export function todayInMontevideo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Convierte una fecha civil `YYYY-MM-DD` a epoch UTC, sin corrimiento de día. */
function civilDateToUtc(value: string): number | null {
  const match = DATE_ONLY_PATTERN.exec(value.slice(0, 10));
  if (!match) return null;
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

export interface VencimientoInfo {
  /** Días civiles hasta el vencimiento (0 = hoy, 1 = mañana, negativo = vencido). */
  dias: number;
  /** Fecha corta, p.ej. "3 sep". */
  fechaCorta: string;
  /** Texto completo del badge, p.ej. "Vence 3 sep · en 6 días". */
  texto: string;
  /** true cuando vence hoy o mañana (o ya venció): se pinta en rojo. */
  urgente: boolean;
}

/**
 * Descripción del vencimiento de un `validezHasta` guardado como fecha civil.
 * Compara días civiles en Montevideo, así el parseo UTC no corre el día.
 */
export function describirVencimiento(
  validezHasta?: string | null,
  hoy: string = todayInMontevideo(),
): VencimientoInfo | null {
  if (!validezHasta) return null;
  const hastaUtc = civilDateToUtc(validezHasta.trim());
  const hoyUtc = civilDateToUtc(hoy);
  if (hastaUtc === null || hoyUtc === null) return null;

  const dias = Math.round((hastaUtc - hoyUtc) / 86_400_000);
  const hasta = new Date(hastaUtc);
  const fechaCorta = `${hasta.getUTCDate()} ${MESES_CORTOS[hasta.getUTCMonth()]}`;

  // Los vencidos no entran en la alerta "por vencer", pero el helper se banca
  // el caso por si alguien abre el badge desde otro lado.
  if (dias < 0) {
    return {
      dias,
      fechaCorta,
      texto: `Venció ${fechaCorta}`,
      urgente: true,
    };
  }

  const relativo = dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;

  return {
    dias,
    fechaCorta,
    texto: `Vence ${fechaCorta} · ${relativo}`,
    urgente: dias <= 1,
  };
}
