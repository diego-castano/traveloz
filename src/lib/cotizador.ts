// ---------------------------------------------------------------------------
// Helpers de slug para los landings de cotizador por marca.
//
// Los landings viven en la raíz (/<slug>), así que el slug NO puede chocar con
// las rutas existentes del sitio público ni con prefijos del sistema. Next
// resuelve las rutas estáticas antes que el segmento dinámico [slug], pero
// igual reservamos los nombres para que el admin no cree un landing inalcanzable.
// ---------------------------------------------------------------------------

export const RESERVED_SLUGS = new Set([
  "about",
  "contact",
  "corporativo",
  "cotizar",
  "destinos",
  "faq",
  "terms",
  "work-with-us",
  "newsletter",
  "proximamente",
  "backend",
  "api",
  "site",
  "sitemap.xml",
  "robots.txt",
  "icon.svg",
  "presentacion_traveloz",
  "header-logo.webp",
  "_next",
]);

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Devuelve un mensaje de error si el slug no sirve, o null si es válido. */
export function validateSlug(slug: string): string | null {
  if (!slug) return "El slug es requerido.";
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return "El slug solo puede tener minúsculas, números y guiones.";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" es una ruta reservada del sitio. Elegí otro slug.`;
  }
  return null;
}
