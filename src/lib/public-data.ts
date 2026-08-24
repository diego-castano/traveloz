import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { BRAND_ID } from "@/lib/brand";
import { precioDesdeDePaquete } from "@/lib/precio-desde";
import {
  buildRegionResolver,
  resolveRegionSlugDesdeBreadcrumb,
  type RegionResolver,
} from "@/lib/region-paquete";

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
    await conPrecioDesdeReal(
      await prisma.paquete.findMany({
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
        destinos: {
          orderBy: { orden: "asc" },
          // `pais` hace falta para resolver la región real del paquete y armar
          // el href /destinos/<region>/<slug> de cada card (ver
          // src/lib/region-paquete.ts). Sin esto la card caía a la primera
          // región publicada ("europa") para TODOS los paquetes.
          include: { ciudad: { include: { pais: true } } },
        },
        // Fallback de noches para tarjetas de paquetes CIRCUITO (sin destinos
        // con noches propias): las noches reales viven en el circuito asignado.
        circuitos: {
          take: 1,
          orderBy: { orden: "asc" },
          select: { circuito: { select: { noches: true } } },
        },
        // Opciones hoteleras: fuente REAL del precio "desde" de la card
        // (ver conPrecioDesdeReal). Solo el precio, no infla el payload.
        opcionesHoteleras: { select: { precioVenta: true } },
        // Servicios REALES del paquete: los renglones automáticos de la card
        // salen de acá cuando no hay lista "Incluye" curada, así la tarjeta
        // nunca promete un traslado que el paquete no tiene (ver
        // buildCardBullets). Contadores, no filas: no infla el payload.
        _count: { select: { aereos: true, traslados: true, seguros: true } },
      },
    }),
    ),
  ["paquetes-by-tipo"],
  { revalidate: 60, tags: ["paquetes"] },
);

/**
 * Resuelve una Etiqueta publica por su slug real (columna `slug`, con
 * @@unique([brandId, slug]) — a diferencia de TipoPaquete no hace falta
 * slugify: cada Etiqueta ya guarda su propio slug). Null si no existe para
 * la marca.
 */
export const getEtiquetaBySlug = unstable_cache(
  async (slug: string) =>
    prisma.etiqueta.findFirst({
      where: { slug, brandId: PUBLIC_BRAND_ID },
      select: { id: true, nombre: true, slug: true },
    }),
  ["etiqueta-by-slug"],
  { revalidate: 300, tags: ["etiquetas"] },
);

/**
 * Public packages tagged with una Etiqueta dada (join PaqueteEtiqueta). Usado
 * por /tag/[slug]. Mismo select/include/orden que `getPaquetesByTipo` — la
 * grilla (PackageCard) espera esa forma exacta.
 */
export const getPaquetesByEtiqueta = unstable_cache(
  async (etiquetaId: string) =>
    await conPrecioDesdeReal(
      await prisma.paquete.findMany({
      where: {
        publicado: true,
        deletedAt: null,
        brandId: PUBLIC_BRAND_ID,
        etiquetas: { some: { etiquetaId } },
        ...vigenciaActivaWhere(),
      },
      orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
      include: {
        fotos: { take: 1, orderBy: { orden: "asc" } },
        destinos: {
          orderBy: { orden: "asc" },
          // `pais` hace falta para resolver la región real del paquete y armar
          // el href /destinos/<region>/<slug> de cada card (ver
          // src/lib/region-paquete.ts). Sin esto la card caía a la primera
          // región publicada ("europa") para TODOS los paquetes.
          include: { ciudad: { include: { pais: true } } },
        },
        // Fallback de noches para tarjetas de paquetes CIRCUITO (sin destinos
        // con noches propias): las noches reales viven en el circuito asignado.
        circuitos: {
          take: 1,
          orderBy: { orden: "asc" },
          select: { circuito: { select: { noches: true } } },
        },
        // Opciones hoteleras: fuente REAL del precio "desde" de la card
        // (ver conPrecioDesdeReal). Solo el precio, no infla el payload.
        opcionesHoteleras: { select: { precioVenta: true } },
        // Servicios REALES del paquete: los renglones automáticos de la card
        // salen de acá cuando no hay lista "Incluye" curada, así la tarjeta
        // nunca promete un traslado que el paquete no tiene (ver
        // buildCardBullets). Contadores, no filas: no infla el payload.
        _count: { select: { aereos: true, traslados: true, seguros: true } },
      },
    }),
    ),
  ["paquetes-by-etiqueta"],
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

/**
 * Regiones de TODAS las marcas (id + slug). La base arrastra un juego
 * duplicado de regiones de otra marca con los mismos slugs, y algunos países
 * del brand público quedaron colgados de ese juego. Este índice permite
 * traducir por slug ese regionId cruzado a la región pública equivalente en
 * vez de caer al fallback silencioso. Tabla de ~14 filas: el costo es nulo.
 */
export const getRegionesTodasLasMarcas = unstable_cache(
  async () =>
    prisma.region.findMany({
      select: { id: true, slug: true },
      orderBy: { orden: "asc" },
    }),
  ["regiones-todas-marcas"],
  { revalidate: 300, tags: ["regiones"] },
);

/**
 * Contexto que necesitan `resolveRegionSlugPaquete` /
 * `resolveRegionSlugParaListado` (src/lib/region-paquete.ts). Lo usan los
 * listados, el detalle y el sitemap para hablar todos el mismo criterio.
 */
export async function getRegionResolver(): Promise<RegionResolver> {
  const [publicas, todas] = await Promise.all([
    getRegionesPublicas(),
    getRegionesTodasLasMarcas(),
  ]);
  return buildRegionResolver(publicas, todas);
}

export const getRegionBySlug = unstable_cache(
  async (slug: string) =>
    prisma.region.findFirst({
      where: { slug, brandId: PUBLIC_BRAND_ID },
      include: { paises: { include: { ciudades: true } } },
    }),
  ["region-by-slug"],
  { revalidate: 300, tags: ["regiones"] },
);

/**
 * Mismo criterio que el `orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }]`
 * de las queries: Postgres ordena ASC con NULLS LAST, de ahí el Infinity.
 */
function compararParaListado(
  a: { precioDesde: number | null; titulo: string },
  b: { precioDesde: number | null; titulo: string },
): number {
  const pa = a.precioDesde ?? Number.POSITIVE_INFINITY;
  const pb = b.precioDesde ?? Number.POSITIVE_INFINITY;
  if (pa !== pb) return pa - pb;
  return a.titulo.localeCompare(b.titulo, "es");
}

/**
 * Servicios que necesita `precioDesdeDePaquete` para calcular el precio de un
 * paquete: los costos fijos (aéreos, traslados, seguros, circuito) y las
 * opciones hoteleras con sus tarifas. Va en una consulta aparte de la del
 * listado para no arrastrar estos joins en el `include` de las cards.
 */
const serviciosParaPrecio = {
  modalidad: true,
  markup: true,
  noches: true,
  viajeDesde: true,
  validezDesde: true,
  destinos: { select: { id: true, noches: true } },
  // Las opciones viajan con su factor y sus hoteles (con tarifas) porque el
  // precio de cada una se calcula EN VIVO, igual que en la pestaña Precios.
  // `precioVenta` queda de último recurso (ver precio-desde.ts).
  opcionesHoteleras: {
    select: {
      precioVenta: true,
      factor: true,
      hoteles: {
        select: {
          destinoId: true,
          alojamiento: {
            select: {
              precios: {
                select: {
                  periodoDesde: true,
                  periodoHasta: true,
                  precioPorNoche: true,
                },
              },
            },
          },
        },
      },
    },
  },
  aereos: {
    select: {
      aereo: {
        select: {
          deletedAt: true,
          precios: {
            select: { periodoDesde: true, periodoHasta: true, precioAdulto: true },
          },
        },
      },
    },
  },
  traslados: { select: { traslado: { select: { deletedAt: true, precio: true } } } },
  seguros: {
    select: {
      diasCobertura: true,
      seguro: { select: { deletedAt: true, costoPorDia: true } },
    },
  },
  circuitos: {
    orderBy: { orden: "asc" as const },
    select: {
      circuito: {
        select: {
          deletedAt: true,
          noches: true,
          precios: {
            select: { periodoDesde: true, periodoHasta: true, precio: true },
          },
        },
      },
    },
  },
} as const;

/**
 * Corrige el precio "desde" de las cards. `Paquete.precioDesde` es un campo
 * DENORMALIZADO: una copia del resultado del motor (src/lib/recompute-prices.ts)
 * que queda vieja apenas cambia un servicio sin que el motor vuelva a correr. La
 * copia se conserva porque el `ORDER BY precioDesde` de Postgres necesita una
 * columna, pero el número que se MUESTRA sale siempre de `precioDesdeDePaquete`
 * (src/lib/precio-desde.ts), la misma regla que aplica la pestaña Precios del
 * backend. Así card, ficha y panel no pueden discrepar.
 *
 * Re-ordena porque el `orderBy` de Postgres usó el valor viejo: al corregir el
 * precio, el orden "más barato primero" cambia.
 */
async function conPrecioDesdeReal<
  T extends {
    id: string;
    precioDesde: number | null;
    titulo: string;
    opcionesHoteleras: { precioVenta: number }[];
  },
>(rows: T[]): Promise<T[]> {
  // Se recalculan TODOS, no sólo los que no tienen opciones con precio: la
  // venta de cada opción también se calcula en vivo, porque su `precioVenta`
  // guardado queda viejo apenas cambia una tarifa de hotel o el período de
  // viaje. Es una consulta más por listado, y los listados están cacheados.
  const recalculados = new Map<string, number | null>();
  if (rows.length > 0) {
    const conServicios = await prisma.paquete.findMany({
      where: { id: { in: rows.map((p) => p.id) } },
      select: { id: true, ...serviciosParaPrecio },
    });
    for (const p of conServicios) {
      recalculados.set(p.id, precioDesdeDePaquete(p));
    }
  }

  return rows
    .map((p) => ({
      ...p,
      precioDesde:
        recalculados.get(p.id) ??
        // Sin fila de servicios (no debería pasar): la copia guardada.
        (p.opcionesHoteleras.length > 0
          ? Math.min(...p.opcionesHoteleras.map((o) => o.precioVenta))
          : null),
    }))
    .sort(compararParaListado);
}

/**
 * Intercala dos listas YA ordenadas por `compararParaListado` conservando el
 * orden relativo que trajo cada una de la base. Preferido a re-sortear todo:
 * los empates mantienen exactamente el orden de Postgres, así que sumar los
 * paquetes por breadcrumb no reacomoda el listado que el cliente ya conocía.
 */
function mergeOrdenado<T extends { precioDesde: number | null; titulo: string }>(
  a: T[],
  b: T[],
): T[] {
  const out: T[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    out.push(compararParaListado(a[i], b[j]) <= 0 ? a[i++] : b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

export const getPaquetesByRegion = unstable_cache(
  async (regionId: string) => {
    const include = {
      fotos: { take: 1, orderBy: { orden: "asc" as const } },
      destinos: {
        orderBy: { orden: "asc" as const },
        include: { ciudad: { include: { pais: true } } },
      },
      // Fallback de noches para tarjetas de paquetes CIRCUITO (sin destinos
      // con noches propias): las noches reales viven en el circuito asignado.
      circuitos: {
        take: 1,
        orderBy: { orden: "asc" as const },
        select: { circuito: { select: { noches: true } } },
      },
      // Opciones hoteleras: fuente REAL del precio "desde" (ver
      // conPrecioDesdeReal). Solo el precio, no infla el payload.
      opcionesHoteleras: { select: { precioVenta: true as const } },
      // Servicios REALES: alimentan los renglones automáticos de la card sin
      // inventar nada (ver buildCardBullets).
      _count: {
        select: { aereos: true as const, traslados: true as const, seguros: true as const },
      },
    };
    const base = {
      publicado: true,
      deletedAt: null,
      brandId: PUBLIC_BRAND_ID,
      ...vigenciaActivaWhere(),
    };
    const orderBy = [
      { precioDesde: "asc" as const },
      { titulo: "asc" as const },
    ];

    // Dos poblaciones distintas:
    //  · `some` trae cualquier paquete con AL MENOS una ciudad en la región —
    //    incluye los "CURAZAO" con escala en Madrid, que después se descartan.
    //  · `none` trae los que no tienen ninguna fila en PaqueteDestino. Son los
    //    CIRCUITO (el destino se cargó como Región › País, sin ciudad, y esa
    //    tabla exige ciudadId), invisibles hasta ahora en TODOS los listados
    //    por región. Hoy son ~7 filas: traerlas enteras no cuesta nada.
    const [candidates, sinDestinos, regionResolver] = await Promise.all([
      prisma.paquete.findMany({
        where: {
          ...base,
          destinos: { some: { ciudad: { pais: { regionId } } } },
        },
        orderBy,
        include,
      }),
      prisma.paquete.findMany({
        where: { ...base, destinos: { none: {} } },
        orderBy,
        include,
      }),
      getRegionResolver(),
    ]);

    // Narrow client-side al destino PRIMARIO (menor `orden`): un paquete
    // multi-región se ancla a una sola región para el listado.
    const conDestinos = candidates.filter(
      (p) => p.destinos[0]?.ciudad?.pais?.regionId === regionId,
    );

    // Y los sin destinos, por breadcrumb ("Europa › Turquía" → europa). El
    // match es contra el SLUG porque el breadcrumb guarda nombres, no ids.
    const slugRegion = regionResolver.slugPublicoPorId.get(regionId) ?? null;
    const porBreadcrumb = slugRegion
      ? sinDestinos.filter(
          (p) =>
            resolveRegionSlugDesdeBreadcrumb(p.destino, regionResolver) ===
            slugRegion,
        )
      : [];
    // Camino sin cambios cuando no hay nada que sumar.
    if (porBreadcrumb.length === 0) return await conPrecioDesdeReal(conDestinos);

    // Las dos poblaciones son disjuntas por construcción (`some` vs `none`),
    // pero el guard mantiene el invariante si alguna where cambia.
    const vistos = new Set(conDestinos.map((p) => p.id));
    // Cada lista se normaliza (y re-ordena) por separado antes de intercalar:
    // mergeOrdenado asume que ambas entradas ya vienen ordenadas.
    const [conPrecio, porBreadcrumbConPrecio] = await Promise.all([
      conPrecioDesdeReal(conDestinos),
      conPrecioDesdeReal(porBreadcrumb.filter((p) => !vistos.has(p.id))),
    ]);
    return mergeOrdenado(conPrecio, porBreadcrumbConPrecio);
  },
  ["paquetes-by-region"],
  { revalidate: 60, tags: ["paquetes"] },
);

/**
 * Todos los paquetes públicos, sin filtrar por región. Usado por
 * /destinos/todos (mismo select/include que getPaquetesByRegion, sin la
 * narrow-down client-side a "región primaria" porque acá no hay una sola
 * región de referencia — se listan todos los paquetes publicados).
 */
export const getPaquetesPublicos = unstable_cache(
  async () =>
    await conPrecioDesdeReal(
      await prisma.paquete.findMany({
      where: {
        publicado: true,
        deletedAt: null,
        brandId: PUBLIC_BRAND_ID,
        ...vigenciaActivaWhere(),
      },
      orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
      include: {
        fotos: { take: 1, orderBy: { orden: "asc" } },
        destinos: {
          orderBy: { orden: "asc" },
          include: { ciudad: { include: { pais: true } } },
        },
        // Fallback de noches para tarjetas de paquetes CIRCUITO (sin destinos
        // con noches propias): las noches reales viven en el circuito asignado.
        circuitos: {
          take: 1,
          orderBy: { orden: "asc" },
          select: { circuito: { select: { noches: true } } },
        },
        // Opciones hoteleras: fuente REAL del precio "desde" de la card
        // (ver conPrecioDesdeReal). Solo el precio, no infla el payload.
        opcionesHoteleras: { select: { precioVenta: true } },
        // Servicios REALES del paquete: los renglones automáticos de la card
        // salen de acá cuando no hay lista "Incluye" curada, así la tarjeta
        // nunca promete un traslado que el paquete no tiene (ver
        // buildCardBullets). Contadores, no filas: no infla el payload.
        _count: { select: { aereos: true, traslados: true, seguros: true } },
      },
    }),
    ),
  ["paquetes-publicos"],
  { revalidate: 60, tags: ["paquetes"] },
);

/**
 * Ciudades DISTINCT que aparecen como destino de algún paquete publicado y
 * vigente de la marca. Alimenta el typeahead global del filtro de destinos:
 * desde cualquier listado (ej. /destinos/europa) el usuario puede buscar una
 * ciudad de otra región y saltar a /destinos/todos?ciudad=<id>.
 *
 * Tabla chica (decenas de filas), así que se ordena en memoria con collation
 * español en vez de delegar el orderBy a Postgres.
 */
export const getCiudadesConPaquetesPublicados = unstable_cache(
  async (): Promise<{ id: string; nombre: string; paisNombre: string }[]> => {
    const ciudades = await prisma.ciudad.findMany({
      where: {
        paqueteDestinos: {
          some: {
            paquete: {
              publicado: true,
              deletedAt: null,
              brandId: PUBLIC_BRAND_ID,
              ...vigenciaActivaWhere(),
            },
          },
        },
      },
      select: { id: true, nombre: true, pais: { select: { nombre: true } } },
    });
    return ciudades
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        paisNombre: c.pais?.nombre ?? "",
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },
  ["ciudades-con-paquetes-publicados"],
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
      // Fallback de noches para tarjetas de paquetes CIRCUITO (sin destinos
      // con noches propias): las noches reales viven en el circuito asignado.
      circuitos: {
        take: 1,
        orderBy: { orden: "asc" as const },
        select: { circuito: { select: { noches: true } } },
      },
      // Opciones hoteleras: fuente REAL del precio "desde" (ver
      // conPrecioDesdeReal). Solo el precio, no infla el payload.
      opcionesHoteleras: { select: { precioVenta: true as const } },
      // Servicios REALES: alimentan los renglones automáticos de la card sin
      // inventar nada (ver buildCardBullets).
      _count: {
        select: { aereos: true as const, traslados: true as const, seguros: true as const },
      },
    };
    // El `take` corre en Postgres sobre `ORDER BY precioDesde`, o sea sobre la
    // copia denormalizada: con take 6 la copia vieja no decidía sólo el orden,
    // decidía QUÉ paquetes entraban al slider. Traemos el doble y recortamos a 6
    // recién después de corregir el precio, así el corte lo hace el número real.
    // Son 6 filas de más en una query cacheada 120s: barato para el problema.
    const CUPO = 6;
    const CANDIDATOS = CUPO * 2;
    let rows = regionId
      ? await prisma.paquete.findMany({
          where: {
            ...base,
            destinos: { some: { ciudad: { pais: { regionId } } } },
          },
          orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
          include,
          take: CANDIDATOS,
        })
      : [];
    if (rows.length < 3) {
      const extra = await prisma.paquete.findMany({
        where: base,
        orderBy: [{ precioDesde: "asc" }, { titulo: "asc" }],
        include,
        take: CANDIDATOS,
      });
      const seen = new Set(rows.map((r) => r.id));
      for (const e of extra) {
        if (rows.length >= CANDIDATOS) break;
        if (!seen.has(e.id)) rows.push(e);
      }
    }
    return (await conPrecioDesdeReal(rows)).slice(0, CUPO);
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
        // Las tarifas de aéreo y circuito viajan con el servicio porque la ficha
        // recalcula el precio "desde" con ellas (ver precioDesdeDePaquete): la
        // modalidad CIRCUITO no tiene opciones hoteleras de dónde sacarlo.
        aereos: {
          orderBy: { orden: "asc" },
          include: { aereo: { include: { precios: true } } },
        },
        traslados: { orderBy: { orden: "asc" }, include: { traslado: true } },
        seguros: { orderBy: { orden: "asc" }, include: { seguro: true } },
        circuitos: {
          orderBy: { orden: "asc" },
          include: {
            circuito: {
              include: {
                // Itinerario día a día (modalidad CIRCUITO) — mismo orden que
                // usa el admin en circuitos/[id] (orderBy orden asc).
                itinerario: { orderBy: { orden: "asc" } },
                precios: true,
              },
            },
          },
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
