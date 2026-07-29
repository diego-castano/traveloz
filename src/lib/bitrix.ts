/**
 * Cliente del CRM Bitrix24 (webhook entrante).
 *
 * Alcance: crear un Negocio (Deal) en la columna "ENTRADA CALIENTE" del embudo
 * principal cada vez que alguien consulta por un paquete desde el sitio
 * público, con el contacto asociado y todos los datos del formulario en el
 * campo COMMENTS.
 *
 * Configuración (env):
 *   BITRIX_WEBHOOK_URL   URL del webhook entrante, con o sin barra final.
 *                        Ej: https://<portal>.bitrix24.com/rest/21/<token>/
 *                        Si falta, TODO este módulo es un no-op silencioso
 *                        (mismo patrón que sendEmail sin RESEND_API_KEY).
 *   BITRIX_CATEGORY_ID   Embudo. Default 0.
 *   BITRIX_STAGE_ID      Columna. Default "NEW".
 *   BITRIX_SOURCE_ID     Origen. Default "CALL".
 *   BITRIX_ASSIGNED_BY_ID Responsable. Default 85.
 *   BITRIX_TIMEOUT_MS    Timeout por request. Default 8000.
 *   BITRIX_TITLE_PREFIX  Prefijo del TITLE. Vacío en producción; sirve para
 *                        marcar negocios de prueba (ej. "[PRUEBA] ").
 *
 * Forma de llamada: POST {webhook}/{metodo}.json con el body
 * form-urlencoded (Bitrix acepta claves anidadas tipo fields[EMAIL][0][VALUE]).
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "bitrix" });

// ──────────────────────────────────────────────
// Constantes del CRM del cliente
//
// Todas verificadas contra el portal en vivo (crm.status.list / crm.deal.list
// sobre negocios cargados a mano por recepción), no inventadas:
//   • CATEGORY_ID 0    → embudo principal (el único que usa recepción).
//   • STAGE_ID "NEW"   → columna visible "ENTRADA CALIENTE".
//   • SOURCE_ID "CALL" → origen visible "Web". Se llama CALL internamente
//     porque el cliente renombró una fuente de fábrica en vez de crear una.
//   • ASSIGNED_BY_ID 85 → Belu Lavorerio, la responsable que figura en todos
//     los negocios de esa columna.
// Cualquiera se puede pisar por env sin tocar código (ej. si mañana cambian
// de responsable o mueven la columna).
// ──────────────────────────────────────────────

const DEFAULT_CATEGORY_ID = 0;
const DEFAULT_STAGE_ID = "NEW";
const DEFAULT_SOURCE_ID = "CALL";
const DEFAULT_ASSIGNED_BY_ID = 85;
const DEFAULT_TIMEOUT_MS = 8000;

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envStr(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

/** URL base del webhook, sin barra final. `null` cuando no está configurado. */
function webhookBase(): string | null {
  const raw = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/** `true` cuando hay webhook configurado y las llamadas van a salir de verdad. */
export function bitrixEnabled(): boolean {
  return webhookBase() !== null;
}

// ──────────────────────────────────────────────
// Transporte
// ──────────────────────────────────────────────

/** Error devuelto por la API de Bitrix (o por el transporte). */
export class BitrixError extends Error {
  readonly method: string;
  readonly code?: string;
  readonly status?: number;

  constructor(opts: { method: string; message: string; code?: string; status?: number }) {
    super(`bitrix ${opts.method}: ${opts.message}`);
    this.name = "BitrixError";
    this.method = opts.method;
    this.code = opts.code;
    this.status = opts.status;
  }
}

/**
 * Aplana un objeto a pares clave/valor con la notación de corchetes que espera
 * Bitrix: `{ fields: { EMAIL: [{ VALUE: "a@b.c" }] } }` →
 * `fields[EMAIL][0][VALUE]=a@b.c`.
 */
export function encodeBitrixParams(
  params: Record<string, unknown>,
): URLSearchParams {
  const out = new URLSearchParams();

  const walk = (prefix: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(`${prefix}[${i}]`, item));
      return;
    }
    if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(`${prefix}[${k}]`, v);
      }
      return;
    }
    if (typeof value === "boolean") {
      out.append(prefix, value ? "Y" : "N");
      return;
    }
    out.append(prefix, String(value));
  };

  for (const [k, v] of Object.entries(params)) walk(k, v);
  return out;
}

/**
 * Llama un método REST del webhook.
 *
 * Devuelve el campo `result` de la respuesta, o `null` si no hay webhook
 * configurado (no-op silencioso: loguea en debug y sigue). Tira `BitrixError`
 * si Bitrix responde con `error`, si el HTTP falla o si se vence el timeout.
 */
export async function bitrixCall<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T | null> {
  const base = webhookBase();
  if (!base) {
    log.debug("bitrix.skip", {
      reason: "BITRIX_WEBHOOK_URL not set",
      method,
    });
    return null;
  }

  const timeoutMs = envInt("BITRIX_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}/${method}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeBitrixParams(params).toString(),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    let json: { result?: T; error?: string; error_description?: string };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      throw new BitrixError({
        method,
        status: res.status,
        message: `respuesta no-JSON (${res.status}): ${text.slice(0, 300)}`,
      });
    }

    if (json.error) {
      throw new BitrixError({
        method,
        status: res.status,
        code: json.error,
        message: json.error_description || json.error,
      });
    }
    if (!res.ok) {
      throw new BitrixError({
        method,
        status: res.status,
        message: `HTTP ${res.status}: ${text.slice(0, 300)}`,
      });
    }

    return (json.result ?? null) as T | null;
  } catch (err) {
    if (err instanceof BitrixError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new BitrixError({ method, message: `timeout de ${timeoutMs}ms` });
    }
    throw new BitrixError({
      method,
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timer);
  }
}

// ──────────────────────────────────────────────
// Contactos
// ──────────────────────────────────────────────

/**
 * Parte un nombre completo en NAME / LAST_NAME. Criterio simple y predecible:
 * la primera palabra es el nombre, el resto el apellido. Con una sola palabra
 * el apellido queda vacío.
 */
export function partirNombre(nombre: string): { name: string; lastName: string } {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { name: "", lastName: "" };
  return { name: partes[0], lastName: partes.slice(1).join(" ") };
}

type DuplicateResult = {
  CONTACT?: (number | string)[];
  LEAD?: (number | string)[];
  COMPANY?: (number | string)[];
};

/** Busca un CONTACT existente por email o teléfono. `null` si no hay match. */
async function buscarContactoPorComunicacion(
  type: "EMAIL" | "PHONE",
  value: string,
): Promise<number | null> {
  const res = await bitrixCall<DuplicateResult>("crm.duplicate.findbycomm", {
    type,
    values: [value],
    entity_type: "CONTACT",
  });
  const ids = res?.CONTACT ?? [];
  if (ids.length === 0) return null;
  const id = Number(ids[0]);
  return Number.isFinite(id) ? id : null;
}

export interface UpsertContactoInput {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
}

/**
 * Devuelve el ID del contacto en Bitrix: reusa el existente si el email o el
 * teléfono ya están en la base (así no llenamos el CRM de duplicados cuando un
 * mismo pasajero consulta varias veces) y si no lo crea.
 *
 * Devuelve `null` cuando el webhook no está configurado.
 */
export async function upsertContacto(
  input: UpsertContactoInput,
): Promise<number | null> {
  if (!bitrixEnabled()) return null;

  const email = input.email?.trim() || "";
  const telefono = input.telefono?.trim() || "";

  if (email) {
    const existente = await buscarContactoPorComunicacion("EMAIL", email);
    if (existente) {
      log.debug("bitrix.contacto.reuse", { by: "email", contactId: existente });
      return existente;
    }
  }
  if (telefono) {
    const existente = await buscarContactoPorComunicacion("PHONE", telefono);
    if (existente) {
      log.debug("bitrix.contacto.reuse", { by: "phone", contactId: existente });
      return existente;
    }
  }

  const { name, lastName } = partirNombre(input.nombre);
  // EMAIL y PHONE son campos "multifield": Bitrix los espera como lista de
  // objetos { VALUE, VALUE_TYPE }, no como string suelto.
  const fields: Record<string, unknown> = {
    NAME: name,
    LAST_NAME: lastName,
    OPENED: "Y",
    ASSIGNED_BY_ID: envInt("BITRIX_ASSIGNED_BY_ID", DEFAULT_ASSIGNED_BY_ID),
    SOURCE_ID: envStr("BITRIX_SOURCE_ID", DEFAULT_SOURCE_ID),
  };
  if (email) fields.EMAIL = [{ VALUE: email, VALUE_TYPE: "WORK" }];
  if (telefono) fields.PHONE = [{ VALUE: telefono, VALUE_TYPE: "WORK" }];

  const id = await bitrixCall<number>("crm.contact.add", { fields });
  const contactId = Number(id);
  if (!Number.isFinite(contactId)) return null;
  log.info("bitrix.contacto.create", { contactId });
  return contactId;
}

// ──────────────────────────────────────────────
// Armado del Negocio (funciones puras - testeables sin red)
// ──────────────────────────────────────────────

const MESES_ES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SETIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

/** Datos del formulario de consulta que viajan al CRM. */
export interface ConsultaLead {
  /** Título del paquete consultado. Sin él el TITLE cae al destino. */
  tituloPaquete?: string | null;
  /** URL pública del paquete en el sitio. */
  paqueteUrl?: string | null;
  nombre: string;
  email?: string | null;
  /** Teléfono ya formateado para mostrar (prefijo de país + número). */
  telefono?: string | null;
  destino?: string | null;
  fechaDesde?: Date | null;
  fechaHasta?: Date | null;
  adultos?: number;
  ninos?: number;
  infantes?: number;
  /** LLAMADA | EMAIL | WHATSAPP. */
  preferencia?: string | null;
  /** Texto libre que escribió el pasajero. */
  comentarios?: string | null;
  /** URL de la página desde la que se envió el formulario. */
  origen?: string | null;
  /** Resumen de atribución de pauta (ver `resumenPauta`). */
  pauta?: string | null;
  aceptaPromos?: boolean;
  /** Etiqueta del formulario de origen, para la línea "Canal". */
  canal?: string | null;
}

/** Fechas del form vienen como medianoche UTC - las leemos en UTC para no correr un día. */
function fmtFecha(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function mesEnMayusculas(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return MESES_ES[d.getUTCMonth()] ?? "";
}

function totalPax(lead: ConsultaLead): number {
  return (lead.adultos ?? 0) + (lead.ninos ?? 0) + (lead.infantes ?? 0);
}

/**
 * TITLE del negocio, formato pedido por el cliente:
 *   "Consulta Web - TITULO DEL PAQUETE"
 *
 * Sin paquete (cotizador general de /cotizar) usa el destino que escribió el
 * visitante. Si tampoco hay destino, queda solo "Consulta Web".
 * `BITRIX_TITLE_PREFIX` antepone una marca (se usa para los negocios de
 * prueba) y en producción está vacío.
 */
export function construirTitulo(lead: ConsultaLead): string {
  const base = lead.tituloPaquete?.trim() || lead.destino?.trim() || "";
  const partes = ["Consulta Web"];
  if (base) partes.push(base);

  // Sin trim: el prefijo se usa tal cual se configuró (normalmente termina en
  // un espacio, ej. "[PRUEBA] ").
  return `${process.env.BITRIX_TITLE_PREFIX ?? ""}${partes.join(" - ")}`;
}

/**
 * COMMENTS: texto plano, una línea por dato, con las etiquetas que ya usa
 * recepción (Nombre / Mail / Cel / Destino / Salida / Regreso / Adultos /
 * Menores / Canal) más lo nuestro (paquete, link, pauta, promos).
 *
 * Regla de omisión: las líneas de identificación y de pasajeros van siempre
 * (con "N/A" cuando no hay dato, como hace recepción); las demás se omiten si
 * están vacías, para que la tarjeta no quede llena de ruido.
 */
export function construirComentarios(lead: ConsultaLead): string {
  const NA = "N/A";
  const lineas: string[] = [
    `Nombre: ${lead.nombre?.trim() || NA}`,
    `Mail: ${lead.email?.trim() || NA}`,
    `Cel: ${lead.telefono?.trim() || NA}`,
  ];

  const opcional = (label: string, value: string | null | undefined) => {
    const v = value?.trim();
    if (v) lineas.push(`${label}: ${v}`);
  };

  opcional("Paquete", lead.tituloPaquete);
  opcional("Link del paquete", lead.paqueteUrl);
  opcional("Destino", lead.destino);
  opcional("Salida", fmtFecha(lead.fechaDesde));
  opcional("Regreso", fmtFecha(lead.fechaHasta));

  lineas.push(`Adultos: ${lead.adultos ?? 0}`);
  lineas.push(`Menores: ${lead.ninos ?? 0}`);
  lineas.push(`Infantes: ${lead.infantes ?? 0}`);

  opcional("Preferencia de contacto", lead.preferencia);
  opcional("Comentarios del pasajero", lead.comentarios);
  opcional("Origen", lead.origen);
  opcional("Pauta", lead.pauta);
  lineas.push(`Acepta promos: ${lead.aceptaPromos ? "Sí" : "No"}`);
  opcional("Canal", lead.canal);

  return lineas.join("\n");
}

// ──────────────────────────────────────────────
// Negocio
// ──────────────────────────────────────────────

export interface CrearNegocioResult {
  dealId: number;
  contactId: number | null;
  title: string;
  comments: string;
}

/**
 * Crea el Negocio en ENTRADA CALIENTE con el contacto asociado.
 *
 * Devuelve `null` si el webhook no está configurado. Tira `BitrixError` si
 * Bitrix rechaza la operación - el caller decide qué hacer (en el formulario
 * público se traga el error: el lead ya está en nuestra DB).
 */
export async function crearNegocioLead(
  lead: ConsultaLead,
): Promise<CrearNegocioResult | null> {
  if (!bitrixEnabled()) {
    log.debug("bitrix.skip", {
      reason: "BITRIX_WEBHOOK_URL not set",
      method: "crearNegocioLead",
    });
    return null;
  }

  const title = construirTitulo(lead);
  const comments = construirComentarios(lead);

  // El contacto es best-effort dentro del best-effort: si la búsqueda o el alta
  // fallan, igual creamos el negocio (sin contacto asociado) para no perder el
  // lead en el CRM. Recepción puede vincularlo a mano después.
  let contactId: number | null = null;
  try {
    contactId = await upsertContacto({
      nombre: lead.nombre,
      email: lead.email,
      telefono: lead.telefono,
    });
  } catch (err) {
    log.error("bitrix.contacto.fail", err);
  }

  const fields: Record<string, unknown> = {
    TITLE: title,
    CATEGORY_ID: envInt("BITRIX_CATEGORY_ID", DEFAULT_CATEGORY_ID),
    STAGE_ID: envStr("BITRIX_STAGE_ID", DEFAULT_STAGE_ID),
    SOURCE_ID: envStr("BITRIX_SOURCE_ID", DEFAULT_SOURCE_ID),
    ASSIGNED_BY_ID: envInt("BITRIX_ASSIGNED_BY_ID", DEFAULT_ASSIGNED_BY_ID),
    OPENED: "Y",
    COMMENTS: comments,
  };
  if (contactId) fields.CONTACT_ID = contactId;

  const id = await bitrixCall<number>("crm.deal.add", { fields });
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) {
    throw new BitrixError({
      method: "crm.deal.add",
      message: `respuesta inesperada: ${JSON.stringify(id)}`,
    });
  }

  log.info("bitrix.deal.create", { dealId, contactId, title });
  return { dealId, contactId, title, comments };
}
