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

  // Project to the shape RegionExplorer expects.
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
  }));

  return (
    <RegionExplorer
      region={{
        id: region.id,
        slug: region.slug,
        nombre: region.nombre,
        descripcion: region.descripcion,
      }}
      paquetes={paquetes}
    />
  );
}
