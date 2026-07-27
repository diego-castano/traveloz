import {
  getPaquetesPublicos,
  getRegionResolver,
  getCiudadesConPaquetesPublicados,
} from "@/lib/public-data";
import { RegionExplorer } from "@/components/public/RegionExplorer";
import { buildSeoMetadata } from "@/lib/seo";
import {
  projectPaqueteParaListado,
  buildCiudadesUnicas,
} from "@/lib/paquete-listing";
import { resolveRegionSlugParaListado } from "@/lib/region-paquete";

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
//
// Lee `searchParams.ciudad`, así que Next la renderiza on-demand en vez de
// prerenderizarla. Las queries siguen cacheadas (unstable_cache, revalidate
// 60), o sea que el costo por request es armar el HTML, no pegarle a la DB.
// ---------------------------------------------------------------------------

export async function generateMetadata() {
  return buildSeoMetadata("destinos", {
    title: "Todos los destinos | TravelOz",
    description:
      "Explorá el catálogo completo de paquetes de viaje de TravelOz: todos los destinos, en un solo lugar.",
    path: "/destinos/todos",
  });
}

export default async function TodosDestinosPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [paquetesRaw, regionResolver, ciudadesGlobales] = await Promise.all([
    getPaquetesPublicos(),
    getRegionResolver(),
    getCiudadesConPaquetesPublicados(),
  ]);

  // ?ciudad=<id de Ciudad>: pre-selecciona el chip del typeahead. Es el destino
  // del buscador global cuando desde /destinos/<region> se elige una ciudad de
  // otra región. Un id desconocido lo ignora RegionExplorer en silencio.
  const ciudadParam = searchParams?.ciudad;
  const ciudadInicialId =
    typeof ciudadParam === "string" ? ciudadParam : undefined;

  // El href de cada card necesita /destinos/<region>/<slug>: como acá no hay
  // una única región de referencia, resolvemos la región de CADA paquete con
  // el helper compartido (src/lib/region-paquete.ts), el mismo criterio que
  // usan el detalle y src/app/sitemap.ts. Si un paquete no tiene destino
  // cargado cae a la primera región publicada, pero dejando un warn en el log.
  const paquetes = paquetesRaw.map((p) => ({
    ...projectPaqueteParaListado(p),
    regionSlug: resolveRegionSlugParaListado(p, regionResolver),
  }));

  // Distinct city list (id, nombre, paisNombre) for the typeahead, unión de
  // todos los paquetes (sin acotar a una región).
  const ciudades = buildCiudadesUnicas(paquetes);

  return (
    <RegionExplorer
      titulo="Explorá todos los destinos"
      paquetes={paquetes}
      ciudades={ciudades}
      // Acá local == global: todas las ciudades del catálogo filtran en el
      // lugar, así que el typeahead nunca navega (sin loops).
      ciudadesGlobales={ciudadesGlobales}
      ciudadInicialId={ciudadInicialId}
    />
  );
}
