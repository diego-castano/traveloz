// ---------------------------------------------------------------------------
// /[slug] — landing público de cotizador por marca (route group aislado).
// Solo branding + dato institucional + formulario. Sin links de navegación:
// el visitante no puede salir a otra parte del sitio.
// ---------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { getPublishedLanding } from "@/actions/cotizador.actions";
import { CotizadorLeadForm } from "./_components/CotizadorLeadForm";

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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-12">
      {/* Branding */}
      <header className="mb-10 text-center">
        {landing.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={landing.logoUrl}
            alt={landing.nombreMarca}
            className="mx-auto mb-4 h-16 w-auto object-contain"
          />
        ) : (
          <div className="mb-2 text-2xl font-bold" style={{ color }}>
            {landing.nombreMarca}
          </div>
        )}
      </header>

      <main className="flex-1">
        <h1 className="mb-3 text-center text-3xl font-bold tracking-tight">
          Cotizá tu próximo viaje
        </h1>
        {landing.textoInstitucional && (
          <p className="mx-auto mb-8 max-w-lg text-center leading-relaxed text-neutral-600">
            {landing.textoInstitucional}
          </p>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <CotizadorLeadForm landingId={landing.id} color={color} />
        </div>
      </main>

      {/* Footer mínimo, sin links. */}
      <footer className="mt-12 text-center text-xs text-neutral-400">
        © {landing.nombreMarca}
      </footer>
    </div>
  );
}
