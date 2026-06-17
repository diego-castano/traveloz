// ---------------------------------------------------------------------------
// /backend/cotizadores — módulo de Cotizadores por marca (solo ADMIN).
// Lista de landings + toggle de Coming Soon del sitio principal.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { getCotizadorLandings, getComingSoonState } from "@/actions/cotizador.actions";
import { ComingSoonToggle } from "./_components/ComingSoonToggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cotizadores por marca — TravelOz" };

export default async function CotizadoresPage() {
  let landings: Awaited<ReturnType<typeof getCotizadorLandings>> = [];
  let comingSoon = true;
  try {
    [landings, comingSoon] = await Promise.all([
      getCotizadorLandings(),
      getComingSoonState(),
    ]);
  } catch {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Cotizadores por marca</h1>
        <p className="mt-3 text-red-600">Acceso restringido a administradores.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Cotizadores por marca</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Landings de cotización independientes del sitio principal.
          </p>
        </div>
        <Link
          href="/backend/cotizadores/nuevo"
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Nuevo cotizador
        </Link>
      </div>

      <div className="mb-6">
        <ComingSoonToggle initial={comingSoon} />
      </div>

      {landings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
          Todavía no hay cotizadores. Creá el primero.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-neutral-500">
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {landings.map((l) => (
                <tr key={l.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/backend/cotizadores/${l.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {l.nombreMarca}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">/{l.slug}</td>
                  <td className="px-4 py-3">
                    {l.publicado ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Publicado
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                        Borrador
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{l._count.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
