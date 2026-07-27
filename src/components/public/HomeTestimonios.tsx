"use client";

import { useEffect, useRef, useState } from "react";
import { EmblaSlider } from "./EmblaSlider";

/**
 * Texto del testimonio con clamp a 7 renglones EN MOBILE (<768px) y flechita
 * para desplegar/plegar. El clamp vive en el CSS (.expand-content p, dentro de
 * un @media max-width:767px); acá solo decidimos si hace falta la flecha.
 *
 * Detección: comparamos scrollHeight vs clientHeight del <p> ya montado. Como
 * el clamp existe solo en mobile, en >=768px ambos valores coinciden y el
 * botón nunca se renderiza — el gate de viewport lo hace el propio CSS, sin
 * matchMedia ni breakpoints duplicados en JS.
 */
function TestimonioTexto({ texto }: { texto: string }) {
  const pRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = pRef.current;
    // Expandido no se mide: sin clamp scrollHeight === clientHeight y
    // apagaríamos la flecha justo cuando hace falta para volver a plegar.
    if (!el || expanded) return;

    let alive = true;
    const measure = () => {
      if (alive) setOverflows(el.scrollHeight - el.clientHeight > 1);
    };
    measure();

    // ResizeObserver sobre el <p>: cubre el cambio de viewport (el ancho del
    // párrafo sigue al del contenedor) sin listener de resize propio.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // La fuente web puede cambiar cuántas líneas ocupa el texto sin cambiar la
    // altura clampeada, así que el RO no se entera: remedimos al cargarla.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [expanded]);

  return (
    <div className={`expand-wrapper${expanded ? " expanded" : ""}`}>
      <div className="expand-content">
        <p ref={pRef}>{texto}</p>
      </div>
      {overflows && (
        <button
          type="button"
          className="expand-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Ver menos" : "Leer el relato completo"}
          onClick={(e) => {
            // El botón vive dentro de una slide de Embla: cortamos la
            // propagación para que el tap no se confunda con un drag.
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <svg
            className="arrow"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}

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
                    <TestimonioTexto texto={t.texto} />
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
