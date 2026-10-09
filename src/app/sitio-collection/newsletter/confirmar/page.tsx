import type { Metadata } from "next";
import { confirmarSuscripcion } from "@/actions/collection/newsletter.actions";
import { ResultadoNewsletter } from "@/components/collection/sitio/consulta/ResultadoNewsletter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Newsletter", robots: { index: false, follow: false } };

// Enlace del mail de confirmación (doble opt-in).
export default async function ConfirmarNewsletter({ searchParams }: { searchParams: { token?: string } }) {
  const r = await confirmarSuscripcion(searchParams.token ?? "");
  return r.ok ? (
    <ResultadoNewsletter ok titulo="Ya estás en la lista" texto="Te vamos a escribir pocas veces al año: un destino, un relato y una idea para tu próximo viaje." />
  ) : (
    <ResultadoNewsletter ok={false} titulo="No pudimos confirmar" texto={`${r.error} Si el enlace es viejo, suscribite de nuevo desde el sitio y te mandamos uno nuevo.`} />
  );
}
