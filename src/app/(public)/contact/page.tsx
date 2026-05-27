// ---------------------------------------------------------------------------
// /contact (CONTACTO) — server component reading contact data from
// SiteSettings (group=contacto). Form is a client island.
// ---------------------------------------------------------------------------

import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/public-data";
import { ContactForm } from "./_components/ContactForm";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("contact");
}

export default async function ContactPage() {
  const s = await getSiteSettings("contacto");
  const titulo = s.contacto_titulo ?? "¡Conversemos!";
  const subtitulo =
    s.contacto_subtitulo ??
    "Ideas, comentarios, preguntas... Todo lo que quieras compartir es bienvenido, ¡queremos escucharte!";

  return (
    <section
      className="content-area contact-area gradient-page-bg"
      id="contact-box"
    >
      <div className="container">
        <div className="content-box style2 contact-form-wrapper">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-md-10 text-center mb_50">
              <h1 className="h2 text_white mb-4 section-heading">{titulo}</h1>
              <p
                className="sub-text text_white"
                dangerouslySetInnerHTML={{
                  __html: subtitulo.replace(/\n/g, "<br/>"),
                }}
              />
            </div>
          </div>

          {/* Contact data + form, side by side on desktop */}
          <div className="row justify-content-center align-items-start">
            <div className="col-lg-4 col-md-7 mb-4 mb-lg-0 text_white">
              <ul style={{ listStyle: "none", padding: 0, fontSize: 14 }}>
                {s.contacto_email && (
                  <li
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Mail style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                    <a
                      href={`mailto:${s.contacto_email}`}
                      className="text_white"
                      style={{ wordBreak: "break-word" }}
                    >
                      {s.contacto_email}
                    </a>
                  </li>
                )}
                {s.contacto_telefono && (
                  <li
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Phone style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                    <a
                      href={`tel:${s.contacto_telefono.replace(/\s/g, "")}`}
                      className="text_white"
                    >
                      {s.contacto_telefono}
                    </a>
                  </li>
                )}
                {s.contacto_whatsapp && (
                  <li
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <MessageCircle style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                    <a
                      href={s.contacto_whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="text_white"
                    >
                      WhatsApp
                    </a>
                  </li>
                )}
                {s.contacto_direccion && (
                  <li
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <MapPin style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                    <span>{s.contacto_direccion}</span>
                  </li>
                )}
                {s.contacto_horario && (
                  <li
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Clock style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                    <span>{s.contacto_horario}</span>
                  </li>
                )}
              </ul>

              {s.contacto_mapa_embed && (
                <div
                  style={{
                    marginTop: 24,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                  dangerouslySetInnerHTML={{ __html: s.contacto_mapa_embed }}
                />
              )}
            </div>

            <div className="col-lg-5 col-md-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
