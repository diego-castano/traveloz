import { notFound } from "next/navigation";
import { getRegionBySlug, getPaquetesByRegion } from "@/lib/public-data";
import { PackageCard } from "@/components/public/PackageCard";

export async function generateMetadata({
  params,
}: {
  params: { region: string };
}) {
  const region = await getRegionBySlug(params.region);
  if (!region) return { title: "TravelOz" };
  return {
    title: `${region.nombre} | TravelOz`,
    description: region.descripcion ?? `Paquetes de viaje a ${region.nombre}.`,
  };
}

export default async function RegionListingPage({
  params,
}: {
  params: { region: string };
}) {
  const region = await getRegionBySlug(params.region);
  if (!region) notFound();
  const paquetes = await getPaquetesByRegion(region.id);

  return (
    <section className="content-area">
      <div className="container">
        <div className="banner-text mb_50">
          <h1 className="h1">{region.nombre}</h1>
          {region.descripcion && <p>{region.descripcion}</p>}
        </div>
        {paquetes.length === 0 ? (
          <p className="text-center py-12">
            Próximamente más destinos en esta región.
          </p>
        ) : (
          <div className="row">
            {paquetes.map((p) => (
              <div className="col-lg-4 col-md-6 mb-4" key={p.id}>
                <PackageCard paquete={p} regionSlug={region.slug} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
