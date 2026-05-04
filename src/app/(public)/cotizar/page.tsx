import { CotizarForm } from "./_components/CotizarForm";

export const metadata = {
  title: "Cotizá tu viaje | TravelOz",
  description:
    "Contanos a dónde querés ir y diseñamos un viaje a tu medida. Te respondemos en 24h.",
};

export default function CotizarPage() {
  return (
    <section className="content-area">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="text-center mb_50">
              <h1 className="section-heading">Cotizá tu viaje</h1>
              <p>
                Contanos a dónde querés ir, cuándo y cuántos viajan. Diseñamos
                el itinerario y te respondemos en 24 horas.
              </p>
            </div>
            <CotizarForm />
          </div>
        </div>
      </div>
    </section>
  );
}
