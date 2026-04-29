"use server";

// ---------------------------------------------------------------------------
// Public site form server action stubs.
//
// These actions log the submitted payload and return a success result.
// In Fase 5 they get rewritten to persist into Prisma (Cotizacion,
// MensajeContacto, ContactoCorporativo, Postulacion, SuscripcionNewsletter)
// and trigger admin notifications.
//
// The shape returned by each action matches React's useFormState contract:
//   { ok: boolean; message: string; field?: string }
// ---------------------------------------------------------------------------

export type FormResult = {
  ok: boolean;
  message: string;
};

const SUCCESS_MSG = "¡Mensaje enviado con éxito! Te contactaremos a la brevedad.";

function logSubmission(form: string, payload: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[public-forms] ${form} submission:`, payload);
}

// ---------------------------------------------------------------------------
// /contact form
// ---------------------------------------------------------------------------
export async function submitContactForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const payload = {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    comentarios: formData.get("comentarios"),
  };
  logSubmission("contact", payload);
  return { ok: true, message: SUCCESS_MSG };
}

// ---------------------------------------------------------------------------
// /work-with-us form (multipart -- includes CV file upload)
// ---------------------------------------------------------------------------
export async function submitWorkWithUsForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const cv = formData.get("cv") as File | null;
  const payload = {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    motivacion: formData.get("motivacion"),
    cvFilename: cv?.name ?? null,
    cvSize: cv?.size ?? 0,
  };
  logSubmission("work-with-us", payload);
  return {
    ok: true,
    message: "¡Recibimos tu postulación! Vamos a revisarla y te contactamos pronto.",
  };
}

// ---------------------------------------------------------------------------
// /corporativo form
// ---------------------------------------------------------------------------
export async function submitCorporateForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const payload = {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    cargo: formData.get("cargo"),
    empresa: formData.get("empresa"),
    comentarios: formData.get("comentarios"),
  };
  logSubmission("corporativo", payload);
  return { ok: true, message: SUCCESS_MSG };
}

// ---------------------------------------------------------------------------
// Newsletter (home hero)
// ---------------------------------------------------------------------------
export async function submitNewsletterForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const payload = { email: formData.get("email") };
  logSubmission("newsletter", payload);
  return { ok: true, message: "¡Suscripción confirmada!" };
}

// ---------------------------------------------------------------------------
// Cotización (sidebar of /destinos/[region]/[slug] and standalone /cotizar)
// ---------------------------------------------------------------------------
export async function submitQuoteForm(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const payload = {
    paqueteId: formData.get("paqueteId"),
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    fechaDesde: formData.get("fechaDesde"),
    fechaHasta: formData.get("fechaHasta"),
    adultos: formData.get("adultos"),
    ninos: formData.get("ninos"),
    infantes: formData.get("infantes"),
    preferencia: formData.get("preferencia"),
    comentarios: formData.get("comentarios"),
    aceptaPromos: formData.get("aceptaPromos") === "on",
    origen: formData.get("origen"),
  };
  logSubmission("quote", payload);
  return { ok: true, message: SUCCESS_MSG };
}
