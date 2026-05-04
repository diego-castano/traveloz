"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";

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
      textoNoIncluye: true,
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
    textoNoIncluye?: string | null;
    itinerarioPublico?: string | null;
    textoCondiciones?: string | null;
  },
) {
  await requireAuth();
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
