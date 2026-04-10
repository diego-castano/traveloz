"use server";

import { prisma } from "@/lib/db";
import type { CategoriaServicio } from "@prisma/client";

// ──────────────────────────────────────────────
// Temporada
// ──────────────────────────────────────────────

export async function getTemporadas(brandId: string) {
  try {
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
  brandId: string;
  nombre: string;
  orden?: number;
  activa?: boolean;
}) {
  try {
    return await prisma.temporada.create({ data });
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
    return await prisma.temporada.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating temporada:", error);
    throw new Error("No se pudo actualizar la temporada.");
  }
}

export async function deleteTemporada(id: string) {
  try {
    return await prisma.temporada.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting temporada:", error);
    throw new Error("No se pudo eliminar la temporada.");
  }
}

// ──────────────────────────────────────────────
// TipoPaquete
// ──────────────────────────────────────────────

export async function getTiposPaquete(brandId: string) {
  try {
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
  brandId: string;
  nombre: string;
  orden?: number;
  activo?: boolean;
}) {
  try {
    return await prisma.tipoPaquete.create({ data });
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
    return await prisma.tipoPaquete.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating tipo de paquete:", error);
    throw new Error("No se pudo actualizar el tipo de paquete.");
  }
}

export async function deleteTipoPaquete(id: string) {
  try {
    return await prisma.tipoPaquete.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting tipo de paquete:", error);
    throw new Error("No se pudo eliminar el tipo de paquete.");
  }
}

// ──────────────────────────────────────────────
// Etiqueta
// ──────────────────────────────────────────────

export async function getEtiquetas(brandId: string) {
  try {
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
  brandId: string;
  nombre: string;
  slug: string;
  color: string;
}) {
  try {
    return await prisma.etiqueta.create({ data });
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
    return await prisma.etiqueta.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating etiqueta:", error);
    throw new Error("No se pudo actualizar la etiqueta.");
  }
}

export async function deleteEtiqueta(id: string) {
  try {
    return await prisma.etiqueta.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting etiqueta:", error);
    throw new Error("No se pudo eliminar la etiqueta.");
  }
}

// ──────────────────────────────────────────────
// Regimen
// ──────────────────────────────────────────────

export async function getRegimenes(brandId: string) {
  try {
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
  brandId: string;
  nombre: string;
  abrev: string;
}) {
  try {
    return await prisma.regimen.create({ data });
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
    return await prisma.regimen.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating regimen:", error);
    throw new Error("No se pudo actualizar el régimen.");
  }
}

export async function deleteRegimen(id: string) {
  try {
    return await prisma.regimen.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting regimen:", error);
    throw new Error("No se pudo eliminar el régimen.");
  }
}

// ──────────────────────────────────────────────
// Pais
// ──────────────────────────────────────────────

export async function getPaises(brandId: string) {
  try {
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
  brandId: string;
  nombre: string;
  codigo?: string;
}) {
  try {
    return await prisma.pais.create({ data });
  } catch (error) {
    console.error("Error creating pais:", error);
    throw new Error("No se pudo crear el país.");
  }
}

export async function updatePais(
  id: string,
  data: { nombre?: string; codigo?: string }
) {
  try {
    return await prisma.pais.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating pais:", error);
    throw new Error("No se pudo actualizar el país.");
  }
}

export async function deletePais(id: string) {
  try {
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
    return await prisma.ciudad.create({ data });
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
    return await prisma.ciudad.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating ciudad:", error);
    throw new Error("No se pudo actualizar la ciudad.");
  }
}

export async function deleteCiudad(id: string) {
  try {
    return await prisma.ciudad.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting ciudad:", error);
    throw new Error("No se pudo eliminar la ciudad.");
  }
}

// ──────────────────────────────────────────────
// Proveedor (soft delete)
// ──────────────────────────────────────────────

export async function getProveedores(brandId: string) {
  try {
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
  brandId: string;
  nombre: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  notas?: string;
  servicio: CategoriaServicio;
}) {
  try {
    return await prisma.proveedor.create({ data });
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
    return await prisma.proveedor.update({ where: { id }, data });
  } catch (error) {
    console.error("Error updating proveedor:", error);
    throw new Error("No se pudo actualizar el proveedor.");
  }
}

export async function deleteProveedor(id: string) {
  try {
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

export async function getAllCatalogs(brandId: string) {
  try {
    const [
      temporadas,
      tiposPaquete,
      etiquetas,
      regimenes,
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
      paises,
      proveedores,
    };
  } catch (error) {
    console.error("Error fetching all catalogs:", error);
    throw new Error("No se pudieron obtener los datos de catálogo.");
  }
}
