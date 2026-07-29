"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requireCanEdit } from "@/lib/require-auth";
import { BRAND_ID } from "@/lib/brand";
import { slugify } from "@/lib/utils";
import type { LinkTargetOption, LinkTargetOptions } from "@/lib/link-target";

export async function listCategoriasDestacadas() {
  return prisma.categoriaDestacada.findMany({ orderBy: { orden: "asc" } });
}

/** Nombres únicos por slug y limpios, listos para el desplegable. */
function toOptions(rows: { nombre: string; slug: string }[]): LinkTargetOption[] {
  const seen = new Set<string>();
  const out: LinkTargetOption[] = [];
  for (const r of rows) {
    const nombre = r.nombre.trim();
    if (!r.slug || seen.has(r.slug)) continue;
    seen.add(r.slug);
    out.push({ slug: r.slug, nombre });
  }
  return out;
}

/**
 * Destinos internos que puede apuntar una categoría destacada, para armar el
 * link desde un selector en vez de pedirle la URL al admin.
 *
 * Solo lectura. Filtra por la marca pública (en la DB conviven dos marcas con
 * nombres repetidos: sin el filtro el desplegable mostraría "Playa" dos veces).
 * Los tipos de paquete no tienen columna slug — se deriva del nombre con el
 * mismo slugify que usa getTipoPaqueteBySlug al resolver /destinos?tipo=X.
 */
export async function getLinkTargetOptions(): Promise<LinkTargetOptions> {
  await requireAuth();
  const [tipos, etiquetas, regiones] = await Promise.all([
    prisma.tipoPaquete.findMany({
      where: { brandId: BRAND_ID, activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { nombre: true },
    }),
    prisma.etiqueta.findMany({
      where: { brandId: BRAND_ID },
      orderBy: { nombre: "asc" },
      select: { nombre: true, slug: true },
    }),
    prisma.region.findMany({
      where: { brandId: BRAND_ID },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { nombre: true, slug: true },
    }),
  ]);

  return {
    tipos: toOptions(
      tipos.map((t) => ({ nombre: t.nombre, slug: slugify(t.nombre) })),
    ),
    etiquetas: toOptions(etiquetas),
    regiones: toOptions(regiones),
  };
}

export async function createCategoriaDestacada(input: {
  titulo: string;
  imagen: string;
  link: string;
  orden?: number;
}) {
  await requireCanEdit();
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
  await requireCanEdit();
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
  await requireCanEdit();
  await prisma.categoriaDestacada.delete({ where: { id } });
  revalidatePath("/backend/web/categorias");
  revalidatePath("/", "layout");
  revalidateTag("categorias-destacadas");
}
