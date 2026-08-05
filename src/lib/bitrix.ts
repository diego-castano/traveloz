/**
 * Cliente del CRM Bitrix24 (webhook entrante).
 *
 * Alcance: crear un Negocio (Deal) en la columna "ENTRADA CALIENTE" del embudo
 * principal cada vez que alguien consulta por un paquete desde el sitio
 * público, con el contacto asociado y todos los datos del formulario en el
 * campo COMMENTS.
 *
 * Excepción: si el mismo pasajero ya tiene un negocio abierto y reciente, la
 * consulta nueva va como comentario en ese negocio en vez de abrir otro (ver
 * BITRIX_DEDUPE_HOURS más abajo).
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
 *   BITRIX_DEDUPE_HOURS  Ventana en horas para no abrir un negocio repetido:
 *                        si el contacto ya tiene uno abierto creado dentro de
 *                        esa ventana, la consulta va como comentario ahí.
 *                        Default 24 (la regla que definió el cliente). Con "0"
 *                        o con la variable seteada en vacío la deduplicación
 *                        queda apagada y todo vuelve a crear negocio siempre,
 *                        sin necesidad de deploy.
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
const DEFAULT_DEDUPE_HOURS = 24;

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
  /**
   * URL del paquete en el portal de vendedores. El vendedor abre el lead y con
   * un clic ve cómo está armado el producto (aéreos, hoteles, precios), sin
   * tener que buscarlo. Es el mismo link que ya lleva el aviso por mail.
   */
  paqueteAdminUrl?: string | null;
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
 * Destino legible para el título. El paquete guarda un breadcrumb
 * ("Brasil › Brasil › Búzios"): nos quedamos con el último tramo, que es la
 * ciudad. El cotizador general manda texto libre, que pasa tal cual.
 */
export function destinoLegible(raw: string | null | undefined): string {
  if (!raw) return "";
  const tramos = raw
    .split(/[›>]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tramos.length ? tramos[tramos.length - 1] : "";
}

/**
 * TITLE del negocio con el mismo formato que usa recepción a mano:
 *   "Destino - N PAX - MES"   (ej. "Búzios - 2 PAX - OCTUBRE")
 *
 * Los tramos que no tenemos se omiten. Si no hay destino, cae al título del
 * paquete y, en última instancia, a "Consulta Web".
 * `BITRIX_TITLE_PREFIX` antepone una marca (se usa para los negocios de
 * prueba) y en producción está vacío.
 */
export function construirTitulo(lead: ConsultaLead): string {
  const base =
    destinoLegible(lead.destino) || lead.tituloPaquete?.trim() || "Consulta Web";
  const partes = [base];

  const pax = totalPax(lead);
  if (pax > 0) partes.push(`${pax} PAX`);

  const mes = mesEnMayusculas(lead.fechaDesde);
  if (mes) partes.push(mes);

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
  // Los dos links que pidió el cliente: el que vio el pasajero y el de cómo
  // está armado el producto para el vendedor.
  opcional("Link del paquete (web)", lead.paqueteUrl);
  opcional("Ver en portal de vendedores", lead.paqueteAdminUrl);
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
// Deduplicación: una consulta más, no un negocio más
//
// Bitrix no fusiona negocios (su control de duplicados sólo cubre prospectos,
// contactos y empresas), así que dos consultas seguidas del mismo pasajero
// terminaban en dos tarjetas. Como el vendedor se asigna al mover la tarjeta de
// columna, cada tarjeta caía en un vendedor distinto y el pasajero recibía dos
// llamadas. Regla del cliente: dentro de las 24 horas no se abre negocio nuevo.
// ──────────────────────────────────────────────

/**
 * Ventana de deduplicación en horas. `0` la apaga.
 *
 * La variable sin definir vale el default (24). Definida pero vacía vale 0:
 * así el cliente puede apagar la regla desde Railway sin deploy y sin tener que
 * acordarse de ningún número.
 */
function horasDedupe(): number {
  const raw = process.env.BITRIX_DEDUPE_HOURS;
  if (raw === undefined) return DEFAULT_DEDUPE_HOURS;
  const limpio = raw.trim();
  if (!limpio) return 0;
  const parsed = Number(limpio);
  // Basura ("abc") no debería apagar la regla en silencio: cae al default.
  if (!Number.isFinite(parsed)) return DEFAULT_DEDUPE_HOURS;
  return parsed > 0 ? parsed : 0;
}

type DealResumen = {
  ID: string | number;
  DATE_CREATE?: string;
  STAGE_ID?: string;
};

/**
 * ID del negocio abierto más reciente del contacto dentro de la ventana, o
 * `null` si no hay ninguno.
 *
 * Filtro:
 *   • CONTACT_ID  - el contacto que ya resolvió `upsertContacto`.
 *   • CATEGORY_ID - sólo nuestro embudo, para no engancharnos con tarjetas de
 *     otros pipelines donde el pasajero también aparezca.
 *   • CLOSED = "N" - el campo que Bitrix mantiene solo. Verificado contra el
 *     portal en vivo: sobre el embudo 0, CLOSED="Y" da los mismos 59.248
 *     negocios que STAGE_ID en (WON, LOSE), y las dos consultas cruzadas
 *     (WON/LOSE con CLOSED="N", y CLOSED="Y" fuera de WON/LOSE) dan cero. Le
 *     ganamos a listar etapas a mano porque sigue la semántica de la etapa: si
 *     mañana el cliente agrega una columna de cierre propia, CLOSED la toma y
 *     una lista hardcodeada no.
 *   • >DATE_CREATE - `toISOString()` tal cual. El portal está en +03:00 y
 *     devuelve las fechas con offset, pero el filtro respeta el offset que le
 *     mandamos: probado al segundo contra dos negocios reales, un instante
 *     antes los trae y un instante después no. Por eso no hace falta ningún
 *     margen de zona horaria ni convertir a la hora del portal.
 *
 * Nunca tira: si la consulta falla devuelve `null` y el caller crea el negocio
 * como siempre. Perder un lead sería mucho peor que abrir un duplicado.
 */
async function buscarNegocioAbiertoReciente(
  contactId: number,
): Promise<number | null> {
  const horas = horasDedupe();
  if (horas <= 0) {
    log.debug("bitrix.dedupe.off", { contactId });
    return null;
  }

  const desde = new Date(Date.now() - horas * 60 * 60 * 1000);

  try {
    const deals = await bitrixCall<DealResumen[]>("crm.deal.list", {
      filter: {
        CONTACT_ID: contactId,
        CATEGORY_ID: envInt("BITRIX_CATEGORY_ID", DEFAULT_CATEGORY_ID),
        CLOSED: "N",
        ">DATE_CREATE": desde.toISOString(),
      },
      select: ["ID", "DATE_CREATE", "STAGE_ID"],
      order: { DATE_CREATE: "DESC" },
    });

    const primero = deals?.[0];
    if (!primero) return null;

    const dealId = Number(primero.ID);
    if (!Number.isFinite(dealId)) return null;

    log.info("bitrix.dedupe.hit", {
      contactId,
      dealId,
      dateCreate: primero.DATE_CREATE,
      stageId: primero.STAGE_ID,
      horas,
    });
    return dealId;
  } catch (err) {
    log.error("bitrix.dedupe.fail", err);
    return null;
  }
}

/**
 * Fecha y hora de la consulta como la lee el vendedor: "05/08/2026, 18:03".
 * Va en hora uruguaya porque el portal está en +03:00 y la tarjeta la abre
 * alguien sentado en Montevideo.
 */
function ahoraEnMontevideo(): string {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Texto del comentario que va al historial del negocio existente: el mismo
 * bloque de datos que iría en COMMENTS de un negocio nuevo, con un encabezado
 * que le avisa al vendedor que es otra consulta del mismo pasajero (y no una
 * nota suelta perdida en el timeline).
 */
export function construirComentarioConsultaPosterior(lead: ConsultaLead): string {
  const paquete =
    lead.tituloPaquete?.trim() ||
    destinoLegible(lead.destino) ||
    "cotizador general";
  return [
    `NUEVA CONSULTA DEL MISMO PASAJERO (${ahoraEnMontevideo()} hs de Montevideo)`,
    `Paquete consultado: ${paquete}`,
    "",
    construirComentarios(lead),
  ].join("\n");
}

// ──────────────────────────────────────────────
// Negocio
// ──────────────────────────────────────────────

export interface CrearNegocioResult {
  /**
   * Qué camino se tomó. `comentario-en-negocio` significa que no se creó
   * tarjeta: la consulta se sumó al historial de `dealId`.
   */
  modo: "negocio-nuevo" | "comentario-en-negocio";
  /** Negocio creado, o el existente al que se le sumó el comentario. */
  dealId: number;
  contactId: number | null;
  title: string;
  comments: string;
}

/**
 * Deja la consulta en el historial de un negocio que ya existe.
 *
 * Devuelve `false` si Bitrix rechaza el comentario, y ahí el caller crea el
 * negocio como siempre: preferimos un duplicado antes que un lead que no llega.
 */
async function comentarEnNegocio(
  dealId: number,
  comment: string,
): Promise<boolean> {
  try {
    // La clave `fields` va en minúscula: desde CRM 23.100.0 Bitrix ignora
    // FIELDS en mayúscula y el comentario se pierde sin devolver error.
    await bitrixCall<number>("crm.timeline.comment.add", {
      fields: {
        ENTITY_ID: dealId,
        ENTITY_TYPE: "deal",
        COMMENT: comment,
      },
    });
    return true;
  } catch (err) {
    log.error("bitrix.deal.comment.fail", err);
    return false;
  }
}

/**
 * Crea el Negocio en ENTRADA CALIENTE con el contacto asociado, salvo que el
 * pasajero ya tenga uno abierto y reciente: en ese caso la consulta va como
 * comentario en ese negocio. El campo `modo` del resultado dice cuál de los dos
 * caminos se tomó.
 *
 * Devuelve `null` si el webhook no está configurado. Tira `BitrixError` si
 * Bitrix rechaza la creación del negocio - el caller decide qué hacer (en el
 * formulario público se traga el error: el lead ya está en nuestra DB).
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

  // Sin contacto no hay con qué buscar negocios previos, así que va derecho al
  // camino de siempre.
  if (contactId) {
    const existente = await buscarNegocioAbiertoReciente(contactId);
    if (existente) {
      const comentado = await comentarEnNegocio(
        existente,
        construirComentarioConsultaPosterior(lead),
      );
      if (comentado) {
        log.info("bitrix.deal.comment", { dealId: existente, contactId, title });
        return {
          modo: "comentario-en-negocio",
          dealId: existente,
          contactId,
          title,
          comments,
        };
      }
    }
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
  return { modo: "negocio-nuevo", dealId, contactId, title, comments };
}
