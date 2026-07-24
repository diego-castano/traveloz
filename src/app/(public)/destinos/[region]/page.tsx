import { notFound } from "next/navigation";
import { getRegionBySlug, getPaquetesByRegion } from "@/lib/public-data";
import { RegionExplorer } from "@/components/public/RegionExplorer";
import { buildSeoMetadata } from "@/lib/seo";
import {
  projectPaqueteParaListado,
  buildCiudadesUnicas,
} from "@/lib/paquete-listing";

export async function generateMetadata({
  params,
}: {
  params: { region: string };
}) {
  const region = await getRegionBySlug(params.region);
  return buildSeoMetadata("destinos", {
    title: region ? `${region.nombre} | TravelOz` : undefined,
    description: region
      ? (region.descripcion ?? `Paquetes de viaje a ${region.nombre}.`)
      : undefined,
    image: region?.heroImage ?? undefined,
    noindex: !region,
    path: region ? `/destinos/${params.region}` : undefined,
  });
}

export default async function RegionListingPage({
  params,
}: {
  params: { region: string };
}) {
  const region = await getRegionBySlug(params.region);
  if (!region) notFound();
  const paquetesRaw = await getPaquetesByRegion(region.id);

  // Project to the shape RegionExplorer expects (helper compartido con
  // /destinos/todos). Acá se pasa `regionId` para anclar las ciudades del
  // paquete a la región actual (ver projectPaqueteParaListado).
  const paquetes = paquetesRaw.map((p) =>
    projectPaqueteParaListado(p, { regionId: region.id }),
  );

  // Distinct city list (id, nombre, paisNombre) for the typeahead.
  const ciudades = buildCiudadesUnicas(paquetes);

  return (
    <RegionExplorer
      region={{
        id: region.id,
        slug: region.slug,
        nombre: region.nombre,
        descripcion: region.descripcion,
      }}
      paquetes={paquetes}
      ciudades={ciudades}
    />
  );
}
