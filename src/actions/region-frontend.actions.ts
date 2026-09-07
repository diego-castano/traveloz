"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCanEdit } from "@/lib/require-auth";
import { BRAND_ID } from "@/lib/brand";

// ---------------------------------------------------------------------------
// Frontend module for regions: ONLY edits public-facing visuals (heroImage,
// descripcion). Region identity (nombre, slug, orden, paises, ciudades) is
// owned by Catalogos → Regiones y Paises. Single source of truth.
// ---------------------------------------------------------------------------

export async function listRegionesForFrontend() {
  const rows = await prisma.region.findMany({
    where: { brandId: BRAND_ID },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      slug: true,
      nombre: true,
      orden: true,
      heroImage: true,
      descripcion: true,
      paises: {
        select: { id: true, _count: { select: { ciudades: true } } },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    orden: r.orden,
    heroImage: r.heroImage,
    descripcion: r.descripcion,
    paisesCount: r.paises.length,
    ciudadesCount: r.paises.reduce((acc, p) => acc + p._count.ciudades, 0),
  }));
}

export async function updateRegionFrontend(
  id: string,
  data: { heroImage?: string | null; descripcion?: string | null },
) {
  const { brandId } = await requireCanEdit();
  const actual = await prisma.region.findUnique({ where: { id }, select: { brandId: true } });
  if (!actual || actual.brandId !== brandId) {
    throw new Error("Esa región no pertenece a esta marca.");
  }
  const updated = await prisma.region.update({
    where: { id },
    data: {
      ...(data.heroImage !== undefined ? { heroImage: data.heroImage } : {}),
      ...(data.descripcion !== undefined
        ? { descripcion: data.descripcion }
        : {}),
    },
  });
  revalidatePath("/backend/web/destinos");
  revalidatePath("/destinos", "layout");
  revalidateTag("regiones");
  return updated;
}
