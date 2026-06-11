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
// Email notifications to admins are NOT wired yet — explicit user request.
// ---------------------------------------------------------------------------

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { uploadBuffer } from "@/lib/storage";
import { checkFormRate } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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
    return { ok: true, message: SUCCESS_MSG };
  } catch (err) {
    log.error("submitCorporateForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Newsletter (home hero) → SuscripcionNewsletter (idempotent on email)
// ---------------------------------------------------------------------------
const NEWSLETTER_SUCCESS_MSG = "¡Suscripción confirmada!";

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

    // Idempotent — re-subscribing reactivates the row instead of erroring.
    await prisma.suscripcionNewsletter.upsert({
      where: { email },
      update: { active: true, unsubscribedAt: null },
      create: { email, source: captureOrigen(), active: true },
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
    return { ok: true, message: SUCCESS_MSG };
  } catch (err) {
    log.error("submitQuoteForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}
