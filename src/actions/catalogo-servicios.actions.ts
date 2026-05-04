"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

export async function listServicios() {
  return prisma.catalogoServicio.findMany({ orderBy: { orden: "asc" } });
}

export async function createServicio(input: {
  nombre: string;
  icon: string;
  descripcion?: string | null;
  orden?: number;
}) {
  await requireAuth();
  const created = await prisma.catalogoServicio.create({ data: input });
  revalidatePath("/backend/catalogos/servicios");
  revalidateTag("servicios");
  return created;
}

export async function updateServicio(
  id: string,
  input: Partial<{
    nombre: string;
    icon: string;
    descripcion: string | null;
    orden: number;
    activo: boolean;
  }>,
) {
  await requireAuth();
  const updated = await prisma.catalogoServicio.update({
    where: { id },
    data: input,
  });
  revalidatePath("/backend/catalogos/servicios");
  revalidateTag("servicios");
  return updated;
}

export async function deleteServicio(id: string) {
  await requireAuth();
  await prisma.catalogoServicio.delete({ where: { id } });
  revalidatePath("/backend/catalogos/servicios");
  revalidateTag("servicios");
}
