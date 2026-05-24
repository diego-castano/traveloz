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
const DEFAULT_FROM = "TravelOz <no-reply@traveloz.com.uy>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
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
// Templates
// ──────────────────────────────────────────────

export function invitationEmail(opts: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: "Tu acceso a TravelOz",
    text: `Hola ${opts.name},\n\nSe creó tu usuario en TravelOz.\n\nUsuario: ${opts.email}\nContraseña temporal: ${opts.tempPassword}\n\nIngresá en ${opts.loginUrl} y cambiá la contraseña desde "Mi perfil".`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1a1a2e">
        <h2 style="margin:0 0 16px">Bienvenido a TravelOz</h2>
        <p>Hola <strong>${escapeHtml(opts.name)}</strong>, se creó tu acceso al panel.</p>
        <p style="background:#f5f5f8;padding:12px 16px;border-radius:8px;line-height:1.7">
          <strong>Usuario:</strong> ${escapeHtml(opts.email)}<br/>
          <strong>Contraseña temporal:</strong> <code>${escapeHtml(opts.tempPassword)}</code>
        </p>
        <p>Ingresá en <a href="${opts.loginUrl}">${opts.loginUrl}</a> y cambiá tu contraseña desde <em>Mi perfil</em>.</p>
        <p style="color:#888;font-size:12px;margin-top:24px">Si no esperabas este email, ignoralo.</p>
      </div>`,
  };
}

export function passwordResetEmail(opts: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
  return {
    subject: "Recuperá tu contraseña de TravelOz",
    text: `Hola ${opts.name},\n\nRecibimos un pedido para restablecer tu contraseña.\n\nIngresá a este link (válido por ${opts.expiresInMinutes} minutos):\n${opts.resetUrl}\n\nSi no fuiste vos, ignorá este email.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1a1a2e">
        <h2 style="margin:0 0 16px">Restablecer contraseña</h2>
        <p>Hola <strong>${escapeHtml(opts.name)}</strong>, recibimos un pedido para restablecer tu contraseña.</p>
        <p>
          <a href="${opts.resetUrl}"
             style="display:inline-block;background:#8b5cf6;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
            Crear nueva contraseña
          </a>
        </p>
        <p style="color:#666;font-size:13px">Este link vence en ${opts.expiresInMinutes} minutos.</p>
        <p style="color:#888;font-size:12px;margin-top:24px">Si no fuiste vos quien lo solicitó, podés ignorar este email — tu contraseña actual sigue intacta.</p>
      </div>`,
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
