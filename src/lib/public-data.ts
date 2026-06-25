import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";

// Single-tenant: every public query filters by the constant brandId. The
// PUBLIC_BRAND_ID alias is kept for callers that imported it before Fase 7.
export const PUBLIC_BRAND_ID = BRAND_ID;

// SiteSettings — keyed by group, returned as a flat key→value record.
// Wrapped in try/catch so a transient DB outage during a build/cold start
// degrades to empty defaults rather than crashing the page render.
export const getSiteSettings = unstable_cache(
  async (group: string): Promise<Record<string, string>> => {
    try {
      const list = await prisma.siteSetting.findMany({ where: { group } });
      return Object.fromEntries(list.map((s) => [s.key, s.value]));
    } catch (err) {
      console.warn(`[public-data] getSiteSettings(${group}) failed:`, err);
      return {};
    }
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

// Un paquete sigue "vigente" si no tiene fecha de baja (validezHasta) o si
// todavía no pasó. validezHasta se guarda como "YYYY-MM-DD" (o ISO completo),
// así que la comparación lexicográfica contra la fecha local de hoy es válida.
// Esto da de baja del sitio público automáticamente los paquetes vencidos,
// incluso si nadie entró al backend a reconciliar su estado.
function vigenciaActivaWhere() {
  const hoy = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  return {
    OR: [{ validezHasta: null }, { validezHasta: { gte: hoy } }],
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve a tipo-paquete by its slugified name (e.g. "lunas-de-miel" matches
 * the TipoPaquete row whose nombre slugifies to that). Returns the row or null.
 */
export const getTipoPaqueteBySlug = unstable_cache(
  async (slug: string) => {
    const tipos = await prisma.tipoPaquete.findMany({
      where: { brandId: PUBLIC_BRAND_ID },
    });
    return tipos.find((t) => slugify(t.nombre) === slug) ?? null;
  },
  ["tipo-paquete-by-slug"],
  { revalidate: 300, tags: ["tipos-paquete"] },
);

/**
 * Public packages filtered by tipo (no region constraint). Used by /destinos
 * when the URL has ?tipo=X (links from CategoriaDestacada).
 */
export const getPaquetesByTipo = unstable_cache(
  async (tipoPaqueteId: string) =>
    prisma.paquete.findMany({
      where: {
        publicado: true,
        deletedAt: null,
        brandId: PUBLIC_BRAND_ID,
        tipoPaqueteId,
        ...vigenciaActivaWhere(),
      },
      orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
      include: {
        fotos: { take: 1, orderBy: { orden: "asc" } },
        destinos: { orderBy: { orden: "asc" }, include: { ciudad: true } },
      },
    }),
  ["paquetes-by-tipo"],
  { revalidate: 60, tags: ["paquetes"] },
);

export const getRegionesPublicas = unstable_cache(
  async () =>
    prisma.region.findMany({
      where: { brandId: PUBLIC_BRAND_ID },
      orderBy: { orden: "asc" },
    }),
  ["regiones"],
  { revalidate: 300, tags: ["regiones"] },
);

export const getRegionBySlug = unstable_cache(
  async (slug: string) =>
    prisma.region.findFirst({
      where: { slug, brandId: PUBLIC_BRAND_ID },
      include: { paises: { include: { ciudades: true } } },
    }),
  ["region-by-slug"],
  { revalidate: 300, tags: ["regiones"] },
);

export const getPaquetesByRegion = unstable_cache(
  async (regionId: string) => {
    // Prisma `some` brings in any paquete with AT LEAST ONE city in the region —
    // that includes "CURAZAO" packages that happen to have a Madrid stopover.
    // We narrow it client-side to only paquetes whose PRIMARY destino (lowest
    // orden) is in the region. Multi-region packages are then anchored to a
    // single region for listing purposes.
    const candidates = await prisma.paquete.findMany({
      where: {
        publicado: true,
        deletedAt: null,
        brandId: PUBLIC_BRAND_ID,
        destinos: { some: { ciudad: { pais: { regionId } } } },
        ...vigenciaActivaWhere(),
      },
      orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
      include: {
        fotos: { take: 1, orderBy: { orden: "asc" } },
        destinos: {
          orderBy: { orden: "asc" },
          include: { ciudad: { include: { pais: true } } },
        },
      },
    });
    return candidates.filter(
      (p) => p.destinos[0]?.ciudad?.pais?.regionId === regionId,
    );
  },
  ["paquetes-by-region"],
  { revalidate: 60, tags: ["paquetes"] },
);

export const getFaqTopics = unstable_cache(
  async () =>
    prisma.faqTopic.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    }),
  ["faq-topics"],
  { revalidate: 300, tags: ["faq"] },
);

export const getTermSections = unstable_cache(
  async () =>
    prisma.termSection.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    }),
  ["term-sections"],
  { revalidate: 300, tags: ["terms"] },
);

export const getClientesCorporativos = unstable_cache(
  async () =>
    prisma.clienteCorporativo.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    }),
  ["clientes-corporativos"],
  { revalidate: 300, tags: ["clientes-corporativos"] },
);

export const getPersonasContacto = unstable_cache(
  async () =>
    prisma.personaContacto.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    }),
  ["personas-contacto"],
  { revalidate: 300, tags: ["equipo"] },
);

/**
 * Related packages for the "Descubrí más destinos" slider on a package detail
 * page. Returns up to 6 published packages from the same region, excluding the
 * current one. Falls back to any published packages when the region match is
 * thin so the slider is never empty.
 */
export const getPaquetesRelacionados = unstable_cache(
  async (paqueteId: string, regionId: string | null) => {
    const base = {
      publicado: true,
      deletedAt: null,
      brandId: PUBLIC_BRAND_ID,
      NOT: { id: paqueteId },
      ...vigenciaActivaWhere(),
    } as const;
    const include = {
      fotos: { take: 1, orderBy: { orden: "asc" as const } },
      destinos: {
        orderBy: { orden: "asc" as const },
        include: { ciudad: { include: { pais: true } } },
      },
    };
    let rows = regionId
      ? await prisma.paquete.findMany({
          where: {
            ...base,
            destinos: { some: { ciudad: { pais: { regionId } } } },
          },
          orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
          include,
          take: 6,
        })
      : [];
    if (rows.length < 3) {
      const extra = await prisma.paquete.findMany({
        where: base,
        orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
        include,
        take: 6,
      });
      const seen = new Set(rows.map((r) => r.id));
      for (const e of extra) {
        if (rows.length >= 6) break;
        if (!seen.has(e.id)) rows.push(e);
      }
    }
    return rows;
  },
  ["paquetes-relacionados"],
  { revalidate: 120, tags: ["paquetes"] },
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
        // Servicios estructurados cargados en las pestañas Servicios/Alojamientos.
        // Se usan como fallback de la lista pública "Incluye" cuando el operador
        // no curó una lista manual (serviciosIncluidos / textoIncluye).
        aereos: { orderBy: { orden: "asc" }, include: { aereo: true } },
        traslados: { orderBy: { orden: "asc" }, include: { traslado: true } },
        seguros: { orderBy: { orden: "asc" }, include: { seguro: true } },
        circuitos: { orderBy: { orden: "asc" }, include: { circuito: true } },
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
                    ciudad: { select: { nombre: true } },
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
