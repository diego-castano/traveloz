// ---------------------------------------------------------------------------
// /work-with-us — server component. Reads SiteSettings group="workwithus" for
// titulo / subtitulo / imagen / video opcional. Defers the application form
// (client island with useFormState) to <WorkForm />.
// ---------------------------------------------------------------------------

import { getSiteSettings } from "@/lib/public-data";
import { WorkForm } from "./_components/WorkForm";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("work");
}

export default async function WorkWithUsPage() {
  const settings = await getSiteSettings("workwithus");
  const titulo = settings.workwithus_titulo?.trim() || "¡Queremos conocerte!";
  const subtitulo =
    settings.workwithus_subtitulo?.trim() ||
    "Estamos transformando la experiencia de viajar, y queremos hacerlo con personas como vos.";
  const imagen = settings.workwithus_imagen?.trim() || "/site/img/work-with-us.webp";
  const videoUrl = settings.workwithus_video_url?.trim() || "";

  return (
    <section className="content-area gradient-page-bg work-with-us">
      <div className="container">
        <div className="content-box">
          <div className="text-center mb_50">
            <h1 className="section-heading">{titulo}</h1>
            <div className="sub-text">
              <p style={{ whiteSpace: "pre-line" }}>{subtitulo}</p>
            </div>
          </div>
        </div>
        <div className="row gx-lg-5 gx-4">
          <div className="col-sm-6 order-sm-2 order-1">
            <div className="content-box style2">
              <WorkForm />
            </div>
          </div>
          <div className="col-sm-6 order-sm-1 order-2">
            {videoUrl ? (
              <div className="content-img work-with-img">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  poster={imagen}
                  style={{ width: "100%", borderRadius: 12 }}
                >
                  <track kind="captions" />
                </video>
              </div>
            ) : (
              <div className="content-img work-with-img video-placeholder">
                <img src={imagen} alt="Equipo TravelOz" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
