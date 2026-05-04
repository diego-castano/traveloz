"use client";

import { EmblaSlider } from "./EmblaSlider";

type Cat = { id: string; titulo: string; imagen: string; link: string };

export function HomeCategorias({ items }: { items: Cat[] }) {
  if (items.length === 0) return null;
  return (
    <section className="content-area bg_gray">
      <div className="container wide">
        <EmblaSlider
          slidesToShow={3}
          autoplay
          autoplayDelay={3000}
          loop
          showArrows={false}
          className="image-box-slider"
        >
          {items.map((c) => (
            <a href={c.link} className="image-box style1" key={c.id}>
              <img src={c.imagen} alt={c.titulo} />
              <h3 className="title">{c.titulo}</h3>
            </a>
          ))}
        </EmblaSlider>
      </div>
    </section>
  );
}
