"use server";

/**
 * Lifecycle, bulk and pricing-validation server actions for paquetes.
 *
 * Lives in its own module so the original `package.actions.ts` (which has
 * grown to ~900 lines of CRUD + junction work) stays focused on writes per
 * sub-entity, and so callers can `import * as lifecycle from ...` to get
 * the bulk surface in one place.
 *
 * Surface:
 *   • transitionEstado(id, next)               — one paquete, validated transition
 *   • bulkPublish / bulkUnpublish / bulkArchive / bulkClone — batch operations
 *   • bulkUpdateMarkup                         — uniform markup change across paquetes
 *   • clonePaqueteAsTemplate                   — copy without prices/markup (for new offers)
 *   • clonePaqueteForSeason                    — copy + shift validez to a new range
 *   • assertMargenPositivo                     — shared validator
 */

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { generateSequentialId } from "@/lib/sequential-id";
import { logger, withLogging } from "@/lib/logger";
import type { EstadoPaquete } from "@prisma/client";
import { canTransition, type CloneOptions } from "./package-lifecycle.utils";

const log = logger.child({ module: "package-lifecycle.actions" });

export async function transitionEstado(id: string, next: EstadoPaquete) {
  return withLogging("paquete.transitionEstado", { id, next }, async (innerLog) => {
    const { brandId, userId } = await requireAuth();
    const current = await prisma.paquete.findFirst({
      where: { id, brandId, deletedAt: null },
      select: { id: true, estado: true },
    });
    if (!current) {
      throw new Error("Paquete no encontrado o no pertenece a tu marca.");
    }
    if (!canTransition(current.estado, next)) {
      innerLog.warn("transition rejected", { from: current.estado, to: next });
      throw new Error(
        `Transición no permitida: ${current.estado} → ${next}.`,
      );
    }
    return prisma.paquete.update({
      where: { id },
      data: { estado: next },
      select: { id: true, estado: true },
    });
  }).catch((err) => {
    // withLogging already logged the failure with stack; re-throw user-friendly.
    if (err instanceof Error && err.message.includes("Transición")) throw err;
    if (err instanceof Error && err.message.includes("Paquete no encontrado")) throw err;
    throw new Error("No se pudo cambiar el estado del paquete.");
  });
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

const BulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

interface BulkResult {
  updated: number;
  skipped: number;
  reasons?: string[];
}

async function bulkSetEstado(
  ids: string[],
  target: EstadoPaquete,
): Promise<BulkResult> {
  const { brandId } = await requireAuth();
  BulkIdsSchema.parse({ ids });

  // Read current estados so we can enforce the transition matrix per row.
  const rows = await prisma.paquete.findMany({
    where: { id: { in: ids }, brandId, deletedAt: null },
    select: { id: true, estado: true },
  });

  const ok: string[] = [];
  const reasons: string[] = [];
  for (const r of rows) {
    if (canTransition(r.estado, target)) ok.push(r.id);
    else reasons.push(`${r.id}: ${r.estado} → ${target} no permitido`);
  }
  const missing = ids.length - rows.length;
  if (missing > 0) reasons.push(`${missing} paquete(s) no encontrado(s) en esta marca`);

  if (ok.length > 0) {
    await prisma.paquete.updateMany({
      where: { id: { in: ok } },
      data: { estado: target },
    });
  }
  log.info("paquete.bulkSetEstado", { target, updated: ok.length, skipped: ids.length - ok.length });
  return { updated: ok.length, skipped: ids.length - ok.length, reasons };
}

export async function bulkPublish(ids: string[]) {
  return bulkSetEstado(ids, "ACTIVO");
}

export async function bulkUnpublish(ids: string[]) {
  return bulkSetEstado(ids, "EN_REVISION");
}

export async function bulkArchive(ids: string[]) {
  return bulkSetEstado(ids, "ARCHIVADO");
}

export async function bulkSoftDelete(ids: string[]): Promise<BulkResult> {
  const { brandId } = await requireAuth();
  BulkIdsSchema.parse({ ids });
  const res = await prisma.paquete.updateMany({
    where: { id: { in: ids }, brandId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  log.info("paquete.bulkSoftDelete", { count: res.count });
  return { updated: res.count, skipped: ids.length - res.count };
}

// ---------------------------------------------------------------------------
// Bulk markup adjustment
// ---------------------------------------------------------------------------

const MarkupChangeSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  /** New markup factor (0 < x ≤ 1). Net price is divided by this to compute sale. */
  factor: z.number().gt(0).lte(1),
  /** When true, recompute precioVenta from existing netoCalculado / factor. */
  recomputeVenta: z.boolean().optional().default(true),
});

export async function bulkUpdateMarkup(input: {
  ids: string[];
  factor: number;
  recomputeVenta?: boolean;
}): Promise<BulkResult> {
  return withLogging("paquete.bulkUpdateMarkup", { count: input.ids.length, factor: input.factor }, async () => {
    const { brandId } = await requireAuth();
    const parsed = MarkupChangeSchema.parse(input);

    const rows = await prisma.paquete.findMany({
      where: { id: { in: parsed.ids }, brandId, deletedAt: null },
      select: { id: true, netoCalculado: true },
    });

    let updated = 0;
    if (parsed.recomputeVenta) {
      // Per-row update because precioVenta depends on each row's neto.
      await prisma.$transaction(
        rows.map((r) =>
          prisma.paquete.update({
            where: { id: r.id },
            data: {
              markup: parsed.factor,
              precioVenta: r.netoCalculado > 0
                ? Math.round(r.netoCalculado / parsed.factor)
                : 0,
            },
          }),
        ),
      );
      updated = rows.length;
    } else {
      const res = await prisma.paquete.updateMany({
        where: { id: { in: parsed.ids }, brandId, deletedAt: null },
        data: { markup: parsed.factor },
      });
      updated = res.count;
    }
    return { updated, skipped: parsed.ids.length - updated };
  });
}

// ---------------------------------------------------------------------------
// Clone variants — CloneOptions interface lives in package-lifecycle.utils.ts
// ---------------------------------------------------------------------------

export async function clonePaqueteAdvanced(sourceId: string, opts: CloneOptions = {}) {
  return withLogging(
    "paquete.cloneAdvanced",
    { sourceId, asTemplate: !!opts.asTemplate, hasNewSeason: !!opts.newSeason },
    async () => {
      const { brandId } = await requireAuth();
      return prisma.$transaction(
        async (tx) => {
        const source = await tx.paquete.findFirst({
          where: { id: sourceId, brandId, deletedAt: null },
        });
        if (!source) throw new Error("Paquete origen no encontrado o no pertenece a tu marca.");

        const newId = await generateSequentialId(tx, "paquete");
        const newPaquete = await tx.paquete.create({
          data: {
            id: newId,
            brandId: source.brandId,
            titulo: opts.titulo ?? `Copia de ${source.titulo}`,
            destino: source.destino,
            descripcion: source.descripcion,
            textoVisual: source.textoVisual,
            salidas: source.salidas,
            noches: source.noches,
            temporadaId: source.temporadaId,
            tipoPaqueteId: source.tipoPaqueteId,
            validezDesde: opts.newSeason?.desde ?? source.validezDesde,
            validezHasta: opts.newSeason?.hasta ?? source.validezHasta,
            estado: "BORRADOR",
            destacado: false,
            // Template mode wipes pricing so the user has to set it from scratch.
            netoCalculado: opts.asTemplate ? 0 : source.netoCalculado,
            markup: opts.asTemplate ? 0 : source.markup,
            precioVenta: opts.asTemplate ? 0 : source.precioVenta,
            moneda: source.moneda,
            ordenServicios: source.ordenServicios,
            // Public-site fields are never inherited — user picks slug per copy.
            publicado: false,
            slug: null,
          },
        });

        const [
          aereos,
          alojamientos,
          traslados,
          seguros,
          circuitos,
          fotos,
          etiquetas,
          opciones,
          destinos,
          opcionHoteles,
        ] = await Promise.all([
          tx.paqueteAereo.findMany({ where: { paqueteId: sourceId } }),
          tx.paqueteAlojamiento.findMany({ where: { paqueteId: sourceId } }),
          tx.paqueteTraslado.findMany({ where: { paqueteId: sourceId } }),
          tx.paqueteSeguro.findMany({ where: { paqueteId: sourceId } }),
          tx.paqueteCircuito.findMany({ where: { paqueteId: sourceId } }),
          tx.paqueteFoto.findMany({ where: { paqueteId: sourceId } }),
          tx.paqueteEtiqueta.findMany({ where: { paqueteId: sourceId } }),
          tx.opcionHotelera.findMany({ where: { paqueteId: sourceId } }),
          tx.paqueteDestino.findMany({ where: { paqueteId: sourceId } }),
          tx.opcionHotel.findMany({ where: { opcion: { paqueteId: sourceId } } }),
        ]);

        if (aereos.length) {
          await tx.paqueteAereo.createMany({
            data: aereos.map((a) => ({
              paqueteId: newPaquete.id,
              aereoId: a.aereoId,
              textoDisplay: a.textoDisplay,
              orden: a.orden,
            })),
          });
        }
        if (alojamientos.length) {
          await tx.paqueteAlojamiento.createMany({
            data: alojamientos.map((a) => ({
              paqueteId: newPaquete.id,
              alojamientoId: a.alojamientoId,
              textoDisplay: a.textoDisplay,
              orden: a.orden,
            })),
          });
        }
        if (traslados.length) {
          await tx.paqueteTraslado.createMany({
            data: traslados.map((t) => ({
              paqueteId: newPaquete.id,
              trasladoId: t.trasladoId,
              textoDisplay: t.textoDisplay,
              orden: t.orden,
            })),
          });
        }
        if (seguros.length) {
          await tx.paqueteSeguro.createMany({
            data: seguros.map((s) => ({
              paqueteId: newPaquete.id,
              seguroId: s.seguroId,
              diasCobertura: s.diasCobertura,
              textoDisplay: s.textoDisplay,
              orden: s.orden,
            })),
          });
        }
        if (circuitos.length) {
          await tx.paqueteCircuito.createMany({
            data: circuitos.map((c) => ({
              paqueteId: newPaquete.id,
              circuitoId: c.circuitoId,
              textoDisplay: c.textoDisplay,
              orden: c.orden,
            })),
          });
        }
        if (fotos.length) {
          await tx.paqueteFoto.createMany({
            data: fotos.map((f) => ({
              paqueteId: newPaquete.id,
              url: f.url,
              alt: f.alt,
              orden: f.orden,
            })),
          });
        }
        if (etiquetas.length) {
          await tx.paqueteEtiqueta.createMany({
            data: etiquetas.map((e) => ({
              paqueteId: newPaquete.id,
              etiquetaId: e.etiquetaId,
            })),
          });
        }

        const opcionIdMap = new Map<string, string>();
        for (const o of opciones) {
          const created = await tx.opcionHotelera.create({
            data: {
              paqueteId: newPaquete.id,
              nombre: o.nombre,
              factor: opts.asTemplate ? 0 : o.factor,
              precioVenta: opts.asTemplate ? 0 : o.precioVenta,
              orden: o.orden,
              proveedorId: o.proveedorId,
            },
          });
          opcionIdMap.set(o.id, created.id);
        }

        const destinoIdMap = new Map<string, string>();
        for (const d of destinos) {
          const created = await tx.paqueteDestino.create({
            data: {
              paqueteId: newPaquete.id,
              ciudadId: d.ciudadId,
              noches: d.noches,
              orden: d.orden,
            },
          });
          destinoIdMap.set(d.id, created.id);
        }

        if (opcionHoteles.length) {
          await tx.opcionHotel.createMany({
            data: opcionHoteles
              .map((oh) => {
                const newOpcionId = opcionIdMap.get(oh.opcionHoteleraId);
                const newDestinoId = destinoIdMap.get(oh.destinoId);
                if (!newOpcionId || !newDestinoId) return null;
                return {
                  opcionHoteleraId: newOpcionId,
                  destinoId: newDestinoId,
                  alojamientoId: oh.alojamientoId,
                  orden: oh.orden,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null),
          });
        }

        return { id: newPaquete.id };
        },
        { timeout: 20_000, maxWait: 5_000 },
      );
    },
  );
}

export async function clonePaqueteAsTemplate(sourceId: string, titulo?: string) {
  return clonePaqueteAdvanced(sourceId, { asTemplate: true, titulo });
}

export async function clonePaqueteForSeason(
  sourceId: string,
  newSeason: { desde: string; hasta: string },
  titulo?: string,
) {
  // Validate the date range early so we don't enter the transaction with bad input.
  const SeasonSchema = z.object({
    desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).refine((s) => s.desde <= s.hasta, "El periodo desde debe ser menor o igual al hasta");
  SeasonSchema.parse(newSeason);
  return clonePaqueteAdvanced(sourceId, { newSeason, titulo });
}

export async function bulkClone(ids: string[], opts: CloneOptions = {}): Promise<BulkResult> {
  BulkIdsSchema.parse({ ids });
  let updated = 0;
  const reasons: string[] = [];
  for (const id of ids) {
    try {
      await clonePaqueteAdvanced(id, opts);
      updated++;
    } catch (err) {
      reasons.push(`${id}: ${err instanceof Error ? err.message : "fallo"}`);
    }
  }
  log.info("paquete.bulkClone", { updated, skipped: ids.length - updated });
  return { updated, skipped: ids.length - updated, reasons };
}
