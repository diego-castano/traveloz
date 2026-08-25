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
//   500 → la página cargó pero no devolvió la hoja, o el navegador no llegó a
//         ella, o cualquier otra rotura nuestra.
//   503 → este servidor no tiene Chromium, o COTIZADOR_PDF_OFF=1.
//   504 → el render pasó el techo de 45 s.
// Todo lo que no es 200 sale como JSON { ok:false, error } y, cuando el que
// falló fue el render, además { codigo, etapa }. Esa ruta ya pide sesión de
// vendedor, así que ahí no hay nada que esconderle a quien la llama: sin esos
// dos campos, un 500 después de 30 s de espera no se puede diagnosticar sin
// entrar al contenedor. `codigo` es SIN_CHROMIUM | TIMEOUT | PAGINA_INVALIDA |
// OCUPADO | NAVEGACION | DESCONOCIDO; `etapa`, lanzar | goto | hoja | fuentes
// | imagenes | pdf.
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
  etapaDeError,
  nombreArchivoPdf,
  pdfDisponible,
  renderizarPdfDeCotizacion,
} from "@/lib/pdf";
import type { CodigoErrorPdf, EtapaPdf } from "@/lib/pdf";
import { sumarHorasHabiles } from "@/lib/presupuesto/habiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger.child({ op: "cotizador.pdf" });

function error(
  mensaje: string,
  status: number,
  extra?: { codigo: CodigoErrorPdf; etapa: EtapaPdf | null },
) {
  return NextResponse.json({ ok: false, error: mensaje, ...extra }, { status });
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
      { codigo: "SIN_CHROMIUM", etapa: null },
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
      // Horas hábiles, igual que las actions: el sábado y el domingo no
      // corren para ningún link, tampoco para el que emite el PDF.
      const link = await emitirORenovar(
        row.id,
        "pdf",
        horas,
        sumarHorasHabiles(new Date(), horas),
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
    const codigo = codigoDeError(err) ?? "DESCONOCIDO";
    const etapa = etapaDeError(err);
    const detalle = { codigo, etapa };

    // `pdf.ts` ya loguea el fallo con etapa, tiempos y status del goto. Acá
    // solo se agrega lo que ese log no sabe: qué cotización se estaba pidiendo.
    log.error("cotizador.pdf.render.fail", { id: params.id, codigo, etapa });

    switch (codigo) {
      case "SIN_CHROMIUM":
        return error(
          "Este servidor no puede generar PDF ahora. Usá la vista de impresión del navegador.",
          503,
          detalle,
        );
      case "TIMEOUT":
        return error(
          "El PDF tardó demasiado. Probá de nuevo en un minuto.",
          504,
          detalle,
        );
      case "OCUPADO":
        return error(
          "Hay varios PDF generándose al mismo tiempo. Probá de nuevo en un minuto.",
          429,
          detalle,
        );
      case "PAGINA_INVALIDA":
        return error("No pudimos armar la hoja de la cotización.", 500, detalle);
      case "NAVEGACION":
        return error(
          "El servidor no pudo abrir la hoja de la cotización.",
          500,
          detalle,
        );
      default:
        return error("No pudimos generar el PDF. Probá de nuevo.", 500, detalle);
    }
  }
}
