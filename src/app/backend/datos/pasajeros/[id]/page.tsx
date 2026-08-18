// ---------------------------------------------------------------------------
// /backend/datos/pasajeros/[id] — un envío en su propia página.
//
// Es el deep-link que sale en el email de aviso al vendedor
// (datos-publico.actions.ts arma la URL con esta ruta), así que tiene que
// abrir para DOS roles distintos:
//   • ADMIN     → getEnvioAdmin: cualquier envío del equipo.
//   • VENDEDOR  → getMiEnvioDetalle: solo los suyos, con el scope duro que ya
//                 vive en datos-vendedor.actions (el where filtra por su id).
//
// Ninguna de las dos ramas afloja el alcance de la otra: el admin no pasa por
// la action del vendedor y el vendedor jamás llama a una action de admin.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth.config";
import { getEnvioAdmin, marcarVistoAdmin } from "@/actions/datos-admin.actions";
import { getMiEnvioDetalle } from "@/actions/datos-vendedor.actions";
import { EnvioDetalleView, type EnvioVista } from "../../_components/EnvioDetalleView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Envío de pasajeros — TravelOz" };

export default async function EnvioPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const esAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  let envio: EnvioVista | null = null;
  let vendedor: { nombre: string; email: string } | null = null;

  if (esAdmin) {
    const detalle = await getEnvioAdmin(params.id);
    if (detalle) {
      envio = detalle;
      vendedor = { nombre: detalle.vendedorNombre, email: detalle.vendedorEmail };
      // Abrirlo lo marca como leído, igual que en el drawer.
      await marcarVistoAdmin(params.id);
    }
  } else {
    // getMiEnvioDetalle ya sella vistoAt por su cuenta. Tira si el rol no
    // tiene acceso (MARKETING): para el visitante es lo mismo que no existir,
    // así que cae en el notFound de abajo en vez de reventar el boundary.
    try {
      envio = await getMiEnvioDetalle(params.id);
    } catch {
      envio = null;
    }
  }

  if (!envio) notFound();

  const titular = envio.pasajeros[0];

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div>
        {esAdmin && (
          <Link
            href="/backend/datos/pasajeros"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a la bandeja
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">
          {titular ? `${titular.nombres} ${titular.apellidos}`.trim() : "Envío de pasajeros"}
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          {envio.pasajeros.length}{" "}
          {envio.pasajeros.length === 1 ? "pasajero" : "pasajeros"}
          {envio.destino ? ` · ${envio.destino}` : ""}
        </p>
      </div>

      <EnvioDetalleView envio={envio} vendedor={vendedor} />
    </div>
  );
}
