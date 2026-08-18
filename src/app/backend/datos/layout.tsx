// ---------------------------------------------------------------------------
// /backend/datos — cabecera + solapas del módulo de Pasajeros y Pagos.
//
// El layout es un server component por una razón concreta: las páginas
// /pasajeros/[id] y /pagos/[id] son los deep-links que salen en los emails al
// VENDEDOR (datos-publico.actions.ts los arma con esas rutas). El vendedor
// llega hasta acá con una sesión válida pero sin ser admin, así que las
// solapas (que cuentan TODO el equipo) no se le dibujan: ve solo el detalle.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { auth } from "@/lib/auth.config";
import { DatosTabs } from "./_components/DatosTabs";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pasajeros y pagos — TravelOz" };

export default async function DatosLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const esAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  if (!esAdmin) {
    // Vendedor con un deep-link: el detalle se defiende solo (cada action
    // valida dueño-o-admin). Sin cabecera de módulo ni solapas globales.
    return <div className="h-full min-h-0 overflow-y-auto bg-neutral-50/40">{children}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <DatosTabs />
      <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/40">{children}</main>
    </div>
  );
}
