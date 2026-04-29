// ---------------------------------------------------------------------------
// Public site header (placeholder for Fase 2)
//
// Markup is a 1:1 port of <header class="header-area"> from html_inicial/.
// In Fase 4 the mobile menu toggle gets wired to React state; in Fase 6 the
// destinos submenu gets driven by the Region catalog from Prisma.
// ---------------------------------------------------------------------------

export function Header() {
  return (
    <header className="header-area">
      <div className="container wide">
        <div className="header-inn d-flex align-items-center justify-content-between">
          <div className="header-logo">
            <a href="/">
              <img src="/site/img/header-logo.webp" alt="TravelOz" />
            </a>
          </div>
          <div className="header-menu">
            <div className="mainmenu">
              <nav id="menu">
                <ul>
                  <li>
                    <span></span>
                    <a href="/destinos">DESTINOS</a>
                    <ul>
                      <li>
                        <a href="/destinos/africa">África</a>
                      </li>
                      <li>
                        <a href="/destinos/america-del-sur">América del Sur</a>
                      </li>
                      <li>
                        <a href="/destinos/america-del-norte">
                          América del Norte
                        </a>
                      </li>
                      <li>
                        <a href="/destinos/asia">Asia</a>
                      </li>
                      <li>
                        <a href="/destinos/europa">Europa</a>
                      </li>
                      <li>
                        <a href="/destinos/caribe-y-centroamerica">
                          Caribe y Centroamérica
                        </a>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <a href="/corporativo">CORPORATIVO</a>
                  </li>
                  <li>
                    <a href="/about">NOSOTROS</a>
                  </li>
                  <li>
                    <a href="/contact">CONTACTO</a>
                  </li>
                </ul>
              </nav>
            </div>
            <div id="menu-toggle">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
