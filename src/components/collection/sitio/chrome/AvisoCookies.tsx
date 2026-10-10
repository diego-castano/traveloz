"use client";

// Aviso de cookies discreto. Se recuerda en localStorage; si el navegador no
// deja usarlo (modo privado de algunos Safari) el aviso se cierra igual y
// vuelve en la próxima visita.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const CLAVE = "col-aviso-cookies";

export function AvisoCookies() {
  const [visible, setVisible] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(CLAVE));
    } catch {
      setVisible(true);
    }
  }, []);

  // Mientras está abierto, publica cuánto ocupa abajo (--sitio-aviso): la barra
  // de consulta, el botón de WhatsApp y el pie suben eso y no quedan tapados.
  useEffect(() => {
    const el = caja.current;
    if (!visible || !el) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--sitio-aviso", `${el.offsetHeight + parseFloat(getComputedStyle(el).bottom)}px`);
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
      raiz.style.removeProperty("--sitio-aviso");
    };
  }, [visible]);

  if (!visible) return null;

  const aceptar = () => {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      /* sin almacenamiento: solo se cierra */
    }
    setVisible(false);
  };

  return (
    <div ref={caja} role="region" aria-label="Aviso de cookies" className="sitio-cookies">
      <p className="text-[14px] font-light leading-relaxed text-col-slate">
        Usamos cookies para saber de dónde llegan las visitas y mejorar el sitio.{" "}
        <Link href="/cookies" className="text-col-ink underline decoration-col-line underline-offset-4 hover:decoration-col-gold">
          Más información
        </Link>
      </p>
      <button
        type="button"
        onClick={aceptar}
        className="h-11 shrink-0 rounded-sm bg-col-ink px-5 text-[12px] uppercase tracking-[0.14em] text-col-base transition-colors duration-200 ease-col hover:bg-col-slate active:translate-y-px"
      >
        Entendido
      </button>
    </div>
  );
}
