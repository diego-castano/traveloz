"use client";

// Aviso de cookies discreto. Se recuerda en localStorage; si el navegador no
// deja usarlo (modo privado de algunos Safari) el aviso se cierra igual y
// vuelve en la próxima visita.

import { useEffect, useState } from "react";
import Link from "next/link";

const CLAVE = "col-aviso-cookies";

export function AvisoCookies() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(CLAVE));
    } catch {
      setVisible(true);
    }
  }, []);

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
    <div role="region" aria-label="Aviso de cookies" className="sitio-cookies">
      <p className="text-[14px] font-light leading-relaxed text-col-slate">
        Usamos cookies para saber de dónde llegan las visitas y mejorar el sitio.{" "}
        <Link href="/cookies" className="text-col-ink underline decoration-col-line underline-offset-4 hover:decoration-col-gold">
          Más información
        </Link>
      </p>
      <button
        type="button"
        onClick={aceptar}
        className="h-10 shrink-0 rounded-sm bg-col-ink px-5 text-[12px] font-medium uppercase tracking-[0.12em] text-col-base transition-colors duration-200 ease-col hover:bg-col-slate active:translate-y-px"
      >
        Entendido
      </button>
    </div>
  );
}
