// ---------------------------------------------------------------------------
// /about (NOSOTROS) — server component. Hero title, lead, history text and
// image come from SiteSettings (group=nosotros), editable via /backend/web/nosotros.
// The rest of the page body remains hardcoded for now.
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
  const historia =
    s.nosotros_historia ??
    "TravelOz nació en 2018 con la idea de cambiar la forma en que se diseñan los viajes en Uruguay.";
  const imagen = s.nosotros_imagen ?? "/site/img/about1.webp";

  return (
    <section className="content-area gradient-page-bg">
      <div className="container">
        <div className="inner-media-content">
          <h1 className="h2 text_white mb-4 font_clarik">
            <strong>{titulo}</strong>
          </h1>
          {subtitulo && (
            <p className="text_white mb-4" style={{ fontSize: 18, opacity: 0.9 }}>
              {subtitulo}
            </p>
          )}
          <div className="row align-items-lg-center">
            <div className="col-sm-6 order-sm-2 order-1">
              <div className="content-img">
                <img src={imagen} alt="TravelOz" />
              </div>
            </div>
            <div className="col-sm-6 order-sm-1 order-2">
              <div className="content-text text_white pe-lg-5">
                <p>{historia}</p>
                <p>
                  TravelOz nació en agosto de 2018 como el sueño compartido de
                  cuatro amigos unidos por una misma pasión: viajar y ayudar a
                  otros a descubrir el mundo. Lo que comenzó como una idea
                  entre conversaciones y anécdotas, se transformó en un
                  proyecto firme, impulsado por nuestra formación profesional
                  y por años de experiencia en el sector turístico. Con esa
                  base, decidimos dar el gran paso y crear una agencia con una
                  misión clara: brindar un servicio de excelencia, cercano y
                  verdaderamente personalizado, capaz de transformar cada
                  viaje en una experiencia inolvidable.
                </p>
                <p>
                  Con el tiempo entendimos que ofrecer calidad no se trata
                  solo de elegir buenos destinos o diseñar itinerarios;
                  empieza mucho antes, en lo que sucede puertas adentro. Por
                  eso trabajamos para construir un equipo comprometido,
                  capacitado y profundamente apasionado por lo que hace. Cada
                  integrante aporta su mirada, su energía y su vocación de
                  servicio, permitiéndonos crecer y mejorar de manera
                  constante. Creemos firmemente que solo desde un entorno de
                  trabajo sano, colaborativo y motivador es posible brindar
                  una atención que realmente marque la diferencia.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="inner-media-content">
          <div className="row align-items-lg-center">
            <div className="col-sm-6">
              <div className="content-img">
                <img src="/site/img/about2.webp" alt="TravelOz equipo" />
              </div>
            </div>
            <div className="col-sm-6">
              <div className="content-text text_white ps-lg-5">
                <p>
                  Nuestros valores son los pilares de nuestro éxito. La
                  honestidad guía cada decisión, el respeto sostiene cada
                  vínculo y el compañerismo nos permite avanzar juntos,
                  incluso en los desafíos más grandes. Estos principios, no
                  solo fortalecen nuestra cultura interna, sino que se
                  reflejan en cada interacción con nuestros viajeros,
                  generando relaciones duraderas basadas en la confianza y la
                  transparencia.
                </p>
                <p>
                  En TravelOz entendemos que viajar es mucho más que moverse
                  de un lugar a otro: es descubrir, conectar, emocionarse y
                  aprender. Por eso, nos comprometemos a acompañar a cada
                  persona en su camino, diseñando experiencias que respondan
                  a sus sueños, necesidades y expectativas. Nuestro propósito
                  es simple pero profundo: que cada viaje sea una historia
                  que valga la pena recordar.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-6 mx-auto">
            <div className="about-notes text-center">
              <p>
                En TravelOz no solo planificamos itinerarios de viaje,
                acompañamos sueños, creamos momentos y dejamos huellas que
                perduran para siempre.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
