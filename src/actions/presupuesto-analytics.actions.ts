"use server";

// ---------------------------------------------------------------------------
// Analytics del cotizador — solo ADMIN.
//
// Archivo aparte de presupuesto.actions.ts porque no comparte nada con él: no
// escribe, no usa el scope por vendedor (el admin ve todo por definición) y su
// única query pesada conviene tenerla a la vista.
//
// Dos queries fijas y una tercera chica para los nombres. Nada de N+1: las
// filas y las aperturas bajan crudas y `agregarAnalytics` (lib/presupuesto/
// analytics.ts) hace las cuentas en memoria, en una pasada.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/require-auth";
import {
  agregarAnalytics,
  type AnalyticsCotizador,
} from "@/lib/presupuesto/analytics";

const log = logger.child({ module: "presupuesto-analytics.actions" });

const GENERICO = "No pudimos calcular las métricas. Probá de nuevo.";

/** Tope de cotizaciones por consulta. Arriba de esto el número es un piso. */
const TOPE_FILAS = 5_000;
/** Tope de aperturas. Una cotización caliente junta decenas. */
const TOPE_APERTURAS = 20_000;

/** Rango por defecto: los últimos 90 días por `createdAt`. */
const DIAS_DEFAULT = 90;
const DIA_MS = 86_400_000;

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export type { AnalyticsCotizador } from "@/lib/presupuesto/analytics";

const Entrada = z
  .object({
    desde: z.string().min(1).optional(),
    hasta: z.string().min(1).optional(),
    vendedorId: z.string().min(1).optional(),
  })
  .optional();

export type EntradaAnalytics = z.infer<typeof Entrada>;

/** ISO → Date, o null si vino cualquier cosa. El rango nunca rompe la pantalla. */
function fecha(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Mismo envoltorio que `ejecutar()` en presupuesto.actions.ts: acá nada tira. */
async function ejecutar<T>(nombre: string, fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("No autorizado") || msg.startsWith("Acceso restringido")) {
      return { ok: false, error: msg };
    }
    log.error(`${nombre}.fail`, { err });
    return { ok: false, error: GENERICO };
  }
}

/** Columnas que mira la agregación. El JSON `contenido` no entra ni de casualidad. */
const SELECT_ANALYTICS = {
  id: true,
  vendedorId: true,
  estado: true,
  estadoManual: true,
  montoPrincipal: true,
  destino: true,
  createdAt: true,
  enviadaAt: true,
  expiraAt: true,
  confirmadaAt: true,
  aperturas: true,
  primeraAperturaAt: true,
  ultimaAperturaAt: true,
  tiempoArmadoSeg: true,
} as const;

/**
 * Métricas del cotizador para el panel del admin.
 *
 * @param entrada.desde       ISO. Default: hace 90 días.
 * @param entrada.hasta       ISO. Default: ahora.
 * @param entrada.vendedorId  filtra a un vendedor. Default: todos.
 */
export async function analyticsCotizador(
  entrada?: EntradaAnalytics,
): Promise<Resultado<AnalyticsCotizador>> {
  return ejecutar("analyticsCotizador", async () => {
    const { brandId } = await requireAdmin();
    const args = Entrada.parse(entrada) ?? {};

    const hasta = fecha(args.hasta) ?? new Date();
    const desde = fecha(args.desde) ?? new Date(hasta.getTime() - DIAS_DEFAULT * DIA_MS);
    const vendedorId = args.vendedorId && args.vendedorId !== "todos" ? args.vendedorId : null;

    // El mismo WHERE para las dos queries: si divergen, el embudo deja de
    // corresponderse con las filas de arriba.
    const where = {
      brandId,
      deletedAt: null,
      createdAt: { gte: desde, lte: hasta },
      ...(vendedorId ? { vendedorId } : {}),
    };

    const [filasCrudas, aperturas] = await Promise.all([
      prisma.presupuesto.findMany({
        where,
        select: SELECT_ANALYTICS,
        orderBy: { createdAt: "asc" },
        take: TOPE_FILAS + 1,
      }),
      // Por relación y no por `in: [...5000 ids]`: el IN gigante hace que
      // Postgres tire el plan por la ventana.
      //
      // El orden importa por el `take`: sin `orderBy` el recorte del tope se
      // queda con las aperturas que Postgres devuelva primero, que no es nada
      // en particular. Por `abiertaAt` descendente, lo que sobrevive al tope
      // son las más recientes — el embudo y los dispositivos describen el mes
      // pasado y no un pedazo arbitrario del año.
      prisma.presupuestoApertura.findMany({
        where: { link: { presupuesto: where } },
        select: {
          linkId: true,
          abiertaAt: true,
          dispositivo: true,
          seccionMax: true,
          segundos: true,
        },
        orderBy: { abiertaAt: "desc" },
        take: TOPE_APERTURAS + 1,
      }),
    ]);

    const truncado =
      filasCrudas.length > TOPE_FILAS || aperturas.length > TOPE_APERTURAS;
    const filas = filasCrudas.slice(0, TOPE_FILAS);

    const ids = Array.from(new Set(filas.map((f) => f.vendedorId)));
    const usuarios = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];

    return agregarAnalytics(
      filas,
      aperturas.slice(0, TOPE_APERTURAS),
      usuarios,
      { desde, hasta, truncado },
    );
  });
}
