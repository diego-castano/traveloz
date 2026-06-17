// ---------------------------------------------------------------------------
// /newsletter/confirm?token=… — paso final del double opt-in (F4).
// El link del email de confirmación cae acá: activamos la suscripción y
// mostramos el resultado. Confirmar por GET es aceptable para un opt-in.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Confirmar suscripción — TravelOz",
  robots: { index: false, follow: false },
};

async function confirmToken(token: string): Promise<"ok" | "already" | "invalid"> {
  const row = await prisma.suscripcionNewsletter.findUnique({
    where: { confirmToken: token },
    select: { id: true, active: true },
  });
  if (!row) return "invalid";
  if (row.active) return "already";
  await prisma.suscripcionNewsletter.update({
    where: { id: row.id },
    // Limpiamos el token (un solo uso) y marcamos la confirmación.
    data: { active: true, confirmedAt: new Date(), confirmToken: null },
  });
  return "ok";
}

export default async function NewsletterConfirmPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const result = token ? await confirmToken(token) : "invalid";

  const copy = {
    ok: {
      title: "¡Suscripción confirmada!",
      body: "Listo, ya estás en la lista de TravelOz. Te vamos a escribir con novedades y ofertas.",
    },
    already: {
      title: "Ya estabas suscripto",
      body: "Tu suscripción ya estaba confirmada. ¡Gracias!",
    },
    invalid: {
      title: "Link inválido o vencido",
      body: "No pudimos confirmar la suscripción. Probá suscribirte de nuevo desde la página principal.",
    },
  }[result];

  return (
    <section style={{ padding: "120px 20px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: 520,
          textAlign: "center",
          background: "#fff",
          borderRadius: 16,
          padding: "40px 32px",
          boxShadow: "0 8px 40px rgba(26,26,46,0.08)",
        }}
      >
        <h1 style={{ fontSize: 26, margin: "0 0 12px", color: "#1a1a2e" }}>{copy.title}</h1>
        <p style={{ color: "#555", lineHeight: 1.6, margin: "0 0 28px" }}>{copy.body}</p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#e3001b",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
