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

// "¿Por qué elegirnos?" — diseño 1:1 con html_inicial/cotizacion.html: íconos
// FontAwesome en círculo degradé (no imágenes) y copy fijo. Los textos se pueden
// sobrescribir desde Ajustes (grupo "cotizar"); los íconos quedan fijos para no
// romper el diseño aprobado.
const PORQUE_DEFAULT = [
  {
    icon: "fa-bolt",
    titulo: "Agilidad",
    texto: "Respondemos a tu pedido de cotización en menos de 24hs",
  },
  {
    icon: "fa-user-tie",
    titulo: "Profesionalismo",
    texto:
      "Contamos con personal altamente capacitado, para brindarte el mejor servicio.",
  },
  {
    icon: "fa-tags",
    titulo: "Precios más bajos",
    texto: "Te ofrecemos las mejores tarifas del mercado.",
  },
];

export default async function CotizarPage() {
  const s = await getSiteSettings("cotizar");
  const titulo = s.cotizar_titulo ?? "Cotizá tu viaje";
  const lead =
    s.cotizar_lead ??
    "Completá el formulario y recibí tu presupuesto en menos de 24 horas.";

  const porqueTitulo = s.cotizar_porque_titulo?.trim() || "¿Por qué elegirnos?";
  const porqueCards = PORQUE_DEFAULT.map((card, i) => {
    const n = i + 1;
    return {
      icon: card.icon,
      titulo: s[`cotizar_porque_card_${n}_titulo`]?.trim() || card.titulo,
      texto: s[`cotizar_porque_card_${n}_texto`]?.trim() || card.texto,
    };
  });

  return (
    <>
      {/* Formulario — fondo violeta, intro en blanco (form en tarjeta blanca) */}
      <section className="content-area contact-area gradient-page-bg">
        <div className="container">
          <div className="row justify-content-center">
            {/* contact-form-wrapper acá da el tamaño/responsive del título del
                diseño original; el form va aparte para conservar la tarjeta y los
                inputs blancos (este wrapper tiene reglas !important que los
                volverían transparentes). */}
            <div className="col-lg-8 col-md-10 text-center mb_50 contact-form-wrapper">
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
      </section>

      {/* ¿Por qué elegirnos? — idéntico al diseño original */}
      <section className="content-area bg_gray">
        <div className="container">
          <div className="text-center mb_50">
            <h2 className="section-heading purple">{porqueTitulo}</h2>
          </div>
          <div className="row">
            {porqueCards.map((c, i) => (
              <div className="col-md-4" key={i}>
                <div className="icon-teaser style1">
                  <div className="quote-icon-circle">
                    <i className={`fa-solid ${c.icon}`}></i>
                  </div>
                  <h3 className="title">{c.titulo}</h3>
                  <p>{c.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
