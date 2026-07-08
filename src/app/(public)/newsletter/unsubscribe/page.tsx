// ---------------------------------------------------------------------------
// /newsletter/unsubscribe?email=… — punto de entrada publico de baja.
// Lo dispara el link "Cancelar suscripcion" que va en el footer del email
// de confirmacion y (eventualmente) en cada broadcast. Por seguridad no
// pedimos token: el visitante que abre el email YA esta autenticado por
// tener el link unico con su direccion. Si el parametro email falta o no
// matchea ninguna fila, devolvemos "no encontrado" sin revelar nada.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Cancelar suscripción — TravelOz",
  robots: { index: false, follow: false },
};

type Outcome = "ok" | "already" | "notfound" | "invalid";

async function processUnsubscribe(rawEmail: string): Promise<Outcome> {
  const email = rawEmail.trim().toLowerCase();
  // Validacion minima de email para no aceptar cualquier cosa como param.
  if (!email || !email.includes("@") || email.length > 254) return "invalid";

  const row = await prisma.suscripcionNewsletter.findUnique({
    where: { email },
    select: { id: true, active: true, unsubscribedAt: true },
  });
  if (!row) return "notfound";
  if (row.unsubscribedAt) return "already";

  await prisma.suscripcionNewsletter.update({
    where: { id: row.id },
    data: {
      active: false,
      unsubscribedAt: new Date(),
      // Invalidamos el token de confirmacion si todavia estaba pendiente, asi
      // nadie puede volver a activar la fila apretando un link viejo.
      confirmToken: null,
    },
  });
  return "ok";
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const raw = typeof searchParams.email === "string" ? searchParams.email : "";
  const result = raw ? await processUnsubscribe(raw) : "invalid";

  const copy = {
    ok: {
      title: "Suscripción cancelada",
      body: "Listo. No vas a recibir más emails de newsletter de TravelOz. Si te arrepentís, podés volver a suscribirte desde la página principal cuando quieras.",
    },
    already: {
      title: "Ya estabas dado de baja",
      body: "Tu suscripción ya estaba cancelada. No vas a recibir más emails nuestros.",
    },
    notfound: {
      title: "No encontramos esa dirección",
      body: "No tenemos registrada esa dirección de email. Probablemente nunca te suscribiste, o ya fue borrada.",
    },
    invalid: {
      title: "Link inválido",
      body: "El link no incluye una dirección válida. Si querés darte de baja, escribinos a info@traveloz.com.uy.",
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
