import { getSiteSettings } from "@/lib/public-data";
import { CotizarForm } from "./_components/CotizarForm";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  // Legacy `cotizar_meta_*` keys still win when set so we don't surprise the
  // admin; otherwise the new `seo_cotizar_*` keys (group="seo") drive it.
  const s = await getSiteSettings("cotizar");
  return buildSeoMetadata("cotizar", {
    title: s.cotizar_meta_title?.trim() || undefined,
    description: s.cotizar_meta_description?.trim() || undefined,
    path: "/cotizar",
  });
}

export default async function CotizarPage() {
  const s = await getSiteSettings("cotizar");
  const titulo = s.cotizar_titulo ?? "Cotizá tu viaje";
  const lead =
    s.cotizar_lead ??
    "Completá el formulario y recibí tu presupuesto en menos de 24 horas.";

  return (
    <>
      {/* Formulario — 1:1 con html_inicial/cotizacion.html: título + form dentro
          de un mismo `content-box style2 contact-form-wrapper`, así los inputs
          heredan el look translúcido (fondo transparente, borde blanco 2px,
          texto blanco) directo sobre el degradado, sin tarjeta blanca. */}
      <section className="content-area contact-area gradient-page-bg">
        <div className="container">
          <div className="content-box style2 contact-form-wrapper">
            <div className="row justify-content-center">
              <div className="col-lg-8 col-md-10 text-center mb_50">
                <h1 className="section-heading text_white">{titulo}</h1>
                <p className="sub-text text_white">{lead}</p>
              </div>
            </div>
            <div className="row justify-content-center">
              <div className="col-lg-5 col-md-7">
                <CotizarForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
