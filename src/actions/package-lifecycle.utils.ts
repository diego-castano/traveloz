// ---------------------------------------------------------------------------
// Pure helpers + types for package-lifecycle.actions.
//
// Lives in its own file (NOT "use server") because Next.js requires that
// every export from a "use server" module be an async function. The bits
// here are sync utilities (canTransition, checkMargen, assertMargenPositivo)
// and TypeScript interfaces (MargenCheck, CloneOptions) that are imported
// by the server-action module and by other server modules that need them.
// ---------------------------------------------------------------------------

import type { EstadoPaquete } from "@prisma/client";

// ---------------------------------------------------------------------------
// Estado lifecycle
// ---------------------------------------------------------------------------

/**
 * Allowed transitions between paquete states. Anything not listed here is
 * rejected by `transitionEstado`. The matrix mirrors typical content workflow:
 *   BORRADOR    → EN_REVISION | ARCHIVADO
 *   EN_REVISION → BORRADOR | ACTIVO | ARCHIVADO
 *   ACTIVO      → EN_REVISION | ARCHIVADO    (publish-only after re-review)
 *   ARCHIVADO   → BORRADOR                   (resurrect for editing)
 *   INACTIVO    → BORRADOR | ARCHIVADO       (legacy bridge for migrated rows)
 */
export const TRANSITIONS: Record<EstadoPaquete, EstadoPaquete[]> = {
  BORRADOR: ["EN_REVISION", "ARCHIVADO"],
  EN_REVISION: ["BORRADOR", "ACTIVO", "ARCHIVADO"],
  ACTIVO: ["EN_REVISION", "ARCHIVADO"],
  ARCHIVADO: ["BORRADOR"],
  INACTIVO: ["BORRADOR", "ARCHIVADO"],
};

export function canTransition(
  from: EstadoPaquete,
  to: EstadoPaquete,
): boolean {
  if (from === to) return true; // idempotent
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Margin validator — enforced by createPaquete/updatePaquete and bulk markup
// ---------------------------------------------------------------------------

/** Default minimum factor (markup) configurable via env. 0.85 = ~17.6% margin. */
export const MIN_MARKUP_FACTOR = Number(
  process.env.MIN_MARKUP_FACTOR ?? "0.95",
);
/** A factor of 1.0 means zero markup. We warn at this threshold but don't block. */
export const WARN_MARKUP_FACTOR = Number(
  process.env.WARN_MARKUP_FACTOR ?? "0.97",
);

export interface MargenCheck {
  ok: boolean;
  warning?: string;
  marginPct: number;
}

export function checkMargen(
  neto: number,
  venta: number,
  factor?: number | null,
): MargenCheck {
  if (!Number.isFinite(neto) || !Number.isFinite(venta)) {
    return { ok: false, warning: "Precios inválidos", marginPct: 0 };
  }
  if (neto <= 0 || venta <= 0) {
    return { ok: true, marginPct: 0 }; // un-priced draft — allowed
  }
  if (venta < neto) {
    return {
      ok: false,
      warning: `El precio de venta (${venta}) es menor que el neto (${neto}).`,
      marginPct: ((venta - neto) / neto) * 100,
    };
  }
  const marginPct = ((venta - neto) / venta) * 100;

  if (factor != null && factor > 0) {
    if (factor > MIN_MARKUP_FACTOR) {
      return {
        ok: false,
        warning: `Markup ${factor.toFixed(2)} excede el mínimo permitido (${MIN_MARKUP_FACTOR}).`,
        marginPct,
      };
    }
    if (factor > WARN_MARKUP_FACTOR) {
      return {
        ok: true,
        warning: `Markup ${factor.toFixed(2)} bajo el umbral de aviso (${WARN_MARKUP_FACTOR}).`,
        marginPct,
      };
    }
  }
  return { ok: true, marginPct };
}

export function assertMargenPositivo(
  neto: number,
  venta: number,
  factor?: number | null,
) {
  const m = checkMargen(neto, venta, factor);
  if (!m.ok) throw new Error(m.warning ?? "Margen no válido.");
}

// ---------------------------------------------------------------------------
// Clone options shape
// ---------------------------------------------------------------------------

export interface CloneOptions {
  /**
   * Template mode: copy structure + relationships, but reset prices/markup
   * and put it in BORRADOR. Use when starting a new offer from an existing
   * one without inheriting numbers.
   */
  asTemplate?: boolean;
  /**
   * Season mode: shift validezDesde/Hasta to the supplied window. Combines
   * with regular clone so the new copy is editable but already dated.
   */
  newSeason?: { desde: string; hasta: string };
  /**
   * Override the default "Copia de X" title.
   */
  titulo?: string;
}
