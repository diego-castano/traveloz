// ---------------------------------------------------------------------------
// /about (NOSOTROS) — server component. All copy + images come from
// SiteSettings (group=nosotros), editable from /backend/web/nosotros.
// ---------------------------------------------------------------------------

import { getSiteSettings } from "@/lib/public-data";

export const metadata = {
  title: "Nosotros | TravelOz",
  description:
    "Conocé la historia de TravelOz. Somos una agencia de viajes uruguaya fundada en 2018, comprometida con brindar experiencias de viaje personalizadas y de excelencia.",
};

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
                {historia &&
                  historia
                    .split(/\n\n+/)
                    .map((para, i) => <p key={i}>{para}</p>)}
                {mision && <p>{mision}</p>}
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
                  {valores && <p>{valores}</p>}
                  {proposito && <p>{proposito}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {cierre && (
          <div className="row">
            <div className="col-lg-6 mx-auto">
              <div className="about-notes text-center">
                <p>{cierre}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
