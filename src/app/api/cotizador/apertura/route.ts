// ---------------------------------------------------------------------------
// POST /api/cotizador/apertura — beacon de lectura del link público.
//
// Lo llama la página /c/<token> (sin sesión) en dos momentos:
//
//   1. Al montar, SIN `aperturaId`: crea la fila `PresupuestoApertura`, suma al
//      contador del presupuesto y lo pasa a ABIERTA si venía de ENVIADA.
//      Responde `{ aperturaId }`.
//   2. Cada 15 s / al ocultar la pestaña, CON `aperturaId`: actualiza hasta qué
//      sección llegó y cuántos segundos lleva. Estas llamadas salen por
//      `navigator.sendBeacon`, así que la respuesta no la lee nadie.
//
// Lo que NO cuenta como apertura: la vista de impresión (`?print=1`) y el
// render server-side del PDF (header `x-cotizador-pdf`). La vista previa del
// vendedor tampoco pasa por acá — no usa esta página.
//
// Convención del repo (visita/upload/health): runtime nodejs, named POST,
// NextResponse.json, validación manual inline, sin auth().
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkAperturaRate } from "@/lib/rate-limit";
import {
  dispositivoDesdeUA,
  indiceSeccion,
  normalizarToken,
  seccionMasAvanzada,
} from "@/lib/presupuesto/links";
// Mismo criterio que /api/visita: el proxy de Railway apendea la IP real al
// final de X-Forwarded-For. Vive en src/lib/request-ip.ts desde que el lector
// de itinerarios necesitó exactamente la misma lectura.
import { ipConfiable } from "@/lib/request-ip";

export const runtime = "nodejs";

const log = logger.child({ module: "api.cotizador.apertura" });

/** Techo del contador de segundos: 6 horas. Más que eso es una pestaña olvidada. */
const SEGUNDOS_MAX = 6 * 60 * 60;

export async function POST(req: NextRequest) {
  // El render del PDF abre la misma página: no puede inflar las aperturas.
  if (req.headers.get("x-cotizador-pdf")) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  let body: { token?: unknown; aperturaId?: unknown; seccion?: unknown; segundos?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const token = normalizarToken(body.token);
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const ip = ipConfiable(req);
  // Limiter propio (ver checkAperturaRate): el de formularios da 20 golpes por
  // hora y este beacon late cada 15 s mientras el pasajero lee.
  if (!checkAperturaRate(ip, token).allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  // Link vivo: existe, sin revocar, dentro de la vigencia y con la cotización
  // sin borrar. Es la misma puerta que la página pública.
  const link = await prisma.presupuestoLink.findUnique({
    where: { token },
    select: {
      id: true,
      expiraAt: true,
      revocadoAt: true,
      presupuesto: { select: { id: true, estado: true, primeraAperturaAt: true, deletedAt: true } },
    },
  });
  if (
    !link ||
    link.revocadoAt ||
    link.presupuesto.deletedAt ||
    link.expiraAt.getTime() < Date.now()
  ) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const seccion = typeof body.seccion === "string" ? body.seccion : null;
  const segundosCrudos = Number(body.segundos);
  const segundos =
    Number.isFinite(segundosCrudos) && segundosCrudos > 0
      ? Math.min(Math.round(segundosCrudos), SEGUNDOS_MAX)
      : null;

  const aperturaId = typeof body.aperturaId === "string" ? body.aperturaId.trim() : "";

  try {
    if (aperturaId) {
      return await actualizar(aperturaId, link.id, seccion, segundos);
    }
    return await abrir(link, ip, req.headers.get("user-agent"), seccion);
  } catch (err) {
    log.error("apertura.fail", { token, err });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** Primera llamada: nace la apertura y el presupuesto pasa a ABIERTA. */
async function abrir(
  link: {
    id: string;
    presupuesto: { id: string; estado: string; primeraAperturaAt: Date | null };
  },
  ip: string | null,
  ua: string | null,
  seccion: string | null,
) {
  const ahora = new Date();
  const apertura = await prisma.presupuestoApertura.create({
    data: {
      linkId: link.id,
      userAgent: ua?.slice(0, 400) ?? null,
      dispositivo: dispositivoDesdeUA(ua),
      ip,
      seccionMax: indiceSeccion(seccion) >= 0 ? seccion : "encabezado",
    },
    select: { id: true },
  });

  // Sin $transaction: un update suelto y tolerante. Si esto fallara, la
  // apertura ya quedó registrada y el drawer la muestra igual.
  await prisma.presupuesto
    .update({
      where: { id: link.presupuesto.id },
      data: {
        aperturas: { increment: 1 },
        ultimaAperturaAt: ahora,
        ...(link.presupuesto.primeraAperturaAt ? {} : { primeraAperturaAt: ahora }),
        // ENVIADA → ABIERTA. Una CONFIRMADA no vuelve para atrás porque el
        // pasajero recargue la página, y una VENCIDA no llega hasta acá.
        ...(link.presupuesto.estado === "ENVIADA" ? { estado: "ABIERTA" as const } : {}),
      },
    })
    .catch((err) => log.error("apertura.presupuesto.fail", { id: link.presupuesto.id, err }));

  await prisma.presupuestoEvento
    .create({
      data: {
        presupuestoId: link.presupuesto.id,
        tipo: "abierta",
        titulo: link.presupuesto.primeraAperturaAt ? "Reabierta por el pasajero" : "Primera apertura",
        detalle: dispositivoDesdeUA(ua),
        actorTipo: "pasajero",
      },
    })
    .catch((err) => log.error("apertura.evento.fail", { id: link.presupuesto.id, err }));

  return NextResponse.json({ ok: true, aperturaId: apertura.id });
}

/**
 * Llamadas siguientes: hasta dónde llegó y cuánto tiempo lleva.
 *
 * `seccionMax` solo avanza (nunca retrocede si el pasajero sube a releer el
 * encabezado) y `segundos` se queda con el máximo: dos pestañas de la misma
 * cotización no se pisan hacia abajo.
 */
async function actualizar(
  aperturaId: string,
  linkId: string,
  seccion: string | null,
  segundos: number | null,
) {
  const actual = await prisma.presupuestoApertura.findFirst({
    // El linkId en el WHERE ata la apertura a ESTE token: con el id de otra
    // apertura no se puede escribir sobre la lectura de otro pasajero.
    where: { id: aperturaId, linkId },
    select: { id: true, seccionMax: true, segundos: true },
  });
  if (!actual) return NextResponse.json({ ok: false }, { status: 404 });

  const seccionMax = seccionMasAvanzada(actual.seccionMax, seccion);
  const segundosMax =
    segundos != null ? Math.max(segundos, actual.segundos ?? 0) : actual.segundos;

  await prisma.presupuestoApertura.update({
    where: { id: actual.id },
    data: { seccionMax, segundos: segundosMax },
  });

  return NextResponse.json({ ok: true, aperturaId: actual.id });
}
