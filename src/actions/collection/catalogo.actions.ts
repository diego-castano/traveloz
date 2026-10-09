"use server";

// Catálogo común de Traveloz que usa Collection (proveedores internos y
// usuarios para vincular especialistas).
// Contrato { ok, data } | { ok, error }.

import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";
import { requireCollection } from "@/lib/collection/permisos";
import { ejecutar, type Resultado } from "@/lib/collection/ejecutar";

export async function listarProveedoresCatalogo(): Promise<Resultado<{ id: string; nombre: string }[]>> {
  return ejecutar("listarProveedoresCatalogo", async () => {
    await requireCollection("panel");
    return prisma.proveedor.findMany({
      where: { brandId: BRAND_ID, deletedAt: null },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
  });
}

export async function listarUsuariosTraveloz(): Promise<Resultado<{ id: string; name: string }[]>> {
  return ejecutar("listarUsuariosTraveloz", async () => {
    await requireCollection("sitio.editar");
    return prisma.user.findMany({
      where: { brandId: BRAND_ID, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });
}
