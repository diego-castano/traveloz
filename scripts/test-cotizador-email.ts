// ---------------------------------------------------------------------------
// Test manual de los emails de notificación del cotizador.
//
// Manda un email de ejemplo POR MARCA a un destinatario de prueba, con datos
// simulados que incluyen los campos custom de cada marca, para revisar el
// diseño y cómo llegan los campos.
//
// Uso:  RESEND_API_KEY=re_... npx tsx scripts/test-cotizador-email.ts [email]
//   (o con .env.local cargado y el destino por defecto diegothx@me.com)
// ---------------------------------------------------------------------------

import { cotizadorLeadEmail, cotizadorFrom, COTIZADOR_FROM_ADDRESS } from "../src/lib/cotizador-email";

const TO = process.argv[2] || "diegothx@me.com";

type Caso = {
  marca: string;
  slug: string;
  logoUrl?: string | null;
  nombre: string;
  email: string;
  respuestas: { etiqueta: string; valor: string }[];
};

const CASOS: Caso[] = [
  {
    marca: "Club de Mujeres",
    slug: "club-de-mujeres",
    logoUrl: null, // cuando subas el logo de la marca aparece acá
    nombre: "María Rodríguez",
    email: "maria.test@example.com",
    respuestas: [
      { etiqueta: "Teléfono", valor: "+598 99 123 456" },
      { etiqueta: "Ciudad de destino", valor: "Punta Cana, República Dominicana" },
      { etiqueta: "Fechas (salida y regreso)", valor: "10 jul 2026 → 20 jul 2026" },
      { etiqueta: "Adultos", valor: "2" },
      { etiqueta: "Niños", valor: "1" },
      { etiqueta: "Tipo de compra", valor: "1ra compra" },
      { etiqueta: "Elegí tu beneficio de bienvenida", valor: "Equipaje en bodega" },
      { etiqueta: "Observaciones", valor: "Fechas flexibles +/- 3 días. Buscamos all inclusive." },
      { etiqueta: "Deseo recibir promociones y ofertas", valor: "Sí" },
    ],
  },
  {
    marca: "Hospital Británico",
    slug: "hospital-britanico",
    logoUrl: null,
    nombre: "Juan Methol",
    email: "juan.test@example.com",
    respuestas: [
      { etiqueta: "Soy", valor: "Socio del Hospital Británico" },
      { etiqueta: "Teléfono", valor: "+598 98 765 432" },
      { etiqueta: "Ciudad de destino", valor: "Madrid, España" },
      { etiqueta: "Fechas (salida y regreso)", valor: "5 sep 2026 → 18 sep 2026" },
      { etiqueta: "Adultos", valor: "2" },
      { etiqueta: "Observaciones", valor: "Preferimos vuelos directos. Viaje de aniversario." },
    ],
  },
];

async function enviar(apiKey: string, caso: Caso) {
  const fecha = new Intl.DateTimeFormat("es-UY", { dateStyle: "long", timeStyle: "short" }).format(
    new Date(),
  );
  const tmpl = cotizadorLeadEmail({ ...caso, fecha });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: cotizadorFrom(caso.marca),
      to: TO,
      reply_to: caso.email,
      subject: `[TEST] ${tmpl.subject}`,
      html: tmpl.html,
      text: tmpl.text,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`✗ ${caso.marca}: ${res.status} — ${body}`);
    return false;
  }
  console.log(`✓ ${caso.marca} → ${TO} (id ${JSON.parse(body).id})`);
  return true;
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Falta RESEND_API_KEY en el entorno.");
    process.exit(1);
  }
  console.log(`Remitente: ${COTIZADOR_FROM_ADDRESS} · destino: ${TO}\n`);
  let ok = true;
  for (const c of CASOS) ok = (await enviar(apiKey, c)) && ok;
  process.exit(ok ? 0 : 1);
}

main();
