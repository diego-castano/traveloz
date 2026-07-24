import { getRegionesPublicas, getPaquetesPublicos } from "@/lib/public-data";
import { RegionExplorer } from "@/components/public/RegionExplorer";
import { buildSeoMetadata } from "@/lib/seo";
import {
  projectPaqueteParaListado,
  buildCiudadesUnicas,
} from "@/lib/paquete-listing";

// ---------------------------------------------------------------------------
// /destinos/todos — listado de TODOS los paquetes publicados (sin filtro de
// región), destino del CTA "Explorá todos los destinos" de DestinosGrid.
// Ruta estática hermana de /destinos/[region] (dinámica); en App Router una
// ruta estática siempre tiene precedencia sobre un segmento dinámico del
// mismo nivel, y ninguna región real usa el slug "todos" (verificado contra
// /destinos: asia, brasil, caribe, estados-unidos, europa, oceania,
// sudamerica), así que no hay colisión posible.
//
// Reusa RegionExplorer (variante sin `region`) y el mismo helper de
// proyección que /destinos/[region]/page.tsx (src/lib/paquete-listing.ts)
// para no duplicar el mapeo noches/bullets/ciudades.
// ---------------------------------------------------------------------------

export async function generateMetadata() {
  return buildSeoMetadata("destinos", {
    title: "Todos los destinos | TravelOz",
    description:
      "Explorá el catálogo completo de paquetes de viaje de TravelOz: todos los destinos, en un solo lugar.",
    path: "/destinos/todos",
  });
}

export default async function TodosDestinosPage() {
  const [paquetesRaw, regiones] = await Promise.all([
    getPaquetesPublicos(),
    getRegionesPublicas(),
  ]);

  // El href de cada card necesita /destinos/<region>/<slug>: como acá no hay
  // una única región de referencia, resolvemos la región de CADA paquete a
  // partir de su destino primario (mismo criterio que usa src/app/sitemap.ts
  // para armar la URL canónica del paquete). Fallback a la primera región
  // publicada si el paquete no tiene destino/ciudad/país cargado.
  const slugPorRegionId = new Map(regiones.map((r) => [r.id, r.slug]));
  const fallbackRegionSlug = regiones[0]?.slug ?? "";

  const paquetes = paquetesRaw.map((p) => {
    const regionId = p.destinos[0]?.ciudad?.pais?.regionId ?? null;
    const regionSlug =
      (regionId && slugPorRegionId.get(regionId)) || fallbackRegionSlug;
    return { ...projectPaqueteParaListado(p), regionSlug };
  });

  // Distinct city list (id, nombre, paisNombre) for the typeahead, unión de
  // todos los paquetes (sin acotar a una región).
  const ciudades = buildCiudadesUnicas(paquetes);

  return (
    <RegionExplorer
      titulo="Explorá todos los destinos"
      paquetes={paquetes}
      ciudades={ciudades}
    />
  );
}
