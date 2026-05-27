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
 * Render rich-text content from SiteSettings. The CMS now writes HTML (from
 * the WYSIWYG in /backend/web/nosotros), but legacy plaintext rows still
 * exist in prod — auto-paragraph those by splitting on blank or single
 * newlines so they don't render as one giant block.
 */
function RichText({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(html);
  const finalHtml = looksLikeHtml
    ? html
    : html
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
        .join("");
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
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
  const subtitulo = s.nosotros_subtitulo ?? "";
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
          {subtitulo && (
            <p
              className="text_white mb-4"
              style={{ fontSize: 18, opacity: 0.9 }}
            >
              {subtitulo}
            </p>
          )}
          <div className="row align-items-lg-center">
            <div className="col-sm-6 order-sm-2 order-1">
              <div className="content-img">
                <img src={imagen1} alt="TravelOz" />
              </div>
            </div>
            <div className="col-sm-6 order-sm-1 order-2">
              <div className="content-text text_white pe-lg-5">
                <RichText html={historia} className="rich-content" />
                <RichText html={mision} className="rich-content" />
              </div>
            </div>
          </div>
        </div>

        {(valores || proposito) && (
          <div className="inner-media-content">
            <div className="row align-items-lg-center">
              <div className="col-sm-6">
                <div className="content-img">
                  <img src={imagen2} alt="TravelOz equipo" />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="content-text text_white ps-lg-5">
                  <RichText html={valores} className="rich-content" />
                  <RichText html={proposito} className="rich-content" />
                </div>
              </div>
            </div>
          </div>
        )}

        {cierre && (
          <div className="row">
            <div className="col-lg-6 mx-auto">
              <div className="about-notes text-center">
                <RichText html={cierre} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
