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
  className = "",
}: Props) {
  // Responsive slidesToShow — defaults to 1.1 on mobile if desktop shows >1,
  // matching the legacy Slick "peek the next card" behavior.
  const mobileSlides =
    slidesToShowMobile ?? (slidesToShow > 1 ? 1.1 : slidesToShow);
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
  // internal scroll math is stale until we ask it to re-measure.
  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, effectiveSlides]);

  const slideStyle = {
    flex: `0 0 ${100 / effectiveSlides}%`,
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
