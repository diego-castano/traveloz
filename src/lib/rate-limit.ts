/**
 * In-memory IP-based rate limiter for the login surface.
 *
 * Scope: Railway deploys one Node instance per service (no horizontal scale
 * configured), so a process-local Map is good enough to slow down brute-force
 * attempts at the network edge. The per-user lockout in the DB
 * (`User.failedLoginAttempts` / `User.lockedUntil`) is the source of truth for
 * persistent protection — this layer just adds a quick first line of defence
 * so we don't even hit bcrypt for clearly hostile traffic.
 *
 * If/when we move to multi-instance, swap this for an Upstash Redis-backed
 * counter; the surface (`check`) stays identical.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_HITS = 20; // 20 login attempts per IP per window

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkLoginRate(ip: string | null | undefined): RateLimitResult {
  const key = ip || "unknown";
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_HITS - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > MAX_HITS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_HITS - existing.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Drop the bucket for an IP — call after a successful login so legitimate
 * users don't accidentally lock themselves out by typoing a few times before
 * getting it right.
 */
export function resetLoginRate(ip: string | null | undefined): void {
  if (!ip) return;
  buckets.delete(ip);
}

// ──────────────────────────────────────────────
// Generic limiter for public form submissions
// ──────────────────────────────────────────────

const FORM_WINDOW_MS = 60 * 60 * 1000; // 1 hour
// 20 envíos por form por IP por hora. Estaba en 5 y le pegaba al equipo del
// cliente: toda la agencia sale por una sola IP, asi que probar los
// formularios un par de veces ya frenaba los envios reales de una oficina
// entera. 20 sigue cortando el abuso automatizado, que llega de a cientos.
const FORM_MAX_HITS = 20;

const formBuckets = new Map<string, Bucket>();

/**
 * Rate limit para los formularios públicos (cotizar, contacto, newsletter,
 * corporativo, work-with-us). Misma estrategia process-local que el login:
 * suficiente para una sola instancia de Railway; si escalamos horizontal,
 * cambiar por Redis manteniendo esta firma.
 *
 * `scope` separa los buckets por formulario para que llenar el límite de
 * newsletter no bloquee un pedido de cotización legítimo.
 */
export function checkFormRate(
  scope: string,
  ip: string | null | undefined,
): RateLimitResult {
  const key = `${scope}:${ip || "unknown"}`;
  const now = Date.now();
  const existing = formBuckets.get(key);

  // GC oportunista para que el Map no crezca sin límite.
  if (formBuckets.size > 5000) {
    formBuckets.forEach((b, k) => {
      if (b.resetAt < now) formBuckets.delete(k);
    });
  }

  if (!existing || existing.resetAt < now) {
    formBuckets.set(key, { count: 1, resetAt: now + FORM_WINDOW_MS });
    return { allowed: true, remaining: FORM_MAX_HITS - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > FORM_MAX_HITS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, FORM_MAX_HITS - existing.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Mira el bucket SIN consumirlo.
 *
 * Existe para el link público de cotización (/c/<token>): ahí el que gasta
 * cupo es el intento fallido —adivinar tokens—, no la lectura legítima. La
 * página consulta con `peekFormRate` antes de tocar la base y recién llama a
 * `checkFormRate` cuando el token no existe. Así el pasajero puede recargar
 * las veces que quiera y el render del PDF (que sale por la IP de salida de
 * Railway, una sola para toda la agencia) nunca se queda sin cupo.
 */
export function peekFormRate(
  scope: string,
  ip: string | null | undefined,
): RateLimitResult {
  const existing = formBuckets.get(`${scope}:${ip || "unknown"}`);
  const now = Date.now();
  if (!existing || existing.resetAt < now) {
    return { allowed: true, remaining: FORM_MAX_HITS, retryAfterSeconds: 0 };
  }
  if (existing.count > FORM_MAX_HITS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, FORM_MAX_HITS - existing.count),
    retryAfterSeconds: 0,
  };
}

// ──────────────────────────────────────────────
// Beacon de páginas vistas (/api/visita)
// ──────────────────────────────────────────────

const VISITA_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const VISITA_MAX_IP = 300; // páginas vistas por IP por hora
const VISITA_MAX_VID = 200; // páginas vistas por visitante (vid) por hora
const VISITA_MAX_GLOBAL = 10_000; // presupuesto global de inserts por hora

const visitaIpBuckets = new Map<string, Bucket>();
const visitaVidBuckets = new Map<string, Bucket>();
// Circuit breaker global: una sola ventana compartida por todo el proceso.
let visitaGlobal: Bucket = { count: 0, resetAt: 0 };

/**
 * Rate limit del beacon de páginas vistas. TRES capas independientes; si
 * cualquiera se pasa devolvemos allowed=false y el handler responde 429 (el
 * cliente lo ignora, es fire-and-forget):
 *
 *   1. por IP (~300/h): frena scrapers que rotan `vid` pero no IP. La IP la
 *      pasa el handler tomando el extremo CONFIABLE de X-Forwarded-For.
 *   2. por vid (~200/h): frena a un mismo visitante que dispara de más.
 *   3. presupuesto global (~10k inserts/h): circuit breaker ante un pico
 *      anómalo (bot distribuido) para no inundar la tabla PaginaVista.
 *
 * El presupuesto global se consume recién al final, así una request rechazada
 * por IP/vid no gasta cupo global. Misma estrategia process-local que el resto
 * de los limiters (una instancia en Railway; a Redis si escalamos horizontal).
 */
export function checkVisitaRate(
  ip: string | null,
  vid: string,
): RateLimitResult {
  const now = Date.now();

  // GC oportunista para que los Maps no crezcan sin límite (más visitantes que
  // logins/forms → umbral más alto).
  if (visitaIpBuckets.size > 20000) {
    visitaIpBuckets.forEach((b, k) => {
      if (b.resetAt < now) visitaIpBuckets.delete(k);
    });
  }
  if (visitaVidBuckets.size > 20000) {
    visitaVidBuckets.forEach((b, k) => {
      if (b.resetAt < now) visitaVidBuckets.delete(k);
    });
  }

  // Capa 3 (chequeo, sin consumir todavía): si el presupuesto global ya está
  // agotado, cortamos antes de tocar las capas por-clave.
  if (visitaGlobal.resetAt < now) {
    visitaGlobal = { count: 0, resetAt: now + VISITA_WINDOW_MS };
  }
  if (visitaGlobal.count >= VISITA_MAX_GLOBAL) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((visitaGlobal.resetAt - now) / 1000),
    };
  }

  // Capa 1: por IP.
  const ipKey = ip || "unknown";
  const ipB = visitaIpBuckets.get(ipKey);
  if (!ipB || ipB.resetAt < now) {
    visitaIpBuckets.set(ipKey, { count: 1, resetAt: now + VISITA_WINDOW_MS });
  } else {
    ipB.count += 1;
    if (ipB.count > VISITA_MAX_IP) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((ipB.resetAt - now) / 1000),
      };
    }
  }

  // Capa 2: por vid.
  const vidB = visitaVidBuckets.get(vid);
  if (!vidB || vidB.resetAt < now) {
    visitaVidBuckets.set(vid, { count: 1, resetAt: now + VISITA_WINDOW_MS });
  } else {
    vidB.count += 1;
    if (vidB.count > VISITA_MAX_VID) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((vidB.resetAt - now) / 1000),
      };
    }
  }

  // Pasó las tres capas: recién ahora consumimos presupuesto global.
  visitaGlobal.count += 1;
  return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
}

// ──────────────────────────────────────────────
// Beacon de lectura de cotizaciones (/api/cotizador/apertura)
// ──────────────────────────────────────────────

const APERTURA_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const APERTURA_MAX_IP = 500; // golpes por IP por hora
const APERTURA_MAX_TOKEN = 300; // golpes por link por hora
const APERTURA_MAX_GLOBAL = 20_000; // presupuesto global por hora

const aperturaIpBuckets = new Map<string, Bucket>();
const aperturaTokenBuckets = new Map<string, Bucket>();
let aperturaGlobal: Bucket = { count: 0, resetAt: 0 };

/**
 * Rate limit del beacon de lectura del link público.
 *
 * NO usa `checkFormRate`: ese limiter da 20 golpes por hora, que es lo correcto
 * para un formulario que se manda una vez, y acá el cliente late cada 15 s
 * mientras el pasajero lee. Con 20 el tracking se apagaría a los cinco minutos
 * de lectura, que es justo cuando se pone interesante.
 *
 * Tres capas, misma forma que `checkVisitaRate`:
 *   1. por IP (~500/h): frena a quien rota tokens desde una sola salida.
 *   2. por token (~300/h): una hora entera de lectura latiendo cada 15 s son
 *      240 golpes, así que 300 cubre al lector más paciente y corta al script.
 *   3. presupuesto global (~20k/h): circuit breaker para no inundar
 *      PresupuestoApertura ante un pico raro.
 *
 * Process-local, igual que el resto: una instancia en Railway. Si escalamos
 * horizontal, esto se muda a Redis manteniendo la firma.
 */
export function checkAperturaRate(
  ip: string | null | undefined,
  token: string,
): RateLimitResult {
  const now = Date.now();

  if (aperturaIpBuckets.size > 20000) {
    aperturaIpBuckets.forEach((b, k) => {
      if (b.resetAt < now) aperturaIpBuckets.delete(k);
    });
  }
  if (aperturaTokenBuckets.size > 20000) {
    aperturaTokenBuckets.forEach((b, k) => {
      if (b.resetAt < now) aperturaTokenBuckets.delete(k);
    });
  }

  if (aperturaGlobal.resetAt < now) {
    aperturaGlobal = { count: 0, resetAt: now + APERTURA_WINDOW_MS };
  }
  if (aperturaGlobal.count >= APERTURA_MAX_GLOBAL) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((aperturaGlobal.resetAt - now) / 1000),
    };
  }

  const ipKey = ip || "unknown";
  const ipB = aperturaIpBuckets.get(ipKey);
  if (!ipB || ipB.resetAt < now) {
    aperturaIpBuckets.set(ipKey, { count: 1, resetAt: now + APERTURA_WINDOW_MS });
  } else {
    ipB.count += 1;
    if (ipB.count > APERTURA_MAX_IP) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((ipB.resetAt - now) / 1000),
      };
    }
  }

  const tokB = aperturaTokenBuckets.get(token);
  if (!tokB || tokB.resetAt < now) {
    aperturaTokenBuckets.set(token, { count: 1, resetAt: now + APERTURA_WINDOW_MS });
  } else {
    tokB.count += 1;
    if (tokB.count > APERTURA_MAX_TOKEN) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((tokB.resetAt - now) / 1000),
      };
    }
  }

  aperturaGlobal.count += 1;
  return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
}

// ──────────────────────────────────────────────
// Per-user lockout policy (driven by DB columns)
// ──────────────────────────────────────────────

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function isLockedNow(lockedUntil: Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() > Date.now();
}
