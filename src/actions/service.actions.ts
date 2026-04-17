"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { generateSequentialId } from "@/lib/sequential-id";

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
    console.error("Error fetching aereos:", error);
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
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = AereoSchema.parse(data);
    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "aereo");
      return await tx.aereo.create({ data: { ...parsed, id, brandId } });
    });
  } catch (error) {
    console.error("Error creating aereo:", error);
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
    return await prisma.aereo.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating aereo:", error);
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
    console.error("Error deleting aereo:", error);
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
    return await prisma.precioAereo.create({ data: parsed });
  } catch (error) {
    console.error("Error creating precio aereo:", error);
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
    return await prisma.precioAereo.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating precio aereo:", error);
    throw new Error("No se pudo actualizar el precio del aéreo.");
  }
}

export async function deletePrecioAereo(id: string) {
  try {
    await requireAuth();
    return await prisma.precioAereo.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting precio aereo:", error);
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
    console.error("Error fetching alojamientos:", error);
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
    console.error("Error creating alojamiento:", error);
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
    return await prisma.alojamiento.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating alojamiento:", error);
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
    console.error("Error deleting alojamiento:", error);
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
    return await prisma.precioAlojamiento.create({ data: parsed });
  } catch (error) {
    console.error("Error creating precio alojamiento:", error);
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
    return await prisma.precioAlojamiento.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating precio alojamiento:", error);
    throw new Error("No se pudo actualizar el precio del alojamiento.");
  }
}

export async function deletePrecioAlojamiento(id: string) {
  try {
    await requireAuth();
    return await prisma.precioAlojamiento.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting precio alojamiento:", error);
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
    return await prisma.alojamientoFoto.create({ data: parsed });
  } catch (error) {
    console.error("Error creating alojamiento foto:", error);
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
    return await prisma.alojamientoFoto.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating alojamiento foto:", error);
    throw new Error("No se pudo actualizar la foto del alojamiento.");
  }
}

export async function deleteAlojamientoFoto(id: string) {
  try {
    await requireAuth();
    return await prisma.alojamientoFoto.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting alojamiento foto:", error);
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
    console.error("Error fetching traslados:", error);
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
    console.error("Error creating traslado:", error);
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
    return await prisma.traslado.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating traslado:", error);
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
    console.error("Error deleting traslado:", error);
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
    console.error("Error fetching seguros:", error);
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
    console.error("Error creating seguro:", error);
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
    return await prisma.seguro.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating seguro:", error);
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
    console.error("Error deleting seguro:", error);
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
    console.error("Error fetching circuitos:", error);
    throw new Error("No se pudieron obtener los circuitos.");
  }
}

export async function createCircuito(data: {
  nombre: string;
  noches: number;
  proveedorId?: string | null;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = CircuitoSchema.parse(data);
    return await prisma.$transaction(async (tx) => {
      const id = await generateSequentialId(tx, "circuito");
      return await tx.circuito.create({ data: { ...parsed, id, brandId } });
    });
  } catch (error) {
    console.error("Error creating circuito:", error);
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
    return await prisma.circuito.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating circuito:", error);
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
    console.error("Error deleting circuito:", error);
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
    return await prisma.circuitoDia.create({ data: parsed });
  } catch (error) {
    console.error("Error creating circuito dia:", error);
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
    return await prisma.circuitoDia.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating circuito dia:", error);
    throw new Error("No se pudo actualizar el día del circuito.");
  }
}

export async function deleteCircuitoDia(id: string) {
  try {
    await requireAuth();
    return await prisma.circuitoDia.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting circuito dia:", error);
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
    return await prisma.precioCircuito.create({ data: parsed });
  } catch (error) {
    console.error("Error creating precio circuito:", error);
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
    return await prisma.precioCircuito.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating precio circuito:", error);
    throw new Error("No se pudo actualizar el precio del circuito.");
  }
}

export async function deletePrecioCircuito(id: string) {
  try {
    await requireAuth();
    return await prisma.precioCircuito.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting precio circuito:", error);
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

export async function getBaseServices(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);

    const [aereos, alojamientos, traslados, seguros, circuitos] =
      await Promise.all([
        prisma.aereo.findMany({
          where: { brandId, deletedAt: null },
          orderBy: { createdAt: "desc" },
        }),
        prisma.alojamiento.findMany({
          where: { brandId, deletedAt: null },
          orderBy: { createdAt: "desc" },
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

    return { aereos, alojamientos, traslados, seguros, circuitos };
  } catch (error) {
    console.error("Error fetching base services:", error);
    throw new Error("No se pudieron obtener los servicios base.");
  }
}

export async function getServiceSubEntities(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);

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

    return {
      preciosAereo,
      preciosAlojamiento,
      alojamientoFotos,
      circuitoDias,
      preciosCircuito,
    };
  } catch (error) {
    console.error("Error fetching service sub-entities:", error);
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
