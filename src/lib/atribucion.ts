/**
 * Atribución de pauta — núcleo PURO / isomórfico (cliente + servidor).
 *
 * Este módulo NO importa `next/*` a propósito: lo consume tanto un client
 * component (`AtribucionTracker`) como código de servidor (`atribucion-server`,
 * `/api/visita`). Si un `"use client"` importara indirectamente `next/headers`,
 * el build de Next 14.2 se rompe — de ahí la separación en dos archivos
 * (lo server-only vive en `atribucion-server.ts`).
 *
 * Qué resuelve:
 *   - modela un "touch" de campaña (UTM + click IDs + referrer externo),
 *   - guarda first-touch (jamás se pisa) y last-touch (se pisa ante señal nueva)
 *     junto a un id anónimo de visitante (`vid`) en la cookie `tvz_attr`,
 *   - parsea/serializa la cookie tratándola SIEMPRE como input NO confiable
 *     (safeParse + caps por campo), y cuidando el presupuesto de tamaño
 *     (una cookie >4KB el browser la descarta ENTERA).
 *
 * Encoding de la cookie: el cliente la escribe con `document.cookie` usando
 * `serializeAtribucion` (= `encodeURIComponent(JSON.stringify(...))`), así que
 * el valor almacenado en el browser está URL-encodeado. En cambio, la API de
 * cookies de Next (`cookies()` / `req.cookies`) DEVUELVE el valor ya decodeado.
 * Por eso `parseAtribucion` es tolerante: intenta parsear el valor tal cual y,
 * si falla, tras un `decodeURIComponent`. Así el mismo parser sirve para ambos
 * lados. (Ver también el re-set server-side en `/api/visita`.)
 */

import { z } from "zod";

// Nombre de la cookie. Evitamos prefijos tipo "utm"/"track" que las listas de
// bloqueo (EasyPrivacy) matchean; `tvz_attr` es neutro y de marca.
export const ATTR_COOKIE = "tvz_attr";

// TTL de 90 días (en segundos, que es lo que esperan `max-age` de la cookie y
// el `maxAge` de la API de Next). Se re-emite en cada pageview → cookie rodante.
export const ATTR_MAX_AGE = 90 * 24 * 60 * 60;

// Presupuesto de bytes de la cookie YA serializada (encodeada). Dejamos margen
// contra el límite duro de 4096 del browser: pasado esto se dropean campos.
const COOKIE_MAX_BYTES = 3900;

// Caps por campo (en chars). Acotan el tamaño de la cookie y el ruido de datos
// de marketing. Los click IDs son más largos que los UTM; ref/lp (URLs) más aún.
const CAP_CAMPO = 100; // src, med, cmp, cnt, trm
const CAP_CLICKID = 150; // gclid, fbclid, gad
const CAP_REF = 200; // ref (referrer externo), lp (landing page)

// UUID (cualquier versión). Se reutiliza en `/api/visita` para validar el vid
// del beacon sin duplicar el regex.
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ──────────────────────────────────────────────
// Schemas zod (reutilizados por fases B/C para re-parsear los Json de Prisma)
// ──────────────────────────────────────────────

// Cada campo string se recorta (trim) y se capa por transform en vez de por
// `.max()`: así un valor sobredimensionado (cookie crafteada) se TRUNCA en vez
// de invalidar toda la atribución. Sigue siendo input no confiable, pero
// preferimos salvar los datos válidos a descartarlos.
function campo(max: number) {
  return z
    .string()
    .transform((v) => v.trim().slice(0, max))
    .optional();
}

export const touchSchema = z.object({
  src: campo(CAP_CAMPO), // utm_source
  med: campo(CAP_CAMPO), // utm_medium
  cmp: campo(CAP_CAMPO), // utm_campaign
  cnt: campo(CAP_CAMPO), // utm_content
  trm: campo(CAP_CAMPO), // utm_term
  gclid: campo(CAP_CLICKID), // Google Ads
  fbclid: campo(CAP_CLICKID), // Meta
  gad: campo(CAP_CLICKID), // gad_source
  ref: campo(CAP_REF), // referrer externo
  lp: campo(CAP_REF), // landing page (pathname de entrada)
  // Timestamp del touch (ms). Entero: descarta NaN/Infinity de una cookie
  // crafteada; siempre lo generamos con Date.now().
  ts: z.number().int(),
});

export const atribucionSchema = z.object({
  v: z.literal(1),
  vid: z.string().regex(UUID_RE),
  first: touchSchema.optional(),
  last: touchSchema.optional(),
});

export type Touch = z.infer<typeof touchSchema>;
export type Atribucion = z.infer<typeof atribucionSchema>;

// ──────────────────────────────────────────────
// Parse / serialize de la cookie
// ──────────────────────────────────────────────

/**
 * Parsea el valor crudo de la cookie a una `Atribucion` validada, o `null` ante
 * cualquier cosa inválida. JAMÁS tira (un fallo acá no puede romper un submit
 * de lead ni la navegación).
 *
 * Tolerante al encoding: prueba el valor tal cual (servidor: Next ya lo decodea)
 * y, si no parsea, tras un `decodeURIComponent` (cliente: `document.cookie` lo
 * devuelve encodeado). Ambas formas son inequívocas — el JSON plano arranca con
 * `{`, el encodeado con `%7B`.
 */
export function parseAtribucion(
  raw: string | null | undefined,
): Atribucion | null {
  if (!raw) return null;
  const candidatos = [raw];
  try {
    candidatos.push(decodeURIComponent(raw));
  } catch {
    // `raw` con un `%` inválido: nos quedamos solo con el original.
  }
  for (const candidato of candidatos) {
    try {
      const parsed = atribucionSchema.safeParse(JSON.parse(candidato));
      if (parsed.success) return parsed.data;
    } catch {
      // Este candidato no es JSON; probamos el siguiente.
    }
  }
  return null;
}

/**
 * Serializa a valor de cookie (`encodeURIComponent(JSON.stringify(...))`). Para
 * escribir con `document.cookie` desde el cliente.
 *
 * Si la cookie serializada supera el presupuesto, dropea campos en orden de
 * menor valor `trm → cnt → ref → lp`, primero de `last` y después de `first`,
 * hasta entrar. Nunca toca src/med/cmp ni los click IDs (lo que marketing
 * necesita sí o sí). Como la salida de `encodeURIComponent` es ASCII puro, su
 * `.length` es exactamente su tamaño en bytes.
 */
export function serializeAtribucion(a: Atribucion): string {
  // Clon para no mutar el objeto del caller (los touches son planos).
  const clon: Atribucion = {
    v: a.v,
    vid: a.vid,
    ...(a.first ? { first: { ...a.first } } : {}),
    ...(a.last ? { last: { ...a.last } } : {}),
  };

  const orden: Array<["first" | "last", keyof Touch]> = [
    ["last", "trm"],
    ["last", "cnt"],
    ["last", "ref"],
    ["last", "lp"],
    ["first", "trm"],
    ["first", "cnt"],
    ["first", "ref"],
    ["first", "lp"],
  ];

  let out = encodeURIComponent(JSON.stringify(clon));
  for (let i = 0; out.length > COOKIE_MAX_BYTES && i < orden.length; i++) {
    const [touch, field] = orden[i];
    const t = clon[touch];
    if (t && field in t) delete t[field];
    out = encodeURIComponent(JSON.stringify(clon));
  }
  return out;
}

// ──────────────────────────────────────────────
// Reglas de captura y actualización
// ──────────────────────────────────────────────

/**
 * Arma un `Touch` a partir del contexto de la página actual, o `null` si no hay
 * señal de campaña ni referrer externo.
 *
 * Emite un touch si hay parámetros de campaña (`utm_*`, `gclid`, `fbclid`,
 * `gad_source`) O un referrer EXTERNO (host distinto al actual). Un referrer
 * vacío o mal formado = visita directa; el mismo host = navegación interna:
 * ninguno de esos genera touch (regla non-direct de GA4/Matomo — el sitio
 * navega con `<a>` full-reload y cada página trae un `document.referrer`
 * interno, así que el compare por host es obligatorio).
 *
 * Los parámetros tienen prioridad como señal, pero `ref` se setea igual cuando
 * hay un referrer externo. `lp` = pathname de entrada. `ts` = `now`.
 */
export function extraerTouch(input: {
  search: string;
  referrer: string;
  pathname: string;
  host: string;
  now: number;
}): Touch | null {
  const { search, referrer, pathname, host, now } = input;

  const params = new URLSearchParams(search || "");
  const pick = (k: string): string | undefined => {
    const v = params.get(k);
    if (!v) return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
  };

  const src = pick("utm_source");
  const med = pick("utm_medium");
  const cmp = pick("utm_campaign");
  const cnt = pick("utm_content");
  const trm = pick("utm_term");
  const gclid = pick("gclid");
  const fbclid = pick("fbclid");
  const gad = pick("gad_source");
  const hasParams = !!(src || med || cmp || cnt || trm || gclid || fbclid || gad);

  // Referrer externo: host distinto al actual. Vacío o mal formado → directo.
  let ref: string | undefined;
  if (referrer) {
    try {
      const refHost = new URL(referrer).host;
      if (refHost && refHost !== host) ref = referrer;
    } catch {
      // Referrer mal formado: lo tratamos como directo (sin ref).
    }
  }

  // Sin señal de campaña ni referrer externo → directa/interna: NO hay touch.
  if (!hasParams && !ref) return null;

  const touch: Touch = { ts: now };
  if (src) touch.src = src.slice(0, CAP_CAMPO);
  if (med) touch.med = med.slice(0, CAP_CAMPO);
  if (cmp) touch.cmp = cmp.slice(0, CAP_CAMPO);
  if (cnt) touch.cnt = cnt.slice(0, CAP_CAMPO);
  if (trm) touch.trm = trm.slice(0, CAP_CAMPO);
  if (gclid) touch.gclid = gclid.slice(0, CAP_CLICKID);
  if (fbclid) touch.fbclid = fbclid.slice(0, CAP_CLICKID);
  if (gad) touch.gad = gad.slice(0, CAP_CLICKID);
  if (ref) touch.ref = ref.slice(0, CAP_REF);
  if (pathname) touch.lp = pathname.slice(0, CAP_REF);
  return touch;
}

/**
 * Aplica las reglas first/last sobre la atribución previa dado un touch nuevo
 * (o `null` si esta página no trajo señal).
 *
 * - Sin previa: crea una atribución con `vid` nuevo; si hay touch, first=last.
 * - Con previa: `first` NUNCA se pisa (si faltaba y hay touch, se setea una
 *   única vez); `last` se pisa solo ante un touch nuevo.
 *
 * `cambio` indica si el contenido cambió (hay que reescribir sí o sí). Ojo: el
 * caller igual re-emite la cookie SIEMPRE para renovar el TTL rodante — `cambio`
 * es informativo, no un gate del write.
 */
export function actualizarAtribucion(
  previa: Atribucion | null,
  touch: Touch | null,
  genVid: () => string,
): { atrib: Atribucion; cambio: boolean } {
  if (!previa) {
    const atrib: Atribucion = { v: 1, vid: genVid() };
    if (touch) {
      atrib.first = { ...touch };
      atrib.last = { ...touch };
    }
    // vid nuevo: la cookie hay que escribirla.
    return { atrib, cambio: true };
  }

  const atrib: Atribucion = {
    v: 1,
    vid: previa.vid,
    ...(previa.first ? { first: previa.first } : {}),
    ...(previa.last ? { last: previa.last } : {}),
  };

  let cambio = false;
  if (touch) {
    // first se setea una sola vez; jamás se pisa.
    if (!atrib.first) {
      atrib.first = { ...touch };
      cambio = true;
    }
    // last refleja siempre la última señal.
    atrib.last = { ...touch };
    cambio = true;
  }
  return { atrib, cambio };
}

// ──────────────────────────────────────────────
// Formato para humanos (fase B: línea de pauta en emails de notificación)
// ──────────────────────────────────────────────

/**
 * Reduce un touch a una etiqueta corta tipo "meta / cpc / invierno-2026"
 * (src / med / cmp, solo los presentes). Si no hay UTM pero sí un click ID,
 * igual identifica la plataforma ("google", "meta"). `null` si el touch no
 * trae ninguna señal de pauta (un touch con solo `ref`/`lp` es referrer
 * externo orgánico, no campaña).
 */
function etiquetaTouch(t: Touch | null | undefined): string | null {
  if (!t) return null;
  const campos = [t.src, t.med, t.cmp].filter((v): v is string => Boolean(v));
  if (campos.length) return campos.join(" / ");
  if (t.gclid || t.gad) return "google";
  if (t.fbclid) return "meta";
  return null;
}

/**
 * Arma un resumen humano corto de la pauta que trajo al lead, para mostrar en
 * los emails de notificación (texto plano, sin URLs). Ej: "meta / cpc /
 * invierno-2026", o con cambio de canal en el camino: "meta / cpc /
 * invierno-2026 · último: google / brand-search".
 *
 * Preferimos el `first` (la entrada real por pauta) como base. Si el `first`
 * no tiene señal de campaña pero el `last` sí (ej. first touch fue un
 * referrer orgánico y en una visita posterior entró por un ad), mostramos el
 * `last` igual en vez de esconder un dato de campaña real. Devuelve `null`
 * solo cuando NINGUNO de los dos touches trae señal de pauta.
 */
export function resumenPauta(
  first: Touch | null | undefined,
  last: Touch | null | undefined,
): string | null {
  const etFirst = etiquetaTouch(first);
  const etLast = etiquetaTouch(last);

  const base = etFirst ?? etLast;
  if (!base) return null;

  // Apendeamos el last solo si hay AMBOS touches con señal y difieren entre
  // sí (cambio de campaña/fuente durante el recorrido del visitante).
  if (etFirst && etLast && etLast !== etFirst) {
    return `${base} · último: ${etLast}`;
  }
  return base;
}
