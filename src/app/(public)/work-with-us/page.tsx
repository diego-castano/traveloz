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
    // El \n se respeta por el whiteSpace:"pre-line" del <p>; reproduce el <br>
    // de la referencia (html_inicial/work-with-us.html).
    "Estamos transformando la experiencia de viajar,\ny queremos hacerlo con personas como vos.";
  const imagen = settings.workwithus_imagen?.trim() || "/site/img/work-with-us.webp";
  const videoUrl = settings.workwithus_video_url?.trim() || "";

  return (
    <section className="content-area work-with-us">
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
            <div className="content-box style3">
              <WorkForm />
            </div>
          </div>
          <div className="col-sm-6 order-sm-1 order-2">
            {videoUrl ? (
              <div className="content-img work-with-img">
                <video
                  key={videoUrl}
                  src={videoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  poster={imagen}
                  aria-label="Equipo TravelOz"
                  style={{ width: "100%", borderRadius: 12 }}
                />
              </div>
            ) : (
              <div className="content-img work-with-img video-placeholder">
                <img src={imagen} alt="Equipo TravelOz" decoding="async" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
