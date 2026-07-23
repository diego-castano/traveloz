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
  const slidesToShow = 3;
  // Embla desactiva el loop cuando el contenido entra entero en el viewport
  // (con slidesToShow=3 y exactamente 3 categorías, 3 x 33.3% = 100%, sin
  // overflow). La referencia aprobada (html_inicial) resuelve esto duplicando
  // las slides x2 para forzar overflow y que loop + autoplay + dots funcionen.
  // Con 4+ categorías ya hay overflow natural, así que no duplicamos. Esto
  // infla los snaps de Embla (6 snaps para 3 categorías); los dots se
  // corrigen aparte pasando dotsCount al EmblaSlider más abajo.
  const slidesForCarousel =
    shownItems.length <= slidesToShow
      ? [...shownItems, ...shownItems]
      : shownItems;
  return (
    <section className="content-area bg_gray">
      <div className="container wide">
        {heading ? (
          <div className="text-center mb_50">
            <h2 className="section-heading">{heading}</h2>
          </div>
        ) : null}
        <EmblaSlider
          slidesToShow={slidesToShow}
          autoplay
          autoplayDelay={3000}
          loop
          showArrows
          showDots
          // Un dot por categoría real, no por slide duplicada.
          dotsCount={shownItems.length}
          centerModeMobile
          className="image-box-slider"
        >
          {slidesForCarousel.map((c, i) => (
            <a href={c.link} className="image-box style1" key={`${c.id}-${i}`}>
              {/* eager (no lazy): este carrusel duplica slides para forzar el
                  loop y Embla clona/reposiciona; con lazy los decodes saltaban
                  durante el scroll y se sentía trabado. Son pocas imágenes y
                  están arriba en la home, así que las cargamos ya. */}
              <img src={c.imagen} alt={c.titulo} loading="eager" decoding="async" />
              <h3 className="title">{c.titulo}</h3>
            </a>
          ))}
        </EmblaSlider>
      </div>
    </section>
  );
}
