"use client";

// Menú del sitio. Sobre una portada (página con [data-portada]) arranca
// transparente y en blanco; al bajar pasa a fondo claro con la marca oscura.
// Eso lo resuelve chrome.css con :has(), así el primer pintado ya es el
// correcto. Bajando se esconde y subiendo vuelve, para no tapar la
// subnavegación fija de la experiencia. En celular abre un menú a pantalla
// completa.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MarcaCollection } from "@/components/collection/shell/MarcaCollection";
import { cn } from "@/components/lib/cn";
import { CONTACTO_SITIO, MENU_SITIO } from "./menu";

const etiqueta = "text-[13px] font-medium uppercase tracking-[0.12em]";

export function CabeceraSitio() {
  const pathname = usePathname();
  const [arriba, setArriba] = useState(true);
  const [oculta, setOculta] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let previo = window.scrollY;
    const leer = () => {
      const y = window.scrollY;
      setArriba(y < 48);
      setOculta(y > 320 && y > previo);
      previo = y;
    };
    leer();
    window.addEventListener("scroll", leer, { passive: true });
    return () => window.removeEventListener("scroll", leer);
  }, []);

  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", esc);
    return () => {
      html.style.overflow = "";
      window.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const activo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className="sitio-cabecera"
        data-arriba={arriba ? "" : undefined}
        data-oculta={oculta && !abierto ? "" : undefined}
      >
        <div className="sitio-ancho flex h-[72px] items-center justify-between gap-8">
          <Link href="/" aria-label="Traveloz Collection, inicio" className="flex shrink-0 items-center pt-2">
            <span className="sitio-marca-clara">
              <MarcaCollection tono="claro" />
            </span>
            <span className="sitio-marca-oscura">
              <MarcaCollection tono="oscuro" />
            </span>
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-9 lg:flex">
            {MENU_SITIO.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={activo(i.href) ? "page" : undefined}
                className={cn(etiqueta, "sitio-enlace")}
              >
                {i.nombre}
              </Link>
            ))}
            <Link href={CONTACTO_SITIO.href} className={cn(etiqueta, "sitio-cta ml-2")}>
              {CONTACTO_SITIO.nombre}
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
            className="-mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
          >
            <Menu aria-hidden className="h-6 w-6" strokeWidth={1.25} />
          </button>
        </div>
      </header>

      {abierto && (
        <div role="dialog" aria-modal="true" aria-label="Menú" className="sitio-menu-movil">
          <div className="sitio-ancho flex h-[72px] items-center justify-between">
            <Link href="/" aria-label="Traveloz Collection, inicio" onClick={() => setAbierto(false)} className="flex items-center pt-2">
              <MarcaCollection tono="oscuro" />
            </Link>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="-mr-2 flex h-11 w-11 items-center justify-center"
            >
              <X aria-hidden className="h-6 w-6" strokeWidth={1.25} />
            </button>
          </div>
          <nav aria-label="Principal" className="sitio-ancho flex flex-1 flex-col justify-center gap-1 pb-10">
            {MENU_SITIO.map((i, n) => (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setAbierto(false)}
                aria-current={activo(i.href) ? "page" : undefined}
                className="sitio-menu-item font-col-display text-[44px] font-light leading-[1.2] text-white"
                style={{ animationDelay: `${60 + n * 50}ms` }}
              >
                {i.nombre}
              </Link>
            ))}
            <Link
              href={CONTACTO_SITIO.href}
              onClick={() => setAbierto(false)}
              className={cn(
                etiqueta,
                "sitio-menu-item mt-10 inline-flex h-12 w-fit items-center rounded-sm bg-col-gold px-6 text-col-noche",
              )}
              style={{ animationDelay: `${60 + MENU_SITIO.length * 50}ms` }}
            >
              {CONTACTO_SITIO.nombre}
            </Link>
          </nav>
          <p className="sitio-ancho pb-8 text-[13px] text-white/60">Una propuesta de Traveloz</p>
        </div>
      )}
    </>
  );
}
