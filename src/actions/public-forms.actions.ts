"use server";

// ---------------------------------------------------------------------------
// Public site form server actions — persist submissions to Prisma.
//
// Each action mirrors React's useFormState contract:
//   { ok: boolean; message: string }
//
// On success: the row is created with estado=NUEVO so the admin /backend/leads
// inbox can pick it up. Validation is intentionally light (HTML inputs already
// enforce required + email format); we still trim + null-out empty strings to
// keep the DB clean.
//
// File uploads (work-with-us CV) go to the S3 bucket via uploadBuffer.
//
// Email notifications to admins are NOT wired yet — explicit user request.
// ---------------------------------------------------------------------------

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { uploadBuffer } from "@/lib/storage";
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

// ---------------------------------------------------------------------------
// /contact form → MensajeContacto
// ---------------------------------------------------------------------------
export async function submitContactForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const nombre = s(formData, "nombre");
    const email = s(formData, "email");
    const comentarios = s(formData, "comentarios");
    if (!nombre || !email || !comentarios) {
      return { ok: false, message: "Completá nombre, email y comentarios." };
    }
    await prisma.mensajeContacto.create({
      data: {
        nombre,
        email,
        telefono: s(formData, "telefono"),
        comentarios,
      },
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
export async function submitWorkWithUsForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const nombre = s(formData, "nombre");
    const email = s(formData, "email");
    const motivacion = s(formData, "motivacion");
    if (!nombre || !email || !motivacion) {
      return {
        ok: false,
        message: "Completá nombre, email y la motivación.",
      };
    }

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
        nombre,
        email,
        telefono: s(formData, "telefono"),
        motivacion,
        cvUrl: uploaded.url,
        cvFilename: cv.name,
      },
    });
    return {
      ok: true,
      message:
        "¡Recibimos tu postulación! Vamos a revisarla y te contactamos pronto.",
    };
  } catch (err) {
    log.error("submitWorkWithUsForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// /corporativo form → ContactoCorporativo
// ---------------------------------------------------------------------------
export async function submitCorporateForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const nombre = s(formData, "nombre");
    const email = s(formData, "email");
    const empresa = s(formData, "empresa");
    if (!nombre || !email || !empresa) {
      return {
        ok: false,
        message: "Completá nombre, email y empresa.",
      };
    }
    await prisma.contactoCorporativo.create({
      data: {
        nombre,
        email,
        empresa,
        telefono: s(formData, "telefono"),
        cargo: s(formData, "cargo"),
        comentarios: s(formData, "comentarios"),
      },
    });
    return { ok: true, message: SUCCESS_MSG };
  } catch (err) {
    log.error("submitCorporateForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Newsletter (home hero) → SuscripcionNewsletter (idempotent on email)
// ---------------------------------------------------------------------------
export async function submitNewsletterForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const email = s(formData, "email");
    if (!email) return { ok: false, message: "Ingresá un email válido." };

    // Idempotent — re-subscribing reactivates the row instead of erroring.
    await prisma.suscripcionNewsletter.upsert({
      where: { email },
      update: { active: true, unsubscribedAt: null },
      create: { email, source: captureOrigen(), active: true },
    });
    return { ok: true, message: "¡Suscripción confirmada!" };
  } catch (err) {
    log.error("submitNewsletterForm failed", err);
    return { ok: false, message: "Hubo un error. Intentá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Cotización (sidebar of /destinos/[region]/[slug] and standalone /cotizar)
// → Cotizacion
// ---------------------------------------------------------------------------
export async function submitQuoteForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  try {
    const nombre = s(formData, "nombre");
    const email = s(formData, "email");
    if (!nombre || !email) {
      return { ok: false, message: "Completá nombre y email." };
    }

    // The PassengerCounter component serializes counts in a single hidden
    // input "pasajeros" with shape "adultos:N|ninos:N|infantes:N", but for
    // backwards compat with manual forms we also accept individual fields.
    const pasajerosBlob = s(formData, "pasajeros") ?? "";
    const m = (k: string) => {
      const match = pasajerosBlob.match(new RegExp(`${k}:(\\d+)`));
      if (match) return Number(match[1]);
      return n(formData, k);
    };

    const preferencia = s(formData, "preferencia");
    const validPref = ["LLAMADA", "EMAIL", "WHATSAPP"].includes(preferencia ?? "")
      ? (preferencia as "LLAMADA" | "EMAIL" | "WHATSAPP")
      : null;

    await prisma.cotizacion.create({
      data: {
        paqueteId: s(formData, "paqueteId"),
        nombre,
        email,
        telefono: s(formData, "telefono"),
        paisCodigo: s(formData, "paisCodigo"),
        fechaDesde: date(formData, "fechaDesde"),
        fechaHasta: date(formData, "fechaHasta"),
        adultos: m("adultos"),
        ninos: m("ninos"),
        infantes: m("infantes"),
        preferencia: validPref,
        comentarios: s(formData, "comentarios"),
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
