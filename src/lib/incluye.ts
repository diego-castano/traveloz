// ---------------------------------------------------------------------------
// "Incluye" list — the curated, ordered list of bullets shown to the traveler
// on the public package page. It replaces the old free-text `textoIncluye`
// (rich text) + the separate `serviciosIncluidos` catalog picker with ONE
// reorderable list. To avoid a schema migration the whole list is serialized
// as JSON into the existing `textoIncluye` column, wrapped in a marker object
// so we can tell it apart from legacy rich-text/plain-text content.
//
// Each item carries its own icon + text so the public render is trivial. A
// catalog-backed item keeps its `servicioId` for reference, but the icon/text
// are snapshotted at insert time (the operator can edit the text inline).
// ---------------------------------------------------------------------------

export interface IncluyeItem {
  /** Stable id, used as the drag-and-drop key. */
  id: string;
  /** Source catalog service id, when the item came from the catalog. */
  servicioId?: string | null;
  /** Icon key — maps to a Traveloz SVG icon via the ServiceIcon registry. */
  icon: string;
  /** Display text shown to the traveler. */
  texto: string;
}

// Default icon key for items that don't specify one. Icon keys map to Lucide
// components via the registry in components/ui/ServiceIcon.
export const DEFAULT_INCLUYE_ICON = "check";

// Marker wrapper so we can distinguish a serialized Incluye list from the
// legacy rich-text the column used to hold. Bumping `v` lets us evolve later.
interface IncluyeEnvelope {
  __incluye: number;
  items: IncluyeItem[];
}

export function isIncluyeJson(raw: string | null | undefined): boolean {
  return parseIncluyeItems(raw) !== null;
}

/**
 * Parse the canonical JSON list out of `textoIncluye`. Returns null when the
 * value is legacy content (plain text / HTML) so callers can fall back to the
 * old rendering path.
 */
export function parseIncluyeItems(
  raw: string | null | undefined,
): IncluyeItem[] | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as Partial<IncluyeEnvelope>;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.__incluye === "number" &&
      Array.isArray(parsed.items)
    ) {
      return parsed.items
        .filter((it): it is IncluyeItem => !!it && typeof it.texto === "string")
        .map((it) => ({
          id: it.id || newIncluyeId(),
          servicioId: it.servicioId ?? null,
          icon: it.icon || DEFAULT_INCLUYE_ICON,
          texto: it.texto,
        }));
    }
  } catch {
    /* not JSON → legacy content */
  }
  return null;
}

export function serializeIncluyeItems(items: IncluyeItem[]): string {
  const envelope: IncluyeEnvelope = {
    __incluye: 1,
    items: items.map((it) => ({
      id: it.id,
      servicioId: it.servicioId ?? null,
      icon: it.icon,
      texto: it.texto,
    })),
  };
  return JSON.stringify(envelope);
}

/**
 * Convert legacy `textoIncluye` content (plain text or rich HTML, one bullet
 * per line/block) into editable custom items, so packages created before the
 * new editor can be migrated in-place without losing what was typed.
 */
export function legacyTextToIncluye(raw: string | null | undefined): IncluyeItem[] {
  if (!raw) return [];
  const normalized = raw
    .replace(/<\/(div|p|li)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return normalized
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((texto) => ({
      id: newIncluyeId(),
      servicioId: null,
      icon: DEFAULT_INCLUYE_ICON,
      texto,
    }));
}

/**
 * Elige la clave de ícono de transporte según el texto del renglón.
 *
 * El set nuevo de iconos distingue el medio: "traslado" = auto (default),
 * "bus" = ómnibus de frente, "tren", "crucero" = barco/ferry. El generador de
 * sugerencias creaba TODOS los traslados con "traslado" (auto), así que un
 * renglón como "Bus Lisboa - Oporto - Lisboa" mostraba un auto. Esta función
 * lee el texto (case-insensitive, sin tildes) y devuelve el ícono correcto.
 *
 * Es la única fuente de verdad para esta heurística: la usan el generador
 * (`getSugerenciasIncluye`), el script de remapeo y la detección legacy de
 * bullets de texto libre (`detectIconForBullet` en la vista pública).
 */
export function iconForTrasladoTexto(
  texto: string | null | undefined,
): "traslado" | "bus" | "tren" | "crucero" {
  const t = (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // saca tildes/diacríticos
  if (/\b(bus|buses|omnibus|autobus|micro)\b/.test(t)) return "bus";
  if (/\b(tren|trenes|rail)\b/.test(t)) return "tren";
  if (/\b(ferry|barco|catamaran|navegacion|cruceros?)\b/.test(t)) return "crucero";
  return "traslado";
}

export function newIncluyeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `inc-${Math.round(Math.random() * 1e9).toString(36)}`;
}
