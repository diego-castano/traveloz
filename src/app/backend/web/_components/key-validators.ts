// ---------------------------------------------------------------------------
// Per-key validators for SiteSetting fields. Returns an error message string
// when the value is invalid, or null when it's fine (including empty for
// optional keys). Used by SettingsForm to block autosave + render an inline
// hint under the offending field.
//
// Kept zod-free on purpose: the schemas would be one-liners and we don't want
// to load the zod runtime just for this. The validators are pure functions.
// ---------------------------------------------------------------------------

import { z } from "zod";

type Validator = (value: string) => string | null;

const url = z.string().url();
const email = z.string().email();
const optionalUrl = z.union([z.literal(""), url]);
const optionalEmail = z.union([z.literal(""), email]);

// Helpers — keep the call sites short and consistent.
const required: Validator = (v) =>
  v.trim() ? null : "Este campo no puede estar vacío.";
const requiredUrl: Validator = (v) => {
  if (!v.trim()) return "Este campo no puede estar vacío.";
  return url.safeParse(v).success
    ? null
    : "Tiene que ser una URL válida (https://…).";
};
const optionalUrlV: Validator = (v) =>
  optionalUrl.safeParse(v).success
    ? null
    : "Si lo completás, tiene que ser una URL válida (https://…).";
const optionalEmailV: Validator = (v) =>
  optionalEmail.safeParse(v).success
    ? null
    : "Si lo completás, tiene que ser un email válido.";
// Lista de emails separados por comas/espacios (vacío = sin destinatarios).
const optionalEmailListV: Validator = (v) => {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[,;\s]+/).filter(Boolean);
  const bad = parts.find((p) => !email.safeParse(p).success);
  return bad ? `"${bad}" no es un email válido.` : null;
};
const phone: Validator = (v) =>
  !v.trim() || /^[\d+()\-\s]{6,}$/.test(v.trim())
    ? null
    : "Formato de teléfono inválido.";
const internalOrExternalUrl: Validator = (v) => {
  const trimmed = v.trim();
  if (!trimmed) return "Este campo no puede estar vacío.";
  // Internal route: /algo (allowed). External: must be a valid URL.
  if (trimmed.startsWith("/")) return null;
  return url.safeParse(trimmed).success
    ? null
    : "Usá una ruta interna (/destinos) o una URL completa (https://…).";
};

export const KEY_VALIDATORS: Record<string, Validator> = {
  // Home — hero
  home_hero_title: required,
  home_hero_subtitle: required,
  home_hero_cta_text: required,
  home_hero_cta_link: internalOrExternalUrl,

  // General / contact info
  general_whatsapp: optionalUrlV,
  general_email: optionalEmailV,
  general_phone: phone,
  contacto_email: optionalEmailV,
  contacto_telefono: phone,
  contacto_whatsapp: optionalUrlV,

  // Notificaciones de leads — un destino por formulario (separá varios con comas)
  notificaciones_email_contacto: optionalEmailListV,
  notificaciones_email_corporativo: optionalEmailListV,
  notificaciones_email_cotizacion: optionalEmailListV,
  notificaciones_email_trabaja: optionalEmailListV,

  // Destinos CTA
  destinos_cta_link_href: internalOrExternalUrl,

  // Footer social links
  footer_social_facebook: optionalUrlV,
  footer_social_instagram: optionalUrlV,
  footer_social_linkedin: optionalUrlV,
  footer_social_youtube: optionalUrlV,
};

/** Returns the validator for a given SiteSetting key, or a no-op pass-through. */
export function getValidator(key: string): Validator {
  return KEY_VALIDATORS[key] ?? (() => null);
}

/** Validate every (key, value) entry. Returns a map of key → error message. */
export function validateAll(
  entries: Array<{ key: string; value: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of entries) {
    const err = getValidator(key)(value);
    if (err) out[key] = err;
  }
  return out;
}
