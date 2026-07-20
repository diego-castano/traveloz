// ---------------------------------------------------------------------------
// POST /api/visita — beacon de páginas vistas para atribución de pauta.
//
// Lo llama `AtribucionTracker` (fire-and-forget) en cada pageview. Registra una
// fila anónima en `PaginaVista` ligada al `vid` de la cookie `tvz_attr`, y de
// paso renueva el TTL de esa cookie con un Set-Cookie de SERVIDOR (ver abajo).
//
// Convención del repo (upload/health): `runtime = "nodejs"`, named `POST`,
// `NextResponse.json`, validación manual inline. Sin `auth()` (endpoint público).
// El nombre "visita" evita los patrones track/collect/beacon que las listas de
// bloqueo matchean; queda fuera del matcher del middleware (/backend/:path*).
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkVisitaRate } from "@/lib/rate-limit";
import {
  ATTR_COOKIE,
  ATTR_MAX_AGE,
  UUID_RE,
  parseAtribucion,
} from "@/lib/atribucion";

export const runtime = "nodejs";

const log = logger.child({ module: "api.visita" });

const URL_MAX = 500;
const RETENCION_DIAS = 180;

/**
 * IP del extremo CONFIABLE de X-Forwarded-For. El proxy de Railway APENDEA la IP
 * real del cliente al FINAL de la lista; el primer elemento lo controla el
 * cliente y es spoofeable. Por eso tomamos el ÚLTIMO — a diferencia de
 * `clientIp()` de public-forms.actions.ts, que hace `split(",")[0]` para otro
 * propósito (registro de consentimiento, no rate-limit anti-abuso).
 */
function ipConfiable(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const partes = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length) return partes[partes.length - 1];
  }
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  // Body inválido → 400 sin log ruidoso (es tráfico público, va a haber basura).
  let body: { vid?: unknown; url?: unknown; ref?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const vid = typeof body.vid === "string" ? body.vid : "";
  if (!UUID_RE.test(vid)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // La url debe ser una ruta interna del sitio; jamás del admin.
  const url = typeof body.url === "string" ? body.url.slice(0, URL_MAX) : "";
  if (!url.startsWith("/") || url.startsWith("/backend")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ref =
    typeof body.ref === "string" && body.ref.length
      ? body.ref.slice(0, URL_MAX)
      : null;

  // Rate limit de 3 capas (IP / vid / presupuesto global). Cualquier exceso
  // corta con 429; el cliente lo ignora (fire-and-forget).
  const rate = checkVisitaRate(ipConfiable(req), vid);
  if (!rate.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    await prisma.paginaVista.create({
      data: { visitanteId: vid, url, referrer: ref },
    });
  } catch (err) {
    log.error("paginaVista.create failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Prune probabilístico (~1% de requests): borra historial > 180 días. Es una
  // desviación deliberada del patrón gc-orphans (endpoint admin + job): acá solo
  // se borran filas viejas, sin exponer datos. Si el tráfico bajo lo vuelve
  // impreciso, migrar a un scheduled job de Railway. try/catch propio para que
  // un fallo del prune no afecte la respuesta.
  if (Math.random() < 0.01) {
    try {
      const corte = new Date(Date.now() - RETENCION_DIAS * 24 * 60 * 60 * 1000);
      const res = await prisma.paginaVista.deleteMany({
        where: { createdAt: { lt: corte } },
      });
      if (res.count) log.debug("paginaVista prune", { borradas: res.count });
    } catch (err) {
      log.warn("paginaVista prune failed", err);
    }
  }

  // Renovamos el TTL de la cookie con un Set-Cookie de SERVIDOR: Safari ITP capa
  // a 7 días las cookies escritas por JS, pero no las server-set. Reusamos el
  // MISMO valor que llegó (si valida); si no hay cookie válida, sin Set-Cookie.
  //
  // OJO con el encoding: la API de cookies de Next hace `encodeURIComponent` al
  // setear y `decodeURIComponent` al leer. `req.cookies.get().value` ya viene
  // DECODEADO, y a `res.cookies.set` le pasamos el JSON PLANO (Next lo encodea
  // solo). Si le pasáramos `serializeAtribucion` (que ya encodea) quedaría
  // doble-encodeado y el cliente no podría releerlo. El tamaño ya lo garantizó
  // el cliente al escribir la cookie que estamos renovando.
  const res = NextResponse.json({ ok: true });
  const atrib = parseAtribucion(req.cookies.get(ATTR_COOKIE)?.value);
  if (atrib) {
    res.cookies.set(ATTR_COOKIE, JSON.stringify(atrib), {
      maxAge: ATTR_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
