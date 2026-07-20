// ---------------------------------------------------------------------------
// Email branded por marca que reciben los vendedores con cada nuevo lead del
// cotizador. Lleva el logo (o el nombre) de la marca y TODOS los campos que
// completó el usuario, incluidos los custom de cada marca.
//
// Sin imports con alias "@/" a propósito: así lo puede usar tanto el server
// action como un script suelto (tsx) sin configurar paths.
// ---------------------------------------------------------------------------

// Dirección remitente de las notificaciones del cotizador (dominio verificado
// en Resend: app.traveloz.com.uy). El nombre visible es el de la marca → el
// vendedor ve "Club de Mujeres" en el remitente.
export const COTIZADOR_FROM_ADDRESS = "notificaciones@app.traveloz.com.uy";

export function cotizadorFrom(marca: string): string {
  // El display-name no puede romper el header: sin comillas ni saltos.
  const safe = marca.replace(/["\r\n<>]/g, "").trim() || "TravelOz";
  return `${safe} <${COTIZADOR_FROM_ADDRESS}>`;
}

export interface CotizadorLeadEmailOpts {
  marca: string;
  slug: string;
  logoUrl?: string | null;
  nombre: string;
  email: string;
  respuestas: { etiqueta: string; valor: string }[];
  /** Fecha legible del envío (ya formateada). */
  fecha?: string;
}

// Dominio del servicio (el mismo que Railway/Resend). Cambiar acá si migra.
export const SITE_BASE_URL = "https://app.traveloz.com.uy";

// Logo de la plataforma (TravelOz). No usamos header-logo.webp: mismo motivo
// que en email.ts (proxy de Gmail rompe el alpha del webp → fondo negro;
// Outlook no soporta webp).
export const TRAVELOZ_LOGO_URL = `${SITE_BASE_URL}/email-logo.png`;

export function cotizadorLeadEmail(opts: CotizadorLeadEmailOpts): {
  subject: string;
  html: string;
  text: string;
} {
  const accent = "#F43E55";
  const ink = "#23232b";
  const muted = "#8a8f98";
  const marca = escapeHtml(opts.marca);
  const landingUrl = `${SITE_BASE_URL}/${opts.slug}`;
  const landingLabel = escapeHtml(landingUrl.replace(/^https?:\/\//, ""));

  // Marca: logo propio si lo cargaron, si no el nombre en un chip claro.
  const brand = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="${marca}" style="max-height:46px;max-width:240px;height:auto;display:inline-block" />`
    : `<span style="display:inline-block;background:#fff0f2;color:${accent};font-size:16px;font-weight:700;padding:7px 16px;border-radius:999px">${marca}</span>`;

  const filas = opts.respuestas
    .map(
      (r, i) => `
        <tr>
          <td style="padding:11px 0;${i ? "border-top:1px solid #edeef2;" : ""}color:${muted};font-size:13px;line-height:1.4;vertical-align:top;width:42%">${escapeHtml(
            r.etiqueta,
          )}</td>
          <td style="padding:11px 0 11px 16px;${i ? "border-top:1px solid #edeef2;" : ""}color:${ink};font-size:14px;line-height:1.5;vertical-align:top;font-weight:500">${escapeHtml(
            r.valor,
          ).replace(/\n/g, "<br/>")}</td>
        </tr>`,
    )
    .join("");

  const subject = `Nueva cotización — ${opts.marca} · ${opts.nombre}`;
  const preheader = `Nuevo lead de ${opts.nombre} para ${opts.marca}`;

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
        <!-- Plataforma -->
        <tr><td style="padding:24px 28px 0;text-align:center">
          <img src="${TRAVELOZ_LOGO_URL}" alt="TravelOz" height="32" style="height:32px;width:auto;display:inline-block" />
        </td></tr>
        <tr><td style="padding:14px 28px 0"><div style="height:1px;background-color:#eef0f4;line-height:1px">&nbsp;</div></td></tr>
        <!-- Marca + título -->
        <tr><td style="padding:18px 28px 0;text-align:center">
          ${brand}
          <div style="margin-top:12px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${muted}">Nueva solicitud de cotización</div>
        </td></tr>
        <!-- Contacto -->
        <tr><td style="padding:16px 28px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px">
            <tr><td style="padding:14px 16px;line-height:1.6">
              <span style="color:${ink};font-size:16px;font-weight:700">${escapeHtml(opts.nombre)}</span><br/>
              <a href="mailto:${escapeHtml(opts.email)}" style="color:${accent};text-decoration:none;font-size:14px">${escapeHtml(
                opts.email,
              )}</a>
              ${opts.fecha ? `<div style="color:${muted};font-size:12px;margin-top:4px">${escapeHtml(opts.fecha)}</div>` : ""}
              <div style="margin-top:8px;font-size:13px;line-height:1.5">
                <span style="color:${muted}">Enviado desde:</span>
                <a href="${landingUrl}" style="color:${accent};text-decoration:none">${landingLabel}</a>
              </div>
            </td></tr>
          </table>
        </td></tr>
        <!-- Campos -->
        <tr><td style="padding:6px 28px 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 28px;background-color:#f7f8fa;border-top:1px solid #e6e8ee;text-align:center;color:${muted};font-size:12px;line-height:1.6">
          Cotizador <strong style="color:${ink}">${marca}</strong> · TravelOz<br/>
          <a href="${landingUrl}" style="color:${muted};text-decoration:underline">${landingLabel}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Nueva cotización — ${opts.marca}`,
    "",
    `Nombre: ${opts.nombre}`,
    `Email: ${opts.email}`,
    opts.fecha ? `Fecha: ${opts.fecha}` : "",
    "",
    ...opts.respuestas.map((r) => `${r.etiqueta}: ${r.valor}`),
    "",
    `Enviado desde el formulario: ${landingUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
