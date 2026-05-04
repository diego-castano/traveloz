// ---------------------------------------------------------------------------
// Public site footer — server component reading SiteSettings groups
// "footer" (columns + links + social + copyright) and "general"
// (contact info reused across the site). Editable from /backend/web/footer
// and /backend/web/general.
// ---------------------------------------------------------------------------

import { getSiteSettings } from "@/lib/public-data";

type FooterLink = { label: string; href: string };

function parseLinks(json: string | undefined): FooterLink[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is FooterLink =>
        x &&
        typeof x.label === "string" &&
        typeof x.href === "string",
    );
  } catch {
    return [];
  }
}

export async function Footer() {
  const [footer, general] = await Promise.all([
    getSiteSettings("footer"),
    getSiteSettings("general"),
  ]);

  const aboutTitulo = footer.footer_about_titulo ?? "Sobre TravelOz";
  const aboutTexto =
    footer.footer_about_texto ??
    "Unimos agilidad, profesionalismo y tarifas competitivas.";
  const linksTitulo = footer.footer_links_titulo ?? "Enlaces rápidos";
  const links = parseLinks(footer.footer_links_json);
  const legalTitulo = footer.footer_legal_titulo ?? "Legal";
  const legal = parseLinks(footer.footer_legal_json);
  const copyright =
    footer.footer_copyright ?? "© 2026 TravelOz. Todos los derechos reservados.";

  const SOCIAL: Array<{ url?: string; icon: string; label: string }> = [
    { url: footer.footer_social_instagram, icon: "fa-instagram", label: "Instagram" },
    { url: footer.footer_social_facebook, icon: "fa-facebook-f", label: "Facebook" },
    { url: footer.footer_social_linkedin, icon: "fa-linkedin-in", label: "LinkedIn" },
    { url: footer.footer_social_youtube, icon: "fa-youtube", label: "YouTube" },
  ].filter((s) => s.url && s.url.trim().length > 0) as Array<{
    url: string;
    icon: string;
    label: string;
  }>;

  return (
    <footer className="footer-area">
      <div className="container wide relative">
        <div className="row">
          {/* Column 1 — about + social */}
          <div className="col-lg-3 col-sm-6">
            <div className="footer-left">
              <a className="footer-logo" href="/">
                <img src="/site/img/footer-logo.webp" alt="TravelOz" />
              </a>
              <p>{aboutTexto}</p>
              {SOCIAL.length > 0 && (
                <ul>
                  {SOCIAL.map((s) => (
                    <li key={s.icon}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                      >
                        <i className={`fa-brands ${s.icon}`}></i>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Column 2 — Contacto (datos generales) */}
          <div className="col-lg-3 col-sm-6">
            <div className="footer-link style2 ps-lg-4">
              <h3 className="title">Contacto</h3>
              <ul>
                {general.general_address && (
                  <li>
                    <span className="icon">
                      <i className="fa-solid fa-location-dot"></i>
                    </span>
                    <a href="#">{general.general_address}</a>
                  </li>
                )}
                {general.general_email && (
                  <li>
                    <span className="icon">
                      <i className="fa-solid fa-envelope"></i>
                    </span>
                    <a href={`mailto:${general.general_email}`}>
                      {general.general_email}
                    </a>
                  </li>
                )}
                {general.general_phone && (
                  <li>
                    <span className="icon">
                      <i className="fa-solid fa-mobile-screen-button"></i>
                    </span>
                    <a href={`tel:${general.general_phone.replace(/\s/g, "")}`}>
                      {general.general_phone}
                    </a>
                  </li>
                )}
                {general.general_hours && (
                  <li>
                    <span className="icon">
                      <i className="fa-solid fa-clock"></i>
                    </span>
                    {general.general_hours}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Column 3 — Enlaces rápidos + Legal */}
          <div className="col-lg-3 col-sm-6">
            <div className="footer-link ps-lg-5">
              <h3 className="title">{linksTitulo}</h3>
              <ul>
                {links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
                {/* AgenciaModal trigger stays as data-attribute so we don't break the modal pattern */}
                <li>
                  <a href="#" data-agencia-modal-open>
                    Agencia registrada
                  </a>
                </li>
              </ul>
              {legal.length > 0 && (
                <>
                  <h3 className="title" style={{ marginTop: 24 }}>
                    {legalTitulo}
                  </h3>
                  <ul>
                    {legal.map((l) => (
                      <li key={l.href}>
                        <a href={l.href}>{l.label}</a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Column 4 — Brand logos (kept hardcoded; they're partner logos) */}
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

        {copyright && (
          <div
            className="text-center pt-4"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              marginTop: 32,
              paddingTop: 16,
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {copyright}
          </div>
        )}
      </div>
    </footer>
  );
}
