// ---------------------------------------------------------------------------
// Resolución de la región de un paquete — criterio ÚNICO para todo el sitio.
//
// La URL pública de un paquete es /destinos/<region>/<slug>, y la región sale
// de su destino primario: destinos[0] → ciudad → pais → regionId. Ese criterio
// estaba copiado en /destinos/todos, en el sitemap y (a medias) en el detalle,
// y cada copia caía en silencio a la primera región publicada cuando el
// regionId no matcheaba. Resultado: paquetes de Miami publicados bajo
// /destinos/europa/… (ver scripts/audit-regiones-paquetes.ts).
//
// Acá vive el criterio una sola vez, con dos niveles:
//
//   1. regionId del país → región del brand público (caso normal).
//   2. si ese regionId es de OTRA marca (data cruzada: la base arrastra un
//      juego duplicado de regiones region-8..14), se traduce por SLUG a la
//      región equivalente del brand público. region-8 "europa"/brand-2 →
//      region-1 "europa"/brand-1.
//
// Si ni así resuelve, `resolveRegionSlugPaquete` devuelve null y cada llamador
// decide: el detalle no redirige (renderiza como hoy), y los listados/sitemap
// usan `resolveRegionSlugParaListado`, que cae a la primera región PERO deja
// un warn con el slug del paquete para que el problema no vuelva a ser
// invisible.
// ---------------------------------------------------------------------------

export type RegionRef = { id: string; slug: string };

export type PaqueteParaRegion = {
  slug?: string | null;
  destinos: Array<{
    ciudad?: { pais?: { regionId: string | null } | null } | null;
  } | null>;
};

export type RegionResolver = {
  /** Primera región publicada (menor `orden`); último recurso de los listados. */
  fallbackSlug: string;
  /** id → slug, solo regiones del brand público. */
  slugPublicoPorId: Map<string, string>;
  /** id → slug de TODAS las marcas, para traducir data cruzada por slug. */
  slugPorIdGlobal: Map<string, string>;
  /** slugs que existen en el brand público. */
  slugsPublicos: Set<string>;
};

export function buildRegionResolver(
  regionesPublicas: RegionRef[],
  todasLasRegiones: RegionRef[],
): RegionResolver {
  return {
    fallbackSlug: regionesPublicas[0]?.slug ?? "",
    slugPublicoPorId: new Map(regionesPublicas.map((r) => [r.id, r.slug])),
    slugPorIdGlobal: new Map(todasLasRegiones.map((r) => [r.id, r.slug])),
    slugsPublicos: new Set(regionesPublicas.map((r) => r.slug)),
  };
}

/**
 * Región real del paquete, o null si no hay forma de resolverla (paquete sin
 * destinos, ciudad sin país, país sin región, o región inexistente incluso
 * cruzando marcas). Nunca inventa un fallback.
 */
export function resolveRegionSlugPaquete(
  paquete: PaqueteParaRegion,
  resolver: RegionResolver,
): string | null {
  const regionId = paquete.destinos?.[0]?.ciudad?.pais?.regionId ?? null;
  if (!regionId) return null;

  const directo = resolver.slugPublicoPorId.get(regionId);
  if (directo) return directo;

  // Data cruzada: el país cuelga de la región homónima de otra marca.
  const cruzado = resolver.slugPorIdGlobal.get(regionId);
  if (cruzado && resolver.slugsPublicos.has(cruzado)) return cruzado;

  return null;
}

// Un warn por slug y por proceso: el listado se re-renderiza seguido y no
// queremos inundar los logs con la misma línea.
const yaAvisados = new Set<string>();

/**
 * Variante para listados y sitemap, donde SIEMPRE hace falta un slug para
 * armar el href. Cae a la primera región publicada, pero logueando qué
 * paquete se está publicando bajo una región que no es la suya.
 */
export function resolveRegionSlugParaListado(
  paquete: PaqueteParaRegion,
  resolver: RegionResolver,
): string {
  const real = resolveRegionSlugPaquete(paquete, resolver);
  if (real) return real;

  const id = paquete.slug ?? "(paquete sin slug)";
  if (!yaAvisados.has(id)) {
    yaAvisados.add(id);
    console.warn(
      `[region-paquete] no pude resolver la región de "${id}" ` +
        `(destino[0] sin ciudad/país/región): se publica bajo "${resolver.fallbackSlug}". ` +
        `Cargale el destino desde el backend — ver scripts/audit-regiones-paquetes.ts.`,
    );
  }
  return resolver.fallbackSlug;
}
