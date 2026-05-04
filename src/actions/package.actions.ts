"use server";

import { z } from "zod";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { generateSequentialId } from "@/lib/sequential-id";
import { logger } from "@/lib/logger";
import type { EstadoPaquete, Prisma } from "@prisma/client";

const log = logger.child({ module: "package.actions" });

// Cache busters for dashboard, report, AND paquete listing aggregates. Called
// after every paquete mutation so the UI stops serving stale counts/lists the
// moment the user commits a change.
function bustDashboardCache(brandId: string) {
  revalidateTag(`dashboard:${brandId}`);
  revalidateTag(`metrics:${brandId}`);
  revalidateTag(`reports:${brandId}`);
  revalidateTag(`paquetes:${brandId}`);
  revalidateTag(`paquete-sub:${brandId}`);
}

// ──────────────────────────────────────────────
// Paquete — Main entity (soft delete)
// ──────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Two-wave loading for paquetes.
// Wave 1 — getBasePackages: only the Paquete rows. Fast; lifts the skeleton.
// Wave 2 — getPackageSubEntities: all paquete-X join rows. Background fill.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Filter shape for server-side paquete listing. Every field is optional so
// callers (page server components, dashboard drill-down links, exporters) can
// compose just the filters they need. Translates 1:1 into a Prisma WHERE
// clause inside `buildPaqueteWhere` below.
// ---------------------------------------------------------------------------

export interface PaquetesFilter {
  /** Free-text match on titulo / destino / descripcion (case-insensitive). */
  q?: string;
  /** Lifecycle states to include. Empty/undefined = all (except soft-deleted). */
  estados?: EstadoPaquete[];
  temporadaIds?: string[];
  tipoPaqueteIds?: string[];
  /** Filter by País IDs (resolved via linked alojamientos). */
  paisIds?: string[];
  /** Filter by Region (resolved via País → Region). */
  regionId?: string;
  /** Only paquetes flagged for the public site. */
  publicado?: boolean;
  /** Only paquetes whose validezHasta falls in the next N days. */
  porVencerDias?: number;
}

function buildPaqueteWhere(
  brandId: string,
  filter: PaquetesFilter | undefined,
): Prisma.PaqueteWhereInput {
  const where: Prisma.PaqueteWhereInput = { brandId, deletedAt: null };
  if (!filter) return where;

  if (filter.q && filter.q.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { destino: { contains: q, mode: "insensitive" } },
      { descripcion: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter.estados && filter.estados.length > 0) {
    where.estado = { in: filter.estados };
  }
  if (filter.temporadaIds && filter.temporadaIds.length > 0) {
    where.temporadaId = { in: filter.temporadaIds };
  }
  if (filter.tipoPaqueteIds && filter.tipoPaqueteIds.length > 0) {
    where.tipoPaqueteId = { in: filter.tipoPaqueteIds };
  }
  if (filter.publicado !== undefined) {
    where.publicado = filter.publicado;
  }
  if (filter.porVencerDias && filter.porVencerDias > 0) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const horizon = new Date(now.getTime() + filter.porVencerDias * 86_400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    where.validezHasta = { gte: fmt(now), lte: fmt(horizon) };
  }

  // País / Region drill-down resolves through alojamientos linked to this
  // paquete. We keep the filter as a relational `some` so Postgres handles
  // the join and we don't materialize alojamiento IDs in JS first.
  if (filter.paisIds && filter.paisIds.length > 0) {
    where.alojamientos = {
      some: { alojamiento: { paisId: { in: filter.paisIds } } },
    };
  } else if (filter.regionId) {
    where.alojamientos = {
      some: { alojamiento: { pais: { regionId: filter.regionId } } },
    };
  }

  return where;
}

// Hot-path cache for the wave-1 paquete fetch. Keyed by every input that can
// change the result so different filters and pagination windows each get their
// own bucket. Mutations call `bustDashboardCache(brandId)` which fires
// `revalidateTag("paquetes:{brandId}")` to invalidate every bucket at once.
async function fetchBasePackagesUncached(
  brandId: string,
  options: {
    skip: number;
    take: number | null;
    filter?: PaquetesFilter;
    sortCreated: "asc" | "desc";
  },
) {
  const where = buildPaqueteWhere(brandId, options.filter);
  const [paquetes, total] = await prisma.$transaction([
    prisma.paquete.findMany({
      where,
      orderBy: { createdAt: options.sortCreated },
      skip: options.skip,
      ...(options.take != null ? { take: options.take } : {}),
    }),
    prisma.paquete.count({ where }),
  ]);
  return { paquetes, total };
}

export async function getBasePackages(
  requestedBrandId?: string,
  options?: {
    skip?: number;
    take?: number;
    filter?: PaquetesFilter;
    /** Sort direction on createdAt. Defaults to "desc" (newest first). */
    sortCreated?: "asc" | "desc";
  },
) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const skip = Math.max(0, options?.skip ?? 0);
    const take = options?.take ?? null;
    const sortCreated = options?.sortCreated ?? "desc";
    // Stable cache key: brandId + the JSON of the filter + pagination + sort.
    // unstable_cache uses the array argument to derive its bucket id.
    const cacheKey = [
      "paquetes-base",
      brandId,
      String(skip),
      String(take ?? "all"),
      sortCreated,
      JSON.stringify(options?.filter ?? {}),
    ];
    const cached = unstable_cache(
      () =>
        fetchBasePackagesUncached(brandId, {
          skip,
          take,
          filter: options?.filter,
          sortCreated,
        }),
      cacheKey,
      { revalidate: 60, tags: [`paquetes:${brandId}`] },
    );
    return await cached();
  } catch (error) {
    log.error("fetching base packages", error);
    throw new Error("No se pudieron obtener los paquetes.");
  }
}

async function fetchPackageSubEntitiesUncached(brandId: string) {
  const paqueteFilter = { paquete: { brandId, deletedAt: null } };

  const [
    paqueteAereos,
    paqueteAlojamientos,
    paqueteTraslados,
    paqueteSeguros,
    paqueteCircuitos,
    paqueteFotos,
    paqueteEtiquetas,
    opcionesHoteleras,
    destinos,
    opcionHoteles,
  ] = await Promise.all([
    prisma.paqueteAereo.findMany({ where: paqueteFilter }),
    prisma.paqueteAlojamiento.findMany({ where: paqueteFilter }),
    prisma.paqueteTraslado.findMany({ where: paqueteFilter }),
    prisma.paqueteSeguro.findMany({ where: paqueteFilter }),
    prisma.paqueteCircuito.findMany({ where: paqueteFilter }),
    prisma.paqueteFoto.findMany({ where: paqueteFilter }),
    prisma.paqueteEtiqueta.findMany({ where: paqueteFilter }),
    prisma.opcionHotelera.findMany({ where: paqueteFilter }),
    prisma.paqueteDestino.findMany({ where: paqueteFilter }),
    prisma.opcionHotel.findMany({
      where: { opcion: { paquete: { brandId, deletedAt: null } } },
    }),
  ]);

  return {
    paqueteAereos,
    paqueteAlojamientos,
    paqueteTraslados,
    paqueteSeguros,
    paqueteCircuitos,
    paqueteFotos,
    paqueteEtiquetas,
    opcionesHoteleras,
    destinos,
    opcionHoteles,
  };
}

export async function getPackageSubEntities(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    // Wave 2 fires 10 join-table queries. Caching it for 60 s drops navigation
    // back to /backend/paquetes from "round-trip to Postgres" to "memory hit".
    const cached = unstable_cache(
      () => fetchPackageSubEntitiesUncached(brandId),
      ["paquete-sub", brandId],
      { revalidate: 60, tags: [`paquete-sub:${brandId}`, `paquetes:${brandId}`] },
    );
    return await cached();
  } catch (error) {
    log.error("fetching package sub-entities", error);
    throw new Error("No se pudieron obtener los datos relacionales de paquetes.");
  }
}

// Compat wrapper — still used by legacy callers that want everything at once.
export async function getAllPackageData(requestedBrandId?: string) {
  const [base, sub] = await Promise.all([
    getBasePackages(requestedBrandId),
    getPackageSubEntities(requestedBrandId),
  ]);
  return { ...base, ...sub };
}

export async function createPaquete(data: {
  titulo: string;
  destino: string;
  descripcion?: string;
  textoVisual?: string;
  salidas?: string;
  noches?: number;
  temporadaId?: string | null;
  tipoPaqueteId?: string | null;
  validezDesde?: string;
  validezHasta?: string;
  estado?: EstadoPaquete;
  destacado?: boolean;
  netoCalculado?: number;
  markup?: number;
  precioVenta?: number;
  moneda?: string;
  ordenServicios?: string[];
}) {
  try {
    const { brandId } = await requireAuth();

    const schema = z.object({
      titulo: z.string().min(1),
      destino: z.string(),
      temporadaId: z.string().min(1).nullable().optional(),
      tipoPaqueteId: z.string().min(1).nullable().optional(),
    });
    schema.parse(data);

    // Margin guardrail — only enforced when both prices are present and positive,
    // so half-filled drafts still save (the writer will fill numbers later).
    const { assertMargenPositivo } = await import("./package-lifecycle.utils");
    if ((data.netoCalculado ?? 0) > 0 && (data.precioVenta ?? 0) > 0) {
      assertMargenPositivo(data.netoCalculado!, data.precioVenta!, data.markup);
    }

    const created = await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "paquete");
      return await tx.paquete.create({ data: { ...data, id, brandId } });
    });
    bustDashboardCache(brandId);
    return created;
  } catch (error) {
    log.error("creating paquete", error);
    if (error instanceof Error && /margen|markup|venta/i.test(error.message)) {
      throw error; // surface the validation message to the UI
    }
    throw new Error("No se pudo crear el paquete.");
  }
}

export async function updatePaquete(
  id: string,
  data: {
    titulo?: string;
    destino?: string;
    descripcion?: string;
    textoVisual?: string;
    noches?: number;
    salidas?: string;
    temporadaId?: string | null;
    tipoPaqueteId?: string | null;
    validezDesde?: string | null;
    validezHasta?: string | null;
    estado?: EstadoPaquete;
    destacado?: boolean;
    netoCalculado?: number;
    markup?: number;
    precioVenta?: number;
    moneda?: string;
    ordenServicios?: string[];
  }
) {
  try {
    const { brandId } = await requireAuth();

    // Brand-ownership check: prevent users from editing paquetes of other brands
    // even if they happen to know the ID. Cheap (indexed by id) and stops the
    // most common cross-tenant footgun.
    const owner = await prisma.paquete.findFirst({
      where: { id, brandId, deletedAt: null },
      select: { id: true, netoCalculado: true, precioVenta: true, markup: true },
    });
    if (!owner) throw new Error("Paquete no encontrado o no pertenece a tu marca.");

    // Margin guardrail using the merged values (incoming-or-existing).
    const nextNeto = data.netoCalculado ?? owner.netoCalculado;
    const nextVenta = data.precioVenta ?? owner.precioVenta;
    const nextFactor = data.markup ?? owner.markup;
    if (nextNeto > 0 && nextVenta > 0) {
      const { assertMargenPositivo } = await import("./package-lifecycle.utils");
      assertMargenPositivo(nextNeto, nextVenta, nextFactor);
    }

    const updated = await prisma.paquete.update({ where: { id }, data });
    bustDashboardCache(brandId);
    return updated;
  } catch (error) {
    log.error("updating paquete", error);
    if (error instanceof Error && /margen|markup|venta|pertenece/i.test(error.message)) {
      throw error;
    }
    throw new Error("No se pudo actualizar el paquete.");
  }
}

export async function deletePaquete(id: string) {
  try {
    const { brandId } = await requireAuth();
    const owner = await prisma.paquete.findFirst({
      where: { id, brandId, deletedAt: null },
      select: { id: true },
    });
    if (!owner) throw new Error("Paquete no encontrado o no pertenece a tu marca.");
    const result = await prisma.paquete.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    bustDashboardCache(brandId);
    return result;
  } catch (error) {
    log.error("deleting paquete", error);
    if (error instanceof Error && /pertenece/i.test(error.message)) throw error;
    throw new Error("No se pudo eliminar el paquete.");
  }
}

export async function clonePaquete(sourceId: string) {
  try {
    await requireAuth();
    return await prisma.$transaction(async (tx) => {
      // 1. Read source paquete
      const source = await tx.paquete.findUniqueOrThrow({
        where: { id: sourceId },
      });

      // 2. Create new paquete with a sequential id
      const newId = await generateSequentialId(tx, "paquete");
      const newPaquete = await tx.paquete.create({
        data: {
          id: newId,
          brandId: source.brandId,
          titulo: `Copia de ${source.titulo}`,
          destino: source.destino,
          descripcion: source.descripcion,
          textoVisual: source.textoVisual,
          salidas: source.salidas,
          temporadaId: source.temporadaId,
          tipoPaqueteId: source.tipoPaqueteId,
          validezDesde: source.validezDesde,
          validezHasta: source.validezHasta,
          estado: "BORRADOR",
          destacado: false,
          netoCalculado: source.netoCalculado,
          markup: source.markup,
          precioVenta: source.precioVenta,
          moneda: source.moneda,
          ordenServicios: source.ordenServicios,
        },
      });

      // 3. Read all junction tables for source
      const [
        sourceAereos,
        sourceAlojamientos,
        sourceTraslados,
        sourceSeguros,
        sourceCircuitos,
        sourceFotos,
        sourceEtiquetas,
        sourceOpciones,
        sourceDestinos,
        sourceOpcionHoteles,
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
        tx.opcionHotel.findMany({
          where: { opcion: { paqueteId: sourceId } },
        }),
      ]);

      // 4. Clone all junction tables using createMany, then re-fetch
      if (sourceAereos.length > 0) {
        await tx.paqueteAereo.createMany({
          data: sourceAereos.map((a) => ({
            paqueteId: newPaquete.id,
            aereoId: a.aereoId,
            textoDisplay: a.textoDisplay,
            orden: a.orden,
          })),
        });
      }

      if (sourceAlojamientos.length > 0) {
        await tx.paqueteAlojamiento.createMany({
          data: sourceAlojamientos.map((a) => ({
            paqueteId: newPaquete.id,
            alojamientoId: a.alojamientoId,
            textoDisplay: a.textoDisplay,
            orden: a.orden,
          })),
        });
      }

      if (sourceTraslados.length > 0) {
        await tx.paqueteTraslado.createMany({
          data: sourceTraslados.map((t) => ({
            paqueteId: newPaquete.id,
            trasladoId: t.trasladoId,
            textoDisplay: t.textoDisplay,
            orden: t.orden,
          })),
        });
      }

      if (sourceSeguros.length > 0) {
        await tx.paqueteSeguro.createMany({
          data: sourceSeguros.map((s) => ({
            paqueteId: newPaquete.id,
            seguroId: s.seguroId,
            diasCobertura: s.diasCobertura,
            textoDisplay: s.textoDisplay,
            orden: s.orden,
          })),
        });
      }

      if (sourceCircuitos.length > 0) {
        await tx.paqueteCircuito.createMany({
          data: sourceCircuitos.map((c) => ({
            paqueteId: newPaquete.id,
            circuitoId: c.circuitoId,
            textoDisplay: c.textoDisplay,
            orden: c.orden,
          })),
        });
      }

      if (sourceFotos.length > 0) {
        await tx.paqueteFoto.createMany({
          data: sourceFotos.map((f) => ({
            paqueteId: newPaquete.id,
            url: f.url,
            alt: f.alt,
            orden: f.orden,
          })),
        });
      }

      if (sourceEtiquetas.length > 0) {
        await tx.paqueteEtiqueta.createMany({
          data: sourceEtiquetas.map((e) => ({
            paqueteId: newPaquete.id,
            etiquetaId: e.etiquetaId,
          })),
        });
      }

      // Clone opciones one by one so we can map oldId → newId for OpcionHotel.
      const opcionIdMap = new Map<string, string>();
      for (const o of sourceOpciones) {
        const created = await tx.opcionHotelera.create({
          data: {
            paqueteId: newPaquete.id,
            nombre: o.nombre,
            factor: o.factor,
            precioVenta: o.precioVenta,
            orden: o.orden,
            proveedorId: o.proveedorId,
          },
        });
        opcionIdMap.set(o.id, created.id);
      }

      // Clone destinos — keep oldId → newId map for OpcionHotel link-through.
      const destinoIdMap = new Map<string, string>();
      for (const d of sourceDestinos) {
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

      // Clone OpcionHotel rows using the two maps above.
      if (sourceOpcionHoteles.length > 0) {
        await tx.opcionHotel.createMany({
          data: sourceOpcionHoteles
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
            .filter(
              (x): x is NonNullable<typeof x> => x !== null,
            ),
        });
      }

      // 5. Re-fetch all cloned junction records
      const [
        newAereos,
        newAlojamientos,
        newTraslados,
        newSeguros,
        newCircuitos,
        newFotos,
        newEtiquetas,
        newOpciones,
        newDestinos,
        newOpcionHoteles,
      ] = await Promise.all([
        tx.paqueteAereo.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteAlojamiento.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteTraslado.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteSeguro.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteCircuito.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteFoto.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteEtiqueta.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.opcionHotelera.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.paqueteDestino.findMany({ where: { paqueteId: newPaquete.id } }),
        tx.opcionHotel.findMany({
          where: { opcion: { paqueteId: newPaquete.id } },
        }),
      ]);

      return {
        paquete: newPaquete,
        paqueteAereos: newAereos,
        paqueteAlojamientos: newAlojamientos,
        paqueteTraslados: newTraslados,
        paqueteSeguros: newSeguros,
        paqueteCircuitos: newCircuitos,
        paqueteFotos: newFotos,
        paqueteEtiquetas: newEtiquetas,
        opcionesHoteleras: newOpciones,
        destinos: newDestinos,
        opcionHoteles: newOpcionHoteles,
      };
    });
  } catch (error) {
    log.error("cloning paquete", error);
    throw new Error("No se pudo clonar el paquete.");
  }
}

// ──────────────────────────────────────────────
// PaqueteAereo — Junction CRUD
// ──────────────────────────────────────────────

export async function assignAereo(data: {
  paqueteId: string;
  aereoId: string;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteAereo.create({ data });
  } catch (error) {
    log.error("assigning aereo", error);
    throw new Error("No se pudo asignar el aéreo al paquete.");
  }
}

export async function removeAereo(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteAereo.delete({ where: { id } });
  } catch (error) {
    log.error("removing aereo", error);
    throw new Error("No se pudo quitar el aéreo del paquete.");
  }
}

export async function updateAereoAssignment(
  id: string,
  data: { textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteAereo.update({ where: { id }, data });
  } catch (error) {
    log.error("updating aereo assignment", error);
    throw new Error("No se pudo actualizar la asignación del aéreo.");
  }
}

// ──────────────────────────────────────────────
// PaqueteAlojamiento — Junction CRUD
// ──────────────────────────────────────────────

export async function assignAlojamiento(data: {
  paqueteId: string;
  alojamientoId: string;
  nochesEnEste?: number;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteAlojamiento.create({ data });
  } catch (error) {
    log.error("assigning alojamiento", error);
    throw new Error("No se pudo asignar el alojamiento al paquete.");
  }
}

export async function removeAlojamiento(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteAlojamiento.delete({ where: { id } });
  } catch (error) {
    log.error("removing alojamiento", error);
    throw new Error("No se pudo quitar el alojamiento del paquete.");
  }
}

export async function updateAlojamientoAssignment(
  id: string,
  data: { nochesEnEste?: number; textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteAlojamiento.update({ where: { id }, data });
  } catch (error) {
    log.error("updating alojamiento assignment", error);
    throw new Error("No se pudo actualizar la asignación del alojamiento.");
  }
}

// ──────────────────────────────────────────────
// PaqueteTraslado — Junction CRUD
// ──────────────────────────────────────────────

export async function assignTraslado(data: {
  paqueteId: string;
  trasladoId: string;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteTraslado.create({ data });
  } catch (error) {
    log.error("assigning traslado", error);
    throw new Error("No se pudo asignar el traslado al paquete.");
  }
}

export async function removeTraslado(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteTraslado.delete({ where: { id } });
  } catch (error) {
    log.error("removing traslado", error);
    throw new Error("No se pudo quitar el traslado del paquete.");
  }
}

export async function updateTrasladoAssignment(
  id: string,
  data: { textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteTraslado.update({ where: { id }, data });
  } catch (error) {
    log.error("updating traslado assignment", error);
    throw new Error("No se pudo actualizar la asignación del traslado.");
  }
}

// ──────────────────────────────────────────────
// PaqueteSeguro — Junction CRUD
// ──────────────────────────────────────────────

export async function assignSeguro(data: {
  paqueteId: string;
  seguroId: string;
  diasCobertura?: number;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteSeguro.create({ data });
  } catch (error) {
    log.error("assigning seguro", error);
    throw new Error("No se pudo asignar el seguro al paquete.");
  }
}

export async function removeSeguro(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteSeguro.delete({ where: { id } });
  } catch (error) {
    log.error("removing seguro", error);
    throw new Error("No se pudo quitar el seguro del paquete.");
  }
}

export async function updateSeguroAssignment(
  id: string,
  data: { diasCobertura?: number; textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteSeguro.update({ where: { id }, data });
  } catch (error) {
    log.error("updating seguro assignment", error);
    throw new Error("No se pudo actualizar la asignación del seguro.");
  }
}

// ──────────────────────────────────────────────
// PaqueteCircuito — Junction CRUD
// ──────────────────────────────────────────────

export async function assignCircuito(data: {
  paqueteId: string;
  circuitoId: string;
  textoDisplay?: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteCircuito.create({ data });
  } catch (error) {
    log.error("assigning circuito", error);
    throw new Error("No se pudo asignar el circuito al paquete.");
  }
}

export async function removeCircuito(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteCircuito.delete({ where: { id } });
  } catch (error) {
    log.error("removing circuito", error);
    throw new Error("No se pudo quitar el circuito del paquete.");
  }
}

export async function updateCircuitoAssignment(
  id: string,
  data: { textoDisplay?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteCircuito.update({ where: { id }, data });
  } catch (error) {
    log.error("updating circuito assignment", error);
    throw new Error("No se pudo actualizar la asignación del circuito.");
  }
}

// ──────────────────────────────────────────────
// PaqueteFoto — Photo CRUD
// ──────────────────────────────────────────────

export async function addPaqueteFoto(data: {
  paqueteId: string;
  url: string;
  alt: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteFoto.create({ data });
  } catch (error) {
    log.error("adding paquete foto", error);
    throw new Error("No se pudo agregar la foto al paquete.");
  }
}

export async function removePaqueteFoto(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteFoto.delete({ where: { id } });
  } catch (error) {
    log.error("removing paquete foto", error);
    throw new Error("No se pudo eliminar la foto del paquete.");
  }
}

export async function updatePaqueteFoto(
  id: string,
  data: { url?: string; alt?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.paqueteFoto.update({ where: { id }, data });
  } catch (error) {
    log.error("updating paquete foto", error);
    throw new Error("No se pudo actualizar la foto del paquete.");
  }
}

// ──────────────────────────────────────────────
// PaqueteEtiqueta — Etiqueta assignment
// ──────────────────────────────────────────────

export async function assignEtiqueta(data: {
  paqueteId: string;
  etiquetaId: string;
}) {
  try {
    await requireAuth();
    return await prisma.paqueteEtiqueta.create({ data });
  } catch (error) {
    log.error("assigning etiqueta", error);
    throw new Error("No se pudo asignar la etiqueta al paquete.");
  }
}

export async function removeEtiqueta(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteEtiqueta.delete({ where: { id } });
  } catch (error) {
    log.error("removing etiqueta", error);
    throw new Error("No se pudo quitar la etiqueta del paquete.");
  }
}

// ──────────────────────────────────────────────
// OpcionHotelera — CRUD
// ──────────────────────────────────────────────

export async function createOpcionHotelera(data: {
  paqueteId: string;
  nombre: string;
  factor: number;
  precioVenta: number;
  orden?: number;
  proveedorId?: string | null;
}) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.create({ data });
  } catch (error) {
    log.error("creating opcion hotelera", error);
    throw new Error("No se pudo crear la opción hotelera.");
  }
}

export async function updateOpcionHotelera(
  id: string,
  data: {
    nombre?: string;
    factor?: number;
    precioVenta?: number;
    orden?: number;
    proveedorId?: string | null;
  },
) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.update({ where: { id }, data });
  } catch (error) {
    log.error("updating opcion hotelera", error);
    throw new Error("No se pudo actualizar la opción hotelera.");
  }
}

export async function deleteOpcionHotelera(id: string) {
  try {
    await requireAuth();
    return await prisma.opcionHotelera.delete({ where: { id } });
  } catch (error) {
    log.error("deleting opcion hotelera", error);
    throw new Error("No se pudo eliminar la opción hotelera.");
  }
}

// ──────────────────────────────────────────────
// PaqueteDestino — itinerary row CRUD
// ──────────────────────────────────────────────

export async function createPaqueteDestino(data: {
  paqueteId: string;
  ciudadId: string;
  noches: number;
  orden?: number;
}) {
  try {
    await requireAuth();
    const schema = z.object({
      paqueteId: z.string().min(1),
      ciudadId: z.string().min(1),
      noches: z.number().int().min(0).max(365),
      orden: z.number().int().nonnegative().optional(),
    });
    const parsed = schema.parse(data);
    return await prisma.paqueteDestino.create({ data: parsed });
  } catch (error) {
    log.error("creating paquete destino", error);
    throw new Error("No se pudo crear el destino del paquete.");
  }
}

export async function updatePaqueteDestino(
  id: string,
  data: { ciudadId?: string; noches?: number; orden?: number },
) {
  try {
    await requireAuth();
    return await prisma.paqueteDestino.update({ where: { id }, data });
  } catch (error) {
    log.error("updating paquete destino", error);
    throw new Error("No se pudo actualizar el destino del paquete.");
  }
}

export async function deletePaqueteDestino(id: string) {
  try {
    await requireAuth();
    return await prisma.paqueteDestino.delete({ where: { id } });
  } catch (error) {
    log.error("deleting paquete destino", error);
    throw new Error("No se pudo eliminar el destino del paquete.");
  }
}

/**
 * Reorder all destinos of a paquete at once. `orderedIds` is the full list of
 * destino ids in the new order. Missing ids are not touched. Runs in a single
 * transaction to avoid inconsistent partial states.
 */
export async function reorderPaqueteDestinos(
  paqueteId: string,
  orderedIds: string[],
) {
  try {
    await requireAuth();
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.paqueteDestino.update({
          where: { id },
          data: { orden: idx },
        }),
      ),
    );
  } catch (error) {
    log.error("reordering paquete destinos", error);
    throw new Error("No se pudo reordenar los destinos.");
  }
}

// ──────────────────────────────────────────────
// OpcionHotel — per-destino hotel assignment CRUD
// ──────────────────────────────────────────────

export async function createOpcionHotel(data: {
  opcionHoteleraId: string;
  destinoId: string;
  alojamientoId: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.create({ data });
  } catch (error) {
    log.error("creating opcion hotel", error);
    throw new Error("No se pudo asignar el hotel al destino.");
  }
}

export async function updateOpcionHotel(
  id: string,
  data: { alojamientoId?: string; orden?: number },
) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.update({ where: { id }, data });
  } catch (error) {
    log.error("updating opcion hotel", error);
    throw new Error("No se pudo actualizar la asignación del hotel.");
  }
}

export async function deleteOpcionHotel(id: string) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.delete({ where: { id } });
  } catch (error) {
    log.error("deleting opcion hotel", error);
    throw new Error("No se pudo eliminar la asignación del hotel.");
  }
}

/**
 * Upsert the hotel assigned to a (opcion, destino) pair. If no OpcionHotel
 * exists for that pair yet, it's created; otherwise the alojamientoId is
 * updated in place. This is the "single-click" handler used by the UI dropdown.
 */
export async function upsertOpcionHotelPrincipal(
  opcionHoteleraId: string,
  destinoId: string,
  alojamientoId: string,
) {
  try {
    await requireAuth();
    return await prisma.opcionHotel.upsert({
      where: {
        opcionHoteleraId_destinoId: { opcionHoteleraId, destinoId },
      },
      create: { opcionHoteleraId, destinoId, alojamientoId, orden: 0 },
      update: { alojamientoId },
    });
  } catch (error) {
    log.error("upserting opcion hotel", error);
    throw new Error("No se pudo asignar el hotel.");
  }
}
