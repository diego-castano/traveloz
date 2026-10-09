import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { bajaSuscripcion } from "@/actions/collection/newsletter.actions";
import { ResultadoNewsletter } from "@/components/collection/sitio/consulta/ResultadoNewsletter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Newsletter", robots: { index: false, follow: false } };

// Enlace de baja de los mails del newsletter. Abrir el link NO da de baja:
// los antivirus de correo abren los enlaces para revisarlos y darían de baja a
// gente que no lo pidió. La baja se confirma con el botón (POST).
export default function BajaNewsletter({
  searchParams,
}: {
  searchParams: { token?: string; hecho?: string; error?: string };
}) {
  if (searchParams.hecho === "1") {
    return (
      <ResultadoNewsletter
        ok
        titulo="Te diste de baja"
        texto="No te vamos a mandar más novedades. Si cambiás de idea, te podés suscribir de nuevo desde el sitio."
      />
    );
  }
  if (searchParams.error === "1") {
    return (
      <ResultadoNewsletter
        ok={false}
        titulo="No pudimos darte de baja"
        texto="El enlace no es válido o ya se usó. Escribinos y lo resolvemos a mano."
      />
    );
  }

  const token = searchParams.token ?? "";

  async function confirmarBaja() {
    "use server";
    const r = await bajaSuscripcion(token);
    redirect(r.ok ? "/newsletter/baja?hecho=1" : "/newsletter/baja?error=1");
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-[13px] uppercase tracking-[0.12em] text-col-slate">Newsletter</p>
      <h1 className="mt-4 font-col-display text-[40px] font-light leading-tight text-col-ink">
        ¿Te damos de baja?
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-col-slate">
        Vas a dejar de recibir las cartas de Traveloz Collection. Podés volver a suscribirte cuando quieras.
      </p>
      <form action={confirmarBaja} className="mt-10">
        <button
          type="submit"
          className="inline-flex h-12 items-center bg-col-ink px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-col-base transition-opacity duration-200 hover:opacity-90"
        >
          Confirmar baja
        </button>
      </form>
    </main>
  );
}
