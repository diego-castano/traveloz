// ---------------------------------------------------------------------------
// /datos-de-pasajeros/<User.slug> - link público permanente de cada vendedor.
//
// El pasajero no tiene cuenta ni la necesita. Ve el hero, la tarjeta de su
// asesor y el formulario. Con ?s=<token> el link vino por email y precargamos
// destino, referencia y el email del destinatario.
//
// Estados no felices, con la misma jerarquía visual que el estado feliz:
//   • slug que nunca existió                → notFound()
//   • vendedor inactivo / link apagado      → pantalla de cortesía
//   • formulario sin publicar               → pantalla de cortesía
// ---------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSolicitud, getVendedorPublico } from "@/actions/datos-publico.actions";
import {
  ADJUNTO_ACCEPT,
  AVISO_PASAJEROS,
  MAX_ADJUNTO_BYTES,
  MAX_PASAJEROS,
  getFormularioDato,
} from "@/lib/datos-form";
import { NoDisponible } from "../../_components/NoDisponible";
import { PasajerosForm } from "../../_components/PasajerosForm";
import { VendedorCard } from "../../_components/VendedorCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datos de pasajeros · TravelOz",
  robots: { index: false, follow: false },
};

export default async function DatosDePasajerosPage({
  params,
  searchParams,
}: {
  params: { vendedor: string };
  searchParams: { s?: string };
}) {
  const slug = params.vendedor.trim().toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) notFound();

  const vendedor = await getVendedorPublico(slug);
  if (!vendedor) {
    // El slug de un vendedor no se recicla nunca: si existe en la tabla pero
    // el link está apagado, la persona del otro lado merece una explicación,
    // no un 404 seco.
    const existe = await prisma.user.count({ where: { slug } });
    if (existe === 0) notFound();
    return <NoDisponible />;
  }

  const formulario = await getFormularioDato("PASAJEROS");
  if (!formulario.publicado) {
    return (
      <NoDisponible detalle="El formulario de datos de pasajeros todavía no está habilitado. Escribile a tu asesor y te avisa apenas esté listo." />
    );
  }

  const token = typeof searchParams.s === "string" ? searchParams.s.trim() : "";
  const solicitud = token ? await getSolicitud(token) : null;
  // Un token de pago no precarga el formulario de pasajeros.
  const precarga = solicitud?.tipo === "PASAJEROS" ? solicitud : null;

  return (
    <div className="px-4 pb-16 pt-8 sm:px-5 sm:pt-12">
      <section className="mx-auto max-w-xl text-center">
        <h1 className="formularios-title text-[30px] leading-tight text-white sm:text-[38px]">
          {formulario.titulo}
        </h1>
        {formulario.texto && (
          <p className="mx-auto mt-3.5 max-w-lg text-[15px] leading-relaxed text-white/90 sm:text-[16px]">
            {formulario.texto}
          </p>
        )}
      </section>

      <div className="mt-7">
        <VendedorCard vendedor={vendedor} />
      </div>

      <section className="mx-auto mt-5 max-w-xl rounded-[20px] border border-neutral-900/[0.07] bg-white p-4 shadow-[0_12px_40px_-14px_rgba(15,23,42,0.18)] sm:p-8">
        <PasajerosForm
          slug={slug}
          token={precarga ? token : null}
          campos={formulario.campos}
          maxPasajeros={MAX_PASAJEROS}
          avisoDesde={AVISO_PASAJEROS}
          accept={ADJUNTO_ACCEPT}
          maxAdjuntoBytes={MAX_ADJUNTO_BYTES}
          destinoInicial={precarga?.destino ?? null}
          referenciaInicial={precarga?.referencia ?? null}
          emailInicial={precarga?.destinatarioEmail ?? null}
        />
      </section>
    </div>
  );
}
