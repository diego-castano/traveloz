import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

// SiteSettings — keyed by group, returned as a flat key→value record
export const getSiteSettings = unstable_cache(
  async (group: string) => {
    const list = await prisma.siteSetting.findMany({ where: { group } });
    return Object.fromEntries(list.map((s) => [s.key, s.value]));
  },
  ["site-settings"],
  { revalidate: 60, tags: ["site-settings"] },
);

export const getCategoriasDestacadas = unstable_cache(
  async () =>
    prisma.categoriaDestacada.findMany({
      where: { activa: true },
      orderBy: { orden: "asc" },
    }),
  ["categorias-destacadas"],
  { revalidate: 60, tags: ["categorias-destacadas"] },
);

export const getTestimoniosPublicados = unstable_cache(
  async () =>
    prisma.testimonio.findMany({
      where: { publicado: true },
      orderBy: { orden: "asc" },
    }),
  ["testimonios"],
  { revalidate: 60, tags: ["testimonios"] },
);

export const getRegionesPublicas = unstable_cache(
  async () => prisma.region.findMany({ orderBy: { orden: "asc" } }),
  ["regiones"],
  { revalidate: 300, tags: ["regiones"] },
);

export const getRegionBySlug = unstable_cache(
  async (slug: string) =>
    prisma.region.findFirst({
      where: { slug },
      include: { paises: { include: { ciudades: true } } },
    }),
  ["region-by-slug"],
  { revalidate: 300, tags: ["regiones"] },
);

export const getPaquetesByRegion = unstable_cache(
  async (regionId: string) =>
    prisma.paquete.findMany({
      where: {
        publicado: true,
        deletedAt: null,
        destinos: { some: { ciudad: { pais: { regionId } } } },
      },
      orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
      include: {
        fotos: { take: 1, orderBy: { orden: "asc" } },
        destinos: { orderBy: { orden: "asc" }, include: { ciudad: true } },
      },
    }),
  ["paquetes-by-region"],
  { revalidate: 60, tags: ["paquetes"] },
);

export const getPaqueteBySlug = unstable_cache(
  async (slug: string) =>
    prisma.paquete.findUnique({
      where: { slug },
      include: {
        fotos: { orderBy: { orden: "asc" } },
        serviciosIncluidos: {
          orderBy: { orden: "asc" },
          include: { servicio: true },
        },
        destinos: {
          orderBy: { orden: "asc" },
          include: {
            ciudad: { include: { pais: { include: { region: true } } } },
          },
        },
        opcionesHoteleras: {
          orderBy: { orden: "asc" },
          include: {
            hoteles: {
              include: {
                alojamiento: {
                  include: {
                    fotos: { orderBy: { orden: "asc" } },
                    precios: { include: { regimen: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ["paquete-by-slug"],
  { revalidate: 60, tags: ["paquetes"] },
);
