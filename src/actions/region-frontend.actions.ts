"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

// Public site is single-tenant; the admin Web module only edits TravelOz regions.
const PUBLIC_BRAND_ID = "brand-1";

export async function listRegionesForFrontend() {
  return prisma.region.findMany({
    where: { brandId: PUBLIC_BRAND_ID },
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
