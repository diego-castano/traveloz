// ---------------------------------------------------------------------------
// Public site footer — server component reading SiteSettings groups
// "footer" (col 1 about/social, col 3 links) and "general" (col 2 contact data
// reused across the site). Replica EXACTO el footer de 4 columnas de
// html_inicial/index.html: sin barra de copyright, logos partner en una línea.
//
// Self-contained: el layout va con clases propias (.tvz-footer*) + Footer.css,
// sin depender del grid de Bootstrap ni del reset global de site.css. Así el
// MISMO componente sirve en (public) y en (landing) — donde antes había un
// footer minimalista aparte. Los íconos usan Font Awesome, que cada layout
// carga por su lado (site.css en public, landing.css en landing).
// ---------------------------------------------------------------------------

import "./Footer.css";
import { getSiteSettings } from "@/lib/public-data";

type FooterLink = { label: string; href: string };
type FooterPartner = { label: string; src: string; href?: string };

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

function parsePartners(json: string | undefined): FooterPartner[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is FooterPartner =>
        x &&
        typeof x.label === "string" &&
        typeof x.src === "string",
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

  const aboutTexto =
    footer.footer_about_texto ??
    "Unimos agilidad, profesionalismo y tarifas competitivas para que vivas la mejor experiencia de viaje.";
  const linksTitulo = footer.footer_links_titulo ?? "Información útil";
  const links = parseLinks(footer.footer_links_json);
  const partners = parsePartners(footer.footer_partners_json);
  const logo = general.footer_logo?.trim() || "/site/img/footer-logo.webp";

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
    <footer className="tvz-footer">
      <div className="tvz-footer-inner">
        <div className="tvz-footer-row">
          {/* Columna 1 — logo + about + redes */}
          <div className="tvz-footer-col">
            <div className="footer-left">
              <a className="footer-logo" href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="TravelOz" loading="lazy" decoding="async" />
              </a>
              <p>{aboutTexto}</p>
              {SOCIAL.length > 0 && (
                <ul className="footer-social">
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

          {/* Columna 2 — Contacto (datos generales) */}
          <div className="tvz-footer-col">
            <h3 className="footer-col-title">Contacto</h3>
            <ul className="footer-contact">
              {general.general_address && (
                <li>
                  <span className="icon">
                    <i className="fa-solid fa-location-dot"></i>
                  </span>
                  <span>{general.general_address}</span>
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
                  <span>{general.general_hours}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Columna 3 — Información útil (links + opcional bloque Legal) */}
          <div className="tvz-footer-col">
            <h3 className="footer-col-title">{linksTitulo}</h3>
            <ul className="footer-links">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
              {/* Disparador del modal "Agencia registrada" — declarativo vía
                  data-attribute (lo escucha <AgenciaModal/>). */}
              <li>
                <a href="#" data-agencia-modal-open>
                  Agencia registrada
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 4 — logos partner (editables vía footer_partners_json) */}
          <div className="tvz-footer-col">
            {partners.length > 0 && (
              <ul className="footer-brand-logo">
                {partners.map((p) => (
                  <li key={p.label}>
                    <a href={p.href && p.href.trim().length > 0 ? p.href : "/"}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt={p.label} loading="lazy" decoding="async" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
