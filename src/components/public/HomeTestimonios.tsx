"use client";

import { useState } from "react";
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
  // Ids de testimonios expandidos en mobile: replica el
  // `classList.toggle('expanded')` del JS de referencia (main.js),
  // pero guardado en estado de React en vez de tocar el DOM directo.
  // OJO: los hooks van antes de cualquier early return (Rules of Hooks).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
          // --- Rotación más pausada que el resto de los carruseles: el
          // cliente pidió testimonios más lentos y una transición notoriamente
          // más suave (duration alto = deslizamiento calmo, solo acá).
          autoplayDelay={9000}
          duration={38}
          loop
          showArrows
          className="image-text-slider"
        >
          {items.map((t) => {
            const isExpanded = expanded.has(t.id);
            return (
            <div key={t.id}>
              <div className="row align-items-center">
                <div className="col-lg-6">
                  <div className="content-image">
                    <img
                      src={t.imageUrl?.trim() || "/site/img/slider-4.webp"}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.src.endsWith("/site/img/slider-4.webp")) return;
                        el.src = "/site/img/slider-4.webp";
                      }}
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
                    <div className={`expand-wrapper${isExpanded ? " expanded" : ""}`}>
                      <div className="expand-content">
                        <p>{t.texto}</p>
                      </div>
                      <button
                        type="button"
                        className="expand-toggle"
                        aria-label={isExpanded ? "Ver menos" : "Ver más"}
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpanded(t.id)}
                      >
                        <span className="arrow"><em className="fa-solid fa-angle-down" /></span>
                      </button>
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
            );
          })}
        </EmblaSlider>
      </div>
    </section>
  );
}
