import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.config";
import { deleteObjects } from "@/lib/storage";
import { collectOrphans, RATIO_MAXIMO_HUERFANOS } from "@/lib/gc-orphans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recolector de objetos huérfanos del bucket. La lógica vive en
 * `@/lib/gc-orphans` (así se puede auditar con un script de solo lectura sin
 * levantar el server); acá queda la capa HTTP.
 *
 * GET  → reporta sin tocar el bucket. Muestra qué protege cada fuente para
 *        poder auditar antes de ejecutar. Siempre seguro de correr.
 * POST → borra de verdad. Exige `?confirm=1` y pasa dos controles antes de
 *        tocar nada: que el barrido genérico de la base haya corrido bien, y
 *        que la proporción de huérfanos no dispare el freno de mano.
 *
 * Pide sesión. No hay `cron` acá: se dispara desde un scheduled job de Railway
 * o a mano desde el admin.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const reporte = await collectOrphans();
  return NextResponse.json(reporte);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  if (sp.get("confirm") !== "1") {
    return NextResponse.json(
      {
        error:
          "Llamá con ?confirm=1 para ejecutar el borrado real. Sin esa flag solo se reporta.",
      },
      { status: 400 },
    );
  }

  const reporte = await collectOrphans();

  // Fail-closed: si el barrido genérico no pudo correr, el set de archivos en
  // uso está incompleto y borrar sería a ciegas.
  if (!reporte.scanGenerico.ok) {
    return NextResponse.json(
      {
        ...reporte,
        deleted: 0,
        error:
          "El barrido genérico de la base falló, así que el set de archivos en uso está incompleto. No se borró nada. Revisá el error y volvé a intentar.",
      },
      { status: 500 },
    );
  }

  if (reporte.frenoDeMano.activado) {
    return NextResponse.json(
      {
        ...reporte,
        deleted: 0,
        error:
          `Freno de mano: ${reporte.orphanCount} de ${reporte.bucket.objetos} objetos ` +
          `(${(reporte.frenoDeMano.ratio * 100).toFixed(1)}%) darían huérfanos, por encima del ` +
          `${(RATIO_MAXIMO_HUERFANOS * 100).toFixed(0)}% permitido. Eso no es basura acumulada, ` +
          "parece un error de configuración (base equivocada, bucket equivocado, o una fuente de " +
          "referencias que dejó de leerse). No se borró nada. Revisá el GET de este mismo endpoint " +
          "y, si de verdad son huérfanos, hacé la limpieza a mano y revisada.",
      },
      { status: 409 },
    );
  }

  if (reporte.orphans.length > 0) {
    await deleteObjects(reporte.orphans);
  }
  return NextResponse.json({ ...reporte, deleted: reporte.orphans.length });
}
