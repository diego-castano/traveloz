import { notFound } from "next/navigation";
import { getRegionBySlug, getPaquetesByRegion } from "@/lib/public-data";
import { RegionExplorer } from "@/components/public/RegionExplorer";
import { buildSeoMetadata } from "@/lib/seo";
import { resolveNochesTotales, buildCardBullets } from "@/lib/format-paquete";

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
  // We expand `destinos` with ciudad+pais so the listing can offer a city
  // typeahead (each paquete's primary city) and a season chip filter parsed
  // from `salidas`.
  const paquetes = paquetesRaw.map((p) => {
    const nochesTotales = resolveNochesTotales({
      noches: p.noches,
      destinos: p.destinos,
      circuitoNoches: p.circuitos[0]?.circuito?.noches ?? null,
    });
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
      bullets: buildCardBullets({ textoIncluye: p.textoIncluye, nochesTotales }),
      ciudades: p.destinos
        .filter((d) => d.ciudad?.pais?.regionId === region.id)
        .map((d) => ({
          id: d.ciudad?.id ?? "",
          nombre: d.ciudad?.nombre ?? "",
          paisNombre: d.ciudad?.pais?.nombre ?? "",
        })),
    };
  });

  // Distinct city list (id, nombre, paisNombre) for the typeahead. Sorted by
  // name; deduped by id.
  const ciudadesMap = new Map<string, { id: string; nombre: string; paisNombre: string }>();
  for (const p of paquetes) {
    for (const c of p.ciudades) {
      if (c.id && !ciudadesMap.has(c.id)) {
        ciudadesMap.set(c.id, c);
      }
    }
  }
  const ciudades = Array.from(ciudadesMap.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );

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
