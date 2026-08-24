// ---------------------------------------------------------------------------
// GET /api/cotizador/pdf/salud — ¿hay Chromium en este contenedor?
//
// Es el chequeo de después del deploy: arranca el navegador, le pide la
// versión y lo cierra. No navega a ninguna página, no toca la base y no
// depende de que exista ninguna cotización.
//
// Solo ADMIN: la respuesta dice la ruta del binario del servidor, que no es
// información para el vendedor.
//
// Contrato:
//   200 → { ok, chromium: string|null, version?: string, ms, error? }
//         `ok:false` con 200 es a propósito: la ruta respondió bien, lo que
//         falló es el navegador. El status habla del chequeo, no del sujeto.
//   401 → sin sesión · 403 → no es admin.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { saludPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const status = msg.startsWith("Acceso restringido") ? 403 : 401;
    return NextResponse.json({ ok: false, error: msg || "No autorizado." }, { status });
  }

  const salud = await saludPdf();
  return NextResponse.json(salud, {
    status: 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
