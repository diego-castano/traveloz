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
  bullets: string[];
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
  // Sin <section> propia: se renderiza DENTRO de la sección con gradient del
  // detalle (PackageDetailView), igual que en la referencia donde el slider de
  // relacionados vive en el mismo gradient-page-bg. Por eso el heading-alt es
  // blanco. La clase "box-slider" hace que el EmblaSlider herede las flechas
  // circulares del template (.box-slider .slick-arrow).
  return (
    <div className="container wide mt-5" style={{ paddingBottom: 20 }}>
      {/* Igualar alturas: el contenedor flex de Embla estira cada slide a la
          más alta. Encadenamos height:100% a través de los dos wrappers que
          mete el Skeleton (slide › div › div › a.box-card) hasta la card, y
          hacemos que .text crezca para rellenar. Así todas las tarjetas quedan
          de la misma altura aunque el título ocupe 1 o 2 líneas. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .box-slider .embla__container { align-items: stretch; }
            .box-slider .embla__slide { display: flex; }
            .box-slider .embla__slide > div,
            .box-slider .embla__slide > div > div { display: flex; width: 100%; }
            .box-slider .box-card {
              display: flex;
              flex-direction: column;
              width: 100%;
            }
            .box-slider .box-card img { flex-shrink: 0; }
            .box-slider .box-card .text { flex: 1 1 auto; }
            /* En mobile las flechas se superponen a la tarjeta; las ocultamos
               igual que la referencia (arrows:false en breakpoints <750) y
               dejamos swipe + autoplay. */
            @media (max-width: 767px) {
              .box-slider .slick-arrow { display: none; }
            }
          `,
        }}
      />
      <h2 className="heading-alt">{titulo}</h2>
      <EmblaSlider
        // 3.3 (no 3): replica el peek del template, donde .box-slider .slick-list
        // tiene padding-right:200px y deja asomar un 4º ítem cortado. El fraccionario
        // hace las tarjetas un poco más angostas y muestra el comienzo de la 4ª.
        slidesToShow={3.3}
        slidesToShowMobile={1.15}
        autoplay
        autoplayDelay={3000}
        loop={items.length > 3}
        showArrows
        showDots={false}
        className="box-slider"
      >
        {items.map((p) => (
          <PackageCard key={p.id} paquete={p} regionSlug={p.regionSlug} />
        ))}
      </EmblaSlider>
    </div>
  );
}
