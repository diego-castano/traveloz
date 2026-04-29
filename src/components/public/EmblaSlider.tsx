"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode[];
  /** Slides visible at the smallest breakpoint (default: 1) */
  slidesToShow?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  showDots?: boolean;
  showArrows?: boolean;
  loop?: boolean;
  /** Extra classes for the .embla wrapper (used to scope original Slick CSS) */
  className?: string;
};

export function EmblaSlider({
  children,
  slidesToShow = 1,
  autoplay = true,
  autoplayDelay = 3000,
  showDots = false,
  showArrows = true,
  loop = true,
  className = "",
}: Props) {
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
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const slideStyle = {
    flex: `0 0 ${100 / slidesToShow}%`,
    minWidth: 0,
  };

  return (
    <div className={`embla ${className}`}>
      <div
        className="embla__viewport"
        ref={emblaRef}
        style={{ overflow: "hidden" }}
      >
        <div className="embla__container" style={{ display: "flex" }}>
          {children.map((child, i) => (
            <div className="embla__slide slide" style={slideStyle} key={i}>
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
            <span>&#8249;</span>
          </button>
          <button
            className="slick-next slick-arrow"
            type="button"
            onClick={scrollNext}
            aria-label="Siguiente"
          >
            <span>&#8250;</span>
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
