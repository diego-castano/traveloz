"use client";

// ---------------------------------------------------------------------------
// /corporativo — uses CorporativoContent client component which receives
// SiteSettings (group=corporativo) loaded by the server wrapper page below.
// Wait, we keep this file as the page itself — it loads settings via a
// fetch hook on first render. Hero title, video URL, valores cards and
// section titles come from SiteSettings; clients logos + contact people
// remain hardcoded for now.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitCorporateForm } from "@/actions/public-forms.actions";
import { FormStatus } from "@/components/public/FormStatus";
import { EmblaSlider } from "@/components/public/EmblaSlider";
import { Typewriter } from "@/components/public/Typewriter";
import { getSettingsByGroup } from "@/actions/site-settings.actions";

type Settings = Record<string, string>;

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
  const [s, setS] = useState<Settings>({});

  useEffect(() => {
    getSettingsByGroup("corporativo").then((rows) => {
      setS(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    });
  }, []);

  const heroTitulo = s.corporativo_hero_titulo ?? "Viajes que impulsan negocios.";
  const heroVideo = s.corporativo_hero_video ?? "/site/video/Video-Traveloz-Corporativo.mp4";
  const cards = [
    {
      icon: "hand-icon.webp",
      title: s.corporativo_valores_titulo_1 ?? "Nuestros valores",
      body: s.corporativo_valores_texto_1 ?? "Trabajamos con una premisa clara: generar valor real a través de la confianza, la eficiencia y el compromiso.",
    },
    {
      icon: "flight-icon.webp",
      title: s.corporativo_valores_titulo_2 ?? "¿Cómo trabajamos?",
      body: s.corporativo_valores_texto_2 ?? "Identificamos las necesidades de cada organización y brindamos soluciones alineadas a sus objetivos, garantizando calidad y respaldo.",
    },
    {
      icon: "clock-icon.webp",
      title: s.corporativo_valores_titulo_3 ?? "Atención 24/7",
      body: s.corporativo_valores_texto_3 ?? "Más de 35 profesionales brindan un servicio de excelencia, resolviendo cada solicitud de forma ágil y con la máxima calidad las 24 horas.",
    },
  ];
  const clientesTitulo = s.corporativo_clientes_titulo ?? "Confían en nosotros";
  const formTitulo = s.corporativo_form_titulo ?? "Contactanos";

  return (
    <>
      {/* Hero with video */}
      <section className="hero-area relative">
        <video
          key={heroVideo}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="container z-99">
          <div className="hero-inner text-sm-center text-start p_150">
            <Typewriter
              as="h1"
              className="hero-text"
              text={heroTitulo}
              speedMs={80}
            />
          </div>
        </div>
      </section>

      {/* Three icon teasers (valores / cómo trabajamos / atención 24/7) */}
      <section className="content-area bg_gray">
        <div className="container">
          <div className="d-none d-md-block">
            <div className="row">
              {cards.map((c) => (
                <div className="col-md-4" key={c.icon}>
                  <div className="icon-teaser style1">
                    <img src={`/site/img/${c.icon}`} alt="icon" />
                    <h3 className="title">{c.title}</h3>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))}
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
              {cards.map((c) => (
                <div className="icon-teaser style1" key={c.icon}>
                  <img src={`/site/img/${c.icon}`} alt="icon" />
                  <h3 className="title">{c.title}</h3>
                  <p>{c.body}</p>
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
                <h2 className="section-heading purple">{clientesTitulo}</h2>
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
                  <h2 className="section-heading">{formTitulo}</h2>
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
