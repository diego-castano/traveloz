"use server";

import { z } from "zod";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { generateSequentialId } from "@/lib/sequential-id";
import { logger } from "@/lib/logger";
const log = logger.child({ module: "service.actions" });

/** Global service-cache tag. Lets every mutation invalidate without first
 *  resolving the brandId (avoids the extra requireAuth round-trip). All
 *  cached service reads include this tag, so the trade-off is over-eager
 *  invalidation across brands — acceptable inside the admin where cross-brand
 *  navigation is rare and the TTL is only 60 s anyway. */
const SERVICES_GLOBAL_TAG = "services-global";

/** Invalidate the per-brand service caches. Call after any service mutation. */
function bustServicesCache(brandId: string) {
  revalidateTag(`services:${brandId}`);
  revalidateTag(`service-sub:${brandId}`);
  revalidateTag(SERVICES_GLOBAL_TAG);
}

/** Bust the global service cache. Use from mutations that don't already have
 *  brandId in scope — saves the extra requireAuth call. */
function bustServicesCacheGlobal() {
  revalidateTag(SERVICES_GLOBAL_TAG);
}

// ──────────────────────────────────────────────
// Zod schemas
// ──────────────────────────────────────────────

const AereoSchema = z.object({
  ruta: z.string().min(1, "La ruta es requerida"),
  destino: z.string(),
  aerolinea: z.string().nullable().optional(),
  equipaje: z.string().nullable().optional(),
  itinerario: z.string().nullable().optional(),
  itinerarioImagenes: z.array(z.string()).optional(),
  escalas: z.number().int().nonnegative().optional(),
  codigoVueloIda: z.string().nullable().optional(),
  codigoVueloVuelta: z.string().nullable().optional(),
  duracionIda: z.string().nullable().optional(),
  duracionVuelta: z.string().nullable().optional(),
});

const PrecioAereoCreateSchema = z.object({
  periodoDesde: z.string().min(1, "El período desde es requerido"),
  periodoHasta: z.string().min(1, "El período hasta es requerido"),
  precioAdulto: z.number().positive("El precio adulto debe ser un número positivo"),
});

const AereoCreateSchema = AereoSchema.extend({
  precioInicial: PrecioAereoCreateSchema.optional(),
});

const PrecioAereoSchema = z.object({
  aereoId: z.string().min(1, "El aereoId es requerido"),
  periodoDesde: z.string().min(1, "El período desde es requerido"),
  periodoHasta: z.string().min(1, "El período hasta es requerido"),
  precioAdulto: z.number().positive("El precio adulto debe ser un número positivo"),
});

const AlojamientoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  ciudadId: z.string().nullable().optional(),
  paisId: z.string().nullable().optional(),
  categoria: z.number().int().nullable().optional(),
  sitioWeb: z.string().nullable().optional(),
});

const PrecioAlojamientoSchema = z.object({
  alojamientoId: z.string().min(1, "El alojamientoId es requerido"),
  periodoDesde: z.string().min(1, "El período desde es requerido"),
  periodoHasta: z.string().min(1, "El período hasta es requerido"),
  precioPorNoche: z.number().positive("El precio por noche debe ser un número positivo"),
  regimenId: z.string().nullable().optional(),
});

const AlojamientoFotoSchema = z.object({
  alojamientoId: z.string().min(1, "El alojamientoId es requerido"),
  url: z.string().min(1, "La URL es requerida"),
  alt: z.string().min(1, "El texto alternativo es requerido"),
  orden: z.number().int().nonnegative().optional(),
});

const TrasladoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.enum(["REGULAR", "PRIVADO"]).optional(),
  ciudadId: z.string().nullable().optional(),
  paisId: z.string().nullable().optional(),
  proveedorId: z.string().nullable().optional(),
  precio: z.number().positive("El precio debe ser un número positivo"),
});

const SeguroSchema = z.object({
  proveedorId: z.string().nullable().optional(),
  plan: z.string().min(1, "El plan es requerido"),
  cobertura: z.string().nullable().optional(),
  costoPorDia: z.number().positive("El costo por día debe ser un número positivo"),
});

const CircuitoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  noches: z.number().int().nonnegative("Las noches deben ser un número no negativo"),
  proveedorId: z.string().nullable().optional(),
});

const CircuitoDiaDraftSchema = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  descripcion: z.string().nullable().optional(),
});

const CircuitoCreateSchema = CircuitoSchema.extend({
  itinerarioInicial: z.array(CircuitoDiaDraftSchema).optional(),
});

const CircuitoDiaSchema = z.object({
  circuitoId: z.string().min(1, "El circuitoId es requerido"),
  numeroDia: z.number().int().positive("El número de día debe ser positivo"),
  titulo: z.string().min(1, "El título es requerido"),
  descripcion: z.string().nullable().optional(),
  orden: z.number().int().nonnegative().optional(),
});

const PrecioCircuitoSchema = z.object({
  circuitoId: z.string().min(1, "El circuitoId es requerido"),
  periodoDesde: z.string().min(1, "El período desde es requerido"),
  periodoHasta: z.string().min(1, "El período hasta es requerido"),
  precio: z.number().positive("El precio debe ser un número positivo"),
});

// ──────────────────────────────────────────────
// Aereo (soft delete)
// ──────────────────────────────────────────────

export async function getAereos(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.aereo.findMany({
      where: { brandId, deletedAt: null },
      include: { precios: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    log.error("fetching aereos", error);
    throw new Error("No se pudieron obtener los aéreos.");
  }
}

export async function createAereo(data: {
  ruta: string;
  destino: string;
  aerolinea?: string | null;
  equipaje?: string | null;
  itinerario?: string | null;
  itinerarioImagenes?: string[];
  escalas?: number;
  codigoVueloIda?: string | null;
  codigoVueloVuelta?: string | null;
  duracionIda?: string | null;
  duracionVuelta?: string | null;
  precioInicial?: {
    periodoDesde: string;
    periodoHasta: string;
    precioAdulto: number;
  };
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const { precioInicial, ...aereoData } = AereoCreateSchema.parse(data);
    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "aereo");
      const aereo = await tx.aereo.create({ data: { ...aereoData, id, brandId } });
      if (precioInicial) {
        await tx.precioAereo.create({
          data: { aereoId: aereo.id, ...precioInicial },
        });
      }
      return aereo;
    });
  } catch (error) {
    log.error("creating aereo", error);
    throw new Error("No se pudo crear el aéreo.");
  }
}

export async function updateAereo(
  id: string,
  data: {
    ruta?: string;
    destino?: string;
    aerolinea?: string | null;
    equipaje?: string | null;
    itinerario?: string | null;
    itinerarioImagenes?: string[];
    escalas?: number;
    codigoVueloIda?: string | null;
    codigoVueloVuelta?: string | null;
    duracionIda?: string | null;
    duracionVuelta?: string | null;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.aereo.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating aereo", error);
    throw new Error("No se pudo actualizar el aéreo.");
  }
}

export async function deleteAereo(id: string) {
  try {
    await requireAuth();
    return await prisma.aereo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    log.error("deleting aereo", error);
    throw new Error("No se pudo eliminar el aéreo.");
  }
}

// ──────────────────────────────────────────────
// PrecioAereo (hard delete)
// ──────────────────────────────────────────────

export async function createPrecioAereo(data: {
  aereoId: string;
  periodoDesde: string;
  periodoHasta: string;
  precioAdulto: number;
}) {
  try {
    await requireAuth();
    const parsed = PrecioAereoSchema.parse(data);
    const __res = await prisma.precioAereo.create({ data: parsed }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating precio aereo", error);
    throw new Error("No se pudo crear el precio del aéreo.");
  }
}

export async function updatePrecioAereo(
  id: string,
  data: {
    periodoDesde?: string;
    periodoHasta?: string;
    precioAdulto?: number;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.precioAereo.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating precio aereo", error);
    throw new Error("No se pudo actualizar el precio del aéreo.");
  }
}

export async function deletePrecioAereo(id: string) {
  try {
    await requireAuth();
    const __res = await prisma.precioAereo.delete({ where: { id } }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting precio aereo", error);
    throw new Error("No se pudo eliminar el precio del aéreo.");
  }
}

// ──────────────────────────────────────────────
// Alojamiento (soft delete)
// ──────────────────────────────────────────────

export async function getAlojamientos(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.alojamiento.findMany({
      where: { brandId, deletedAt: null },
      include: { precios: true, fotos: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    log.error("fetching alojamientos", error);
    throw new Error("No se pudieron obtener los alojamientos.");
  }
}

export async function createAlojamiento(data: {
  nombre: string;
  ciudadId?: string | null;
  paisId?: string | null;
  categoria?: number | null;
  sitioWeb?: string | null;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = AlojamientoSchema.parse(data);
    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "alojamiento");
      return await tx.alojamiento.create({ data: { ...parsed, id, brandId } });
    });
  } catch (error) {
    log.error("creating alojamiento", error);
    throw new Error("No se pudo crear el alojamiento.");
  }
}

export async function updateAlojamiento(
  id: string,
  data: {
    nombre?: string;
    ciudadId?: string | null;
    paisId?: string | null;
    categoria?: number | null;
    sitioWeb?: string | null;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.alojamiento.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating alojamiento", error);
    throw new Error("No se pudo actualizar el alojamiento.");
  }
}

export async function deleteAlojamiento(id: string) {
  try {
    await requireAuth();
    return await prisma.alojamiento.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    log.error("deleting alojamiento", error);
    throw new Error("No se pudo eliminar el alojamiento.");
  }
}

// ──────────────────────────────────────────────
// PrecioAlojamiento (hard delete)
// ──────────────────────────────────────────────

export async function createPrecioAlojamiento(data: {
  alojamientoId: string;
  periodoDesde: string;
  periodoHasta: string;
  precioPorNoche: number;
  regimenId?: string | null;
}) {
  try {
    await requireAuth();
    const parsed = PrecioAlojamientoSchema.parse(data);
    const __res = await prisma.precioAlojamiento.create({ data: parsed }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating precio alojamiento", error);
    throw new Error("No se pudo crear el precio del alojamiento.");
  }
}

export async function updatePrecioAlojamiento(
  id: string,
  data: {
    periodoDesde?: string;
    periodoHasta?: string;
    precioPorNoche?: number;
    regimenId?: string | null;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.precioAlojamiento.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating precio alojamiento", error);
    throw new Error("No se pudo actualizar el precio del alojamiento.");
  }
}

export async function deletePrecioAlojamiento(id: string) {
  try {
    await requireAuth();
    const __res = await prisma.precioAlojamiento.delete({ where: { id } }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting precio alojamiento", error);
    throw new Error("No se pudo eliminar el precio del alojamiento.");
  }
}

// ──────────────────────────────────────────────
// AlojamientoFoto (hard delete)
// ──────────────────────────────────────────────

export async function createAlojamientoFoto(data: {
  alojamientoId: string;
  url: string;
  alt: string;
  orden?: number;
}) {
  try {
    await requireAuth();
    const parsed = AlojamientoFotoSchema.parse(data);
    const __res = await prisma.alojamientoFoto.create({ data: parsed }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating alojamiento foto", error);
    throw new Error("No se pudo crear la foto del alojamiento.");
  }
}

export async function updateAlojamientoFoto(
  id: string,
  data: {
    url?: string;
    alt?: string;
    orden?: number;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.alojamientoFoto.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating alojamiento foto", error);
    throw new Error("No se pudo actualizar la foto del alojamiento.");
  }
}

export async function deleteAlojamientoFoto(id: string) {
  try {
    await requireAuth();
    const __res = await prisma.alojamientoFoto.delete({ where: { id } }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting alojamiento foto", error);
    throw new Error("No se pudo eliminar la foto del alojamiento.");
  }
}

// ──────────────────────────────────────────────
// Traslado (soft delete)
// ──────────────────────────────────────────────

export async function getTraslados(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.traslado.findMany({
      where: { brandId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    log.error("fetching traslados", error);
    throw new Error("No se pudieron obtener los traslados.");
  }
}

export async function createTraslado(data: {
  nombre: string;
  tipo?: "REGULAR" | "PRIVADO";
  ciudadId?: string | null;
  paisId?: string | null;
  proveedorId?: string | null;
  precio: number;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = TrasladoSchema.parse(data);
    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "traslado");
      return await tx.traslado.create({ data: { ...parsed, id, brandId } });
    });
  } catch (error) {
    log.error("creating traslado", error);
    throw new Error("No se pudo crear el traslado.");
  }
}

export async function updateTraslado(
  id: string,
  data: {
    nombre?: string;
    tipo?: "REGULAR" | "PRIVADO";
    ciudadId?: string | null;
    paisId?: string | null;
    proveedorId?: string | null;
    precio?: number;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.traslado.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating traslado", error);
    throw new Error("No se pudo actualizar el traslado.");
  }
}

export async function deleteTraslado(id: string) {
  try {
    await requireAuth();
    return await prisma.traslado.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    log.error("deleting traslado", error);
    throw new Error("No se pudo eliminar el traslado.");
  }
}

// ──────────────────────────────────────────────
// Seguro (soft delete)
// ──────────────────────────────────────────────

export async function getSeguros(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.seguro.findMany({
      where: { brandId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    log.error("fetching seguros", error);
    throw new Error("No se pudieron obtener los seguros.");
  }
}

export async function createSeguro(data: {
  proveedorId?: string | null;
  plan: string;
  cobertura?: string | null;
  costoPorDia: number;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = SeguroSchema.parse(data);
    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "seguro");
      return await tx.seguro.create({ data: { ...parsed, id, brandId } });
    });
  } catch (error) {
    log.error("creating seguro", error);
    throw new Error("No se pudo crear el seguro.");
  }
}

export async function updateSeguro(
  id: string,
  data: {
    proveedorId?: string | null;
    plan?: string;
    cobertura?: string | null;
    costoPorDia?: number;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.seguro.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating seguro", error);
    throw new Error("No se pudo actualizar el seguro.");
  }
}

export async function deleteSeguro(id: string) {
  try {
    await requireAuth();
    return await prisma.seguro.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    log.error("deleting seguro", error);
    throw new Error("No se pudo eliminar el seguro.");
  }
}

// ──────────────────────────────────────────────
// Circuito (soft delete)
// ──────────────────────────────────────────────

export async function getCircuitos(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.circuito.findMany({
      where: { brandId, deletedAt: null },
      include: {
        itinerario: { orderBy: { orden: "asc" } },
        precios: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    log.error("fetching circuitos", error);
    throw new Error("No se pudieron obtener los circuitos.");
  }
}

export async function createCircuito(data: {
  nombre: string;
  noches: number;
  proveedorId?: string | null;
  itinerarioInicial?: Array<{
    titulo: string;
    descripcion?: string | null;
  }>;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = CircuitoCreateSchema.parse(data);
    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "circuito");
      const circuito = await tx.circuito.create({
        data: {
          nombre: parsed.nombre,
          noches: parsed.noches,
          proveedorId: parsed.proveedorId,
          id,
          brandId,
        },
      });

      if (parsed.itinerarioInicial?.length) {
        await tx.circuitoDia.createMany({
          data: parsed.itinerarioInicial.map((dia, index) => ({
            id: crypto.randomUUID(),
            circuitoId: circuito.id,
            numeroDia: index + 1,
            titulo: dia.titulo,
            descripcion: dia.descripcion ?? "",
            orden: index,
          })),
        });
      }

      return circuito;
    });
  } catch (error) {
    log.error("creating circuito", error);
    throw new Error("No se pudo crear el circuito.");
  }
}

export async function updateCircuito(
  id: string,
  data: {
    nombre?: string;
    noches?: number;
    proveedorId?: string | null;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.circuito.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating circuito", error);
    throw new Error("No se pudo actualizar el circuito.");
  }
}

export async function deleteCircuito(id: string) {
  try {
    await requireAuth();
    return await prisma.circuito.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    log.error("deleting circuito", error);
    throw new Error("No se pudo eliminar el circuito.");
  }
}

// ──────────────────────────────────────────────
// CircuitoDia (hard delete)
// ──────────────────────────────────────────────

export async function createCircuitoDia(data: {
  circuitoId: string;
  numeroDia: number;
  titulo: string;
  descripcion?: string | null;
  orden?: number;
}) {
  try {
    await requireAuth();
    const parsed = CircuitoDiaSchema.parse(data);
    const __res = await prisma.circuitoDia.create({ data: parsed }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating circuito dia", error);
    throw new Error("No se pudo crear el día del circuito.");
  }
}

export async function updateCircuitoDia(
  id: string,
  data: {
    numeroDia?: number;
    titulo?: string;
    descripcion?: string | null;
    orden?: number;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.circuitoDia.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating circuito dia", error);
    throw new Error("No se pudo actualizar el día del circuito.");
  }
}

export async function deleteCircuitoDia(id: string) {
  try {
    await requireAuth();
    const __res = await prisma.circuitoDia.delete({ where: { id } }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting circuito dia", error);
    throw new Error("No se pudo eliminar el día del circuito.");
  }
}

// ──────────────────────────────────────────────
// PrecioCircuito (hard delete)
// ──────────────────────────────────────────────

export async function createPrecioCircuito(data: {
  circuitoId: string;
  periodoDesde: string;
  periodoHasta: string;
  precio: number;
}) {
  try {
    await requireAuth();
    const parsed = PrecioCircuitoSchema.parse(data);
    const __res = await prisma.precioCircuito.create({ data: parsed }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating precio circuito", error);
    throw new Error("No se pudo crear el precio del circuito.");
  }
}

export async function updatePrecioCircuito(
  id: string,
  data: {
    periodoDesde?: string;
    periodoHasta?: string;
    precio?: number;
  }
) {
  try {
    await requireAuth();
    const __res = await prisma.precioCircuito.update({ where: { id }, data }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating precio circuito", error);
    throw new Error("No se pudo actualizar el precio del circuito.");
  }
}

export async function deletePrecioCircuito(id: string) {
  try {
    await requireAuth();
    const __res = await prisma.precioCircuito.delete({ where: { id } }); bustServicesCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting precio circuito", error);
    throw new Error("No se pudo eliminar el precio del circuito.");
  }
}

// ---------------------------------------------------------------------------
// Two-wave loading — unblocks the UI fast then fills in sub-entities.
//
// Wave 1 — getBaseServices: only main rows, no sub-entity joins.
//   Typically resolves in <1 s even against a remote DB.
//   ServiceProvider dispatches this first so list pages show data immediately.
//
// Wave 2 — getServiceSubEntities: precios, fotos, circuit days.
//   Heavier but non-blocking — UI is already usable from wave 1.
// ---------------------------------------------------------------------------

async function fetchBaseServicesUncached(
  brandId: string,
  alojamientosSkip: number,
  alojamientosTake: number | null,
) {
  const [aereos, alojamientos, totalAlojamientos, traslados, seguros, circuitos] =
    await Promise.all([
      prisma.aereo.findMany({
        where: { brandId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      prisma.alojamiento.findMany({
        where: { brandId, deletedAt: null },
        include: {
          ciudad: { select: { id: true, nombre: true, paisId: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: alojamientosSkip,
        ...(alojamientosTake != null ? { take: alojamientosTake } : {}),
      }),
      prisma.alojamiento.count({
        where: { brandId, deletedAt: null },
      }),
      prisma.traslado.findMany({
        where: { brandId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      prisma.seguro.findMany({
        where: { brandId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      prisma.circuito.findMany({
        where: { brandId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return { aereos, alojamientos, totalAlojamientos, traslados, seguros, circuitos };
}

export async function getBaseServices(
  requestedBrandId?: string,
  options?: { alojamientosSkip?: number; alojamientosTake?: number },
) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const alojamientosSkip = Math.max(0, options?.alojamientosSkip ?? 0);
    const alojamientosTake = options?.alojamientosTake ?? null;
    const cached = unstable_cache(
      () => fetchBaseServicesUncached(brandId, alojamientosSkip, alojamientosTake),
      ["services-base", brandId, String(alojamientosSkip), String(alojamientosTake ?? "all")],
      { revalidate: 60, tags: [`services:${brandId}`, SERVICES_GLOBAL_TAG] },
    );
    return await cached();
  } catch (error) {
    log.error("fetching base services", error);
    throw new Error("No se pudieron obtener los servicios base.");
  }
}

export async function getBaseAlojamientos(
  requestedBrandId?: string,
  options?: { skip?: number; take?: number },
) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const skip = Math.max(0, options?.skip ?? 0);
    const take = options?.take;

    const [alojamientos, total] = await Promise.all([
      prisma.alojamiento.findMany({
        where: { brandId, deletedAt: null },
        include: {
          ciudad: { select: { id: true, nombre: true, paisId: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        ...(typeof take === "number" ? { take } : {}),
      }),
      prisma.alojamiento.count({
        where: { brandId, deletedAt: null },
      }),
    ]);

    return { alojamientos, total };
  } catch (error) {
    log.error("fetching base alojamientos", error);
    throw new Error("No se pudieron obtener los alojamientos base.");
  }
}

async function fetchServiceSubEntitiesUncached(brandId: string) {
  const [
    preciosAereo,
    preciosAlojamiento,
    alojamientoFotos,
    circuitoDias,
    preciosCircuito,
  ] = await Promise.all([
    prisma.precioAereo.findMany({
      where: { aereo: { brandId, deletedAt: null } },
    }),
    prisma.precioAlojamiento.findMany({
      where: { alojamiento: { brandId, deletedAt: null } },
    }),
    prisma.alojamientoFoto.findMany({
      where: { alojamiento: { brandId, deletedAt: null } },
    }),
    prisma.circuitoDia.findMany({
      where: { circuito: { brandId, deletedAt: null } },
      orderBy: { orden: "asc" },
    }),
    prisma.precioCircuito.findMany({
      where: { circuito: { brandId, deletedAt: null } },
    }),
  ]);

  return { preciosAereo, preciosAlojamiento, alojamientoFotos, circuitoDias, preciosCircuito };
}

export async function getServiceSubEntities(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const cached = unstable_cache(
      () => fetchServiceSubEntitiesUncached(brandId),
      ["service-sub", brandId],
      { revalidate: 60, tags: [`service-sub:${brandId}`, `services:${brandId}`] },
    );
    return await cached();
  } catch (error) {
    log.error("fetching service sub-entities", error);
    throw new Error("No se pudieron obtener los sub-datos de servicios.");
  }
}

// Compat wrapper — still used by some direct callers.
export async function getAllServices(requestedBrandId?: string) {
  const [base, sub] = await Promise.all([
    getBaseServices(requestedBrandId),
    getServiceSubEntities(requestedBrandId),
  ]);
  return { ...base, ...sub };
}
