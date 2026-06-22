// ---------------------------------------------------------------------------
// /contact (CONTACTO) — server component reading contact data from
// SiteSettings (group=contacto). Form is a client island.
// ---------------------------------------------------------------------------

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
    'Ideas, comentarios, preguntas... Todo lo que quieras compartir <br class="d-none d-md-block">es bienvenido, ¡queremos escucharte!';

  return (
    <section
      className="content-area contact-area gradient-page-bg"
      id="contact-box"
    >
      <div className="container">
        <div className="content-box style2 contact-form-wrapper">
          {/* Row 1: Texto más ancho */}
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

          {/* Row 2: Formulario más angosto */}
          <div className="row justify-content-center">
            <div className="col-lg-5 col-md-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
