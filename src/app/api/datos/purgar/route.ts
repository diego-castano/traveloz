import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import { purgarBovedaVencida } from "@/lib/datos-purga";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger.child({ module: "api/datos/purgar" });

/**
 * Purga de la bóveda de datos de pago: pone en null payload/iv/tag de todo lo
 * vencido y sella `purgadoAt`. La lógica vive en `@/lib/datos-purga` (un solo
 * updateMany, con where estricto); acá queda la capa HTTP.
 *
 * Dos vías de autenticación, cualquiera alcanza:
 *   • Sesión ADMIN — para dispararla a mano desde el panel.
 *   • Header `x-purga-secret` igual a la env PURGA_SECRET — para el scheduled
 *     job de Railway, que no tiene sesión. Si la env no está configurada, esa
 *     vía responde 503: preferimos que el job falle ruidosamente antes que
 *     dejar el endpoint abierto con un secreto vacío.
 *
 * Idempotente: correrla dos veces seguidas devuelve `purgados: 0` la segunda.
 * Solo POST — un GET que borre datos es un accidente esperando a un preload.
 */
export async function POST(req: Request) {
  const secretHeader = req.headers.get("x-purga-secret");

  if (secretHeader !== null) {
    const secret = process.env.PURGA_SECRET?.trim();
    if (!secret) {
      return NextResponse.json(
        {
          error:
            "PURGA_SECRET no está configurada en el entorno, así que la vía por header está deshabilitada. " +
            "Definí la variable en Railway (y acordate de forzar un redeploy: cambiar una env no reinicia " +
            "el contenedor vivo) o llamá a este endpoint con una sesión ADMIN.",
        },
        { status: 503 },
      );
    }
    if (secretHeader !== secret) {
      log.warn("datos.purga.secret-invalido");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  } else {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const purgados = await purgarBovedaVencida();
    return NextResponse.json({ ok: true, purgados });
  } catch (err) {
    log.error("datos.purga failed", err);
    return NextResponse.json(
      { ok: false, purgados: 0, error: "La purga falló. Revisá los logs." },
      { status: 500 },
    );
  }
}
