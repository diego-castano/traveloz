// ---------------------------------------------------------------------------
// Public site header.
//
// Markup is a 1:1 port of <header class="header-area"> from html_inicial/.
// Wrapped in <StickyHeader> for the scroll-based .scrolled/.hidden behavior.
// The mainmenu + menu-toggle are rendered by <MobileMenu> (client island)
// to drive the drawer state on mobile (CSS hides the same nav on desktop).
//
// Now server-async: the DESTINOS submenu is built from the Region catalog
// (via getRegionesPublicas) so when the admin adds, removes, or renames a
// region the menu reflects it without a redeploy. The logo image is sourced
// from SiteSettings group=general key=header_logo so it can be replaced too;
// falls back to the bundled asset when not configured.
//
// El <header> en sí (className + logo) lo renderiza <StickyHeader>, que es
// client y decide ahí la variante "header-dark" de /corporativo vía
// usePathname(). Header.tsx sigue siendo server-only: solo hace el fetch de
// regiones/settings y arma NAV; no tiene forma de conocer la ruta actual.
// ---------------------------------------------------------------------------

import { StickyHeader } from "./StickyHeader";
import { MobileMenu } from "./MobileMenu";
import { getRegionesPublicas, getSiteSettings } from "@/lib/public-data";
import { sortRegionesAlfabetico } from "@/lib/utils";

export async function Header() {
  const [regionesRaw, settings] = await Promise.all([
    getRegionesPublicas(),
    getSiteSettings("general"),
  ]);
  // --- Orden alfabético (es) para el submenú, no el orden manual de la DB.
  // "Otros"/"Otras" (si existe) queda siempre al final.
  const regiones = sortRegionesAlfabetico(regionesRaw);

  const NAV = [
    {
      href: "/destinos",
      label: "DESTINOS",
      submenu: regiones.map((r) => ({
        href: `/destinos/${r.slug}`,
        label: r.nombre,
      })),
    },
    { href: "/corporativo", label: "CORPORATIVO" },
    { href: "/about", label: "NOSOTROS" },
    { href: "/contact", label: "CONTACTO" },
  ];

  const logo = settings.header_logo?.trim() || "/site/img/header-logo.webp";

  return (
    <StickyHeader logo={logo}>
      <MobileMenu items={NAV} />
    </StickyHeader>
  );
}
