"use client";

import { EmblaSlider } from "./EmblaSlider";

type T = {
  id: string;
  ubicacion: string;
  titulo: string;
  texto: string;
  autor: string;
  rating: number;
  imageUrl: string | null;
};

export function HomeTestimonios({
  title,
  items,
}: {
  title: string;
  items: T[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="content-area">
      <div className="container smalls">
        <div className="text-center">
          <h2 className="section-heading mb_50">{title}</h2>
        </div>
        <EmblaSlider
          slidesToShow={1}
          autoplay
          autoplayDelay={5000}
          loop
          showArrows
          className="image-text-slider"
        >
          {items.map((t) => (
            <div key={t.id}>
              <div className="row align-items-center">
                <div className="col-lg-6">
                  <div className="content-image">
                    <img
                      src={t.imageUrl ?? "/site/img/slider-4.webp"}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="content-text style1 ps-lg-5">
                    <span className="loacation">
                      <img src="/site/img/map-marker.webp" alt="" loading="lazy" decoding="async" />
                      {t.ubicacion}
                    </span>
                    <h3 className="title">{t.titulo}</h3>
                    <div className="expand-wrapper">
                      <div className="expand-content">
                        <p>{t.texto}</p>
                      </div>
                    </div>
                    <div className="meta">
                      <ul>
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <li key={i}>
                            <i className="fa-solid fa-star"></i>
                          </li>
                        ))}
                      </ul>
                      <span className="name">{t.autor}.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </EmblaSlider>
      </div>
    </section>
  );
}
