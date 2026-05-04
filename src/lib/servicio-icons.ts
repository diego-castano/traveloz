// ---------------------------------------------------------------------------
// Catalog of icon keys available for CatalogoServicio. Each maps to a PNG
// at /public/site/img/p-{icon}-icon.png that the public site renders in the
// "Incluye" list. Lives in lib/ (not actions/) so client components can
// import it — server-action files can only export functions.
// ---------------------------------------------------------------------------

export const AVAILABLE_ICONS = [
  "flight",
  "bag",
  "bus",
  "bed",
  "exc",
  "shield",
  "food",
  "tax",
] as const;

export type ServicioIcon = (typeof AVAILABLE_ICONS)[number];
