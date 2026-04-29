// ---------------------------------------------------------------------------
// Public site footer -- 1:1 port of <footer class="footer-area"> from
// html_inicial/index.html. Static content; no dynamic data needed.
// ---------------------------------------------------------------------------

export function Footer() {
  return (
    <footer className="footer-area">
      <div className="container wide relative">
        <div className="row">
          <div className="col-lg-3 col-sm-6">
            <div className="footer-left">
              <a className="footer-logo" href="/">
                <img src="/site/img/footer-logo.webp" alt="TravelOz" />
              </a>
              <p>
                Unimos agilidad, profesionalismo y tarifas competitivas para
                que vivas la mejor experiencia de viaje.
              </p>
              <ul>
                <li>
                  <a
                    href="https://www.instagram.com/traveloz.uy/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fa-brands fa-instagram"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/traveloz.uy/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fa-brands fa-facebook-f"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/company/travelozuy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fa-brands fa-linkedin-in"></i>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="footer-link style2 ps-lg-4">
              <h3 className="title">Contacto</h3>
              <ul>
                <li>
                  <span className="icon">
                    <i className="fa-solid fa-location-dot"></i>
                  </span>
                  <a href="#">
                    Av. Dr. Luis Alberto de Herrera 1343 Of. 301 - Edificio
                    Trade Plaza
                  </a>
                </li>
                <li>
                  <span className="icon">
                    <i className="fa-solid fa-envelope"></i>
                  </span>
                  <a href="mailto:info@traveloz.com.uy">info@traveloz.com.uy</a>
                </li>
                <li>
                  <span className="icon">
                    <i className="fa-solid fa-mobile-screen-button"></i>
                  </span>
                  <a href="tel:+59826281717">+598 2628 1717</a>
                </li>
                <li>
                  <span className="icon">
                    <i className="fa-solid fa-clock"></i>
                  </span>
                  09:30 AM - 18:30 PM
                </li>
              </ul>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="footer-link ps-lg-5">
              <h3 className="title">Información útil</h3>
              <ul>
                <li>
                  <a href="/work-with-us">Trabaja con nosotros</a>
                </li>
                <li>
                  <a href="/terms">Términos y condiciones</a>
                </li>
                <li>
                  <a href="/faq">Preguntas frecuentes</a>
                </li>
                <li>
                  {/* Modal trigger -- AgenciaModal client component intercepts
                      [data-agencia-modal-open] clicks document-wide and
                      preventDefault()s, so this <a> stays a server component. */}
                  <a href="#" data-agencia-modal-open>
                    Agencia registrada
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <ul className="footer-brand-logo">
              <li>
                <a href="/">
                  <img
                    src="/site/img/logouruguaynatural.png"
                    alt="Uruguay Natural"
                  />
                </a>
              </li>
              <li>
                <a href="/">
                  <img src="/site/img/footer-aud.webp" alt="AUD" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
