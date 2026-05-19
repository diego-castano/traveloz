"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

// ---------------------------------------------------------------------------
// Preview URL resolver — used by the "Previsualizar" button in /backend/paquetes
//
// If the package lacks a slug we auto-generate one from the título (with
// uniqueness suffix on collision) and persist it, so the user doesn't need
// to interrupt their edit flow to type one. The only hard requirement for
// preview is having at least one destino with a resolvable region.
// The `?preview=1` flag is honored by the public page only for authenticated
// users — draft packages stay invisible to the public.
// ---------------------------------------------------------------------------

function slugifyTitulo(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueSlug(
  base: string,
  paqueteId: string,
): Promise<string> {
  if (!base) base = "paquete";
  const existing = await prisma.paquete.findMany({
    where: { slug: { startsWith: base }, NOT: { id: paqueteId } },
    select: { slug: true },
  });
  const taken = new Set(existing.map((e) => e.slug).filter(Boolean) as string[]);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function getPaquetePreviewUrl(
  paqueteId: string,
): Promise<
  | { ok: true; url: string; publicado: boolean; slugGenerated?: string }
  | { ok: false; reason: string }
> {
  await requireAuth();
  const p = await prisma.paquete.findUnique({
    where: { id: paqueteId },
    select: {
      slug: true,
      titulo: true,
      publicado: true,
      destinos: {
        orderBy: { orden: "asc" },
        take: 1,
        select: {
          ciudad: {
            select: { pais: { select: { region: { select: { slug: true } } } } },
          },
        },
      },
    },
  });
  if (!p) return { ok: false, reason: "Paquete no encontrado." };

  // Region is informational in the URL — the public page resolves the package
  // by slug, not by region. So when destinos are still empty (early-stage
  // editing) we fall back to any region from the catalog. This way the user
  // can preview as soon as they have a name + photos, before assigning a
  // destination.
  let regionSlug = p.destinos[0]?.ciudad?.pais?.region?.slug;
  if (!regionSlug) {
    const fallbackRegion = await prisma.region.findFirst({
      orderBy: { orden: "asc" },
      select: { slug: true },
    });
    regionSlug = fallbackRegion?.slug ?? "ver";
  }

  let slug = p.slug;
  let slugGenerated: string | undefined;
  if (!slug) {
    const base = slugifyTitulo(p.titulo);
    slug = await ensureUniqueSlug(base, paqueteId);
    await prisma.paquete.update({
      where: { id: paqueteId },
      data: { slug },
    });
    revalidateTag("paquetes");
    slugGenerated = slug;
  }

  return {
    ok: true,
    url: `/destinos/${regionSlug}/${slug}?preview=1`,
    publicado: p.publicado,
    slugGenerated,
  };
}

export async function getPaqueteFrontendData(paqueteId: string) {
  return prisma.paquete.findUnique({
    where: { id: paqueteId },
    select: {
      id: true,
      titulo: true,
      slug: true,
      publicado: true,
      metaTitle: true,
      metaDescription: true,
      heroImage: true,
      textoIntro: true,
      textoIncluye: true,
      itinerarioPublico: true,
      textoCondiciones: true,
      precioDesde: true,
      precioDesdeMoneda: true,
      fotos: {
        select: { url: true, alt: true, orden: true },
        orderBy: { orden: "asc" },
      },
      serviciosIncluidos: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          textoCustom: true,
          orden: true,
          servicio: { select: { id: true, nombre: true, icon: true } },
        },
      },
    },
  });
}

export async function updatePaqueteFrontend(
  paqueteId: string,
  data: {
    slug?: string | null;
    publicado?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
    heroImage?: string | null;
    textoIntro?: string | null;
    textoIncluye?: string | null;
    itinerarioPublico?: string | null;
    textoCondiciones?: string | null;
  },
) {
  await requireAuth();

  // Publishing gate: when the operator flips `publicado=true`, validate the
  // paquete is actually ready. We block the publish (but still save the rest
  // of the form) when essentials are missing — slug, at least 1 destino, at
  // least 1 hotel option, and (when noches is declared) destinos summing
  // correctly. Returning a structured error lets the UI show what's missing.
  if (data.publicado === true) {
    const current = await prisma.paquete.findUnique({
      where: { id: paqueteId },
      select: {
        slug: true,
        titulo: true,
        noches: true,
        heroImage: true,
        destinos: { select: { noches: true } },
        opcionesHoteleras: { select: { id: true } },
        aereos: { select: { id: true } },
      },
    });
    if (!current) throw new Error("Paquete no encontrado.");

    const incomingSlug =
      typeof data.slug === "string" ? data.slug.trim() : current.slug;
    const heroImage =
      typeof data.heroImage === "string" ? data.heroImage.trim() : current.heroImage;
    const missing: string[] = [];

    if (!incomingSlug) missing.push("slug (URL pública)");
    if (!current.titulo?.trim()) missing.push("título");
    if (current.destinos.length === 0) missing.push("al menos 1 destino en el itinerario");
    if (current.opcionesHoteleras.length === 0) missing.push("al menos 1 opción hotelera");
    if (current.aereos.length === 0) missing.push("al menos 1 aéreo asignado");
    if (!heroImage) missing.push("foto principal del slider");

    const nochesPaquete = current.noches ?? 0;
    const nochesDestinos = current.destinos.reduce(
      (sum, d) => sum + (d.noches || 0),
      0,
    );
    if (nochesPaquete > 0 && nochesDestinos !== nochesPaquete) {
      missing.push(
        `noches por destino suman ${nochesDestinos} (paquete declara ${nochesPaquete})`,
      );
    }

    if (missing.length > 0) {
      throw new Error(
        `No se puede publicar todavía. Falta: ${missing.join("; ")}.`,
      );
    }
  }

  const updated = await prisma.paquete.update({
    where: { id: paqueteId },
    data,
  });
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  revalidatePath("/destinos", "layout");
  revalidateTag("paquetes");
  return updated;
}

export async function setPaqueteServicios(
  paqueteId: string,
  servicios: Array<{
    servicioId: string;
    textoCustom?: string | null;
    orden: number;
  }>,
) {
  await requireAuth();
  await prisma.$transaction([
    prisma.paqueteServicio.deleteMany({ where: { paqueteId } }),
    ...(servicios.length > 0
      ? [
          prisma.paqueteServicio.createMany({
            data: servicios.map((s) => ({
              paqueteId,
              servicioId: s.servicioId,
              textoCustom: s.textoCustom ?? null,
              orden: s.orden,
            })),
          }),
        ]
      : []),
  ]);
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  revalidateTag("paquetes");
}

/**
 * Recompute Paquete.precioDesde from min(OpcionHotel × PrecioAlojamiento.precioPorNoche).
 * Called after package edits that touch hotels or prices. Falls back to null if
 * there are no priced hotels yet.
 */
export async function recalcPaquetePrecioDesde(paqueteId: string) {
  await requireAuth();
  const opciones = await prisma.opcionHotel.findMany({
    where: { destino: { paqueteId } },
    include: {
      alojamiento: {
        include: { precios: { select: { precioPorNoche: true } } },
      },
    },
  });
  const allPrices = opciones.flatMap((o) =>
    o.alojamiento.precios.map((p) => p.precioPorNoche),
  );
  const min = allPrices.length > 0 ? Math.min(...allPrices) : null;
  await prisma.paquete.update({
    where: { id: paqueteId },
    data: { precioDesde: min },
  });
  revalidatePath(`/backend/paquetes/${paqueteId}`);
  revalidateTag("paquetes");
  return min;
}
