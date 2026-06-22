// ---------------------------------------------------------------------------
// /[slug] — landing público de cotizador por marca (route group aislado).
// App-bar con el logo de TravelOz arriba, hero "Cotizá tu viaje" con el logo de
// la marca de forma no invasiva + texto institucional editable, formulario
// moderno (se siente como app en mobile) y el footer completo de TravelOz
// (mismo componente que el sitio público).
// ---------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { getPublishedLanding } from "@/actions/cotizador.actions";
import { DynamicForm } from "./_components/DynamicForm";
import { Footer } from "@/components/public/Footer";

export const dynamic = "force-dynamic";

export default async function CotizadorLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const landing = await getPublishedLanding(params.slug);
  if (!landing) notFound();

  // Color de marca fijo, igual al formulario de referencia (/cotizar). No es
  // configurable por landing a propósito.
  const color = "#F43E55";

  // Fondo de la referencia de diseño (html_inicial/cotizacion.html): degradado
  // violeta → fucsia. El formulario queda en una tarjeta blanca encima.
  const pageBg = "linear-gradient(180deg, #7a5cd1 0%, #ad5285 100%)";

  return (
    <div className="flex min-h-screen flex-col" style={{ background: pageBg }}>
      {/* App-bar TravelOz (plataforma) — barra blanca frosteada sobre el fondo. */}
      <header className="sticky top-0 z-10 border-b border-neutral-200/60 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-center px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-logo.webp" alt="TravelOz" className="h-10 w-auto" />
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-5 pb-2 pt-10 text-center sm:pt-14">
          <div className="mx-auto max-w-xl">
            <h1
              className="landing-title text-[34px] leading-tight tracking-tight sm:text-5xl"
              style={{ color: "#fff" }}
            >
              {landing.tituloHero?.trim() || "Cotizá tu viaje"}
            </h1>
            <p className="mx-auto mt-3.5 max-w-lg text-[16px] leading-relaxed text-white/90">
              {landing.textoInstitucional?.trim() ||
                "Contanos a dónde querés ir, cuándo y cuántos viajan. Diseñamos el itinerario a tu medida y te respondemos a la brevedad."}
            </p>
          </div>
        </section>

        {/* Formulario — tarjeta tipo app */}
        <section className="px-4 pb-10 pt-4 sm:px-5">
          <div className="relative mx-auto max-w-xl rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-[0_8px_40px_rgba(15,23,42,0.06)] sm:p-8">
            {/* Logo de la marca, sutil y discreto en la esquina (no protagonista). */}
            {landing.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={landing.logoUrl}
                alt={landing.nombreMarca}
                className="pointer-events-none absolute right-5 top-5 h-6 w-auto object-contain opacity-35 grayscale sm:right-7 sm:top-7"
              />
            )}
            <DynamicForm landingId={landing.id} campos={landing.campos} color={color} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
