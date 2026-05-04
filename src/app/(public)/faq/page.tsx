// ---------------------------------------------------------------------------
// /faq — server component. Topics come from DB (FaqTopic), editable via
// /backend/web/faq. Renders Radix Tabs on desktop, Radix Accordion on mobile,
// both fed by the same data set.
// ---------------------------------------------------------------------------

import { getFaqTopics } from "@/lib/public-data";
import { FaqContent, type FaqTopic } from "./_components/FaqContent";

export const metadata = {
  title: "Preguntas frecuentes | TravelOz",
  description:
    "Información sobre documentación, menores de edad, visados, requisitos sanitarios, mascotas y embarazadas para viajar tranquilo.",
};

export default async function FaqPage() {
  const dbTopics = await getFaqTopics();
  const TOPICS: FaqTopic[] = dbTopics.map((t) => ({
    id: t.id,
    label: t.label,
    iconBlue: t.iconUrl ?? "faq-icon-1-blue.webp",
    bodyHtml: t.bodyHtml,
  }));

  return (
    <>
      <section className="faq-banner-area">
        <img
          className="bg_image d-none d-md-block"
          src="/site/img/banner-desktop.png"
          alt=""
        />
        <img
          className="bg_image d-md-none"
          src="/site/img/banner-mobile.png"
          alt=""
        />
        <div className="container">
          <div className="row">
            <div className="col-lg-7 col-8">
              <div className="banner-text text_white">
                <h1 className="h1 text_white">
                  <strong>Preguntas frecuentes</strong>
                </h1>
                <p>
                  Todo lo que necesitas saber, <br />
                  para viajar sin preocupaciones
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-area">
        <div className="container">
          {TOPICS.length === 0 ? (
            <p className="text-center py-12 text-muted">
              Próximamente más información.
            </p>
          ) : (
            <FaqContent topics={TOPICS} />
          )}
        </div>
      </section>
    </>
  );
}
