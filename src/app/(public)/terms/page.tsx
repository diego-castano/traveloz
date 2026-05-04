// ---------------------------------------------------------------------------
// /terms — server component. Sections come from DB (TermSection), editable
// via /backend/web/terms.
// ---------------------------------------------------------------------------

import { getTermSections } from "@/lib/public-data";
import {
  AccordionStatic,
  type AccordionItem,
} from "@/components/public/AccordionStatic";

export const metadata = {
  title: "Términos y condiciones | TravelOz",
  description:
    "Términos y condiciones de compra de TravelOz. Información sobre contratación de servicios, pagos, cancelaciones y responsabilidades.",
};

export default async function TermsPage() {
  const sections = await getTermSections();
  const items: AccordionItem[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    bodyHtml: s.bodyHtml,
  }));

  return (
    <>
      <section className="terms-banner-area">
        <img
          className="bg_image d-md-none"
          src="/site/img/faq-mobile-banner.png"
          alt=""
        />
        <div className="container">
          <img
            src="/site/img/terms-banner.webp"
            alt=""
            className="terms_bg_img d-none d-md-block"
          />
          <img
            src="/site/img/terms-mobile-banner.png"
            alt=""
            className="terms_bg_img d-md-none"
          />
          <div className="row align-items-lg-center">
            <div className="col-lg-10 col-10">
              <div className="banner-text text_white">
                <h1 className="h1 text_white">
                  <strong>Términos y condiciones de compra</strong>
                </h1>
                <div className="inner-text">
                  <p>
                    Todo lo que necesitás saber acerca de las contrataciones de
                    tus servicios
                  </p>
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
