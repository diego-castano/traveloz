"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { BRAND_ID } from "@/lib/brand";

export async function listRegionesForFrontend() {
  return prisma.region.findMany({
    where: { brandId: BRAND_ID },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      slug: true,
      nombre: true,
      orden: true,
      heroImage: true,
      descripcion: true,
    },
  });
}

export async function updateRegionFrontend(
  id: string,
  data: {
    nombre?: string;
    slug?: string;
    orden?: number;
    heroImage?: string | null;
    descripcion?: string | null;
  },
) {
  await requireAuth();
  const updated = await prisma.region.update({ where: { id }, data });
  revalidatePath("/backend/web/destinos");
  revalidatePath("/destinos", "layout");
  revalidateTag("regiones");
  return updated;
}
