"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

export async function listCategoriasDestacadas() {
  return prisma.categoriaDestacada.findMany({ orderBy: { orden: "asc" } });
}

export async function createCategoriaDestacada(input: {
  titulo: string;
  imagen: string;
  link: string;
  orden?: number;
}) {
  await requireAuth();
  const created = await prisma.categoriaDestacada.create({ data: input });
  revalidatePath("/backend/web/categorias");
  revalidatePath("/", "layout");
  revalidateTag("categorias-destacadas");
  return created;
}

export async function updateCategoriaDestacada(
  id: string,
  input: Partial<{
    titulo: string;
    imagen: string;
    link: string;
    orden: number;
    activa: boolean;
  }>,
) {
  await requireAuth();
  const updated = await prisma.categoriaDestacada.update({
    where: { id },
    data: input,
  });
  revalidatePath("/backend/web/categorias");
  revalidatePath("/", "layout");
  revalidateTag("categorias-destacadas");
  return updated;
}

export async function deleteCategoriaDestacada(id: string) {
  await requireAuth();
  await prisma.categoriaDestacada.delete({ where: { id } });
  revalidatePath("/backend/web/categorias");
  revalidatePath("/", "layout");
  revalidateTag("categorias-destacadas");
}
