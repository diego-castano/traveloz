"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps the public Header. Adds .scrolled to the inner .header-area when
 * window.scrollY > 100, .hidden when scrolling down past 400px (hides on
 * scroll-down, shows on scroll-up). 1:1 with main.js sticky header logic
 * from html_inicial. Classes are applied to .header-area (not the wrapper)
 * because the existing CSS targets .header-area.scrolled / .header-area.hidden.
 */
export function StickyHeader({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const header = wrapper.querySelector<HTMLElement>(".header-area");
    if (!header) return;

    let lastY = window.scrollY;
    let ticking = false;
    const headerHeight = header.offsetHeight;

    const update = () => {
      const y = window.scrollY;
      const isDesktop = window.innerWidth > 991;

      if (y > 100 && isDesktop) {
        if (!header.classList.contains("scrolled")) {
          header.classList.add("scrolled");
          document.body.style.paddingTop = `${headerHeight}px`;
        }
      } else if (header.classList.contains("scrolled")) {
        header.classList.remove("scrolled");
        document.body.style.paddingTop = "0";
      }

      if (y > 400 && isDesktop) {
        if (y > lastY) {
          header.classList.add("hidden");
        } else {
          header.classList.remove("hidden");
        }
      } else {
        header.classList.remove("hidden");
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.body.style.paddingTop = "0";
    };
  }, []);

  return <div ref={wrapperRef}>{children}</div>;
}
