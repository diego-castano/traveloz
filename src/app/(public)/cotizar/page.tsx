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
  });
}

export default async function CotizarPage() {
  const s = await getSiteSettings("cotizar");
  const titulo = s.cotizar_titulo ?? "Cotizá tu viaje";
  const lead =
    s.cotizar_lead ??
    "Contanos a dónde querés ir, cuándo y cuántos viajan. Diseñamos el itinerario y te respondemos en 24 horas.";

  const porqueTitulo = s.cotizar_porque_titulo?.trim();
  const porqueCards = [1, 2, 3].map((n) => ({
    icon: s[`cotizar_porque_card_${n}_icon`]?.trim(),
    titulo: s[`cotizar_porque_card_${n}_titulo`]?.trim(),
    texto: s[`cotizar_porque_card_${n}_texto`]?.trim(),
  })).filter((c) => c.titulo);

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

        {porqueTitulo && porqueCards.length > 0 && (
          <div className="mt-5 pt-5">
            <div className="text-center mb_50">
              <h2 className="section-heading">{porqueTitulo}</h2>
            </div>
            <div className="row">
              {porqueCards.map((c, i) => (
                <div className="col-md-4" key={i}>
                  <div className="icon-teaser style1 text-center">
                    {c.icon && <img src={c.icon} alt="" loading="lazy" decoding="async" />}
                    <h3 className="title">{c.titulo}</h3>
                    {c.texto && <p>{c.texto}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
