// ---------------------------------------------------------------------------
// /datos-de-pago/<User.slug> - link público permanente de cada vendedor.
//
// Misma anatomía que la pantalla de pasajeros (hero + tarjeta del asesor +
// tarjeta blanca con el formulario), con un estado no feliz extra: si falta la
// env DATOS_PAGO_KEY, la bóveda no puede cifrar y la página responde "no
// disponible". PROHIBIDO ofrecer el formulario sin cifrado - antes ninguno.
// ---------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSolicitud, getVendedorPublico } from "@/actions/datos-publico.actions";
import { getFormularioDato } from "@/lib/datos-form";
import { bovedaDisponible } from "@/lib/datos-cifrado";
import { NoDisponible } from "../../_components/NoDisponible";
import { PagoForm } from "../../_components/PagoForm";
import { VendedorCard } from "../../_components/VendedorCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datos de pago · TravelOz",
  robots: { index: false, follow: false },
};

export default async function DatosDePagoPage({
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
    const existe = await prisma.user.count({ where: { slug } });
    if (existe === 0) notFound();
    return <NoDisponible />;
  }

  const formulario = await getFormularioDato("PAGO");
  if (!formulario.publicado) {
    return (
      <NoDisponible detalle="El formulario de datos de pago todavía no está habilitado. Escribile a tu asesor y coordinan el pago por otra vía." />
    );
  }

  // Sin clave de cifrado no se abre el formulario: preferimos perder el envío
  // antes que tener una tarjeta legible en la base.
  if (!bovedaDisponible()) {
    return (
      <NoDisponible detalle="El formulario de pago no está disponible en este momento. Escribile a tu asesor y coordinan el pago por otra vía." />
    );
  }

  const token = typeof searchParams.s === "string" ? searchParams.s.trim() : "";
  const solicitud = token ? await getSolicitud(token) : null;
  const precarga = solicitud?.tipo === "PAGO" ? solicitud : null;

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
        {precarga?.destino && (
          <p className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1.5 text-[13px] font-medium text-white">
            {precarga.destino}
            {precarga.referencia ? ` · ${precarga.referencia}` : ""}
          </p>
        )}
      </section>

      <div className="mt-7">
        <VendedorCard vendedor={vendedor} />
      </div>

      <section className="mx-auto mt-5 max-w-xl rounded-[20px] border border-neutral-900/[0.07] bg-white p-4 shadow-[0_12px_40px_-14px_rgba(15,23,42,0.18)] sm:p-8">
        <PagoForm slug={slug} token={precarga ? token : null} campos={formulario.campos} />
      </section>
    </div>
  );
}
