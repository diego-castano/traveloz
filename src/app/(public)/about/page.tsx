// ---------------------------------------------------------------------------
// /about (NOSOTROS) — server component. All copy + images come from
// SiteSettings (group=nosotros), editable from /backend/web/nosotros.
// ---------------------------------------------------------------------------

import { getSiteSettings } from "@/lib/public-data";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("about");
}

/**
 * Normalize rich-text content from SiteSettings into an HTML string. The CMS
 * now writes HTML (from the WYSIWYG in /backend/web/nosotros), but legacy
 * plaintext rows still exist in prod — auto-paragraph those by splitting on
 * blank or single newlines so they don't render as one giant block.
 *
 * Returns an HTML string so callers can inject it directly into the existing
 * container (.content-text / .about-notes) via dangerouslySetInnerHTML,
 * matching the reference markup which has <p> as a direct child with no extra
 * wrapper div.
 */
function richTextHtml(html: string): string {
  if (!html) return "";
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(html);
  return looksLikeHtml
    ? html
    : html
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
        .join("");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function AboutPage() {
  const s = await getSiteSettings("nosotros");

  const titulo = s.nosotros_titulo ?? "El viaje que nos hizo agencia";
  const historia = s.nosotros_historia ?? "";
  const mision = s.nosotros_mision ?? "";
  const valores = s.nosotros_valores ?? "";
  const proposito = s.nosotros_proposito ?? "";
  const cierre = s.nosotros_cierre ?? "";
  const imagen1 = s.nosotros_imagen ?? "/site/img/about1.webp";
  const imagen2 = s.nosotros_imagen2 ?? "/site/img/about2.webp";

  return (
    <section className="content-area gradient-page-bg">
      <div className="container">
        <div className="inner-media-content">
          <h1 className="h2 text_white mb-4 font_clarik">
            <strong>{titulo}</strong>
          </h1>
          <div className="row align-items-lg-center">
            <div className="col-sm-6 order-sm-2 order-1">
              <div className="content-img">
                <img src={imagen1} alt="TravelOz" loading="lazy" decoding="async" />
              </div>
            </div>
            <div className="col-sm-6 order-sm-1 order-2">
              <div
                className="content-text text_white pe-lg-5"
                dangerouslySetInnerHTML={{
                  __html: richTextHtml(historia) + richTextHtml(mision),
                }}
              />
            </div>
          </div>
        </div>

        {(valores || proposito) && (
          <div className="inner-media-content">
            <div className="row align-items-lg-center">
              <div className="col-sm-6">
                <div className="content-img">
                  <img src={imagen2} alt="TravelOz equipo" loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="col-sm-6">
                <div
                  className="content-text text_white ps-lg-5"
                  dangerouslySetInnerHTML={{
                    __html: richTextHtml(valores) + richTextHtml(proposito),
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {cierre && (
          <div className="row">
            <div className="col-lg-6 mx-auto">
              <div
                className="about-notes text-center"
                dangerouslySetInnerHTML={{ __html: richTextHtml(cierre) }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
