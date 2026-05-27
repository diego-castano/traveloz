import { notFound } from "next/navigation";
import { getRegionBySlug, getPaquetesByRegion } from "@/lib/public-data";
import { RegionExplorer } from "@/components/public/RegionExplorer";
import { buildSeoMetadata } from "@/lib/seo";

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

  // Project to the shape RegionExplorer expects. Strip destinos that are
  // outside this region (stopovers) so package cards only list cities the
  // user is actually buying as part of THIS region's listing.
  const paquetes = paquetesRaw.map((p) => ({
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
    destinos: p.destinos
      .filter((d) => d.ciudad?.pais?.regionId === region.id)
      .map((d) => ({
        ciudad: {
          id: d.ciudad?.id ?? "",
          nombre: d.ciudad?.nombre ?? "",
          paisId: d.ciudad?.paisId ?? null,
        },
      })),
  }));

  return (
    <RegionExplorer
      region={{
        id: region.id,
        slug: region.slug,
        nombre: region.nombre,
        descripcion: region.descripcion,
        heroImage: region.heroImage,
      }}
      paises={region.paises.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        ciudades: p.ciudades.map((c) => ({ id: c.id, nombre: c.nombre })),
      }))}
      paquetes={paquetes}
    />
  );
}
