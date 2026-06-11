"use server";

import { z } from "zod";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireCanEdit } from "@/lib/require-auth";
import type { CategoriaServicio } from "@prisma/client";
import { logger } from "@/lib/logger";
const log = logger.child({ module: "catalog.actions" });

/** Global catalog-cache tag. Same rationale as services-global: lets every
 *  mutation invalidate without resolving brandId first. Catalogs are tiny
 *  and rarely change, so over-invalidation across brands is cheap. */
const CATALOGS_GLOBAL_TAG = "catalogs-global";

/** Bust the per-brand catalog cache. Catalogs change rarely, so we use a long
 *  TTL (5 min) but still invalidate on every mutation so admins see edits
 *  immediately. */
function bustCatalogsCache(brandId: string) {
  revalidateTag(`catalogs:${brandId}`);
  revalidateTag(CATALOGS_GLOBAL_TAG);
}

/** Bust the global catalog cache. For mutations without brandId in scope. */
function bustCatalogsCacheGlobal() {
  revalidateTag(CATALOGS_GLOBAL_TAG);
}

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
    log.error("fetching temporadas", error);
    throw new Error("No se pudieron obtener las temporadas.");
  }
}

export async function createTemporada(data: {
  nombre: string;
  orden?: number;
  activa?: boolean;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireCanEdit(requestedBrandId);
    const parsed = TemporadaSchema.parse(data);
    const __res = await prisma.temporada.create({ data: { ...parsed, brandId } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating temporada", error);
    throw new Error("No se pudo crear la temporada.");
  }
}

export async function updateTemporada(
  id: string,
  data: { nombre?: string; orden?: number; activa?: boolean }
) {
  try {
    await requireCanEdit();
    const __res = await prisma.temporada.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating temporada", error);
    throw new Error("No se pudo actualizar la temporada.");
  }
}

export async function deleteTemporada(id: string) {
  try {
    await requireCanEdit();
    const count = await prisma.paquete.count({ where: { temporadaId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} paquete${count === 1 ? "" : "s"} usando esta temporada.`
      );
    }
    const __res = await prisma.temporada.delete({ where: { id } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting temporada", error);
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
    log.error("fetching tipos de paquete", error);
    throw new Error("No se pudieron obtener los tipos de paquete.");
  }
}

export async function createTipoPaquete(data: {
  nombre: string;
  orden?: number;
  activo?: boolean;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireCanEdit(requestedBrandId);
    const parsed = TipoPaqueteSchema.parse(data);
    const __res = await prisma.tipoPaquete.create({ data: { ...parsed, brandId } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating tipo de paquete", error);
    throw new Error("No se pudo crear el tipo de paquete.");
  }
}

export async function updateTipoPaquete(
  id: string,
  data: { nombre?: string; orden?: number; activo?: boolean }
) {
  try {
    await requireCanEdit();
    const __res = await prisma.tipoPaquete.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating tipo de paquete", error);
    throw new Error("No se pudo actualizar el tipo de paquete.");
  }
}

export async function deleteTipoPaquete(id: string) {
  try {
    await requireCanEdit();
    const count = await prisma.paquete.count({ where: { tipoPaqueteId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} paquete${count === 1 ? "" : "s"} usando este tipo de paquete.`
      );
    }
    const __res = await prisma.tipoPaquete.delete({ where: { id } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting tipo de paquete", error);
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
    log.error("fetching etiquetas", error);
    throw new Error("No se pudieron obtener las etiquetas.");
  }
}

export async function createEtiqueta(data: {
  nombre: string;
  slug: string;
  color: string;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireCanEdit(requestedBrandId);
    const parsed = EtiquetaSchema.parse(data);
    const __res = await prisma.etiqueta.create({ data: { ...parsed, brandId } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating etiqueta", error);
    throw new Error("No se pudo crear la etiqueta.");
  }
}

export async function updateEtiqueta(
  id: string,
  data: { nombre?: string; slug?: string; color?: string }
) {
  try {
    await requireCanEdit();
    const __res = await prisma.etiqueta.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating etiqueta", error);
    throw new Error("No se pudo actualizar la etiqueta.");
  }
}

export async function deleteEtiqueta(id: string) {
  try {
    await requireCanEdit();
    const __res = await prisma.etiqueta.delete({ where: { id } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting etiqueta", error);
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
    log.error("fetching regimenes", error);
    throw new Error("No se pudieron obtener los regímenes.");
  }
}

export async function createRegimen(data: {
  nombre: string;
  abrev: string;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireCanEdit(requestedBrandId);
    const parsed = RegimenSchema.parse(data);
    const __res = await prisma.regimen.create({ data: { ...parsed, brandId } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating regimen", error);
    throw new Error("No se pudo crear el régimen.");
  }
}

export async function updateRegimen(
  id: string,
  data: { nombre?: string; abrev?: string }
) {
  try {
    await requireCanEdit();
    const __res = await prisma.regimen.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating regimen", error);
    throw new Error("No se pudo actualizar el régimen.");
  }
}

export async function deleteRegimen(id: string) {
  try {
    await requireCanEdit();
    const count = await prisma.precioAlojamiento.count({ where: { regimenId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} precio${count === 1 ? "" : "s"} de alojamiento usando este régimen.`
      );
    }
    const __res = await prisma.regimen.delete({ where: { id } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting regimen", error);
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
    log.error("fetching regiones", error);
    throw new Error("No se pudieron obtener las regiones.");
  }
}

export async function createRegion(data: {
  nombre: string;
  slug: string;
  orden?: number;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireCanEdit(requestedBrandId);
    const parsed = RegionSchema.parse(data);
    const __res = await prisma.region.create({ data: { ...parsed, brandId } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating region", error);
    throw new Error("No se pudo crear la región.");
  }
}

export async function updateRegion(
  id: string,
  data: { nombre?: string; slug?: string; orden?: number }
) {
  try {
    await requireCanEdit();
    const __res = await prisma.region.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating region", error);
    throw new Error("No se pudo actualizar la región.");
  }
}

export async function deleteRegion(id: string) {
  try {
    await requireCanEdit();
    const count = await prisma.pais.count({ where: { regionId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar: hay ${count} país${count === 1 ? "" : "es"} asignado${count === 1 ? "" : "s"} a esta región.`
      );
    }
    const __res = await prisma.region.delete({ where: { id } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting region", error);
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
    log.error("fetching paises", error);
    throw new Error("No se pudieron obtener los países.");
  }
}

export async function createPais(data: {
  nombre: string;
  codigo?: string;
  regionId?: string | null;
}, requestedBrandId?: string) {
  try {
    const { brandId } = await requireCanEdit(requestedBrandId);
    const parsed = PaisSchema.parse(data);
    const __res = await prisma.pais.create({ data: { ...parsed, brandId } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating pais", error);
    throw new Error("No se pudo crear el país.");
  }
}

export async function updatePais(
  id: string,
  data: { nombre?: string; codigo?: string; regionId?: string | null }
) {
  try {
    await requireCanEdit();
    const __res = await prisma.pais.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating pais", error);
    throw new Error("No se pudo actualizar el país.");
  }
}

export async function deletePais(id: string) {
  try {
    await requireCanEdit();
    const __res = await prisma.pais.delete({ where: { id } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting pais", error);
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
    log.error("fetching ciudades", error);
    throw new Error("No se pudieron obtener las ciudades.");
  }
}

export async function createCiudad(data: { paisId: string; nombre: string }) {
  try {
    await requireCanEdit();
    const parsed = CiudadSchema.parse(data);
    const __res = await prisma.ciudad.create({ data: parsed }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("creating ciudad", error);
    throw new Error("No se pudo crear la ciudad.");
  }
}

export async function updateCiudad(
  id: string,
  data: { nombre?: string }
) {
  try {
    await requireCanEdit();
    const __res = await prisma.ciudad.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating ciudad", error);
    throw new Error("No se pudo actualizar la ciudad.");
  }
}

export async function deleteCiudad(id: string) {
  try {
    await requireCanEdit();
    const __res = await prisma.ciudad.delete({ where: { id } }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("deleting ciudad", error);
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
    log.error("fetching proveedores", error);
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
    const { brandId } = await requireCanEdit(requestedBrandId);
    const parsed = ProveedorSchema.parse(data);
    return await prisma.proveedor.create({
      data: { ...parsed, servicio: data.servicio, brandId },
    });
  } catch (error) {
    log.error("creating proveedor", error);
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
    await requireCanEdit();
    const __res = await prisma.proveedor.update({ where: { id }, data }); bustCatalogsCacheGlobal(); return __res;
  } catch (error) {
    log.error("updating proveedor", error);
    throw new Error("No se pudo actualizar el proveedor.");
  }
}

export async function deleteProveedor(id: string) {
  try {
    await requireCanEdit();
    return await prisma.proveedor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    log.error("deleting proveedor", error);
    throw new Error("No se pudo eliminar el proveedor.");
  }
}

// ──────────────────────────────────────────────
// Combined fetch — getAllCatalogs
// ──────────────────────────────────────────────

async function fetchBaseCatalogsUncached(_brandId: string) {
  // Single-tenant since Fase 7. The catalog admin shows ALL rows regardless
  // of brandId so legacy seed data tagged 'brand-2' remains visible/editable.
  // Mutations still write brandId='brand-1' (BRAND_ID).
  const [temporadas, tiposPaquete, etiquetas, regimenes, regiones, proveedores] =
    await Promise.all([
      prisma.temporada.findMany({ orderBy: { orden: "asc" } }),
      prisma.tipoPaquete.findMany({ orderBy: { orden: "asc" } }),
      prisma.etiqueta.findMany({ orderBy: { nombre: "asc" } }),
      prisma.regimen.findMany({ orderBy: { nombre: "asc" } }),
      prisma.region.findMany({
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      }),
      prisma.proveedor.findMany({
        where: { deletedAt: null },
        orderBy: { nombre: "asc" },
      }),
    ]);
  return { temporadas, tiposPaquete, etiquetas, regimenes, regiones, proveedores };
}

export async function getBaseCatalogs(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const cached = unstable_cache(
      () => fetchBaseCatalogsUncached(brandId),
      ["catalogs-base", brandId],
      { revalidate: 300, tags: [`catalogs:${brandId}`, CATALOGS_GLOBAL_TAG] },
    );
    return await cached();
  } catch (error) {
    log.error("fetching base catalogs", error);
    throw new Error("No se pudieron obtener los catálogos base.");
  }
}

async function fetchCatalogGeographyUncached(_brandId: string) {
  // Single-tenant — show all paises + ciudades regardless of brandId.
  const paises = await prisma.pais.findMany({
    include: { ciudades: true },
    orderBy: { nombre: "asc" },
  });
  return { paises };
}

export async function getCatalogGeography(requestedBrandId?: string) {
  try {
    const { brandId } = await requireAuth(requestedBrandId);
    const cached = unstable_cache(
      () => fetchCatalogGeographyUncached(brandId),
      ["catalogs-geography", brandId],
      { revalidate: 300, tags: [`catalogs:${brandId}`, CATALOGS_GLOBAL_TAG] },
    );
    return await cached();
  } catch (error) {
    log.error("fetching catalog geography", error);
    throw new Error("No se pudieron obtener los paises y ciudades.");
  }
}

export async function getAllCatalogs(requestedBrandId?: string) {
  try {
    const [base, geography] = await Promise.all([
      getBaseCatalogs(requestedBrandId),
      getCatalogGeography(requestedBrandId),
    ]);

    return {
      ...base,
      ...geography,
    };
  } catch (error) {
    log.error("fetching all catalogs", error);
    throw new Error("No se pudieron obtener los datos de catálogo.");
  }
}
