import { getSiteSettings } from "@/lib/public-data";
import { CotizarForm } from "./_components/CotizarForm";

export async function generateMetadata() {
  const s = await getSiteSettings("cotizar");
  return {
    title: s.cotizar_meta_title ?? "Cotizá tu viaje | TravelOz",
    description:
      s.cotizar_meta_description ??
      "Contanos a dónde querés ir y diseñamos un viaje a tu medida. Te respondemos en 24h.",
  };
}

export default async function CotizarPage() {
  const s = await getSiteSettings("cotizar");
  const titulo = s.cotizar_titulo ?? "Cotizá tu viaje";
  const lead =
    s.cotizar_lead ??
    "Contanos a dónde querés ir, cuándo y cuántos viajan. Diseñamos el itinerario y te respondemos en 24 horas.";

  return (
    <section className="content-area">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="text-center mb_50">
              <h1 className="section-heading">{titulo}</h1>
              <p>{lead}</p>
            </div>
            <CotizarForm />
          </div>
        </div>
      </div>
    </section>
  );
}
