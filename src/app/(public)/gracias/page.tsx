// ---------------------------------------------------------------------------
// /gracias - página de conversión. Los formularios de leads (paquete,
// cotizador, contacto, corporativo) navegan acá tras un envío exitoso en vez
// de mostrar la confirmación inline, así el cliente puede medir la conversión
// en GTM con un pageview propio.
//
// `?form=` elige el copy (paquete | cotizar | contacto | corporativo);
// cualquier otro valor, o ninguno, cae al mensaje genérico. Entrar directo por
// URL es un caso válido: la página se ve igual de bien.
//
// noindex: es una página de agradecimiento, no tiene por qué estar en Google.
// Tampoco entra al sitemap (src/app/sitemap.ts lista las rutas a mano).
// ---------------------------------------------------------------------------

import Link from "next/link";
import { FormSuccess } from "@/components/public/FormSuccess";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("default", {
    title: "¡Gracias! | TravelOz",
    description:
      "Recibimos tu consulta. Nuestro equipo te contacta a la brevedad.",
    noindex: true,
  });
}

const COPY_GENERICO = {
  title: "¡Gracias por escribirnos!",
  text: "Recibimos tu mensaje. Nuestro equipo te va a contactar a la brevedad.",
};

const COPY: Record<string, { title: string; text: string }> = {
  paquete: {
    title: "¡Consulta enviada!",
    text: "Recibimos tu consulta por el paquete. Nuestro equipo te contacta a la brevedad con la propuesta de tu viaje.",
  },
  cotizar: {
    title: "¡Consulta enviada!",
    text: "Gracias por escribirnos. Te mandamos tu propuesta de viaje a medida en menos de 24 horas.",
  },
  contacto: {
    title: "¡Mensaje enviado!",
    text: "Gracias por contactarte con nosotros. Te respondemos a la brevedad.",
  },
  corporativo: {
    title: "¡Mensaje enviado!",
    text: "Gracias por tu interés. Nuestro equipo corporativo se pone en contacto con vos a la brevedad.",
  },
};

export default function GraciasPage({
  searchParams,
}: {
  searchParams: { form?: string | string[] };
}) {
  const form =
    typeof searchParams.form === "string" ? searchParams.form : undefined;
  const copy = (form && COPY[form]) || COPY_GENERICO;

  return (
    <section className="content-area contact-area gradient-page-bg gracias-area">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
            <FormSuccess
              variant="onGradient"
              titleAs="h1"
              title={copy.title}
              text={copy.text}
            />
            <div className="gracias-actions">
              <Link className="hero-btn" href="/destinos/todos">
                Explorá todos los destinos
              </Link>
              <Link className="hero-btn" href="/">
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
