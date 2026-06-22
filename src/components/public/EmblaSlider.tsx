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
  showDots?: boolean;
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
  showDots = false,
  showArrows = true,
  loop = true,
  centerModeMobile = false,
  className = "",
}: Props) {
  // Responsive slidesToShow — defaults to 1.1 on mobile if desktop shows >1,
  // matching the legacy Slick "peek the next card" behavior. En centerMode
  // mostramos algo más (1.3) para que asomen las vecinas a ambos lados.
  const mobileSlides =
    slidesToShowMobile ??
    (centerModeMobile ? 1.3 : slidesToShow > 1 ? 1.1 : slidesToShow);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const effectiveSlides = isMobile ? mobileSlides : slidesToShow;
  const centered = centerModeMobile && isMobile;
  const plugins = autoplay
    ? [Autoplay({ delay: autoplayDelay, stopOnInteraction: false })]
    : [];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop, align: "start" },
    plugins,
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

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
    sync();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", sync);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", sync);
    };
  }, [emblaApi]);

  // When the breakpoint flips, slide widths change in the DOM but Embla's
  // internal scroll math is stale until we ask it to re-measure. También
  // alternamos align: en centerMode móvil centramos la slide activa.
  useEffect(() => {
    emblaApi?.reInit({ loop, align: centered ? "center" : "start" });
  }, [emblaApi, effectiveSlides, centered, loop]);

  const slideStyle = {
    flex: `0 0 ${100 / effectiveSlides}%`,
    minWidth: 0,
  };

  return (
    // position:relative ancla las flechas y los dots (.slick-dots, position:absolute
    // bottom:-25px del slick-theme) a este wrapper. Sin esto se anclan al
    // .main-wrapper (relative) y los dots se escapan al pie de la página, debajo
    // del footer. Es lo que hace .slick-slider en el template original.
    <div className={`embla ${className}`} style={{ position: "relative" }}>
      <div
        className="embla__viewport"
        ref={emblaRef}
        style={{ overflow: "hidden" }}
      >
        <div className="embla__container" style={{ display: "flex" }}>
          {children.map((child, i) => (
            <div
              className={`embla__slide slide${
                centered && i === selectedIndex ? " is-center" : ""
              }`}
              style={slideStyle}
              key={i}
            >
              {child}
            </div>
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
      {showDots && (
        <ul className="slick-dots">
          {scrollSnaps.map((_, i) => (
            <li key={i} className={i === selectedIndex ? "slick-active" : ""}>
              <button
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Slide ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
