// ---------------------------------------------------------------------------
// GET /api/cotizador/pdf/salud — ¿este contenedor puede generar el PDF?
//
// Es el chequeo de después del deploy. Sin parámetros arranca el navegador, le
// pide la versión y lo cierra: no navega a ninguna página, no toca la base y no
// depende de que exista ninguna cotización.
//
// Con `?render=1` hace además la prueba que importa: navega a `/api/health`
// por la MISMA base que usa el render de verdad (`baseDeRenderPdf()`, que en
// producción es el loopback `http://127.0.0.1:$PORT`). Si eso contesta, el
// camino del PDF está entero; si no contesta, ya sabemos que el problema es la
// entrada al Next y no Chromium.
//
// Solo ADMIN: la respuesta dice la ruta del binario y la base interna del
// servidor, que no es información para el vendedor.
//
// Contrato:
//   200 → { ok, chromium: string|null, version?, ms, error?,
//           render?: { base, url, alcanzado, ok, status, ms, error? } }
//         `ok:false` con 200 es a propósito: la ruta respondió bien, lo que
//         falló es el navegador. El status habla del chequeo, no del sujeto.
//         En `render`, `alcanzado` dice si el navegador recibió alguna
//         respuesta HTTP (o sea: si la base es alcanzable) y `ok` si esa
//         respuesta fue 200. Un 503 ahí es la base de datos caída, no el
//         loopback roto, y por eso no tumba el `ok` de arriba.
//   401 → sin sesión · 403 → no es admin.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { saludPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const status = msg.startsWith("Acceso restringido") ? 403 : 401;
    return NextResponse.json({ ok: false, error: msg || "No autorizado." }, { status });
  }

  const render = req.nextUrl.searchParams.get("render") === "1";
  const salud = await saludPdf({ render });
  return NextResponse.json(salud, {
    status: 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
