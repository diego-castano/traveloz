// Menú del sitio público de Collection (cambios del cliente del 01/10/2026).

export const MENU_SITIO = [
  { nombre: "Nosotros", href: "/nosotros" },
  { nombre: "Destinos", href: "/destinos" },
  { nombre: "Experiencias", href: "/experiencias" },
  { nombre: "Especialistas", href: "/especialistas" },
  { nombre: "Aliados", href: "/aliados" },
] as const;

export const CONTACTO_SITIO = { nombre: "Contactanos", href: "/contacto" } as const;

export const LEGALES_SITIO = [
  { nombre: "Términos y condiciones", href: "/terminos" },
  { nombre: "Privacidad", href: "/privacidad" },
  { nombre: "Cookies", href: "/cookies" },
] as const;

/** "Consultar" de una experiencia: Contactanos ya sabiendo de cuál viene. */
export const rutaConsulta = (slug?: string) =>
  slug ? `${CONTACTO_SITIO.href}?experiencia=${encodeURIComponent(slug)}` : CONTACTO_SITIO.href;
