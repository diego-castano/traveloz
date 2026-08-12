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

/** Largo máximo del error que guardamos en `Cotizacion.crmError`. */
const CRM_ERROR_MAX = 500;

/**
 * Mensaje de error listo para guardar en la DB (`Cotizacion.crmError`): sin
 * stack y sin el token del webhook, recortado a 500 caracteres.
 *
 * La URL del webhook lleva el token en la ruta (`/rest/{userId}/{token}/`), y
 * puede colarse en el mensaje si falla el transporte o si Bitrix devuelve
 * HTML. Lo tapamos siempre, no sólo cuando coincide con la env configurada.
 */
export function mensajeErrorCrm(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const base = webhookBase();
  let limpio = base ? raw.split(base).join("[webhook]") : raw;
  limpio = limpio.replace(/(https?:\/\/[^\s/]+\/rest\/)\S*/gi, "$1***");
  return limpio.length > CRM_ERROR_MAX
    ? `${limpio.slice(0, CRM_ERROR_MAX - 1)}…`
    : limpio;
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

// ──────────────────────────────────────────────
// Teléfonos: un mismo número, una sola forma
//
// El formulario deja el teléfono como lo tipeó la persona pegado al prefijo del
// selector de país, así que el mismo celular llegaba al CRM como "+59895315328"
// una vez y como "+598 095315328" la otra. Bitrix los guarda como dos contactos
// distintos, y la regla de deduplicación de negocios (que agrupa por CONTACT_ID)
// ya no los puede juntar: el pasajero termina con dos tarjetas y dos vendedores.
// Medido sobre los contactos creados desde el 13/7: 53 teléfonos apuntaban a más
// de un contacto.
//
// Dos arreglos, uno para adelante y otro para atrás:
//   • Guardamos siempre en E.164 ("+" + país + nacional sin ceros a la
//     izquierda), así los contactos nuevos no vuelven a bifurcarse.
//   • Antes de crear, buscamos con TODAS las formas en que el mismo número pudo
//     haber quedado guardado, que es lo que rescata los contactos viejos.
//
// Cómo compara Bitrix (probado contra el portal en vivo con
// crm.duplicate.findbycomm, sólo lectura): compara la cadena de DÍGITOS, nada
// más. "+59895315328", "59895315328" y "598 95315328" devuelven los mismos dos
// contactos, o sea que el "+" y los espacios no cambian nada. Pero "+598
// 095315328" (dígitos 598095315328) devuelve otro contacto y "95315328" no
// devuelve ninguno: no hay match por sufijo. Por eso las variantes sólo tienen
// sentido si cambian los dígitos (con y sin país, con y sin el cero nacional) y
// no hace falta gastar valores en formas con espacios o con "+".
// ──────────────────────────────────────────────

/** Dígitos sueltos: se van "+", espacios, guiones y paréntesis. */
function soloDigitos(raw: string): string {
  return raw.replace(/\D+/g, "");
}

/**
 * Prefijo de país como dígitos ("+598" → "598"). Devuelve "" cuando no vino o
 * cuando no parece un código de país (E.164 los define de 1 a 3 dígitos): sin
 * país confiable preferimos no tocar el número antes que inventar uno.
 */
function digitosCodigoPais(codigoPais?: string | null): string {
  const d = soloDigitos(codigoPais ?? "");
  return d.length >= 1 && d.length <= 3 ? d : "";
}

/**
 * Saca el código de país y el cero nacional de adelante del número.
 *
 * El código puede venir tipeado adentro del número, y hasta duplicado (la
 * persona escribe "+598 99..." con el selector ya en +598), por eso el bucle.
 * El corte por longitud es la red de seguridad: si al recortar queda algo
 * demasiado corto para ser un teléfono, el prefijo era parte del número
 * nacional y lo dejamos como estaba.
 */
function nacionalSinCodigoPais(digitos: string, cc: string): string {
  let resto = digitos;
  for (let i = 0; cc && i < 3 && resto.startsWith(cc); i++) {
    const recorte = resto.slice(cc.length).replace(/^0+/, "");
    if (recorte.length < 6) break;
    resto = resto.slice(cc.length);
  }
  // El cero es prefijo de discado nacional en Uruguay y en la región (la gente
  // escribe "095315328"), no parte del número. Ojo: en Italia el cero sí es
  // parte del número; ahí guardaríamos un valor de menos, pero la búsqueda
  // igual lo encuentra porque `variantesTelefono` manda también los dígitos
  // crudos.
  return resto.replace(/^0+/, "");
}

/**
 * Teléfono en formato único y estable (E.164): `+` + código de país + número
 * nacional, sin espacios, guiones ni ceros de discado.
 *
 * `codigoPais` es el prefijo que eligió la persona en el selector del
 * formulario. Sin código de país no inventamos ninguno: devolvemos los dígitos
 * tal cual (o con "+" si la persona marcó el número como internacional).
 * Función pura, sin red: se puede ejercitar sin tocar Bitrix.
 */
export function normalizarTelefono(
  telefono?: string | null,
  codigoPais?: string | null,
): string {
  const raw = (telefono ?? "").trim();
  if (!raw) return "";

  const cc = digitosCodigoPais(codigoPais);
  let digitos = soloDigitos(raw);
  // "00" es el prefijo internacional de discado: equivale a haber escrito "+".
  // Sólo lo sacamos si atrás viene el país que corresponde (o si no sabemos de
  // qué país es), para no destripar un teléfono que arranca con ceros por
  // basura tipeada ("000000").
  let internacional = raw.startsWith("+");
  if (digitos.startsWith("00") && (!cc || digitos.slice(2).startsWith(cc))) {
    digitos = digitos.slice(2);
    internacional = true;
  }
  if (!digitos) return "";

  if (!cc) return internacional ? `+${digitos}` : digitos;

  // Un "+" escrito a mano le gana al selector: si la persona marcó el número
  // como internacional y no arranca con el país del selector, es que está
  // consultando con un número de otro lado y el selector quedó en el default.
  if (internacional && !digitos.startsWith(cc)) return `+${digitos}`;

  const nacional = nacionalSinCodigoPais(digitos, cc);
  if (!nacional) return "";
  return `+${cc}${nacional}`;
}

/**
 * Todas las formas en que el mismo número puede estar guardado en el CRM, para
 * mandarlas juntas a `crm.duplicate.findbycomm` (que acepta una lista en
 * `values`). Sin esto sólo encontramos los contactos guardados exactamente como
 * los escribimos hoy, y los viejos quedan huérfanos.
 *
 * Como Bitrix compara dígitos, cada variante cambia los dígitos: con país, con
 * país y cero nacional, sin país con cero, sin país sin cero, con el país
 * duplicado (6% de las cotizaciones de la última campaña vinieron así, del
 * estilo "+598 +59893579305": la persona escribe el prefijo que el selector ya
 * puso) y lo que escribió la persona por si quedó guardado así. Función pura,
 * sin red.
 */
export function variantesTelefono(
  telefono?: string | null,
  codigoPais?: string | null,
): string[] {
  const out: string[] = [];
  const push = (v: string) => {
    const d = soloDigitos(v);
    // Los teléfonos basura ("000000", "999999999") no pueden entrar a la
    // búsqueda: matchearían con la basura de otro y nos harían fusionar dos
    // pasajeros distintos en un mismo contacto.
    if (d.length < 6 || /^(\d)\1+$/.test(d)) return;
    if (!out.includes(v)) out.push(v);
  };

  // La normalizada primero: es la forma en que guardamos desde ahora, así que
  // es la que más va a pegar con el correr de los meses.
  const normalizado = normalizarTelefono(telefono, codigoPais);
  push(normalizado);

  const cc = digitosCodigoPais(codigoPais);
  if (cc && normalizado.startsWith(`+${cc}`)) {
    const nacional = normalizado.slice(cc.length + 1);
    if (nacional) {
      push(`+${cc}0${nacional}`); // "+598 095315328", el caso que nos rompió
      push(`0${nacional}`); // guardado sin país, como lo tipea la gente
      push(nacional); // guardado sin país ni cero
      push(`+${cc}${cc}${nacional}`); // "+598 +59895315328"
      push(`+${cc}${cc}0${nacional}`); // "+598 +598095315328"
      push(`00${cc}${nacional}`); // marcado como se disca desde afuera
    }
  }

  // Último recurso: los dígitos tal cual llegaron. Cubre los números de otros
  // países, donde no tocamos nada, y cualquier forma rara que no previmos.
  push(soloDigitos(telefono ?? ""));

  return out;
}

type DuplicateResult = {
  CONTACT?: (number | string)[];
  LEAD?: (number | string)[];
  COMPANY?: (number | string)[];
};

/**
 * Busca un CONTACT existente por email o teléfono, probando varios valores en
 * una sola llamada. `null` si no hay match.
 *
 * Cuando varios contactos matchean (pasa seguido: son justamente los duplicados
 * que estamos tratando de reunir) nos quedamos con el ID más chico, o sea el más
 * viejo. Es determinístico y es el contacto con historia, el que recepción
 * reconoce.
 */
async function buscarContactoPorComunicacion(
  type: "EMAIL" | "PHONE",
  values: string[],
): Promise<number | null> {
  if (values.length === 0) return null;
  const res = await bitrixCall<DuplicateResult>("crm.duplicate.findbycomm", {
    type,
    values,
    entity_type: "CONTACT",
  });
  const ids = (res?.CONTACT ?? [])
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) return null;
  return Math.min(...ids);
}

export interface UpsertContactoInput {
  nombre: string;
  email?: string | null;
  /**
   * Teléfono como lo mostramos (puede traer el prefijo de país adelante). Se
   * normaliza antes de buscar y de guardar.
   */
  telefono?: string | null;
  /** Prefijo de país del selector del formulario ("+598"). */
  paisCodigo?: string | null;
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

  // Si la normalización llegara a fallar, el camino viejo gana: buscamos y
  // guardamos con el string crudo, como antes. Perder el lead sería peor que
  // volver a crear un duplicado.
  let telefonoNormalizado = telefono;
  let telefonoVariantes = telefono ? [telefono] : [];
  try {
    telefonoNormalizado = normalizarTelefono(telefono, input.paisCodigo) || telefono;
    // Lista vacía significa que el número no es buscable (basura tipeada): ahí
    // no buscamos nada, en vez de salir a pescar con un valor que puede
    // matchear con la basura de otro pasajero.
    telefonoVariantes = variantesTelefono(telefono, input.paisCodigo);
  } catch (err) {
    log.error("bitrix.telefono.normalizar.fail", err);
  }

  // El email primero: es el dato más confiable para decir "es la misma
  // persona". El teléfono recién después, con todas sus variantes.
  if (email) {
    const existente = await buscarContactoPorComunicacion("EMAIL", [email]);
    if (existente) {
      log.debug("bitrix.contacto.reuse", { by: "email", contactId: existente });
      return existente;
    }
  }
  if (telefonoVariantes.length) {
    const existente = await buscarContactoPorComunicacion("PHONE", telefonoVariantes);
    if (existente) {
      log.debug("bitrix.contacto.reuse", {
        by: "phone",
        contactId: existente,
        variantes: telefonoVariantes,
      });
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
  // Guardamos el normalizado, no lo que tipeó la persona: es el único formato
  // que la próxima consulta va a poder encontrar sin adivinar.
  if (telefonoNormalizado) {
    fields.PHONE = [{ VALUE: telefonoNormalizado, VALUE_TYPE: "WORK" }];
  }

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
  /**
   * Teléfono ya formateado para mostrar (prefijo de país + número), tal cual lo
   * escribió la persona. Es lo que va a la línea "Cel:" del COMMENTS: el
   * vendedor lee el número como se lo dictaron, igual que en el mail interno.
   * Para buscar y para guardar el contacto usamos la versión normalizada (ver
   * `normalizarTelefono`), que no se muestra en ningún lado.
   */
  telefono?: string | null;
  /**
   * Prefijo de país del selector del formulario ("+598"). No se muestra: sólo
   * sirve para normalizar el teléfono, porque sin él no se puede saber qué
   * parte del número es el país.
   */
  paisCodigo?: string | null;
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
      paisCodigo: lead.paisCodigo,
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
