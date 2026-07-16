"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Wraps the public Header. Adds .scrolled to the inner .header-area when
 * window.scrollY > 100, .hidden when scrolling down past 400px (hides on
 * scroll-down, shows on scroll-up). 1:1 with main.js sticky header logic
 * from html_inicial. Classes are applied to .header-area (not the wrapper)
 * because the existing CSS targets .header-area.scrolled / .header-area.hidden.
 *
 * También decide acá la variante "header-dark" de /corporativo (logo blanco +
 * fondo oscuro, como html_inicial/corporativo.html). Este componente ya es
 * client y ya vive dentro del layout público compartido, así que usePathname()
 * es el lugar más simple y estable para detectar la ruta -- Header.tsx sigue
 * siendo server (fetch de regiones/settings) y no tiene acceso a la URL.
 * usePathname() resuelve igual en el render de servidor (RSC) que en el
 * cliente porque el layout usa `dynamic = "force-dynamic"`, así que no hay
 * flash de logo/fondo al cargar: el HTML ya sale con la variante correcta.
 */
export function StickyHeader({
  logo,
  children,
}: {
  logo: string;
  children: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isCorporativo = pathname?.startsWith("/corporativo") ?? false;
  const headerClass = isCorporativo ? "header-area header-dark" : "header-area";
  const logoSrc = isCorporativo ? "/site/img/white-logo.webp" : logo;

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

  return (
    <div ref={wrapperRef}>
      <header className={headerClass}>
        <div className="container wide">
          <div className="header-inn d-flex align-items-center justify-content-between">
            <div className="header-logo">
              <a href="/">
                <img src={logoSrc} alt="TravelOz" decoding="async" />
              </a>
            </div>
            <div className="header-menu">{children}</div>
          </div>
        </div>
      </header>
    </div>
  );
}
