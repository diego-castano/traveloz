"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode[];
  /** Slides visible on >=768px viewports (default: 1) */
  slidesToShow?: number;
  /** Slides visible on <768px viewports (defaults to min(slidesToShow, 1.1)) */
  slidesToShowMobile?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  /**
   * Duración de la transición entre slides, en "unidades" de Embla (no ms;
   * internamente son frames de una curva de fricción). Default de Embla: 25.
   * Valores más altos = deslizamiento más lento/suave. Opcional: si no se
   * pasa, Embla usa su propio default y no afecta a los demás usos.
   */
  duration?: number;
  showDots?: boolean;
  /**
   * Cantidad REAL de ítems para los dots. Cuando las slides están duplicadas
   * para forzar el loop de Embla (ver HomeCategorias), los snaps clonados se
   * mapean módulo a este número: 6 snaps / dotsCount=3 → 3 dots.
   */
  dotsCount?: number;
  showArrows?: boolean;
  loop?: boolean;
  /**
   * Replica del centerMode de Slick en <768px: centra la slide activa, deja
   * asomar las vecinas a ambos lados y las achica vía CSS (.is-center).
   */
  centerModeMobile?: boolean;
  /** Extra classes for the .embla wrapper (used to scope original Slick CSS) */
  className?: string;
};

export function EmblaSlider({
  children,
  slidesToShow = 1,
  slidesToShowMobile,
  autoplay = true,
  autoplayDelay = 3000,
  duration,
  showDots = false,
  dotsCount,
  showArrows = true,
  loop = true,
  centerModeMobile = false,
  className = "",
}: Props) {
  // Responsive slidesToShow — defaults to 1.1 on mobile if desktop shows >1,
  // matching the legacy Slick "peek the next card" behavior. En centerMode
  // mostramos algo más (1.4) para que, incluso tras el achique por CSS de
  // las vecinas (.embla__slide-inner en site.css), les quede un peek visible
  // simétrico y legible (>20px) a ambos lados de la tarjeta central.
  const mobileSlides =
    slidesToShowMobile ??
    (centerModeMobile ? 1.4 : slidesToShow > 1 ? 1.1 : slidesToShow);
  const [isMobile, setIsMobile] = useState(false);
  // `measured` marca que YA leímos el viewport con matchMedia (post-montaje).
  // El SSR y el primer paint no conocen el ancho, así que hasta que esto sea
  // true no revelamos el slider: evita mostrar el layout desktop (flex 33%,
  // sin coverflow) un frame antes de saber que estamos en mobile.
  const [measured, setMeasured] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    setMeasured(true);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Evita el "flash" del layout equivocado: en el primer paint (SSR + hidratación)
  // isMobile arranca en false → se renderiza el layout desktop (flex 33%, align
  // start, sin las clases del coverflow) y recién los efectos lo corrigen. No
  // alcanza con revelar al montar: hay que esperar a que isMobile/flex/align y
  // el reInit de Embla se asienten. El slider queda invisible + sin transición
  // hasta `ready` (ver el efecto más abajo, tras declarar emblaApi), así aparece
  // ya armado y no "anima" desde el estado intermedio.
  const [ready, setReady] = useState(false);
  const effectiveSlides = isMobile ? mobileSlides : slidesToShow;
  const centered = centerModeMobile && isMobile;
  const plugins = autoplay
    ? [Autoplay({ delay: autoplayDelay, stopOnInteraction: false })]
    : [];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop, align: "start", ...(duration !== undefined ? { duration } : {}) },
    plugins,
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  // `dragging` corta la transición de scale/coverflow de .embla__slide-inner
  // mientras el dedo arrastra: si no, cada cambio de is-center/is-prev/is-next
  // dispara la transición transform 0.4s a la vez que Embla mueve el translate
  // -> pelean y se siente trabado. Al soltar vuelve la transición suave.
  const [dragging, setDragging] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const sync = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    };
    const onPointerDown = () => setDragging(true);
    const onPointerUp = () => setDragging(false);
    sync();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", sync);
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", sync);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
    };
  }, [emblaApi]);

  // When the breakpoint flips, slide widths change in the DOM but Embla's
  // internal scroll math is stale until we ask it to re-measure. También
  // alternamos align: en centerMode móvil centramos la slide activa.
  useEffect(() => {
    emblaApi?.reInit({
      loop,
      align: centered ? "center" : "start",
      ...(duration !== undefined ? { duration } : {}),
    });
  }, [emblaApi, effectiveSlides, centered, loop, duration]);

  // Revela el slider recién cuando emblaApi está listo, ya medimos el viewport
  // (measured) y el layout mobile (isMobile/flex/align/reInit) se resolvió,
  // esperando dos frames para que el navegador pinte el coverflow correcto
  // antes de hacerlo visible. El gate en `measured` es clave: sin él los 2 rAF
  // podían disparar y revelar el slider mientras isMobile todavía era false
  // (layout desktop roto) y recién después "se corregía solo".
  useEffect(() => {
    if (!emblaApi || !measured) return;
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [emblaApi, measured, isMobile, centered, effectiveSlides]);

  const slideStyle = {
    flex: `0 0 ${100 / effectiveSlides}%`,
    minWidth: 0,
  };

  // Índices de las vecinas inmediatas a la central, con wrap por el loop.
  // Con n < 3 podrían coincidir con el de la central; se descartan en ese
  // caso (guard más abajo) ya que ambos sliders reales tienen 3+ ítems.
  const n = children.length;
  const prevIndex = (selectedIndex - 1 + n) % n;
  const nextIndex = (selectedIndex + 1) % n;

  // Dots por ítem real cuando las slides están duplicadas para forzar el
  // loop (ver doc de dotsCount en Props / HomeCategorias). Si no vino
  // dotsCount, o no hay menos dots que snaps, comportamiento de siempre: un
  // dot por snap.
  const effectiveDotsCount =
    dotsCount !== undefined && dotsCount > 0 && dotsCount < scrollSnaps.length
      ? dotsCount
      : scrollSnaps.length;
  const dotsRemapped = effectiveDotsCount !== scrollSnaps.length;

  const scrollToDot = (dot: number) => {
    if (!dotsRemapped) {
      scrollTo(dot);
      return;
    }
    // Cada dot representa varios snaps clonados (p. ej. dot 0 -> snaps 0 y 3
    // con 6 snaps/dotsCount=3). Vamos al candidato más cercano al snap
    // actual para no dar una vuelta entera hasta el primero.
    const candidates = scrollSnaps
      .map((_, s) => s)
      .filter((s) => s % effectiveDotsCount === dot);
    const closest = candidates.reduce((best, s) =>
      Math.abs(s - selectedIndex) < Math.abs(best - selectedIndex) ? s : best,
    );
    scrollTo(closest);
  };

  return (
    // position:relative ancla las flechas y los dots (.slick-dots, position:absolute
    // bottom:-25px del slick-theme) a este wrapper. Sin esto se anclan al
    // .main-wrapper (relative) y los dots se escapan al pie de la página, debajo
    // del footer. Es lo que hace .slick-slider en el template original.
    <div
      className={`embla ${className}`}
      style={{
        position: "relative",
        opacity: ready ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        className="embla__viewport"
        ref={emblaRef}
        style={{ overflow: "hidden" }}
      >
        <div className="embla__container" style={{ display: "flex" }}>
          {children.map((child, i) => (
            // --- El div .embla__slide es el que Embla mueve con un
            // transform inline propio (translate3d) para reposicionar slides
            // al loopear; si el scale del centerMode se aplicara ahí, ese
            // inline style lo pisa (gana por especificidad) y la vecina que
            // Embla tocó queda sin achicar -> peek asimétrico/errático. Por
            // eso el scale de .is-center vive en un wrapper interno que
            // Embla nunca toca.
            // is-prev/is-next habilitan el efecto coverflow (vecinas tiradas
            // hacia el centro, detrás de los bordes de la central) del CSS.
            (() => {
              const isCenter = centered && i === selectedIndex;
              const isPrev = centered && i === prevIndex && prevIndex !== selectedIndex;
              const isNext = centered && i === nextIndex && nextIndex !== selectedIndex;
              return (
                <div className="embla__slide slide" style={slideStyle} key={i}>
                  <div
                    className={`embla__slide-inner${isCenter ? " is-center" : ""}${
                      isPrev ? " is-prev" : ""
                    }${isNext ? " is-next" : ""}`}
                    // Sin transición hasta revelar (el coverflow se aplica de
                    // una, no anima desde el estado intermedio del arranque) y
                    // tampoco mientras se arrastra (evita la pelea con el
                    // translate de Embla que se sentía trabada).
                    style={ready && !dragging ? undefined : { transition: "none" }}
                  >
                    {child}
                  </div>
                </div>
              );
            })()
          ))}
        </div>
      </div>
      {showArrows && (
        <>
          <button
            className="slick-prev slick-arrow"
            type="button"
            onClick={scrollPrev}
            aria-label="Anterior"
          >
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                <path d="M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z" />
              </svg>
            </span>
          </button>
          <button
            className="slick-next slick-arrow"
            type="button"
            onClick={scrollNext}
            aria-label="Siguiente"
          >
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                <path d="M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z" />
              </svg>
            </span>
          </button>
        </>
      )}
      {/* Solo mostramos dots si hay más de una página para navegar (cantidad
          EFECTIVA de dots — ver dotsCount arriba — no scrollSnaps.length a
          secas). Cuando el contenido entra en una sola vista (p. ej. 3 ítems
          con slidesToShow=3) Embla devuelve un único snap y quedaba un dot
          colgado suelto. */}
      {showDots && effectiveDotsCount > 1 && (
        <ul className="slick-dots">
          {Array.from({ length: effectiveDotsCount }, (_, i) => (
            <li
              key={i}
              className={
                (dotsRemapped ? selectedIndex % effectiveDotsCount : selectedIndex) === i
                  ? "slick-active"
                  : ""
              }
            >
              <button
                type="button"
                onClick={() => scrollToDot(i)}
                aria-label={`Slide ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
