"use client";

// ---------------------------------------------------------------------------
// RelatedPackages — "Descubrí más destinos" slider at the bottom of a package
// detail page. Ports the related-packages carousel from
// html_inicial/destinos-detalle.html. Data-driven: receives published
// packages from the same region (resolved server-side).
// ---------------------------------------------------------------------------

import { EmblaSlider } from "@/components/public/EmblaSlider";
import { PackageCard } from "@/components/public/PackageCard";

type RelatedPaquete = {
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
  destinos: { ciudad: { nombre: string } }[];
  regionSlug: string;
};

export function RelatedPackages({
  titulo,
  items,
}: {
  titulo: string;
  items: RelatedPaquete[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="content-area">
      <div className="container wide">
        <div className="text-center mb_50">
          <h2 className="section-heading">{titulo}</h2>
        </div>
        <EmblaSlider
          slidesToShow={3}
          autoplay={false}
          loop={items.length > 3}
          showArrows
          showDots={false}
          className="related-packages-slider"
        >
          {items.map((p) => (
            <div key={p.id} style={{ padding: "0 10px" }}>
              <PackageCard paquete={p} regionSlug={p.regionSlug} />
            </div>
          ))}
        </EmblaSlider>
      </div>
    </section>
  );
}
