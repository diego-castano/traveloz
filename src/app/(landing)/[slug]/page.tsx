// ---------------------------------------------------------------------------
// /[slug] — landing público de cotizador por marca (route group aislado).
// Diseño inspirado en /cotizar: branding de la marca + hero "Cotizá tu viaje"
// con texto institucional editable + formulario de cotización moderno + footer
// de TravelOz solo-contacto. Sin links de navegación: el visitante no sale del
// landing.
// ---------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { getPublishedLanding } from "@/actions/cotizador.actions";
import { CotizadorLeadForm } from "./_components/CotizadorLeadForm";
import { LandingFooter } from "./_components/LandingFooter";

export const dynamic = "force-dynamic";

export default async function CotizadorLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const landing = await getPublishedLanding(params.slug);
  if (!landing) notFound();

  const color = landing.colorPrimario || "#1a1a2e";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Barra de marca (sin navegación) */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-center px-5 py-4">
          {landing.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={landing.logoUrl}
              alt={landing.nombreMarca}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span className="text-lg font-bold tracking-tight" style={{ color }}>
              {landing.nombreMarca}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section
          className="px-5 pb-2 pt-12 text-center"
          style={{
            background: `linear-gradient(180deg, ${color}0f 0%, transparent 100%)`,
          }}
        >
          <div className="mx-auto max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
              Cotizá tu viaje
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-neutral-600">
              {landing.textoInstitucional?.trim() ||
                "Contanos a dónde querés ir, cuándo y cuántos viajan. Diseñamos el itinerario a tu medida y te respondemos a la brevedad."}
            </p>
          </div>
        </section>

        {/* Formulario */}
        <section className="px-5 py-10">
          <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-9">
            <CotizadorLeadForm landingId={landing.id} color={color} />
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
