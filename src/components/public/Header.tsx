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
// ---------------------------------------------------------------------------

import { StickyHeader } from "./StickyHeader";
import { MobileMenu } from "./MobileMenu";
import { getRegionesPublicas, getSiteSettings } from "@/lib/public-data";

export async function Header() {
  const [regiones, settings] = await Promise.all([
    getRegionesPublicas(),
    getSiteSettings("general"),
  ]);

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
    <StickyHeader>
      <header className="header-area">
        <div className="container wide">
          <div className="header-inn d-flex align-items-center justify-content-between">
            <div className="header-logo">
              <a href="/">
                <img src={logo} alt="TravelOz" />
              </a>
            </div>
            <div className="header-menu">
              <MobileMenu items={NAV} />
            </div>
          </div>
        </div>
      </header>
    </StickyHeader>
  );
}
