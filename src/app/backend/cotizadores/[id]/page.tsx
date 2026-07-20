// ---------------------------------------------------------------------------
// /backend/cotizadores/[id] — edición de un cotizador + tabla de leads (ADMIN).
// ---------------------------------------------------------------------------

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCotizadorLanding } from "@/actions/cotizador.actions";
import { parseCampos, parseRespuestas } from "@/lib/cotizador-form";
import type { Touch } from "@/lib/atribucion";
import { parseAtribJson } from "@/app/backend/leads/_components/atribucion-admin";
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

// Línea compacta "fuente / campaña" para un touch de atribución. `null` si
// el touch no tiene ninguno de los dos (ej. solo trajo referrer externo).
function pautaCompacta(touch: Touch | null): string | null {
  if (!touch) return null;
  const partes = [touch.src, touch.cmp].filter(Boolean);
  return partes.length > 0 ? partes.join(" / ") : null;
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
    <div className="mx-auto max-w-6xl p-6">
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
          campos: parseCampos(landing.campos),
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
          <div className="space-y-3">
            {landing.leads.map((lead) => {
              const respuestas = parseRespuestas(lead.respuestas);
              // Atribución de pauta: el Json guardado se re-valida siempre
              // con el mismo zod de atribucion.ts antes de mostrarse (nunca
              // se confía en el Json de la columna tal cual).
              const pautaEntrada = pautaCompacta(parseAtribJson(lead.atribFirst));
              const pautaUltimo = pautaCompacta(parseAtribJson(lead.atribLast));
              return (
                <div
                  key={lead.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-medium text-neutral-900">{lead.nombre}</span>
                    <span className="text-xs text-neutral-400">{fmt(lead.createdAt)}</span>
                  </div>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {lead.email}
                  </a>
                  {respuestas.length > 0 && (
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {respuestas.map((r, i) => (
                        <div key={`${r.id}-${i}`} className="flex gap-2 text-sm">
                          <dt className="shrink-0 text-neutral-400">{r.etiqueta}:</dt>
                          <dd className="text-neutral-700">{r.valor}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {(pautaEntrada || pautaUltimo) && (
                    <div className="mt-3 space-y-0.5 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
                      {pautaEntrada && (
                        <div>
                          Pauta (entrada):{" "}
                          <span className="text-neutral-700">{pautaEntrada}</span>
                        </div>
                      )}
                      {pautaUltimo && pautaUltimo !== pautaEntrada && (
                        <div>
                          Pauta (último):{" "}
                          <span className="text-neutral-700">{pautaUltimo}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
