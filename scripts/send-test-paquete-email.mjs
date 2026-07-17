/**
 * Envía UN email de prueba del template de "consulta de paquete" a la casilla
 * que le pases por argumento, para revisar el render en un cliente real.
 *
 *   node scripts/send-test-paquete-email.mjs destinatario@ejemplo.com
 *
 * Requisitos:
 *   - RESEND_API_KEY en el entorno (falla claro si falta).
 *   - un destinatario como primer argumento (falla claro si falta).
 *
 * No toca la base de datos ni importa nada de la app: el HTML se arma acá con
 * una COPIA MÍNIMA del builder `paqueteConsultaEmail` de src/lib/email.ts.
 * Si cambia el template en la app, actualizá también esta copia (es solo para
 * inspección visual, no es la fuente de verdad).
 *
 * ESM puro (sin tsx / sin alias @/) para poder correrlo suelto.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "TravelOz <notificaciones@app.traveloz.com.uy>";

// ── Copia del sistema visual del template (ver src/lib/email.ts) ──────────
const BRAND_ACCENT = "#F43E55";
const BRAND_INK = "#23232b";
const BRAND_MUTED = "#8a8f98";
const SITE_BASE_URL = "https://app.traveloz.com.uy";
const TRAVELOZ_LOGO_URL = `${SITE_BASE_URL}/header-logo.webp`;
const SITE_LABEL = SITE_BASE_URL.replace(/^https?:\/\//, "");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fieldRows(campos) {
  return campos
    .filter((c) => c.value != null && String(c.value).trim() !== "")
    .map(
      (c, i) => `
        <tr>
          <td style="padding:10px 0;${i ? "border-top:1px solid #edeef2;" : ""}color:${BRAND_MUTED};font-size:13px;line-height:1.4;vertical-align:top;width:38%">${escapeHtml(
            c.label,
          )}</td>
          <td style="padding:10px 0 10px 16px;${i ? "border-top:1px solid #edeef2;" : ""}color:${BRAND_INK};font-size:14px;line-height:1.5;vertical-align:top;font-weight:500">${escapeHtml(
            String(c.value),
          ).replace(/\n/g, "<br/>")}</td>
        </tr>`,
    )
    .join("");
}

function paqueteCta(url, label, bg) {
  return `<a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;line-height:1;text-align:center">${escapeHtml(
    label,
  )}</a>`;
}

// COPIA de paqueteConsultaEmail (src/lib/email.ts) — mantener en sync.
function paqueteConsultaEmail(opts) {
  const titulo = escapeHtml(opts.tituloPaquete);
  const nombre = escapeHtml(opts.nombre);
  const telHref = opts.telefono.replace(/[^\d+]/g, "");
  const telText = escapeHtml(opts.telefono);
  const emailAddr = opts.email?.trim() || "";

  const subject = `Nueva consulta · ${opts.tituloPaquete} — ${opts.nombre}`;
  const preheader = `${opts.nombre} consultó por ${opts.tituloPaquete}`;

  const contactLines = [
    `<div style="color:${BRAND_INK};font-size:16px;font-weight:700;line-height:1.4">${nombre}</div>`,
    emailAddr
      ? `<a href="mailto:${escapeHtml(emailAddr)}" style="color:${BRAND_ACCENT};text-decoration:none;font-size:14px;display:inline-block;margin-top:3px">${escapeHtml(
          emailAddr,
        )}</a><br/>`
      : "",
    `<a href="tel:${escapeHtml(telHref)}" style="color:${BRAND_ACCENT};text-decoration:none;font-size:14px;display:inline-block;margin-top:3px">${telText}</a>`,
    opts.fecha
      ? `<div style="color:${BRAND_MUTED};font-size:12px;margin-top:8px">${escapeHtml(opts.fecha)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const filas = fieldRows(opts.campos);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#eef0f4;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef0f4;font-size:1px;line-height:1px">${escapeHtml(
    preheader,
  )}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef0f4;padding:24px 12px;font-family:'Helvetica Neue',Arial,sans-serif">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background-color:#ffffff;border:1px solid #e6e8ee;border-radius:16px;overflow:hidden">
        <tr><td style="padding:26px 28px 0;text-align:center">
          <img src="${TRAVELOZ_LOGO_URL}" alt="TravelOz" height="28" style="height:28px;width:auto;display:inline-block" />
        </td></tr>
        <tr><td style="padding:16px 28px 0"><div style="height:2px;background-color:${BRAND_ACCENT};width:40px;margin:0 auto;border-radius:2px;line-height:2px">&nbsp;</div></td></tr>
        <tr><td style="padding:22px 32px 0;text-align:center">
          <div style="font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:${BRAND_MUTED};font-weight:600">Nueva consulta de paquete</div>
          <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:${BRAND_INK};font-weight:700">${titulo}</h1>
        </td></tr>
        <tr><td style="padding:20px 32px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px">
            <tr><td style="padding:16px 18px;line-height:1.5">${contactLines}</td></tr>
          </table>
        </td></tr>
        ${
          filas
            ? `<tr><td style="padding:8px 32px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
        </td></tr>`
            : ""
        }
        <tr><td style="padding:24px 32px 28px">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
            <tr>
              <td style="padding:0 5px 0 0;width:50%" align="center">${paqueteCta(
                opts.sitioUrl,
                "Ver paquete en el sitio",
                BRAND_ACCENT,
              )}</td>
              <td style="padding:0 0 0 5px;width:50%" align="center">${paqueteCta(
                opts.adminUrl,
                "Ver en portal de vendedores",
                BRAND_INK,
              )}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 28px;background-color:#f7f8fa;border-top:1px solid #e6e8ee;text-align:center;color:${BRAND_MUTED};font-size:12px;line-height:1.6">
          <strong style="color:${BRAND_INK}">TravelOz</strong><br/>
          <a href="${SITE_BASE_URL}" style="color:${BRAND_MUTED};text-decoration:underline">${escapeHtml(
            SITE_LABEL,
          )}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Nueva consulta de paquete — ${opts.tituloPaquete}`,
    "",
    `Nombre: ${opts.nombre}`,
    emailAddr ? `Email: ${emailAddr}` : "",
    `Teléfono: ${opts.telefono}`,
    opts.fecha ? `Fecha: ${opts.fecha}` : "",
    "",
    ...opts.campos
      .filter((c) => c.value != null && String(c.value).trim() !== "")
      .map((c) => `${c.label}: ${c.value}`),
    "",
    `Ver paquete en el sitio: ${opts.sitioUrl}`,
    `Ver en portal de vendedores: ${opts.adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

// ── Runner ────────────────────────────────────────────────────────────────
async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error(
      "Falta el destinatario.\n  Uso: node scripts/send-test-paquete-email.mjs destinatario@ejemplo.com",
    );
    process.exit(1);
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Falta RESEND_API_KEY en el entorno. Exportala y reintentá.");
    process.exit(1);
  }

  // Datos de ejemplo realistas. El slug "ushuaia" está hardcodeado a propósito
  // para que los botones apunten a un paquete real de muestra.
  const slug = "ushuaia";
  const idEjemplo = "pkg_ushuaia_demo"; // id de muestra para la URL admin
  const tpl = paqueteConsultaEmail({
    tituloPaquete: "Ushuaia",
    nombre: "Elizabeth Castro",
    email: "elizabeth.castro@example.com",
    telefono: "+598 099966484",
    fecha: "15 de julio de 2026, 15:42",
    sitioUrl: `${SITE_BASE_URL}/destinos/argentina/${slug}`,
    adminUrl: `${SITE_BASE_URL}/backend/dashboard?vista=vendedor&paquete=pkg-ushuaia-demo`,
    campos: [
      { label: "Destino", value: "Ushuaia" },
      { label: "Fechas", value: "19/09/2026 → 26/09/2026" },
      { label: "Pasajeros", value: "2 adultos · 1 niños · 0 infantes" },
      { label: "Preferencia de contacto", value: "WHATSAPP" },
      {
        label: "Comentarios",
        value:
          "Hola, somos una familia y viajamos con un menor de 8 años.\n" +
          "Queremos saber si el paquete incluye la excursión al Canal Beagle.\n" +
          "¿Tienen opción de habitación triple? ¡Gracias!",
      },
    ],
  });

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend respondió ${res.status}:\n${body}`);
    process.exit(1);
  }
  const json = await res.json().catch(() => ({}));
  console.log(`OK — email enviado a ${to} (id: ${json.id ?? "?"})`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
