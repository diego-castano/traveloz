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
const FORM_MAX_HITS = 5; // 5 envíos por form por IP por hora

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

// ──────────────────────────────────────────────
// Per-user lockout policy (driven by DB columns)
// ──────────────────────────────────────────────

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function isLockedNow(lockedUntil: Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() > Date.now();
}
