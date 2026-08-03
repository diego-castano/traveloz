// ---------------------------------------------------------------------------
// Resolución de la región de un paquete - criterio ÚNICO para todo el sitio.
//
// La URL pública de un paquete es /destinos/<region>/<slug>, y la región sale
// de su destino primario: destinos[0] → ciudad → pais → regionId. Ese criterio
// estaba copiado en /destinos/todos, en el sitemap y (a medias) en el detalle,
// y cada copia caía en silencio a la primera región publicada cuando el
// regionId no matcheaba. Resultado: paquetes de Miami publicados bajo
// /destinos/europa/… (ver scripts/audit-regiones-paquetes.ts).
//
// Acá vive el criterio una sola vez, con tres niveles:
//
//   1. regionId del país → región del brand público (caso normal).
//   2. si ese regionId es de OTRA marca (data cruzada: la base arrastra un
//      juego duplicado de regiones region-8..14), se traduce por SLUG a la
//      región equivalente del brand público. region-8 "europa"/brand-2 →
//      region-1 "europa"/brand-1.
//   3. si el paquete NO tiene destinos estructurados, se deduce del breadcrumb
//      `destino` ("Europa › Turquía"). Los paquetes de modalidad CIRCUITO no
//      generan filas en PaqueteDestino (esa tabla exige ciudadId y en circuitos
//      el operador elige Región › País sin ciudad), así que sin este nivel
//      quedaban invisibles en TODOS los listados por región.
//
// Si ni así resuelve, `resolveRegionSlugPaquete` devuelve null y cada llamador
// decide: el detalle no redirige (renderiza como hoy), y los listados/sitemap
// usan `resolveRegionSlugParaListado`, que cae a la primera región PERO deja
// un warn con el slug del paquete para que el problema no vuelva a ser
// invisible.
// ---------------------------------------------------------------------------

export type RegionRef = { id: string; slug: string; nombre?: string | null };

export type PaqueteParaRegion = {
  slug?: string | null;
  /**
   * Breadcrumb "Región › País › Ciudad" que arma el panel al elegir el destino
   * (buildDestinoBreadcrumb). Es lo único que queda cuando `destinos` viene
   * vacío. Opcional para no romper llamadores que no lo seleccionan.
   */
  destino?: string | null;
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
  /**
   * clave normalizada (nombre o slug, sin acentos ni mayúsculas) → slug del
   * brand público. Permite matchear el primer segmento del breadcrumb, que
   * viene tal cual lo tipeó el operador ("Sudamerica" sin tilde vs la región
   * "Sudamérica" con tilde).
   */
  slugPublicoPorNombre: Map<string, string>;
};

/**
 * Clave canónica para comparar nombres de región: sin diacríticos, minúsculas
 * y con cualquier separador colapsado a "-". Así "Sudamerica", "Sudamérica" y
 * el slug "sudamerica" caen todos en la misma clave, igual que "Estados
 * Unidos" y "estados-unidos".
 */
function normalizarClaveRegion(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildRegionResolver(
  regionesPublicas: RegionRef[],
  todasLasRegiones: RegionRef[],
): RegionResolver {
  // Primera región que reclama una clave gana: `regionesPublicas` viene
  // ordenada por `orden`, así que un empate lo define el orden del menú.
  const slugPublicoPorNombre = new Map<string, string>();
  for (const r of regionesPublicas) {
    for (const candidato of [r.nombre, r.slug]) {
      if (!candidato) continue;
      const clave = normalizarClaveRegion(candidato);
      if (clave && !slugPublicoPorNombre.has(clave)) {
        slugPublicoPorNombre.set(clave, r.slug);
      }
    }
  }
  return {
    fallbackSlug: regionesPublicas[0]?.slug ?? "",
    slugPublicoPorId: new Map(regionesPublicas.map((r) => [r.id, r.slug])),
    slugPorIdGlobal: new Map(todasLasRegiones.map((r) => [r.id, r.slug])),
    slugsPublicos: new Set(regionesPublicas.map((r) => r.slug)),
    slugPublicoPorNombre,
  };
}

/**
 * Región deducida del breadcrumb `destino` ("Europa › Turquía" → "europa").
 * Toma el primer segmento, separando por "›" (lo que escribe el panel) o ">"
 * por si alguna carga vieja usó el ASCII. Null si no hay breadcrumb o si el
 * primer segmento no es ninguna región del brand público - p.ej. "África",
 * que hoy no existe como región.
 */
export function resolveRegionSlugDesdeBreadcrumb(
  destino: string | null | undefined,
  resolver: RegionResolver,
): string | null {
  if (!destino) return null;
  const primerSegmento = destino.split(/[›>]/)[0]?.trim();
  if (!primerSegmento) return null;
  const clave = normalizarClaveRegion(primerSegmento);
  if (!clave) return null;
  return resolver.slugPublicoPorNombre.get(clave) ?? null;
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
  // Sin NINGÚN destino estructurado (típico de CIRCUITO): el breadcrumb
  // `destino` es la única pista de región que quedó. El camino normal de abajo
  // no se toca: un paquete con destinos resuelve igual que siempre.
  //
  // El corte es "destinos vacío" y no "regionId no resuelto" a propósito:
  // getPaquetesByRegion levanta los candidatos extra con `destinos: { none }`,
  // así que ampliar acá haría que una card linkeara a una región cuyo listado
  // no la incluye.
  if (!paquete.destinos?.length) {
    return resolveRegionSlugDesdeBreadcrumb(paquete.destino, resolver);
  }

  const regionId = paquete.destinos[0]?.ciudad?.pais?.regionId ?? null;
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
        `(destino[0] sin ciudad/país/región, y el breadcrumb "${paquete.destino ?? ""}" ` +
        `no matchea ninguna región publicada): se publica bajo "${resolver.fallbackSlug}". ` +
        `Cargale el destino desde el backend - ver scripts/audit-regiones-paquetes.ts.`,
    );
  }
  return resolver.fallbackSlug;
}
