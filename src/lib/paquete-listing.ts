// ---------------------------------------------------------------------------
// Proyección compartida paquete (Prisma) → shape que consume RegionExplorer.
// Usada por /destinos/[region] y /destinos/todos para no duplicar el mapeo
// de noches/bullets/ciudades entre ambas páginas. No toca format-paquete.ts:
// solo reusa sus helpers puros (resolveNochesTotales, buildCardBullets).
// ---------------------------------------------------------------------------

import { resolveNochesTotales, buildCardBullets } from "@/lib/format-paquete";

// Shape crudo esperado: el mismo `include` que devuelven getPaquetesByRegion
// y getPaquetesPublicos (fotos take 1, destinos con ciudad+pais, circuitos
// take 1 con noches).
export type PaqueteRawParaListado = {
  id: string;
  slug: string | null;
  titulo: string;
  destino: string;
  noches: number;
  salidas: string | null;
  precioDesde: number | null;
  precioDesdeMoneda: string | null;
  heroImage: string | null;
  textoIncluye: string | null;
  // Json de DB: renglones custom de la tarjeta (o null → automáticos).
  cardBullets: unknown;
  fotos: { url: string; alt: string | null }[];
  destinos: {
    noches: number | null;
    ciudad: {
      id: string;
      nombre: string;
      pais: { nombre: string; regionId: string | null } | null;
    } | null;
  }[];
  circuitos: { circuito: { noches: number | null } | null }[];
};

export type CiudadListado = { id: string; nombre: string; paisNombre: string };

export type PaqueteParaListado = {
  id: string;
  slug: string | null;
  titulo: string;
  destino: string;
  noches: number;
  salidas: string | null;
  precioDesde: number | null;
  precioDesdeMoneda: string | null;
  heroImage: string | null;
  fotos: { url: string; alt: string }[];
  bullets: string[];
  ciudades: CiudadListado[];
};

/**
 * Proyecta un paquete crudo al shape de RegionExplorer.
 *
 * `regionId` es opcional: en /destinos/[region] se pasa para anclar las
 * ciudades del paquete a la región actual (un paquete puede tener destinos en
 * más de una región); en /destinos/todos se omite y se listan TODAS las
 * ciudades del paquete, ya que no hay una región única de referencia.
 */
export function projectPaqueteParaListado(
  p: PaqueteRawParaListado,
  opts: { regionId?: string } = {},
): PaqueteParaListado {
  const nochesTotales = resolveNochesTotales({
    noches: p.noches,
    destinos: p.destinos,
    circuitoNoches: p.circuitos[0]?.circuito?.noches ?? null,
  });
  const destinosFuente = opts.regionId
    ? p.destinos.filter((d) => d.ciudad?.pais?.regionId === opts.regionId)
    : p.destinos;
  return {
    id: p.id,
    slug: p.slug,
    titulo: p.titulo,
    destino: p.destino,
    noches: p.noches,
    salidas: p.salidas,
    precioDesde: p.precioDesde,
    precioDesdeMoneda: p.precioDesdeMoneda,
    heroImage: p.heroImage,
    fotos: p.fotos.map((f) => ({ url: f.url, alt: f.alt ?? "" })),
    bullets: buildCardBullets({
      textoIncluye: p.textoIncluye,
      nochesTotales,
      cardBullets: p.cardBullets,
    }),
    ciudades: destinosFuente
      .filter((d) => d.ciudad?.id)
      .map((d) => ({
        id: d.ciudad!.id,
        nombre: d.ciudad!.nombre,
        paisNombre: d.ciudad!.pais?.nombre ?? "",
      })),
  };
}

/**
 * Lista de ciudades únicas (por id) para alimentar el typeahead del filtro,
 * ordenada alfabéticamente (es). Dedupea entre todos los paquetes recibidos.
 */
export function buildCiudadesUnicas(
  paquetes: { ciudades: CiudadListado[] }[],
): CiudadListado[] {
  const map = new Map<string, CiudadListado>();
  for (const p of paquetes) {
    for (const c of p.ciudades) {
      if (c.id && !map.has(c.id)) map.set(c.id, c);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}
