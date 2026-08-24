// ---------------------------------------------------------------------------
// Quién puede tocar qué cotización, y el link vivo de cada una.
//
// Esto vivía adentro de `src/actions/presupuesto.actions.ts` y salió acá
// cuando apareció el segundo consumidor: `GET /api/cotizador/[id]/pdf`, que
// necesita exactamente el mismo scope y el mismo link que la action de
// compartir. Un route handler no puede importar de un archivo "use server"
// sin convertir cada helper en un endpoint público, así que la lógica
// compartida vive en un módulo común y de ahí la levantan los dos.
//
// Este archivo NO lleva "use server": nada de acá se expone al cliente.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { logger } from "@/lib/logger";
import { nuevoToken, urlDeToken } from "@/lib/presupuesto/links";
import { SITE_BASE_URL } from "@/lib/datos-email";

const log = logger.child({ module: "presupuesto.acceso" });

export const SIN_PERMISO = "Tu rol no tiene acceso al cotizador.";
export const NO_ENCONTRADA = "No encontramos esa cotización.";

/**
 * Error con texto ya escrito para el vendedor. El envoltorio `ejecutar()` de
 * las actions lo deja pasar tal cual; cualquier otra excepción sale genérica.
 */
export class ErrorDeNegocio extends Error {}

export function fallar(mensaje: string): never {
  throw new ErrorDeNegocio(mensaje);
}

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export interface Scope {
  userId: string;
  role: string;
  brandId: string;
  isAdmin: boolean;
  /** null = sin filtro por vendedor (solo puede pasar siendo ADMIN). */
  targetId: string | null;
}

/**
 * Quién mira y qué puede tocar.
 *
 * Un VENDEDOR llega acá con `canEdit:false` del contrato general del panel —
 * eso es sobre el catálogo (paquetes, hoteles, precios), que solo edita el
 * máster. El cotizador es otra cosa: es la herramienta de trabajo del
 * vendedor y las cotizaciones son suyas, así que acá escribe. Lo que lo
 * encierra no es el permiso de edición sino el scope: `targetId` lo clava en
 * su propio `vendedorId` y el `vendedorId` que mande de afuera se ignora.
 */
export async function scopeVendedor(vendedorId?: string | null): Promise<Scope> {
  const ctx = await requireAuth();
  if (ctx.role !== "ADMIN" && ctx.role !== "VENDEDOR") fallar(SIN_PERMISO);
  const isAdmin = ctx.role === "ADMIN";
  return {
    userId: ctx.userId,
    role: ctx.role,
    brandId: ctx.brandId,
    isAdmin,
    // El vendedor siempre lo suyo; el admin lo que pida, o todo si no filtra.
    targetId: isAdmin ? (vendedorId ?? null) : ctx.userId,
  };
}

/**
 * Trae la cotización comprobando que quien pide la pueda tocar. A un ajeno le
 * responde lo mismo que a una inexistente: no confirmamos que exista.
 */
export async function cargarPropia(id: string, s: Scope) {
  const row = await prisma.presupuesto.findFirst({
    where: { id, brandId: s.brandId, deletedAt: null },
    select: {
      id: true,
      numero: true,
      vendedorId: true,
      estado: true,
      estadoManual: true,
      vigenciaHoras: true,
      enviadaAt: true,
      expiraAt: true,
      // `confirmadaAt` lo necesita `estadoEfectivoDe`: sin él, una confirmada
      // se leería como vencida en cuanto pasara la vigencia.
      confirmadaAt: true,
      contenido: true,
    },
  });
  if (!row) fallar(NO_ENCONTRADA);
  if (!s.isAdmin && row.vendedorId !== s.userId) fallar(NO_ENCONTRADA);
  return row;
}

export type FilaPropia = Awaited<ReturnType<typeof cargarPropia>>;

// ---------------------------------------------------------------------------
// El link público
// ---------------------------------------------------------------------------

/** Lo que devuelve todo lo que emite o renueva un link. */
export interface LinkEmitido {
  token: string;
  url: string;
  expiraAt: Date;
  /** `false` cuando se reusó el link que ya existía. */
  nuevo: boolean;
}

/** El link vivo de un presupuesto (sin revocar), o null. */
export async function linkVivo(presupuestoId: string) {
  return prisma.presupuestoLink.findFirst({
    where: { presupuestoId, revocadoAt: null },
    orderBy: { emitidoAt: "desc" },
    select: { id: true, token: true, expiraAt: true },
  });
}

/**
 * Emite o renueva el link vivo del presupuesto.
 *
 * Si ya hay uno sin revocar se reusa: mismo token, vencimiento corrido y canal
 * actualizado. Si no hay, se crea uno y de paso se revoca cualquier resto de
 * una ronda anterior, para que la invariante "un solo link vivo" se sostenga
 * aunque alguna vez haya quedado basura.
 *
 * El choque de token es prácticamente imposible (40 bits), pero si pasa se
 * reintenta en vez de devolverle un error al vendedor.
 */
export async function emitirORenovar(
  presupuestoId: string,
  canal: string,
  vigenciaHoras: number,
  expiraAt: Date,
): Promise<LinkEmitido> {
  const vivo = await linkVivo(presupuestoId);

  if (vivo) {
    const act = await prisma.presupuestoLink.update({
      where: { id: vivo.id },
      data: { canal, vigenciaHoras, expiraAt },
      select: { token: true, expiraAt: true },
    });
    return {
      token: act.token,
      url: urlDeToken(SITE_BASE_URL, act.token),
      expiraAt: act.expiraAt,
      nuevo: false,
    };
  }

  await prisma.presupuestoLink.updateMany({
    where: { presupuestoId, revocadoAt: null },
    data: { revocadoAt: new Date() },
  });

  for (let intento = 0; intento < 5; intento++) {
    const token = nuevoToken();
    try {
      const creado = await prisma.presupuestoLink.create({
        data: { presupuestoId, token, canal, vigenciaHoras, expiraAt },
        select: { token: true, expiraAt: true },
      });
      return {
        token: creado.token,
        url: urlDeToken(SITE_BASE_URL, creado.token),
        expiraAt: creado.expiraAt,
        nuevo: true,
      };
    } catch (err) {
      log.warn("presupuesto.link.token.choque", { presupuestoId, intento, err });
    }
  }
  fallar("No pudimos generar el link. Probá de nuevo.");
}
