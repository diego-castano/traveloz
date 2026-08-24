// ---------------------------------------------------------------------------
// GET /api/cotizador/[id]/pdf — el PDF de una cotización, generado al vuelo.
//
// La hoja la dibuja `/c/<token>?print=1` y la imprime Chromium desde
// `src/lib/pdf.ts`. Acá solo va la puerta: sesión, scope y el link vivo.
//
// Contrato:
//   200 → application/pdf, `attachment; filename="COT-2026-0001.pdf"`.
//         Con `?inline=1` va `inline`, para verlo en la pestaña del navegador.
//   401 → sin sesión.
//   403 → rol sin cotizador (MARKETING).
//   404 → no existe, está borrada, o es de otro vendedor (a un ajeno le
//         respondemos lo mismo que a una inexistente).
//   429 → los dos slots de render ocupados y la espera se agotó.
//   500 → la página cargó pero no devolvió la hoja (bug nuestro).
//   503 → este servidor no tiene Chromium, o COTIZADOR_PDF_OFF=1.
//   504 → el render pasó el techo de 45 s.
// Todo lo que no es 200 sale como JSON { ok:false, error }.
//
// Lo que esta ruta NO hace: sellar el envío. Bajar el PDF no es mandarle nada
// al pasajero, así que el estado y el reloj de la vigencia no se tocan. Sí
// puede renovar el vencimiento del link cuando ya venció — sin un link vivo no
// hay página que imprimir, y es exactamente lo que ya hacía "Copiar link".
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import {
  ErrorDeNegocio,
  cargarPropia,
  emitirORenovar,
  linkVivo,
  scopeVendedor,
} from "@/lib/presupuesto/acceso";
import {
  codigoDeError,
  nombreArchivoPdf,
  pdfDisponible,
  renderizarPdfDeCotizacion,
} from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger.child({ op: "cotizador.pdf" });

/** Una hora en milisegundos, igual que en las actions. */
const HORA_MS = 3_600_000;

function error(mensaje: string, status: number) {
  return NextResponse.json({ ok: false, error: mensaje }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // ── quién pide ──────────────────────────────────────────────────────────
  let scope;
  try {
    scope = await scopeVendedor();
  } catch (err) {
    // scopeVendedor tira ErrorDeNegocio para el rol equivocado y un Error
    // pelado ("No autorizado…") cuando directamente no hay sesión.
    if (err instanceof ErrorDeNegocio) return error(err.message, 403);
    return error("Iniciá sesión para bajar el PDF.", 401);
  }

  // ── se puede generar en esta máquina ────────────────────────────────────
  // Se pregunta ANTES de tocar el link: si no hay navegador, no tiene sentido
  // renovarle el vencimiento a nadie.
  if (!(await pdfDisponible())) {
    return error(
      "Este servidor no puede generar PDF ahora. Usá la vista de impresión del navegador.",
      503,
    );
  }

  // ── la cotización y su link ─────────────────────────────────────────────
  let numero: string;
  let token: string;
  try {
    const row = await cargarPropia(String(params.id ?? ""), scope);
    numero = row.numero;

    const vivo = await linkVivo(row.id);
    if (vivo && vivo.expiraAt.getTime() > Date.now()) {
      token = vivo.token;
    } else {
      const horas = row.vigenciaHoras || 48;
      const link = await emitirORenovar(
        row.id,
        "pdf",
        horas,
        new Date(Date.now() + horas * HORA_MS),
      );
      token = link.token;
    }
  } catch (err) {
    if (err instanceof ErrorDeNegocio) return error(err.message, 404);
    log.error("cotizador.pdf.link.fail", { id: params.id, err });
    return error("No pudimos preparar el PDF. Probá de nuevo.", 500);
  }

  // ── el render ───────────────────────────────────────────────────────────
  try {
    const pdf = await renderizarPdfDeCotizacion({ token, numero });
    const inline = req.nextUrl.searchParams.get("inline") === "1";

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${nombreArchivoPdf(numero)}"`,
        // Adentro va el nombre, el itinerario y el precio de una persona: no
        // se guarda en ningún cache intermedio.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    switch (codigoDeError(err)) {
      case "SIN_CHROMIUM":
        return error(
          "Este servidor no puede generar PDF ahora. Usá la vista de impresión del navegador.",
          503,
        );
      case "TIMEOUT":
        return error("El PDF tardó demasiado. Probá de nuevo en un minuto.", 504);
      case "OCUPADO":
        return error(
          "Hay varios PDF generándose al mismo tiempo. Probá de nuevo en un minuto.",
          429,
        );
      case "PAGINA_INVALIDA":
        return error("No pudimos armar la hoja de la cotización.", 500);
      default:
        log.error("cotizador.pdf.render.fail", { id: params.id, err });
        return error("No pudimos generar el PDF. Probá de nuevo.", 500);
    }
  }
}
