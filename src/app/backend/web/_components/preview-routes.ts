// ---------------------------------------------------------------------------
// Mapping admin route → public preview URL. Used by the WebLayout iframe so
// each section opens the public page it edits.
// ---------------------------------------------------------------------------

export const PREVIEW_ROUTES: Record<string, string> = {
  "/backend/web/inicio": "/",
  "/backend/web/categorias": "/",
  "/backend/web/testimonios": "/",
  "/backend/web/destinos": "/destinos",
  "/backend/web/nosotros": "/about",
  "/backend/web/contacto": "/contact",
  "/backend/web/corporativo": "/corporativo",
  "/backend/web/cotizar": "/cotizar",
  "/backend/web/faq": "/faq",
  "/backend/web/terms": "/terms",
  "/backend/web/work-with-us": "/work-with-us",
  "/backend/web/clientes": "/corporativo",
  "/backend/web/equipo": "/corporativo",
  "/backend/web/servicios-incluidos": "/destinos",
  "/backend/web/pagos": "/destinos",
  // Footer + general affect every page — default to home.
  "/backend/web/footer": "/",
  "/backend/web/general": "/",
  // SEO meta tags affect every page — preview to home.
  "/backend/web/seo": "/",
  // Robots previewed directly at /robots.txt
  "/backend/web/robots": "/robots.txt",
};

export function getPreviewUrlFor(pathname: string): string {
  return PREVIEW_ROUTES[pathname] ?? "/";
}
