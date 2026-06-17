// ---------------------------------------------------------------------------
// /backend/cotizadores/[id] — edición de un cotizador + tabla de leads (ADMIN).
// ---------------------------------------------------------------------------

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCotizadorLanding } from "@/actions/cotizador.actions";
import { CotizadorForm } from "../_components/CotizadorForm";
import { DeleteLandingButton } from "../_components/DeleteLandingButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar cotizador — TravelOz" };

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function fmtDay(d: Date): string {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(d));
}

export default async function EditarCotizadorPage({
  params,
}: {
  params: { id: string };
}) {
  let landing;
  try {
    landing = await getCotizadorLanding(params.id);
  } catch {
    return (
      <div className="p-6">
        <p className="text-red-600">Acceso restringido a administradores.</p>
      </div>
    );
  }
  if (!landing || landing.deletedAt) notFound();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/backend/cotizadores"
            className="text-sm text-neutral-500 hover:underline"
          >
            ← Cotizadores
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">{landing.nombreMarca}</h1>
          {landing.publicado && (
            <Link
              href={`/${landing.slug}`}
              target="_blank"
              className="mt-1 inline-block text-sm text-blue-600 hover:underline"
            >
              Ver landing /{landing.slug} ↗
            </Link>
          )}
        </div>
        <DeleteLandingButton id={landing.id} nombreMarca={landing.nombreMarca} />
      </div>

      <CotizadorForm
        initial={{
          id: landing.id,
          nombreMarca: landing.nombreMarca,
          slug: landing.slug,
          tituloHero: landing.tituloHero,
          logoUrl: landing.logoUrl,
          textoInstitucional: landing.textoInstitucional,
          colorPrimario: landing.colorPrimario,
          emailsDestino: landing.emailsDestino,
          publicado: landing.publicado,
        }}
      />

      {/* Leads */}
      <div className="mt-12">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">
          Leads recibidos ({landing.leads.length})
        </h2>
        {landing.leads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            Todavía no llegaron envíos de este landing.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left text-neutral-500">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Destino</th>
                  <th className="px-4 py-3 font-medium">Viaje</th>
                  <th className="px-4 py-3 font-medium">Pax</th>
                  <th className="px-4 py-3 font-medium">Pref.</th>
                  <th className="px-4 py-3 font-medium">Consulta</th>
                </tr>
              </thead>
              <tbody>
                {landing.leads.map((lead) => {
                  const tel = [lead.paisCodigo, lead.telefono].filter(Boolean).join(" ");
                  const fechas = [lead.fechaDesde, lead.fechaHasta]
                    .filter(Boolean)
                    .map((d) => fmtDay(d as Date))
                    .join(" → ");
                  const pax = [
                    lead.adultos ? `${lead.adultos}A` : "",
                    lead.ninos ? `${lead.ninos}N` : "",
                    lead.infantes ? `${lead.infantes}I` : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={lead.id} className="border-t border-neutral-100 align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                        {fmt(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{lead.nombre}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                        <div>{lead.email}</div>
                        {tel && <div className="text-xs text-neutral-400">{tel}</div>}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{lead.destino || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                        {fechas || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{pax || "—"}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {lead.preferencia ? lead.preferencia.toLowerCase() : "—"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-neutral-600">
                        {lead.comentarios || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
