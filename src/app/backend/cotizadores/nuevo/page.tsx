// /backend/cotizadores/nuevo — alta de un cotizador por marca (ADMIN).

import Link from "next/link";
import { CotizadorForm } from "../_components/CotizadorForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo cotizador — TravelOz" };

export default function NuevoCotizadorPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link
        href="/backend/cotizadores"
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Cotizadores
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-neutral-900">Nuevo cotizador</h1>
      <CotizadorForm />
    </div>
  );
}
