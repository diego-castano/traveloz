"use server";

import { prisma } from "@/lib/db";

// ──────────────────────────────────────────────
// Aereo (soft delete)
// ──────────────────────────────────────────────

export async function getAereos(brandId: string) {
  return prisma.aereo.findMany({
    where: { brandId, deletedAt: null },
    include: { precios: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAereo(data: {
  brandId: string;
  ruta: string;
  destino: string;
  aerolinea?: string | null;
  equipaje?: string | null;
  itinerario?: string | null;
  escalas?: number;
  codigoVueloIda?: string | null;
  codigoVueloVuelta?: string | null;
  duracionIda?: string | null;
  duracionVuelta?: string | null;
}) {
  return prisma.aereo.create({ data });
}

export async function updateAereo(
  id: string,
  data: {
    ruta?: string;
    destino?: string;
    aerolinea?: string | null;
    equipaje?: string | null;
    itinerario?: string | null;
    escalas?: number;
    codigoVueloIda?: string | null;
    codigoVueloVuelta?: string | null;
    duracionIda?: string | null;
    duracionVuelta?: string | null;
  }
) {
  return prisma.aereo.update({ where: { id }, data });
}

export async function deleteAereo(id: string) {
  return prisma.aereo.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
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
  return prisma.precioAereo.create({ data });
}

export async function updatePrecioAereo(
  id: string,
  data: {
    periodoDesde?: string;
    periodoHasta?: string;
    precioAdulto?: number;
  }
) {
  return prisma.precioAereo.update({ where: { id }, data });
}

export async function deletePrecioAereo(id: string) {
  return prisma.precioAereo.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Alojamiento (soft delete)
// ──────────────────────────────────────────────

export async function getAlojamientos(brandId: string) {
  return prisma.alojamiento.findMany({
    where: { brandId, deletedAt: null },
    include: { precios: true, fotos: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAlojamiento(data: {
  brandId: string;
  nombre: string;
  ciudadId?: string | null;
  paisId?: string | null;
  categoria?: number | null;
  sitioWeb?: string | null;
}) {
  return prisma.alojamiento.create({ data });
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
  return prisma.alojamiento.update({ where: { id }, data });
}

export async function deleteAlojamiento(id: string) {
  return prisma.alojamiento.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
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
  return prisma.precioAlojamiento.create({ data });
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
  return prisma.precioAlojamiento.update({ where: { id }, data });
}

export async function deletePrecioAlojamiento(id: string) {
  return prisma.precioAlojamiento.delete({ where: { id } });
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
  return prisma.alojamientoFoto.create({ data });
}

export async function updateAlojamientoFoto(
  id: string,
  data: {
    url?: string;
    alt?: string;
    orden?: number;
  }
) {
  return prisma.alojamientoFoto.update({ where: { id }, data });
}

export async function deleteAlojamientoFoto(id: string) {
  return prisma.alojamientoFoto.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Traslado (soft delete)
// ──────────────────────────────────────────────

export async function getTraslados(brandId: string) {
  return prisma.traslado.findMany({
    where: { brandId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTraslado(data: {
  brandId: string;
  nombre: string;
  tipo?: "REGULAR" | "PRIVADO";
  ciudadId?: string | null;
  paisId?: string | null;
  proveedorId?: string | null;
  precio: number;
}) {
  return prisma.traslado.create({ data });
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
  return prisma.traslado.update({ where: { id }, data });
}

export async function deleteTraslado(id: string) {
  return prisma.traslado.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ──────────────────────────────────────────────
// Seguro (soft delete)
// ──────────────────────────────────────────────

export async function getSeguros(brandId: string) {
  return prisma.seguro.findMany({
    where: { brandId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSeguro(data: {
  brandId: string;
  proveedorId?: string | null;
  plan: string;
  cobertura?: string | null;
  costoPorDia: number;
}) {
  return prisma.seguro.create({ data });
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
  return prisma.seguro.update({ where: { id }, data });
}

export async function deleteSeguro(id: string) {
  return prisma.seguro.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ──────────────────────────────────────────────
// Circuito (soft delete)
// ──────────────────────────────────────────────

export async function getCircuitos(brandId: string) {
  return prisma.circuito.findMany({
    where: { brandId, deletedAt: null },
    include: {
      itinerario: { orderBy: { orden: "asc" } },
      precios: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCircuito(data: {
  brandId: string;
  nombre: string;
  noches: number;
  proveedorId?: string | null;
}) {
  return prisma.circuito.create({ data });
}

export async function updateCircuito(
  id: string,
  data: {
    nombre?: string;
    noches?: number;
    proveedorId?: string | null;
  }
) {
  return prisma.circuito.update({ where: { id }, data });
}

export async function deleteCircuito(id: string) {
  return prisma.circuito.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
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
  return prisma.circuitoDia.create({ data });
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
  return prisma.circuitoDia.update({ where: { id }, data });
}

export async function deleteCircuitoDia(id: string) {
  return prisma.circuitoDia.delete({ where: { id } });
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
  return prisma.precioCircuito.create({ data });
}

export async function updatePrecioCircuito(
  id: string,
  data: {
    periodoDesde?: string;
    periodoHasta?: string;
    precio?: number;
  }
) {
  return prisma.precioCircuito.update({ where: { id }, data });
}

export async function deletePrecioCircuito(id: string) {
  return prisma.precioCircuito.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Combined fetch — all services in one call
// ──────────────────────────────────────────────

export async function getAllServices(brandId: string) {
  const [aereos, alojamientos, traslados, seguros, circuitos] =
    await Promise.all([
      prisma.aereo.findMany({
        where: { brandId, deletedAt: null },
        include: { precios: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.alojamiento.findMany({
        where: { brandId, deletedAt: null },
        include: { precios: true, fotos: true },
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
        include: {
          itinerario: { orderBy: { orden: "asc" } },
          precios: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // Flatten sub-entities from included relations
  const preciosAereo = aereos.flatMap((a) => a.precios);
  const preciosAlojamiento = alojamientos.flatMap((a) => a.precios);
  const alojamientoFotos = alojamientos.flatMap((a) => a.fotos);
  const circuitoDias = circuitos.flatMap((c) => c.itinerario);
  const preciosCircuito = circuitos.flatMap((c) => c.precios);

  return {
    aereos,
    preciosAereo,
    alojamientos,
    preciosAlojamiento,
    alojamientoFotos,
    traslados,
    seguros,
    circuitos,
    circuitoDias,
    preciosCircuito,
  };
}
