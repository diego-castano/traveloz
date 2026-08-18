// ---------------------------------------------------------------------------
// /backend/datos/pagos/[id] — un registro de la bóveda en su propia página.
//
// Es el deep-link del email de aviso al vendedor, igual que en pasajeros. Acá
// no hace falta bifurcar por rol: getPagoMeta ya resuelve el alcance
// (dueño-o-ADMIN) y devuelve null para cualquier otro, sin confirmar siquiera
// que el registro exista.
//
// De esta página NO sale ni un dígito de la tarjeta: la cabecera es titular,
// emisor, últimos 4 y fechas. El número vive detrás del segundo factor.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { auth } from "@/lib/auth.config";
import { getPagoMeta } from "@/actions/datos-boveda.actions";
import { PagoAbrirButton } from "../../_components/PagoAbrirButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Datos de pago — TravelOz" };

const fechaHora = new Intl.DateTimeFormat("es-UY", {
  dateStyle: "medium",
  timeStyle: "short",
});

const ESTADO_TEXTO: Record<string, string> = {
  DISPONIBLE: "Sin abrir — los datos siguen en la bóveda.",
  VISTO: "Ya se abrió al menos una vez. Sigue disponible hasta que venza.",
  VENCIDO: "Pasaron las 72 horas: los datos ya no se pueden abrir.",
  PURGADO: "Los datos se borraron. Queda el registro, no la tarjeta.",
};

export default async function PagoPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const esAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const meta = await getPagoMeta(params.id);
  if (!meta) notFound();

  const abrible = meta.estado === "DISPONIBLE" || meta.estado === "VISTO";

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        {esAdmin && (
          <Link
            href="/backend/datos/pagos"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al registro
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">{meta.titular}</h1>
        <p className="mt-0.5 font-mono text-[13px] tabular-nums text-neutral-500">
          {meta.emisor ?? "Tarjeta"} •••• {meta.ultimos4}
        </p>
      </div>

      <div className="rounded-[12px] border border-neutral-200 bg-white p-5">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <Dato label="Recibida" valor={fechaHora.format(new Date(meta.createdAt))} />
          <Dato label="Se borra" valor={fechaHora.format(new Date(meta.expiraAt))} />
          <Dato
            label="Primera apertura"
            valor={meta.vistoAt ? fechaHora.format(new Date(meta.vistoAt)) : "Todavía nadie"}
          />
          <Dato label="Link del vendedor" valor={meta.vendedorEmail} />
        </dl>

        <p className="mt-4 border-t border-neutral-100 pt-4 text-[13px] text-neutral-600">
          {ESTADO_TEXTO[meta.estado] ?? ""}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PagoAbrirButton pagoId={meta.id} disabled={!abrible} />
          {!abrible && (
            <span className="text-[12.5px] text-neutral-500">
              Pedile al pasajero que cargue los datos de nuevo con el link.
            </span>
          )}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-[12px] border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-violet-900">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Abrir estos datos pide tu PIN o tu contraseña y queda registrado en la auditoría con
        tu nombre, la fecha y la tarjeta que abriste.
      </p>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex gap-2 text-[12.5px]">
      <dt className="shrink-0 text-neutral-400">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium text-neutral-800">{valor}</dd>
    </div>
  );
}
