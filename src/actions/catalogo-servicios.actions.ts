"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCanEdit } from "@/lib/require-auth";

export async function listServicios() {
  return prisma.catalogoServicio.findMany({ orderBy: { orden: "asc" } });
}

export async function createServicio(input: {
  nombre: string;
  icon: string;
  descripcion?: string | null;
  orden?: number;
}) {
  await requireCanEdit();
  const created = await prisma.catalogoServicio.create({ data: input });
  revalidatePath("/backend/catalogos/servicios");
  revalidatePath("/backend/web/servicios-incluidos");
  revalidatePath("/destinos", "layout");
  revalidateTag("servicios");
  // Servicios are joined into getPaqueteBySlug (tag "paquetes"), so a rename
  // or icon swap must bust that bucket too — otherwise public paquete detail
  // pages show stale copy for up to 60s.
  revalidateTag("paquetes");
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
  await requireCanEdit();
  const updated = await prisma.catalogoServicio.update({
    where: { id },
    data: input,
  });
  revalidatePath("/backend/catalogos/servicios");
  revalidatePath("/backend/web/servicios-incluidos");
  revalidatePath("/destinos", "layout");
  revalidateTag("servicios");
  // Servicios are joined into getPaqueteBySlug (tag "paquetes"), so a rename
  // or icon swap must bust that bucket too — otherwise public paquete detail
  // pages show stale copy for up to 60s.
  revalidateTag("paquetes");
  return updated;
}

export async function deleteServicio(id: string) {
  await requireCanEdit();
  await prisma.catalogoServicio.delete({ where: { id } });
  revalidatePath("/backend/catalogos/servicios");
  revalidatePath("/backend/web/servicios-incluidos");
  revalidatePath("/destinos", "layout");
  revalidateTag("servicios");
  // Servicios are joined into getPaqueteBySlug (tag "paquetes"), so a rename
  // or icon swap must bust that bucket too — otherwise public paquete detail
  // pages show stale copy for up to 60s.
  revalidateTag("paquetes");
}
