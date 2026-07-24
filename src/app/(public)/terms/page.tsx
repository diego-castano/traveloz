// ---------------------------------------------------------------------------
// /terms — server component. Sections come from DB (TermSection), editable
// via /backend/web/terms.
// ---------------------------------------------------------------------------

import { getTermSections, getSiteSettings } from "@/lib/public-data";
import {
  AccordionStatic,
  type AccordionItem,
} from "@/components/public/AccordionStatic";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("terms", { path: "/terms" });
}

export default async function TermsPage() {
  const [sections, settings] = await Promise.all([
    getTermSections(),
    getSiteSettings("terms"),
  ]);
  const items: AccordionItem[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    bodyHtml: s.bodyHtml,
  }));

  const titulo =
    settings.terms_titulo?.trim() || "Términos y condiciones de compra";
  const subtitulo =
    settings.terms_subtitulo?.trim() ||
    "Todo lo que necesitás saber acerca de las contrataciones de tus servicios";
  const bannerDesktop =
    settings.terms_banner_desktop?.trim() || "/site/img/terms-banner.webp";

  return (
    <>
      <section className="terms-banner-area">
        <div className="container">
          {/* Boarding pass decorativo: MISMO gráfico en desktop y mobile, sobre
              el degradado de .terms-banner-area. En mobile antes se mostraba el
              avión de FAQ (faq-mobile-banner) por error; el cliente pidió el
              boarding pass en ambos. Un solo gráfico → sin superposición. */}
          <img
            src={bannerDesktop}
            alt=""
            className="terms_bg_img"
            fetchPriority="high"
            decoding="async"
          />
          <div className="row align-items-lg-center">
            <div className="col-lg-10 col-10">
              <div className="banner-text text_white">
                <h1 className="h1 text_white">
                  <strong>{titulo}</strong>
                </h1>
                <div className="inner-text">
                  <p>{subtitulo}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-area">
        <div className="container smalls">
          {items.length === 0 ? (
            <p className="text-center py-12">
              Los términos y condiciones se publicarán próximamente.
            </p>
          ) : (
            <AccordionStatic parentId="terms-accordion" items={items} />
          )}
        </div>
      </section>
    </>
  );
}
