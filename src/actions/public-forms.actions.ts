"use server";

// ---------------------------------------------------------------------------
// Public site form server actions — persist submissions to Prisma.
//
// Each action mirrors React's useFormState contract:
//   { ok: boolean; message: string }
//
// On success: the row is created with estado=NUEVO so the admin /backend/leads
// inbox can pick it up.
//
// Hardening (todas las actions):
//   - Honeypot: input invisible name="website" — si viene con valor es un bot
//     y devolvemos un éxito falso sin tocar la DB (rechazo silencioso).
//   - Rate-limit: 5 envíos/hora/IP por formulario (src/lib/rate-limit.ts).
//   - Validación zod server-side (los inputs HTML solo cubren al navegador).
//
// File uploads (work-with-us CV) go to the S3 bucket via uploadBuffer.
//
// Cada envío dispara además un aviso por email a las casillas configuradas en
// el setting `notificaciones_leads_emails` (panel /backend/web/notificaciones).
// El envío es best-effort: si falla o no hay destinos, el lead igual queda
// guardado. Los leads del cotizador por marca tienen su propia notificación.
// ---------------------------------------------------------------------------

import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { uploadBuffer } from "@/lib/storage";
import { checkFormRate } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { sendEmail, newsletterConfirmEmail, leadNotificationEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/seo";

const log = logger.child({ module: "public-forms.actions" });

export type FormResult = {
  ok: boolean;
  message: string;
};

const SUCCESS_MSG =
  "¡Mensaje enviado con éxito! Te contactaremos a la brevedad.";

function s(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function n(formData: FormData, key: string): number {
  const v = s(formData, key);
  if (!v) return 0;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

function date(formData: FormData, key: string): Date | null {
  const v = s(formData, key);
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Captures the URL the form was submitted from so the admin can know which
 * page generated the lead. Falls back to "unknown" if headers aren't set.
 */
function captureOrigen(): string {
  try {
    const h = headers();
    return h.get("referer") ?? h.get("x-pathname") ?? "unknown";
  } catch {
    return "unknown";
  }
}

function clientIp(): string | null {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared guards + validators
// ---------------------------------------------------------------------------

const RATE_LIMIT_MSG =
  "Recibimos varios envíos desde tu conexión. Esperá un rato y volvé a intentar.";

/**
 * Honeypot + rate-limit. Devuelve un FormResult si hay que cortar acá
 * (bot o exceso de envíos) o null para seguir con la action.
 */
function guardForm(
  scope: string,
  formData: FormData,
  successMessage: string = SUCCESS_MSG,
): FormResult | null {
  // Bots completan todos los campos; humanos no ven este input. Devolvemos
  // éxito falso para no darle señal al bot de que fue detectado.
  if (s(formData, "website")) {
    log.warn(`honeypot triggered on ${scope}`);
    return { ok: true, message: successMessage };
  }
  const rate = checkFormRate(scope, clientIp());
  if (!rate.allowed) {
    return { ok: false, message: RATE_LIMIT_MSG };
  }
  return null;
}

const emailSchema = z
  .string()
  .trim()
  .min(1, "Ingresá tu email.")
  .max(254, "El email es demasiado largo.")
  .email("Ingresá un email válido.");

const nombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá tu nombre.")
  .max(200, "El nombre es demasiado largo.");

const telefonoSchema = z
  .string()
  .trim()
  .max(50, "El teléfono es demasiado largo.")
  .nullable();

const comentariosSchema = z
  .string()
  .trim()
  .max(5000, "Los comentarios no pueden superar los 5000 caracteres.")
  .nullable();

const codigoPaisSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{1,6}$/, "Código de país inválido.")
  .nullable();

/** Convierte el primer issue de zod en un FormResult amigable. */
function zodError(error: z.ZodError): FormResult {
  const message = error.issues[0]?.message ?? "Revisá los datos ingresados.";
  return { ok: false, message };
}

// ---------------------------------------------------------------------------
// Notificación de lead a las casillas internas configuradas en SiteSetting
// `notificaciones_leads_emails` (lista separada por comas/espacios). Best-effort:
// nunca propaga errores ni bloquea el guardado del lead.
// ---------------------------------------------------------------------------

function parseEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
    ),
  );
}

async function notifyLead(opts: {
  /** Key de SiteSetting con el/los email(s) destino de este formulario. */
  settingKey: string;
  tipo: string;
  campos: { label: string; value: string }[];
  replyTo?: string | null;
  origen?: string | null;
}): Promise<void> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: opts.settingKey },
      select: { value: true },
    });
    const destinos = parseEmails(setting?.value);
    if (destinos.length === 0) return;

    const tpl = leadNotificationEmail({
      tipo: opts.tipo,
      campos: opts.campos,
      origen: opts.origen ?? null,
    });
    await sendEmail({
      to: destinos,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      replyTo: opts.replyTo ?? undefined,
    });
  } catch (err) {
    log.error(`notifyLead (${opts.tipo}) failed`, err);
  }
}

// ---------------------------------------------------------------------------
// /contact form → MensajeContacto
// ---------------------------------------------------------------------------
const contactSchema = z.object({
  nombre: nombreSchema,
  email: emailSchema,
  telefono: telefonoSchema,
  comentarios: z
    .string()
    .trim()
    .min(1, "Contanos en qué te podemos ayudar.")
    .max(5000, "Los comentarios no pueden superar los 5000 caracteres."),
});

export async function submitContactForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const guard = guardForm("contact", formData);
    if (guard) return guard;

    const parsed = contactSchema.safeParse({
      nombre: s(formData, "nombre") ?? "",
      email: s(formData, "email") ?? "",
      telefono: s(formData, "telefono"),
      comentarios: s(formData, "comentarios") ?? "",
    });
    if (!parsed.success) return zodError(parsed.error);

    await prisma.mensajeContacto.create({ data: parsed.data });
    await notifyLead({
      settingKey: "notificaciones_email_contacto",
      tipo: "Contacto",
      replyTo: parsed.data.email,
      origen: captureOrigen(),
      campos: [
        { label: "Nombre", value: parsed.data.nombre },
        { label: "Email", value: parsed.data.email },
        { label: "Teléfono", value: parsed.data.telefono ?? "" },
        { label: "Mensaje", value: parsed.data.comentarios },
      ],
    });
    return { ok: true, message: SUCCESS_MSG };
  } catch (err) {
    log.error("submitContactForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// /work-with-us form → Postulacion + uploaded CV
// ---------------------------------------------------------------------------
const workSchema = z.object({
  nombre: nombreSchema,
  email: emailSchema,
  telefono: telefonoSchema,
  motivacion: z
    .string()
    .trim()
    .min(1, "Contanos tu motivación.")
    .max(5000, "La motivación no puede superar los 5000 caracteres."),
});

const WORK_SUCCESS_MSG =
  "¡Recibimos tu postulación! Vamos a revisarla y te contactamos pronto.";

export async function submitWorkWithUsForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const guard = guardForm("work-with-us", formData, WORK_SUCCESS_MSG);
    if (guard) return guard;

    const parsed = workSchema.safeParse({
      nombre: s(formData, "nombre") ?? "",
      email: s(formData, "email") ?? "",
      telefono: s(formData, "telefono"),
      motivacion: s(formData, "motivacion") ?? "",
    });
    if (!parsed.success) return zodError(parsed.error);

    const cv = formData.get("cv") as File | null;
    if (!cv || cv.size === 0) {
      return { ok: false, message: "Adjuntá tu CV (PDF o DOC)." };
    }
    if (cv.size > 10 * 1024 * 1024) {
      return { ok: false, message: "El CV no puede superar los 10 MB." };
    }

    const buffer = Buffer.from(await cv.arrayBuffer());
    const uploaded = await uploadBuffer({
      buffer,
      contentType: cv.type || "application/octet-stream",
      folder: "leads/cv",
      filename: cv.name,
      metadata: { source: "work-with-us" },
    });

    await prisma.postulacion.create({
      data: {
        ...parsed.data,
        cvUrl: uploaded.url,
        cvFilename: cv.name,
      },
    });
    await notifyLead({
      settingKey: "notificaciones_email_trabaja",
      tipo: "Trabajá con nosotros",
      replyTo: parsed.data.email,
      origen: captureOrigen(),
      campos: [
        { label: "Nombre", value: parsed.data.nombre },
        { label: "Email", value: parsed.data.email },
        { label: "Teléfono", value: parsed.data.telefono ?? "" },
        { label: "Motivación", value: parsed.data.motivacion },
        { label: "CV", value: uploaded.url },
      ],
    });
    return { ok: true, message: WORK_SUCCESS_MSG };
  } catch (err) {
    log.error("submitWorkWithUsForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// /corporativo form → ContactoCorporativo
// ---------------------------------------------------------------------------
const corporateSchema = z.object({
  nombre: nombreSchema,
  email: emailSchema,
  empresa: z
    .string()
    .trim()
    .min(1, "Ingresá el nombre de tu empresa.")
    .max(200, "El nombre de la empresa es demasiado largo."),
  telefono: telefonoSchema,
  cargo: z.string().trim().max(200, "El cargo es demasiado largo.").nullable(),
  comentarios: comentariosSchema,
});

export async function submitCorporateForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const guard = guardForm("corporativo", formData);
    if (guard) return guard;

    const parsed = corporateSchema.safeParse({
      nombre: s(formData, "nombre") ?? "",
      email: s(formData, "email") ?? "",
      empresa: s(formData, "empresa") ?? "",
      telefono: s(formData, "telefono"),
      cargo: s(formData, "cargo"),
      comentarios: s(formData, "comentarios"),
    });
    if (!parsed.success) return zodError(parsed.error);

    await prisma.contactoCorporativo.create({ data: parsed.data });
    await notifyLead({
      settingKey: "notificaciones_email_corporativo",
      tipo: "Corporativo",
      replyTo: parsed.data.email,
      origen: captureOrigen(),
      campos: [
        { label: "Nombre", value: parsed.data.nombre },
        { label: "Empresa", value: parsed.data.empresa },
        { label: "Cargo", value: parsed.data.cargo ?? "" },
        { label: "Email", value: parsed.data.email },
        { label: "Teléfono", value: parsed.data.telefono ?? "" },
        { label: "Comentarios", value: parsed.data.comentarios ?? "" },
      ],
    });
    return { ok: true, message: SUCCESS_MSG };
  } catch (err) {
    log.error("submitCorporateForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Newsletter (home hero) → SuscripcionNewsletter (double opt-in, F4)
// ---------------------------------------------------------------------------
// El alta nace inactiva con un token y mandamos un email "confirmá tu
// suscripción". Así nadie puede suscribir un email ajeno (evita spam complaints
// al enchufar campañas). Recién queda active=true cuando abre el link de
// confirmación (ver /newsletter/confirm). El mensaje de éxito refleja eso.
const NEWSLETTER_SUCCESS_MSG =
  "¡Casi listo! Te enviamos un email para confirmar tu suscripción.";
const NEWSLETTER_ALREADY_MSG = "Ya estabas suscripto. ¡Gracias!";

export async function submitNewsletterForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const guard = guardForm("newsletter", formData, NEWSLETTER_SUCCESS_MSG);
    if (guard) return guard;

    const parsed = emailSchema.safeParse(s(formData, "email") ?? "");
    if (!parsed.success) {
      return { ok: false, message: "Ingresá un email válido." };
    }
    const email = parsed.data;

    const existing = await prisma.suscripcionNewsletter.findUnique({
      where: { email },
      select: { active: true },
    });
    // Ya confirmado y activo — no reenviamos nada.
    if (existing?.active) {
      return { ok: true, message: NEWSLETTER_ALREADY_MSG };
    }

    // Alta nueva o re-suscripción de una baja: (re)generamos token y dejamos
    // la fila inactiva hasta que confirme.
    const confirmToken = randomUUID();
    // En server actions de Next 14 los headers HTTP del request original
    // (referer, user-agent) no son accesibles — los capturamos en el
    // cliente via FormData (prefijo _). Si no estan, caen a null sin tirar.
    const source =
      s(formData, "_consentUrl")?.slice(0, 1000) || captureOrigen();
    const utmSource = s(formData, "_utmSource")?.slice(0, 255) || null;
    const utmMedium = s(formData, "_utmMedium")?.slice(0, 255) || null;
    const utmCampaign = s(formData, "_utmCampaign")?.slice(0, 255) || null;
    const utmContent = s(formData, "_utmContent")?.slice(0, 255) || null;
    const utmTerm = s(formData, "_utmTerm")?.slice(0, 255) || null;
    const consentUserAgent = s(formData, "_consentUserAgent")?.slice(0, 500) || null;
    const consentIp = clientIp();
    await prisma.suscripcionNewsletter.upsert({
      where: { email },
      // En re-suscripciones, no pisamos los datos de consentimiento de la
      // primera alta — son el registro historico de cuando dieron opt-in
      // originalmente. Solo refrescamos el token y el estado.
      update: {
        active: false,
        confirmToken,
        confirmedAt: null,
        unsubscribedAt: null,
      },
      create: {
        email,
        source,
        active: false,
        confirmToken,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        consentIp,
        consentUserAgent,
      },
    });

    // Avisamos al admin (mismo patrón que el resto de los forms del site).
    // Fire-and-forget: si falla el envio no bloqueamos al visitante, el token
    // ya quedo persistido y el admin puede ver el lead en /backend/leads/newsletter.
    void notifyLead({
      settingKey: "notificaciones_email_newsletter",
      tipo: "Newsletter",
      replyTo: email,
      origen: source,
      campos: [
        { label: "Email", value: email },
        { label: "Origen", value: source ?? "(sin origen)" },
      ],
    });

    const baseUrl = getBaseUrl().replace(/\/$/, "");
    const confirmUrl = `${baseUrl}/newsletter/confirm?token=${confirmToken}`;
    // Link publico de unsubscribe. Por ahora usamos el email (en vez de un
    // token) porque el unico flujo que lo dispara es este email de opt-in,
    // y si el visitante reenvia el link el endpoint lo trata como baja
    // valida (LGPD: el opt-in pendiente se puede revocar en cualquier
    // momento, incluso antes de confirmar).
    const unsubscribeUrl = `${baseUrl}/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
    const tpl = newsletterConfirmEmail({ confirmUrl, unsubscribeUrl });
    // No bloqueamos al usuario si el envío falla (Resend puede no estar
    // configurado todavía) — el token queda persistido igual.
    await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      unsubscribeUrl,
    });

    return { ok: true, message: NEWSLETTER_SUCCESS_MSG };
  } catch (err) {
    log.error("submitNewsletterForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Cotización (sidebar of /destinos/[region]/[slug] and standalone /cotizar)
// → Cotizacion
// ---------------------------------------------------------------------------
const quoteSchema = z.object({
  nombre: nombreSchema,
  email: emailSchema,
  telefono: telefonoSchema,
  paisCodigo: codigoPaisSchema,
  comentarios: comentariosSchema,
  destino: z
    .string()
    .trim()
    .max(200, "El destino es demasiado largo.")
    .nullable(),
});

export async function submitQuoteForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const guard = guardForm("cotizar", formData);
    if (guard) return guard;

    const parsed = quoteSchema.safeParse({
      nombre: s(formData, "nombre") ?? "",
      email: s(formData, "email") ?? "",
      telefono: s(formData, "telefono"),
      // El sidebar de paquete manda el prefijo como "telefonoCodigo"; el
      // form standalone podría mandarlo como "paisCodigo". Aceptamos ambos.
      paisCodigo: s(formData, "paisCodigo") ?? s(formData, "telefonoCodigo"),
      comentarios: s(formData, "comentarios"),
      destino: s(formData, "destino"),
    });
    if (!parsed.success) return zodError(parsed.error);
    const data = parsed.data;

    // The PassengerCounter component serializes counts in a single hidden
    // input "pasajeros" with shape "adultos:N|ninos:N|infantes:N", but for
    // backwards compat with manual forms we also accept individual fields.
    const pasajerosBlob = s(formData, "pasajeros") ?? "";
    const m = (k: string) => {
      const match = pasajerosBlob.match(new RegExp(`${k}:(\\d+)`));
      if (match) return Math.min(Number(match[1]), 99);
      return Math.min(Math.max(n(formData, k), 0), 99);
    };

    const preferencia = s(formData, "preferencia");
    const validPref = ["LLAMADA", "EMAIL", "WHATSAPP"].includes(preferencia ?? "")
      ? (preferencia as "LLAMADA" | "EMAIL" | "WHATSAPP")
      : null;

    // Validar el FK antes del insert: un paqueteId inventado tiraría P2003 y
    // perderíamos el lead entero. Si no existe, guardamos la cotización sin
    // paquete asociado.
    let paqueteId = s(formData, "paqueteId");
    if (paqueteId) {
      const exists = await prisma.paquete.findUnique({
        where: { id: paqueteId },
        select: { id: true },
      });
      if (!exists) paqueteId = null;
    }

    // Cotizacion no tiene columna "destino" — lo anteponemos a comentarios
    // para que el admin vea a dónde quiere viajar el lead del /cotizar.
    const comentarios = data.destino
      ? `Destino: ${data.destino}${data.comentarios ? `\n\n${data.comentarios}` : ""}`
      : data.comentarios;

    await prisma.cotizacion.create({
      data: {
        paqueteId,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        paisCodigo: data.paisCodigo,
        fechaDesde: date(formData, "fechaDesde"),
        fechaHasta: date(formData, "fechaHasta"),
        adultos: m("adultos"),
        ninos: m("ninos"),
        infantes: m("infantes"),
        preferencia: validPref,
        comentarios,
        origen: s(formData, "origen") ?? (captureOrigen()),
        aceptaPromos: formData.get("aceptaPromos") === "on",
      },
    });

    const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
    await notifyLead({
      settingKey: "notificaciones_email_cotizacion",
      tipo: "Cotización",
      replyTo: data.email,
      origen: s(formData, "origen") ?? captureOrigen(),
      campos: [
        { label: "Nombre", value: data.nombre },
        { label: "Email", value: data.email },
        {
          label: "Teléfono",
          value: [data.paisCodigo, data.telefono].filter(Boolean).join(" "),
        },
        { label: "Destino", value: data.destino ?? "" },
        {
          label: "Fechas",
          value: [fmtDate(date(formData, "fechaDesde")), fmtDate(date(formData, "fechaHasta"))]
            .filter(Boolean)
            .join(" → "),
        },
        {
          label: "Pasajeros",
          value: `${m("adultos")} adultos · ${m("ninos")} niños · ${m("infantes")} infantes`,
        },
        { label: "Preferencia de contacto", value: validPref ?? "" },
        { label: "Comentarios", value: data.comentarios ?? "" },
      ],
    });
    return { ok: true, message: SUCCESS_MSG };
  } catch (err) {
    log.error("submitQuoteForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}
