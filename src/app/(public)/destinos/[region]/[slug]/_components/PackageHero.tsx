"use client";

import { EmblaSlider } from "@/components/public/EmblaSlider";

type Props = {
  paquete: {
    titulo: string;
    salidas: string | null;
    precioDesde: number | null;
    precioDesdeMoneda: string | null;
    fotos: { url: string; alt: string }[];
    heroImage: string | null;
  };
};

export function PackageHero({ paquete }: Props) {
  const fotos =
    paquete.heroImage && !paquete.fotos.some((f) => f.url === paquete.heroImage)
      ? [
          { url: paquete.heroImage, alt: paquete.titulo },
          ...paquete.fotos,
        ]
      : paquete.fotos.length > 0
        ? paquete.fotos
        : [{ url: "/site/img/slider-1.webp", alt: paquete.titulo }];

  return (
    <section className="package-hero" style={{ padding: "40px 0" }}>
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-7">
            <EmblaSlider
              slidesToShow={1}
              autoplay={false}
              showArrows
              showDots
              className="image-slider style3"
            >
              {fotos.map((f) => (
                <img
                  src={f.url}
                  alt={f.alt}
                  key={f.url}
                  style={{ width: "100%", borderRadius: 8 }}
                />
              ))}
            </EmblaSlider>
          </div>
          <div className="col-lg-5 ps-lg-5">
            <h1 style={{ fontSize: 36, marginBottom: 8 }}>{paquete.titulo}</h1>
            {paquete.salidas && (
              <p style={{ color: "#666", marginBottom: 12 }}>
                {paquete.salidas}
              </p>
            )}
            {paquete.precioDesde !== null && (
              <p style={{ fontSize: 14, color: "#222" }}>
                Desde{" "}
                <strong style={{ color: "#785AE5", fontSize: 28 }}>
                  {paquete.precioDesdeMoneda} {paquete.precioDesde}
                </strong>
                <br />
                <span style={{ fontSize: 12, color: "#999" }}>
                  Por persona en base doble
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
