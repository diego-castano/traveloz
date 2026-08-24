/**
 * POST /api/cotizador/leer-itinerario
 *
 * Reemplazo de PNR Converter: recibe el pegado del GDS y/o una captura de la
 * reserva y devuelve el itinerario ya listo para el editor del cotizador.
 *
 * Entrada  { texto?: string, imagen?: { mimeType, base64 } }  (al menos uno)
 * Salida   { ok: true, trayectos, vuelos }  |  { ok: false, codigo, error }
 *
 * Solo para gente logueada del panel. La API key de Gemini nunca sale de acá.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ErrorGemini, leerItinerarioConGemini, modeloGemini } from "@/lib/gemini";
import { trayectosAVuelos } from "@/lib/presupuesto/itinerario";
import { ipConfiableDeHeaders } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger.child({ op: "cotizador.leer-itinerario" });

const TEXTO_MAX = 20_000;
const IMAGEN_MAX_BYTES = 6 * 1024 * 1024;
/**
 * Tope del string base64 en el body. Sin esto, Zod aceptaba un `base64` de
 * cualquier largo y recién después medíamos los bytes: el string enorme ya
 * estaba en memoria y ya lo habíamos recorrido entero. 4/3 del binario + los
 * saltos de línea que mete cualquier encoder, con 1 KB de holgura.
 */
const BASE64_MAX_CHARS = Math.ceil(IMAGEN_MAX_BYTES * 1.37) + 1024;
const MIMES = ["image/png", "image/jpeg", "image/webp"] as const;

/* ── rate limit: 30 lecturas por minuto por usuario+IP ─────────────────────
   Local a este módulo y no en `src/lib/rate-limit.ts` porque los buckets de
   allá son por hora (login, formularios públicos) y acá hace falta una ventana
   de un minuto. Misma estrategia process-local: alcanza mientras Railway corra
   una sola instancia; si escalamos horizontal, va a Redis. */

const VENTANA_MS = 60_000;
const MAX_HITS = 30;
const buckets = new Map<string, { count: number; resetAt: number }>();

function pasaLimite(clave: string): { ok: boolean; reintentarEn: number } {
  const ahora = Date.now();
  if (buckets.size > 2000) {
    buckets.forEach((b, k) => {
      if (b.resetAt < ahora) buckets.delete(k);
    });
  }
  const b = buckets.get(clave);
  if (!b || b.resetAt < ahora) {
    buckets.set(clave, { count: 1, resetAt: ahora + VENTANA_MS });
    return { ok: true, reintentarEn: 0 };
  }
  b.count += 1;
  if (b.count > MAX_HITS) {
    return { ok: false, reintentarEn: Math.ceil((b.resetAt - ahora) / 1000) };
  }
  return { ok: true, reintentarEn: 0 };
}

/**
 * IP del que pide. El extremo confiable de X-Forwarded-For es el ÚLTIMO: el
 * primero lo escribe el cliente y con un header rotando en cada request el
 * limitador de abajo no frenaba nada. Mismo helper que el beacon de apertura.
 */
async function ipDeRequest(): Promise<string | null> {
  try {
    return ipConfiableDeHeaders(await headers());
  } catch {
    return null;
  }
}

/* ── caché del catálogo de aerolíneas ──────────────────────────────────────
   La tabla `Aerolinea` cambia una vez cada muerte de obispo: no tiene sentido
   pegarle a la base en cada lectura. Solo lectura, cinco minutos. */

let cacheAerolineas: { mapa: Record<string, string>; hasta: number } | null = null;

async function mapaAerolineas(): Promise<Record<string, string>> {
  const ahora = Date.now();
  if (cacheAerolineas && cacheAerolineas.hasta > ahora) return cacheAerolineas.mapa;
  try {
    const filas = await prisma.aerolinea.findMany({ select: { codigo: true, nombre: true } });
    const mapa: Record<string, string> = {};
    for (const f of filas) mapa[f.codigo.toUpperCase()] = f.nombre;
    cacheAerolineas = { mapa, hasta: ahora + 5 * 60_000 };
    return mapa;
  } catch (err) {
    // Sin catálogo el itinerario igual sirve: queda el código IATA como nombre.
    log.warn("no se pudo leer el catálogo de aerolíneas", err);
    return cacheAerolineas?.mapa ?? {};
  }
}

/* ── body ─────────────────────────────────────────────────────────────── */

const bodySchema = z
  .object({
    texto: z.string().max(TEXTO_MAX, `El texto no puede pasar de ${TEXTO_MAX} caracteres.`).optional(),
    imagen: z
      .object({
        mimeType: z.enum(MIMES, "Formato de imagen no soportado (PNG, JPEG o WEBP)."),
        base64: z.string().min(1).max(BASE64_MAX_CHARS, "La imagen pesa demasiado."),
      })
      .optional(),
  })
  .refine((b) => Boolean(b.texto?.trim()) || Boolean(b.imagen), {
    message: "Mandá el texto del itinerario o una imagen.",
  });

/**
 * Tamaño real del binario detrás de un base64, sin decodificarlo. Espera el
 * string YA limpio de espacios (lo limpia el handler, una sola vez).
 */
function bytesDeBase64(limpio: string): number {
  const relleno = limpio.endsWith("==") ? 2 : limpio.endsWith("=") ? 1 : 0;
  return Math.floor((limpio.length * 3) / 4) - relleno;
}

function error(codigo: string, mensaje: string, status: number) {
  return NextResponse.json({ ok: false, codigo, error: mensaje }, { status });
}

/* ── handler ──────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  if (process.env.COTIZADOR_IA_OFF === "1") {
    return error("APAGADO", "Lector desactivado", 503);
  }

  const session = await auth();
  if (!session?.user) {
    return error("NO_AUTORIZADO", "Tenés que iniciar sesión.", 401);
  }

  const ip = await ipDeRequest();
  const userId = String(session.user.id ?? session.user.email ?? "desconocido");
  const limite = pasaLimite(`${userId}:${ip || "sin-ip"}`);
  if (!limite.ok) {
    return NextResponse.json(
      {
        ok: false,
        codigo: "DEMASIADAS",
        error: `Demasiadas lecturas seguidas. Probá de nuevo en ${limite.reintentarEn} segundos.`,
      },
      { status: 429, headers: { "Retry-After": String(limite.reintentarEn) } },
    );
  }

  let crudo: unknown;
  try {
    crudo = await req.json();
  } catch {
    return error("CUERPO_INVALIDO", "El pedido no traía un JSON válido.", 400);
  }

  const parseado = bodySchema.safeParse(crudo);
  if (!parseado.success) {
    const primero = parseado.error.issues[0];
    return error("CUERPO_INVALIDO", primero?.message || "Pedido inválido.", 400);
  }

  const { texto, imagen } = parseado.data;
  // Una sola pasada de limpieza: la medición y lo que se le manda a Gemini
  // trabajan sobre el MISMO string.
  const base64 = imagen ? imagen.base64.replace(/\s/g, "") : null;
  if (imagen && base64 !== null) {
    if (bytesDeBase64(base64) > IMAGEN_MAX_BYTES) {
      return error(
        "IMAGEN_GRANDE",
        `La imagen pesa más de ${Math.round(IMAGEN_MAX_BYTES / 1024 / 1024)} MB.`,
        413,
      );
    }
  }

  const inicio = Date.now();
  try {
    const resultado = await leerItinerarioConGemini({
      texto,
      imagen: imagen && base64 !== null ? { mimeType: imagen.mimeType, base64 } : undefined,
    });
    const vuelos = trayectosAVuelos(resultado.trayectos, await mapaAerolineas());

    // Nunca logueamos el itinerario: solo cuánto tardó y cuánto salió.
    log.info("ok", {
      userId,
      modelo: resultado.modelo,
      duration_ms: Date.now() - inicio,
      gemini_ms: resultado.ms,
      entrada: imagen ? (texto ? "texto+imagen" : "imagen") : "texto",
      segmentos: vuelos.length,
      tokens_in: resultado.tokensEntrada,
      tokens_out: resultado.tokensSalida,
    });

    return NextResponse.json({ ok: true, trayectos: resultado.trayectos, vuelos });
  } catch (err) {
    const duracion = Date.now() - inicio;
    if (err instanceof ErrorGemini) {
      log.warn("falló", { userId, modelo: modeloGemini(), duration_ms: duracion, codigo: err.codigo });
      const status =
        err.codigo === "CUOTA" ? 429
        : err.codigo === "TIMEOUT" ? 504
        : err.codigo === "RESPUESTA_INVALIDA" ? 422
        : 502;
      const mensaje =
        err.codigo === "SIN_API_KEY"
          ? "El lector no está configurado en este entorno."
          : err.message;
      return error(err.codigo, mensaje, status);
    }
    log.error("error inesperado", { userId, duration_ms: duracion, err });
    return error("FALLA_API", "No se pudo leer el itinerario.", 500);
  }
}
