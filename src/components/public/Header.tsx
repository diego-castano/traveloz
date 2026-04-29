// ---------------------------------------------------------------------------
// Public site header.
//
// Markup is a 1:1 port of <header class="header-area"> from html_inicial/.
// Wrapped in <StickyHeader> for the scroll-based .scrolled/.hidden behavior.
// The mainmenu + menu-toggle are rendered by <MobileMenu> (client island)
// to drive the drawer state on mobile (CSS hides the same nav on desktop).
// In Fase 6 the destinos submenu gets driven by the Region catalog from Prisma.
// ---------------------------------------------------------------------------

import { StickyHeader } from "./StickyHeader";
import { MobileMenu } from "./MobileMenu";

const NAV = [
  {
    href: "/destinos",
    label: "DESTINOS",
    submenu: [
      { href: "/destinos/africa", label: "África" },
      { href: "/destinos/america-del-sur", label: "América del Sur" },
      { href: "/destinos/america-del-norte", label: "América del Norte" },
      { href: "/destinos/asia", label: "Asia" },
      { href: "/destinos/europa", label: "Europa" },
      {
        href: "/destinos/caribe-y-centroamerica",
        label: "Caribe y Centroamérica",
      },
    ],
  },
  { href: "/corporativo", label: "CORPORATIVO" },
  { href: "/about", label: "NOSOTROS" },
  { href: "/contact", label: "CONTACTO" },
];

export function Header() {
  return (
    <StickyHeader>
      <header className="header-area">
        <div className="container wide">
          <div className="header-inn d-flex align-items-center justify-content-between">
            <div className="header-logo">
              <a href="/">
                <img src="/site/img/header-logo.webp" alt="TravelOz" />
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
