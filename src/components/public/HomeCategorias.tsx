"use client";

import { EmblaSlider } from "./EmblaSlider";

type Cat = { id: string; titulo: string; imagen: string; link: string };

export function HomeCategorias({
  items,
  title,
}: {
  items: Cat[];
  title?: string;
}) {
  if (items.length === 0) return null;
  const shownItems = items.filter((c) => c.imagen?.trim());
  if (shownItems.length === 0) return null;
  const heading = title?.trim();
  return (
    <section className="content-area bg_gray">
      <div className="container wide">
        {heading ? (
          <div className="text-center mb_50">
            <h2 className="section-heading">{heading}</h2>
          </div>
        ) : null}
        <EmblaSlider
          slidesToShow={3}
          autoplay
          autoplayDelay={3000}
          loop
          showArrows={false}
          showDots
          centerModeMobile
          className="image-box-slider"
        >
          {shownItems.map((c) => (
            <a href={c.link} className="image-box style1" key={c.id}>
              <img src={c.imagen} alt={c.titulo} loading="lazy" decoding="async" />
              <h3 className="title">{c.titulo}</h3>
            </a>
          ))}
        </EmblaSlider>
      </div>
    </section>
  );
}
