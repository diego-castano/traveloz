// ---------------------------------------------------------------------------
// /faq — server component. Topics come from DB (FaqTopic), editable via
// /backend/web/faq. Renders Radix Tabs on desktop, Radix Accordion on mobile,
// both fed by the same data set.
// ---------------------------------------------------------------------------

import { getFaqTopics, getSiteSettings } from "@/lib/public-data";
import { FaqContent, type FaqTopic } from "./_components/FaqContent";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("faq");
}

export default async function FaqPage() {
  const [dbTopics, settings] = await Promise.all([
    getFaqTopics(),
    getSiteSettings("faq"),
  ]);
  const TOPICS: FaqTopic[] = dbTopics.map((t) => ({
    id: t.id,
    label: t.label,
    iconBlue: t.iconUrl ?? "",
    bodyHtml: t.bodyHtml,
  }));

  const titulo = settings.faq_titulo?.trim() || "Preguntas frecuentes";
  const subtitulo =
    settings.faq_subtitulo?.trim() ||
    "Todo lo que necesitas saber, para viajar sin preocupaciones";
  const bannerDesktop =
    settings.faq_banner_desktop?.trim() || "/site/img/banner-desktop.png";
  const bannerMobile =
    settings.faq_banner_mobile?.trim() || "/site/img/banner-mobile.png";

  return (
    <>
      <section className="faq-banner-area">
        <img
          className="bg_image d-none d-md-block"
          src={bannerDesktop}
          alt=""
        />
        <img
          className="bg_image d-md-none"
          src={bannerMobile}
          alt=""
        />
        <div className="container">
          <div className="row">
            <div className="col-lg-7 col-8">
              <div className="banner-text text_white">
                <h1 className="h1 text_white">
                  <strong>{titulo}</strong>
                </h1>
                <p style={{ whiteSpace: "pre-line" }}>{subtitulo}</p>
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
