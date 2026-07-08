/**
 * Email delivery helper — Resend-ready stub.
 *
 * Design intent: when `RESEND_API_KEY` is configured, the helper actually
 * sends mail via Resend's HTTP API. When it isn't (current state — no key
 * yet), the helper logs a rich preview to stdout so dev / staging keep
 * working end-to-end without bouncing on missing infra. The call sites
 * (invitation, password reset, lockout notification) never need to know
 * which mode is active.
 *
 * To enable real delivery, set in env:
 *   RESEND_API_KEY=re_...
 *   EMAIL_FROM="TravelOz <no-reply@traveloz.com.uy>"
 *
 * No `resend` npm dependency yet — we call the REST endpoint directly so the
 * SDK can be added later without changing this file's surface.
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "email" });

const RESEND_API_URL = "https://api.resend.com/emails";
// Remitente por defecto. Usa el subdominio verificado en Resend
// (app.traveloz.com.uy); el apex traveloz.com.uy NO está verificado, así que
// mandar desde ahí hace que Resend rechace el envío. Se puede pisar con
// EMAIL_FROM en el entorno.
const DEFAULT_FROM = "TravelOz <notificaciones@app.traveloz.com.uy>";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /**
   * URL pública para darse de baja. Cuando se pasa, sendEmail además del
   * link en el cuerpo agrega dos headers RFC 8058 al email:
   *   List-Unsubscribe: <mailto:unsub@…?subject=…>, <https://…>
   *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
   * Esto es lo que miran Gmail / Outlook / Yahoo para mostrar el botón
   * "Cancelar suscripción" arriba del email. Si no se pasa, no se
   * agregan headers (los emails transaccionales al admin no califican).
   */
  unsubscribeUrl?: string;
}

export interface SendEmailResult {
  delivered: boolean;
  provider: "resend" | "console";
  id?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = input.from ?? process.env.EMAIL_FROM ?? DEFAULT_FROM;

  // No Resend key yet — log a clear preview so the developer (or the admin
  // testing the flow locally) can copy any one-time link out of the console.
  if (!apiKey) {
    log.warn("email.stub", {
      reason: "RESEND_API_KEY not set — printing email to console",
      to: input.to,
      subject: input.subject,
      from,
      previewText: input.text ?? stripHtml(input.html).slice(0, 500),
    });
    return { delivered: false, provider: "console" };
  }

  const headers: Record<string, string> = {};
  if (input.unsubscribeUrl) {
    // RFC 8058: el formato "mailto:, url" es lo que mejor lo soportan
    // los clientes (algunos ignoran el List-Unsubscribe si solo tiene
    // mailto o solo URL). El POST one-click es opcional pero ayuda a
    // Gmail/Outlook a mostrar el botón de "Cancelar suscripción".
    headers["List-Unsubscribe"] = `<mailto:unsubscribe@traveloz.com.uy>, <${input.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      log.error("email.send.fail", { status: res.status, body, to: input.to });
      return { delivered: false, provider: "resend", error: body };
    }

    const json = (await res.json()) as { id?: string };
    log.info("email.send.ok", { to: input.to, subject: input.subject, id: json.id });
    return { delivered: true, provider: "resend", id: json.id };
  } catch (err) {
    log.error("email.send.exception", err);
    return {
      delivered: false,
      provider: "resend",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ──────────────────────────────────────────────
// Layout branded — todos los emails de plataforma comparten este marco:
// logo de TravelOz arriba, color de marca y footer. Mismo estilo de tabla
// (fondo claro + card blanca) que el email del cotizador, para que la
// identidad sea consistente en toda la mensajería.
// ──────────────────────────────────────────────

const BRAND_ACCENT = "#F43E55";
const BRAND_INK = "#23232b";
const BRAND_MUTED = "#8a8f98";
// Dominio que sirve la app (y el logo del email). Usa el de Railway por
// defecto porque es el asset host confirmado; se puede pisar con APP_URL.
const SITE_BASE_URL = (
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://traveloz-production.up.railway.app"
).replace(/\/+$/, "");
const TRAVELOZ_LOGO_URL = `${SITE_BASE_URL}/header-logo.webp`;
const SITE_LABEL = SITE_BASE_URL.replace(/^https?:\/\//, "");

/** Botón CTA con el color de marca. La URL la arma el caller (ya es segura). */
function ctaButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_ACCENT};color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(
    label,
  )}</a>`;
}

/** Caja gris para destacar datos (credenciales, etc.). */
function infoBox(innerHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;border-radius:12px;margin:4px 0 8px"><tr><td style="padding:14px 16px;color:${BRAND_INK};font-size:14px;line-height:1.7">${innerHtml}</td></tr></table>`;
}

/** Filas etiqueta/valor para listar los campos de un lead. */
function fieldRows(campos: { label: string; value: string }[]): string {
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

function brandedLayout(opts: {
  heading: string;
  bodyHtml: string;
  preheader?: string;
  /**
   * URL pública para que el suscriptor se dé de baja. Se renderea como link
   * discreto en el footer gris del layout. Solo lo agregamos cuando el
   * destinatario es un suscriptor real (newsletter); los emails
   * transaccionales (cambio de contraseña, leads al admin) no lo llevan.
   */
  unsubscribeUrl?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#eef0f4;">
  ${
    opts.preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef0f4;font-size:1px;line-height:1px">${escapeHtml(
          opts.preheader,
        )}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef0f4;padding:24px 12px;font-family:'Helvetica Neue',Arial,sans-serif">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background-color:#ffffff;border:1px solid #e6e8ee;border-radius:16px;overflow:hidden">
        <tr><td style="padding:26px 28px 0;text-align:center">
          <img src="${TRAVELOZ_LOGO_URL}" alt="TravelOz" height="28" style="height:28px;width:auto;display:inline-block" />
        </td></tr>
        <tr><td style="padding:16px 28px 0"><div style="height:2px;background-color:${BRAND_ACCENT};width:40px;margin:0 auto;border-radius:2px;line-height:2px">&nbsp;</div></td></tr>
        <tr><td style="padding:20px 32px 26px">
          <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:${BRAND_INK}">${escapeHtml(
            opts.heading,
          )}</h1>
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background-color:#f7f8fa;border-top:1px solid #e6e8ee;text-align:center;color:${BRAND_MUTED};font-size:12px;line-height:1.6">
          <strong style="color:${BRAND_INK}">TravelOz</strong><br/>
          <a href="${SITE_BASE_URL}" style="color:${BRAND_MUTED};text-decoration:underline">${escapeHtml(
            SITE_LABEL,
          )}</a>
          ${
            opts.unsubscribeUrl
              ? ` · <a href="${opts.unsubscribeUrl}" style="color:${BRAND_MUTED};text-decoration:underline">Cancelar suscripción</a>`
              : ""
          }
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const P = (html: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${BRAND_INK}">${html}</p>`;
const PMUTED = (html: string) =>
  `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${BRAND_MUTED}">${html}</p>`;

// ──────────────────────────────────────────────
// Templates
// ──────────────────────────────────────────────

export function invitationEmail(opts: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const body = `
    ${P(`Hola <strong>${escapeHtml(opts.name)}</strong>, se creó tu acceso al panel de TravelOz.`)}
    ${infoBox(
      `<strong>Usuario:</strong> ${escapeHtml(opts.email)}<br/><strong>Contraseña temporal:</strong> <code style="background:#fff0f2;color:${BRAND_ACCENT};padding:2px 6px;border-radius:5px">${escapeHtml(
        opts.tempPassword,
      )}</code>`,
    )}
    ${P(`Ingresá al panel y cambiá tu contraseña desde <em>Mi perfil</em>.`)}
    <p style="margin:18px 0 0">${ctaButton(opts.loginUrl, "Ingresar al panel")}</p>
    ${PMUTED("Si no esperabas este email, ignoralo.")}`;
  return {
    subject: "Tu acceso a TravelOz",
    text: `Hola ${opts.name},\n\nSe creó tu usuario en TravelOz.\n\nUsuario: ${opts.email}\nContraseña temporal: ${opts.tempPassword}\n\nIngresá en ${opts.loginUrl} y cambiá la contraseña desde "Mi perfil".`,
    html: brandedLayout({ heading: "Bienvenido a TravelOz", bodyHtml: body }),
  };
}

export function passwordResetEmail(opts: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
  const body = `
    ${P(`Hola <strong>${escapeHtml(opts.name)}</strong>, recibimos un pedido para restablecer tu contraseña.`)}
    <p style="margin:18px 0 0">${ctaButton(opts.resetUrl, "Crear nueva contraseña")}</p>
    ${PMUTED(`Este link vence en ${opts.expiresInMinutes} minutos.`)}
    ${PMUTED("Si no fuiste vos quien lo solicitó, podés ignorar este email — tu contraseña actual sigue intacta.")}`;
  return {
    subject: "Recuperá tu contraseña de TravelOz",
    text: `Hola ${opts.name},\n\nRecibimos un pedido para restablecer tu contraseña.\n\nIngresá a este link (válido por ${opts.expiresInMinutes} minutos):\n${opts.resetUrl}\n\nSi no fuiste vos, ignorá este email.`,
    html: brandedLayout({ heading: "Restablecer contraseña", bodyHtml: body }),
  };
}

export function newsletterConfirmEmail(opts: {
  confirmUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const body = `
    ${P("¡Gracias por suscribirte al newsletter de TravelOz! Falta un paso.")}
    <p style="margin:18px 0 0">${ctaButton(opts.confirmUrl, "Confirmar suscripción")}</p>
    ${PMUTED("Si no fuiste vos, ignorá este email — no te vamos a escribir. Si querés, podés darte de baja sin confirmar desde acá.")}`;
  return {
    subject: "Confirmá tu suscripción a TravelOz",
    text: `¡Gracias por suscribirte!\n\nPara confirmar tu suscripción al newsletter de TravelOz, abrí este link:\n${opts.confirmUrl}\n\nSi no fuiste vos, ignorá este email — no te vamos a escribir.\n\nPara cancelar sin confirmar: ${opts.unsubscribeUrl}`,
    html: brandedLayout({
      heading: "Confirmá tu suscripción",
      bodyHtml: body,
      unsubscribeUrl: opts.unsubscribeUrl,
    }),
  };
}

// ── Avisos de seguridad de la cuenta (al propio usuario) ────────────────

export function passwordChangedEmail(opts: {
  name: string;
  byAdmin: boolean;
}): { subject: string; html: string; text: string } {
  const what = opts.byAdmin
    ? "un administrador restableció la contraseña de tu cuenta"
    : "tu contraseña fue cambiada";
  const warn = opts.byAdmin
    ? "Si no esperabas este cambio, escribile a un administrador de inmediato."
    : "Si no fuiste vos quien la cambió, contactá de inmediato a un administrador — tu cuenta podría estar comprometida.";
  const body = `
    ${P(`Hola <strong>${escapeHtml(opts.name)}</strong>, te confirmamos que ${what} en el panel de TravelOz.`)}
    ${P("Si reconocés este cambio, no tenés que hacer nada.")}
    ${PMUTED(warn)}`;
  return {
    subject: "Tu contraseña de TravelOz cambió",
    text: `Hola ${opts.name},\n\nTe confirmamos que ${what} en el panel de TravelOz.\n\n${warn}`,
    html: brandedLayout({ heading: "Tu contraseña cambió", bodyHtml: body }),
  };
}

export function pinChangedEmail(opts: {
  name: string;
  action: "set" | "clear";
  byAdmin: boolean;
}): { subject: string; html: string; text: string } {
  const actor = opts.byAdmin ? "Un administrador" : "Vos";
  const what =
    opts.action === "clear"
      ? `${actor === "Vos" ? "Eliminaste" : "eliminó"} el PIN de acceso de tu cuenta`
      : `${actor === "Vos" ? "Configuraste" : "configuró"} un nuevo PIN de acceso para tu cuenta`;
  const phrase = opts.byAdmin ? `Un administrador ${what.toLowerCase()}` : what;
  const subject =
    opts.action === "clear"
      ? "Se eliminó tu PIN de acceso"
      : "Tu PIN de acceso de TravelOz cambió";
  const warn =
    "Si no reconocés este cambio, contactá a un administrador — el PIN permite ingresar al panel.";
  const body = `
    ${P(`Hola <strong>${escapeHtml(opts.name)}</strong>. ${escapeHtml(phrase)}.`)}
    ${PMUTED(warn)}`;
  return {
    subject,
    text: `Hola ${opts.name},\n\n${phrase}.\n\n${warn}`,
    html: brandedLayout({ heading: subject, bodyHtml: body }),
  };
}

// ── Aviso interno de nuevo lead (a las casillas configuradas) ───────────

export function leadNotificationEmail(opts: {
  tipo: string;
  campos: { label: string; value: string }[];
  origen?: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `Nuevo lead — ${opts.tipo}`;
  const body = `
    ${P(`Llegó una nueva consulta desde el formulario <strong>${escapeHtml(opts.tipo)}</strong> del sitio.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${fieldRows(
      opts.campos,
    )}</table>
    ${
      opts.origen
        ? PMUTED(`Origen: ${escapeHtml(opts.origen)}`)
        : ""
    }`;
  const text = [
    subject,
    "",
    ...opts.campos
      .filter((c) => c.value != null && String(c.value).trim() !== "")
      .map((c) => `${c.label}: ${c.value}`),
    opts.origen ? `\nOrigen: ${opts.origen}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    subject,
    text,
    html: brandedLayout({
      heading: `Nuevo lead · ${opts.tipo}`,
      bodyHtml: body,
      preheader: opts.campos.find((c) => c.label.toLowerCase() === "nombre")?.value,
    }),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
