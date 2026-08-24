import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth.config";
import { SettingsForm } from "../../web/_components/SettingsForm";
import { WebEditProvider } from "../../web/_components/web-edit-context";

export const metadata: Metadata = {
  title: "Ajustes del cotizador | TravelOz",
  robots: { index: false, follow: false, nocache: true },
};

// Los ajustes salen de SiteSetting: sin caché, para que el vendedor vea el
// texto nuevo apenas el máster lo guarda.
export const dynamic = "force-dynamic";

export default async function AjustesCotizadorPage() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <ShieldCheck className="mb-3 h-12 w-12 opacity-40" />
        <p className="text-sm">Acceso restringido</p>
      </div>
    );
  }

  return (
    // SettingsForm vive bajo /backend/web y da por sentado el contexto de esa
    // sección (modo dev + iframe de preview). Acá no hay preview, así que el
    // provider se monta solo para satisfacer el contrato.
    <WebEditProvider>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link
          href="/backend/cotizador"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al cotizador
        </Link>
        <SettingsForm
          group="cotizador"
          title="Ajustes del cotizador"
          blurb="Los textos y valores con los que arranca toda cotización nueva. En el mensaje, {nombre} se reemplaza por el nombre del cliente y {link} por el link de datos de pasajeros del vendedor; en las condiciones, {vigencia} es la cantidad de horas que vale el link. Las condiciones van una por línea. La foto, el teléfono y el link de cada vendedor se cargan en Perfiles."
        />
      </div>
    </WebEditProvider>
  );
}
