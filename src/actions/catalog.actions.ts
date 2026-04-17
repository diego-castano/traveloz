"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import type { CategoriaServicio } from "@prisma/client";

// ──────────────────────────────────────────────
// Zod schemas
// ──────────────────────────────────────────────

const TemporadaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  orden: z.number().int().optional(),
  activa: z.boolean().optional(),
});

const TipoPaqueteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  orden: z.number().int().optional(),
  activo: z.boolean().optional(),
});

const EtiquetaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  slug: z.string().min(1, "El slug es requerido"),
  color: z.string().min(1, "El color es requerido"),
});

const RegimenSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  abrev: z.string().min(1, "La abreviatura es requerida"),
});

const RegionSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  slug: z.string().min(1, "El slug es requerido"),
  orden: z.number().int().optional(),
});

const PaisSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().optional(),
  regionId: z.string().nullable().optional(),
});

const CiudadSchema = z.object({
  paisId: z.string().min(1, "El paisId es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
});

const ProveedorSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  contacto: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  notas: z.string().optional(),
  servicio: z.string().min(1, "El servicio es requerido"),
});

// ──────────────────────────────────────────────
// Temporada
// ──────────────────────────────────────────────

export async function getTemporadas(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.temporada.findMany({
      where: { brandId },
      orderBy: { orden: "asc" },
    });
  } catch (error) {
    console.error("Error fetching temporadas:", error);
    throw new Error("No se pudieron obtener las temporadas.");
  }
}

export async function createTemporada(data: {
  nombre: string;
  orden?: number;
  activa?: boolean;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = TemporadaSchema.parse(data);
    return await prisma.temporada.create({ data: { ...parsed, brandId } });
  } catch (error) {
    console.error("Error creating temporada:", error);
    throw new Error("No se pudo crear la temporada.");
  }
}

export async function updateTemporada(
  id: string,
  data: { nombre?: string; orden?: number; activa?: boolean }
) {
  try {
    await requireAuth();
    return await prisma.temporada.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating temporada:", error);
    throw new Error("No se pudo actualizar la temporada.");
  }
}

export async function deleteTemporada(id: string) {
  try {
    await requireAuth();
    const count = await prisma.paquete.count({ where: { temporadaId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} paquete${count === 1 ? "" : "s"} usando esta temporada.`
      );
    }
    return await prisma.temporada.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting temporada:", error);
    throw error instanceof Error
      ? error
      : new Error("No se pudo eliminar la temporada.");
  }
}

// ──────────────────────────────────────────────
// TipoPaquete
// ──────────────────────────────────────────────

export async function getTiposPaquete(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.tipoPaquete.findMany({
      where: { brandId },
      orderBy: { orden: "asc" },
    });
  } catch (error) {
    console.error("Error fetching tipos de paquete:", error);
    throw new Error("No se pudieron obtener los tipos de paquete.");
  }
}

export async function createTipoPaquete(data: {
  nombre: string;
  orden?: number;
  activo?: boolean;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = TipoPaqueteSchema.parse(data);
    return await prisma.tipoPaquete.create({ data: { ...parsed, brandId } });
  } catch (error) {
    console.error("Error creating tipo de paquete:", error);
    throw new Error("No se pudo crear el tipo de paquete.");
  }
}

export async function updateTipoPaquete(
  id: string,
  data: { nombre?: string; orden?: number; activo?: boolean }
) {
  try {
    await requireAuth();
    return await prisma.tipoPaquete.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating tipo de paquete:", error);
    throw new Error("No se pudo actualizar el tipo de paquete.");
  }
}

export async function deleteTipoPaquete(id: string) {
  try {
    await requireAuth();
    const count = await prisma.paquete.count({ where: { tipoPaqueteId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} paquete${count === 1 ? "" : "s"} usando este tipo de paquete.`
      );
    }
    return await prisma.tipoPaquete.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting tipo de paquete:", error);
    throw error instanceof Error
      ? error
      : new Error("No se pudo eliminar el tipo de paquete.");
  }
}

// ──────────────────────────────────────────────
// Etiqueta
// ──────────────────────────────────────────────

export async function getEtiquetas(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.etiqueta.findMany({
      where: { brandId },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching etiquetas:", error);
    throw new Error("No se pudieron obtener las etiquetas.");
  }
}

export async function createEtiqueta(data: {
  nombre: string;
  slug: string;
  color: string;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = EtiquetaSchema.parse(data);
    return await prisma.etiqueta.create({ data: { ...parsed, brandId } });
  } catch (error) {
    console.error("Error creating etiqueta:", error);
    throw new Error("No se pudo crear la etiqueta.");
  }
}

export async function updateEtiqueta(
  id: string,
  data: { nombre?: string; slug?: string; color?: string }
) {
  try {
    await requireAuth();
    return await prisma.etiqueta.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating etiqueta:", error);
    throw new Error("No se pudo actualizar la etiqueta.");
  }
}

export async function deleteEtiqueta(id: string) {
  try {
    await requireAuth();
    return await prisma.etiqueta.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting etiqueta:", error);
    throw new Error("No se pudo eliminar la etiqueta.");
  }
}

// ──────────────────────────────────────────────
// Regimen
// ──────────────────────────────────────────────

export async function getRegimenes(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.regimen.findMany({
      where: { brandId },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching regimenes:", error);
    throw new Error("No se pudieron obtener los regímenes.");
  }
}

export async function createRegimen(data: {
  nombre: string;
  abrev: string;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = RegimenSchema.parse(data);
    return await prisma.regimen.create({ data: { ...parsed, brandId } });
  } catch (error) {
    console.error("Error creating regimen:", error);
    throw new Error("No se pudo crear el régimen.");
  }
}

export async function updateRegimen(
  id: string,
  data: { nombre?: string; abrev?: string }
) {
  try {
    await requireAuth();
    return await prisma.regimen.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating regimen:", error);
    throw new Error("No se pudo actualizar el régimen.");
  }
}

export async function deleteRegimen(id: string) {
  try {
    await requireAuth();
    const count = await prisma.precioAlojamiento.count({ where: { regimenId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} precio${count === 1 ? "" : "s"} de alojamiento usando este régimen.`
      );
    }
    return await prisma.regimen.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting regimen:", error);
    throw error instanceof Error
      ? error
      : new Error("No se pudo eliminar el régimen.");
  }
}

// ──────────────────────────────────────────────
// Region
// ──────────────────────────────────────────────

export async function getRegiones(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.region.findMany({
      where: { brandId },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
  } catch (error) {
    console.error("Error fetching regiones:", error);
    throw new Error("No se pudieron obtener las regiones.");
  }
}

export async function createRegion(data: {
  nombre: string;
  slug: string;
  orden?: number;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = RegionSchema.parse(data);
    return await prisma.region.create({ data: { ...parsed, brandId } });
  } catch (error) {
    console.error("Error creating region:", error);
    throw new Error("No se pudo crear la región.");
  }
}

export async function updateRegion(
  id: string,
  data: { nombre?: string; slug?: string; orden?: number }
) {
  try {
    await requireAuth();
    return await prisma.region.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating region:", error);
    throw new Error("No se pudo actualizar la región.");
  }
}

export async function deleteRegion(id: string) {
  try {
    await requireAuth();
    const count = await prisma.pais.count({ where: { regionId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} país${count === 1 ? "" : "es"} asignado${count === 1 ? "" : "s"} a esta región.`
      );
    }
    return await prisma.region.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting region:", error);
    throw error instanceof Error
      ? error
      : new Error("No se pudo eliminar la región.");
  }
}

// ──────────────────────────────────────────────
// Pais
// ──────────────────────────────────────────────

export async function getPaises(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.pais.findMany({
      where: { brandId },
      include: { ciudades: true },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching paises:", error);
    throw new Error("No se pudieron obtener los países.");
  }
}

export async function createPais(data: {
  nombre: string;
  codigo?: string;
  regionId?: string | null;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = PaisSchema.parse(data);
    return await prisma.pais.create({ data: { ...parsed, brandId } });
  } catch (error) {
    console.error("Error creating pais:", error);
    throw new Error("No se pudo crear el país.");
  }
}

export async function updatePais(
  id: string,
  data: { nombre?: string; codigo?: string; regionId?: string | null }
) {
  try {
    await requireAuth();
    return await prisma.pais.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating pais:", error);
    throw new Error("No se pudo actualizar el país.");
  }
}

export async function deletePais(id: string) {
  try {
    await requireAuth();
    return await prisma.pais.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting pais:", error);
    throw new Error("No se pudo eliminar el país.");
  }
}

// ──────────────────────────────────────────────
// Ciudad
// ──────────────────────────────────────────────

export async function getCiudades(paisId: string) {
  try {
    await requireAuth();
    return await prisma.ciudad.findMany({
      where: { paisId },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching ciudades:", error);
    throw new Error("No se pudieron obtener las ciudades.");
  }
}

export async function createCiudad(data: { paisId: string; nombre: string }) {
  try {
    await requireAuth();
    const parsed = CiudadSchema.parse(data);
    return await prisma.ciudad.create({ data: parsed });
  } catch (error) {
    console.error("Error creating ciudad:", error);
    throw new Error("No se pudo crear la ciudad.");
  }
}

export async function updateCiudad(
  id: string,
  data: { nombre?: string }
) {
  try {
    await requireAuth();
    return await prisma.ciudad.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating ciudad:", error);
    throw new Error("No se pudo actualizar la ciudad.");
  }
}

export async function deleteCiudad(id: string) {
  try {
    await requireAuth();
    return await prisma.ciudad.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting ciudad:", error);
    throw new Error("No se pudo eliminar la ciudad.");
  }
}

// ──────────────────────────────────────────────
// Proveedor (soft delete)
// ──────────────────────────────────────────────

export async function getProveedores(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    return await prisma.proveedor.findMany({
      where: { brandId, deletedAt: null },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error fetching proveedores:", error);
    throw new Error("No se pudieron obtener los proveedores.");
  }
}

export async function createProveedor(data: {
  nombre: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  notas?: string;
  servicio: CategoriaServicio;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const parsed = ProveedorSchema.parse(data);
    return await prisma.proveedor.create({
      data: { ...parsed, servicio: data.servicio, brandId },
    });
  } catch (error) {
    console.error("Error creating proveedor:", error);
    throw new Error("No se pudo crear el proveedor.");
  }
}

export async function updateProveedor(
  id: string,
  data: {
    nombre?: string;
    contacto?: string;
    email?: string;
    telefono?: string;
    notas?: string;
    servicio?: CategoriaServicio;
  }
) {
  try {
    await requireAuth();
    return await prisma.proveedor.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating proveedor:", error);
    throw new Error("No se pudo actualizar el proveedor.");
  }
}

export async function deleteProveedor(id: string) {
  try {
    await requireAuth();
    return await prisma.proveedor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    console.error("Error deleting proveedor:", error);
    throw new Error("No se pudo eliminar el proveedor.");
  }
}

// ──────────────────────────────────────────────
// Combined fetch — getAllCatalogs
// ──────────────────────────────────────────────

export async function getAllCatalogs(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const [
      temporadas,
      tiposPaquete,
      etiquetas,
      regimenes,
      regiones,
      paises,
      proveedores,
    ] = await Promise.all([
      prisma.temporada.findMany({
        where: { brandId },
        orderBy: { orden: "asc" },
      }),
      prisma.tipoPaquete.findMany({
        where: { brandId },
        orderBy: { orden: "asc" },
      }),
      prisma.etiqueta.findMany({
        where: { brandId },
        orderBy: { nombre: "asc" },
      }),
      prisma.regimen.findMany({
        where: { brandId },
        orderBy: { nombre: "asc" },
      }),
      prisma.region.findMany({
        where: { brandId },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      }),
      prisma.pais.findMany({
        where: { brandId },
        include: { ciudades: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.proveedor.findMany({
        where: { brandId, deletedAt: null },
        orderBy: { nombre: "asc" },
      }),
    ]);

    return {
      temporadas,
      tiposPaquete,
      etiquetas,
      regimenes,
      regiones,
      paises,
      proveedores,
    };
  } catch (error) {
    console.error("Error fetching all catalogs:", error);
    throw new Error("No se pudieron obtener los datos de catálogo.");
  }
}
