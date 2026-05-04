"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

export async function listTestimonios() {
  return prisma.testimonio.findMany({ orderBy: { orden: "asc" } });
}

export async function createTestimonio(input: {
  ubicacion: string;
  titulo: string;
  texto: string;
  autor: string;
  rating?: number;
  imageUrl?: string | null;
  paqueteId?: string | null;
  orden?: number;
}) {
  await requireAuth();
  const created = await prisma.testimonio.create({ data: input });
  revalidatePath("/backend/web/testimonios");
  revalidatePath("/", "layout");
  revalidateTag("testimonios");
  return created;
}

export async function updateTestimonio(
  id: string,
  input: Partial<{
    ubicacion: string;
    titulo: string;
    texto: string;
    autor: string;
    rating: number;
    imageUrl: string | null;
    publicado: boolean;
    orden: number;
    paqueteId: string | null;
  }>,
) {
  await requireAuth();
  const updated = await prisma.testimonio.update({
    where: { id },
    data: input,
  });
  revalidatePath("/backend/web/testimonios");
  revalidatePath("/", "layout");
  revalidateTag("testimonios");
  return updated;
}

export async function deleteTestimonio(id: string) {
  await requireAuth();
  await prisma.testimonio.delete({ where: { id } });
  revalidatePath("/backend/web/testimonios");
  revalidatePath("/", "layout");
  revalidateTag("testimonios");
}
