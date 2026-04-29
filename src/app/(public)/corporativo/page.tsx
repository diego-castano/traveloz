"use client";

// ---------------------------------------------------------------------------
// /corporativo -- 1:1 port of html_inicial/corporativo.html
//
// Sections: hero (video) + 3 valor cards + clients logos grid + contact form
// + 2 contact people cards.
//
// Interactivity:
//   - Form: useFormState -> submitCorporateForm (stub; Fase 5 -> Prisma).
//   - Mobile sliders (icon-teaser-slider, logo-slider) come back in Fase 4
//     when Embla Carousel replaces Slick. For now mobile shows a stacked
//     fallback (just the d-none d-md-block desktop variant -- mobile users
//     see the same content scrolled vertically).
//   - Hero typewriter (.anim-text) is a Fase 4 effect; static text for now.
// ---------------------------------------------------------------------------

import { useFormState, useFormStatus } from "react-dom";
import { submitCorporateForm } from "@/actions/public-forms.actions";
import { FormStatus } from "@/components/public/FormStatus";
import { EmblaSlider } from "@/components/public/EmblaSlider";

const ICON_TEASERS = [
  {
    icon: "hand-icon.webp",
    title: "Nuestros valores",
    body: (
      <>
        Trabajamos con una premisa clara: generar valor real a través de la{" "}
        <strong>confianza, la eficiencia y el compromiso.</strong>
      </>
    ),
  },
  {
    icon: "flight-icon.webp",
    title: "¿Cómo trabajamos?",
    body: (
      <>
        Identificamos las necesidades de cada organización y brindamos
        soluciones alineadas a sus objetivos, garantizando{" "}
        <strong>calidad y respaldo.</strong>
      </>
    ),
  },
  {
    icon: "clock-icon.webp",
    title: "Atención 24/7",
    body: (
      <>
        Más de 35 profesionales brindan un servicio de excelencia, resolviendo
        cada solicitud de{" "}
        <strong>forma ágil y con la máxima calidad las 24 horas.</strong>
      </>
    ),
  },
];

const CLIENT_LOGOS = [
  "canal-10",
  "ucu",
  "eju",
  "mmt",
  "inac",
  "inavi",
  "barrios",
  "arkano",
  "amcs",
  "proeza",
  "cibeles",
  "ubs",
];

const CONTACTS = [
  {
    name: "Agustina Magnani",
    role: "Growth Manager",
    email: "agustina.magnani@traveloz.com.uy",
    photo: "Agustina.webp",
  },
  {
    name: "Francisco Calviño",
    role: "CEO",
    email: "francisco.calvino@traveloz.com.uy",
    photo: "Francisco.webp",
  },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="contact-btn" disabled={pending}>
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export default function CorporativoPage() {
  const [result, formAction] = useFormState(submitCorporateForm, null);

  return (
    <>
      {/* Hero with video */}
      <section className="hero-area relative">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source
            src="/site/video/Video-Traveloz-Corporativo.mp4"
            type="video/mp4"
          />
        </video>
        <div className="container z-99">
          <div className="hero-inner text-sm-center text-start p_150">
            <h1 className="hero-text anim-text">
              Viajes que impulsan negocios.
            </h1>
          </div>
        </div>
      </section>

      {/* Three icon teasers (valores / cómo trabajamos / atención 24/7) */}
      <section className="content-area bg_gray">
        <div className="container">
          <div className="d-none d-md-block">
            <div className="row">
              <div className="col-md-4">
                <div className="icon-teaser style1">
                  <img src="/site/img/hand-icon.webp" alt="icon" />
                  <h3 className="title">Nuestros valores</h3>
                  <p>
                    Trabajamos con una premisa clara: generar valor real a
                    través de la{" "}
                    <strong>
                      confianza, la eficiencia y el compromiso.
                    </strong>
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="icon-teaser style1">
                  <img src="/site/img/flight-icon.webp" alt="icon" />
                  <h3 className="title">¿Cómo trabajamos?</h3>
                  <p>
                    Identificamos las necesidades de cada organización y
                    brindamos soluciones alineadas a sus objetivos,
                    garantizando <strong>calidad y respaldo.</strong>
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="icon-teaser style1">
                  <img src="/site/img/clock-icon.webp" alt="icon" />
                  <h3 className="title">Atención 24/7</h3>
                  <p>
                    Más de 35 profesionales brindan un servicio de excelencia,
                    resolviendo cada solicitud de{" "}
                    <strong>
                      forma ágil y con la máxima calidad las 24 horas.
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Mobile: Embla slider replaces the original Slick icon-teaser-slider */}
          <div className="d-md-none">
            <EmblaSlider
              slidesToShow={1}
              autoplay
              autoplayDelay={5000}
              loop
              showArrows={false}
              showDots
              className="icon-teaser-slider"
            >
              {ICON_TEASERS.map((t) => (
                <div className="icon-teaser style1" key={t.title}>
                  <img src={`/site/img/${t.icon}`} alt="icon" />
                  <h3 className="title">{t.title}</h3>
                  <p>{t.body}</p>
                </div>
              ))}
            </EmblaSlider>
          </div>
        </div>
      </section>

      {/* Client logos */}
      <section className="content-area pb_50">
        <div className="container">
          <div className="row">
            <div className="col-lg-10 mx-auto">
              <div className="text-center mb-lg-4 mb-3">
                <h2 className="section-heading purple">Confían en nosotros</h2>
              </div>
              <div className="d-none d-md-block">
                <div className="company-logo style2">
                  <ul className="row align-items-center justify-content-center">
                    {CLIENT_LOGOS.map((logo) => (
                      <li className="col-lg-2 col-md-3" key={logo}>
                        <a href="#">
                          <img src={`/site/img/${logo}.webp`} alt={logo} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="d-md-none">
                <div className="company-logo style2">
                  <EmblaSlider
                    slidesToShow={3}
                    autoplay
                    autoplayDelay={3000}
                    loop
                    showArrows={false}
                    className="logo-slider"
                  >
                    {CLIENT_LOGOS.map((logo) => (
                      <a href="#" key={logo}>
                        <img src={`/site/img/${logo}.webp`} alt={logo} />
                      </a>
                    ))}
                  </EmblaSlider>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact form + people */}
      <section className="content-area bg_gray">
        <div className="container">
          <div className="row">
            <div className="col-lg-5 col-sm-6 mx-auto">
              <div className="content-box style2 ver2">
                <div className="text-center mb_50">
                  <h2 className="section-heading">Contactanos</h2>
                </div>
                <form action={formAction}>
                  <ul className="row">
                    <li className="col-sm-12">
                      <label htmlFor="f_name">Nombre Completo</label>
                      <input
                        type="text"
                        id="f_name"
                        name="nombre"
                        placeholder="Nombre completo *"
                        required
                      />
                    </li>
                    <li className="col-sm-12">
                      <label htmlFor="phn">Teléfono</label>
                      <input
                        type="text"
                        id="phn"
                        name="telefono"
                        placeholder="Teléfono *"
                      />
                    </li>
                    <li className="col-sm-12">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Email *"
                        required
                      />
                    </li>
                    <li className="col-sm-12">
                      <label htmlFor="cargo">Cargo</label>
                      <input
                        type="text"
                        id="cargo"
                        name="cargo"
                        placeholder="Cargo/Rol"
                      />
                    </li>
                    <li className="col-sm-12">
                      <label htmlFor="empresa">Nombre</label>
                      <input
                        type="text"
                        id="empresa"
                        name="empresa"
                        placeholder="Nombre de la empresa *"
                        required
                      />
                    </li>
                    <li className="col-sm-12">
                      <label htmlFor="msg">Mensaje</label>
                      <textarea
                        id="msg"
                        name="comentarios"
                        placeholder="Comentarios"
                      />
                    </li>
                  </ul>
                  <div className="text-start">
                    <SubmitButton />
                  </div>
                  <FormStatus result={result} />
                </form>
              </div>
            </div>
            <div className="col-lg-8 mx-auto">
              <div className="row">
                {CONTACTS.map((c) => (
                  <div className="col-sm-6" key={c.email}>
                    <div className="content-box text-center style3">
                      <div className="image-box">
                        <img src={`/site/img/${c.photo}`} alt={c.name} />
                      </div>
                      <div className="text">
                        <span className="name">{c.name}</span>
                        <span className="deg">{c.role}</span>
                        <a href={`mailto:${c.email}`} className="email">
                          {c.email}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
