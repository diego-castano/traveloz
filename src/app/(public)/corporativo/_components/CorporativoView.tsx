"use client";

// ---------------------------------------------------------------------------
// CorporativoView — client island for /corporativo.
//
// All data (SiteSettings group "corporativo", clientes corporativos, equipo
// de contacto) is fetched server-side in page.tsx and passed in as props, so
// the hero, logos and team cards are present in the SSR HTML — no client
// fetch, no empty-then-pop flash. Only the interactive bits (typewriter,
// mobile sliders, contact form) need to run on the client.
// ---------------------------------------------------------------------------

import { useFormState, useFormStatus } from "react-dom";
import { submitCorporateForm } from "@/actions/public-forms.actions";
import { FormStatus } from "@/components/public/FormStatus";
import HoneypotField from "@/components/public/HoneypotField";
import { EmblaSlider } from "@/components/public/EmblaSlider";
import { Typewriter } from "@/components/public/Typewriter";

type Settings = Record<string, string>;

type Cliente = {
  id: string;
  nombre: string;
  logoUrl: string;
  link: string | null;
};

type Persona = {
  id: string;
  nombre: string;
  rol: string;
  email: string;
  photoUrl: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="contact-btn" disabled={pending}>
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function CorporativoView({
  settings: s,
  clientes,
  equipo,
}: {
  settings: Settings;
  clientes: Cliente[];
  equipo: Persona[];
}) {
  const [result, formAction] = useFormState(submitCorporateForm, null);

  const heroTitulo =
    s.corporativo_hero_titulo?.trim() || "Viajes que impulsan negocios.";
  const heroVideo =
    s.corporativo_hero_video?.trim() ||
    "/site/video/Video-Traveloz-Corporativo.mp4";
  const cards = [
    {
      icon: s.corporativo_valores_icon_1?.trim() || "/site/img/hand-icon.webp",
      title: s.corporativo_valores_titulo_1 ?? "Nuestros valores",
      body:
        s.corporativo_valores_texto_1 ??
        "Trabajamos con una premisa clara: generar valor real a través de la confianza, la eficiencia y el compromiso.",
    },
    {
      icon: s.corporativo_valores_icon_2?.trim() || "/site/img/flight-icon.webp",
      title: s.corporativo_valores_titulo_2 ?? "¿Cómo trabajamos?",
      body:
        s.corporativo_valores_texto_2 ??
        "Identificamos las necesidades de cada organización y brindamos soluciones alineadas a sus objetivos, garantizando calidad y respaldo.",
    },
    {
      icon: s.corporativo_valores_icon_3?.trim() || "/site/img/clock-icon.webp",
      title: s.corporativo_valores_titulo_3 ?? "Atención 24/7",
      body:
        s.corporativo_valores_texto_3 ??
        "Más de 35 profesionales brindan un servicio de excelencia, resolviendo cada solicitud de forma ágil y con la máxima calidad las 24 horas.",
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
                    <img src={c.icon} alt="icon" loading="lazy" decoding="async" />
                    <h3 className="title">{c.title}</h3>
                    <CardBody html={c.body} />
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
                  <img src={c.icon} alt="icon" loading="lazy" decoding="async" />
                  <h3 className="title">{c.title}</h3>
                  <CardBody html={c.body} />
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
                    {clientes.map((c) => (
                      <li className="col-lg-2 col-md-3" key={c.id}>
                        <a
                          href={c.link ?? "#"}
                          target={c.link ? "_blank" : undefined}
                          rel={c.link ? "noopener noreferrer" : undefined}
                        >
                          <img src={c.logoUrl} alt={c.nombre} loading="lazy" decoding="async" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="d-md-none">
                <div className="company-logo style2">
                  {clientes.length > 0 && (
                    <EmblaSlider
                      slidesToShow={3}
                      autoplay
                      autoplayDelay={3000}
                      loop
                      showArrows={false}
                      className="logo-slider"
                    >
                      {clientes.map((c) => (
                        <a
                          href={c.link ?? "#"}
                          target={c.link ? "_blank" : undefined}
                          rel={c.link ? "noopener noreferrer" : undefined}
                          key={c.id}
                        >
                          <img src={c.logoUrl} alt={c.nombre} loading="lazy" decoding="async" />
                        </a>
                      ))}
                    </EmblaSlider>
                  )}
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
                  <HoneypotField />
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
                {equipo.map((p) => (
                  <div className="col-sm-6" key={p.id}>
                    <div className="content-box text-center style3">
                      <div className="image-box">
                        <img
                          src={p.photoUrl ?? "/site/img/agencia.jpeg"}
                          alt={p.nombre}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="text">
                        <span className="name">{p.nombre}</span>
                        <span className="deg">{p.rol}</span>
                        <a href={`mailto:${p.email}`} className="email">
                          {p.email}
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

function CardBody({ html }: { html: string }) {
  if (!html) return null;
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(html);
  if (!looksLikeHtml) return <p>{html}</p>;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
