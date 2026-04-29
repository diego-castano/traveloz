"use client";

// ---------------------------------------------------------------------------
// "Agencia Registrada" modal
//
// Markup port of <div id="agenciaModal"> from html_inicial/. Open/close logic
// uses a custom DOM event (`agencia-modal:open`) instead of the global
// window.openAgenciaModal() function the original main.js exposed -- this
// keeps the trigger declarative (data-agencia-modal-open on any anchor) and
// avoids polluting `window`.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";

export function AgenciaModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-agencia-modal-open]")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("agencia-modal:open", openHandler);
    document.addEventListener("click", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("agencia-modal:open", openHandler);
      document.removeEventListener("click", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  // Lock body scroll while modal is open (matches original behavior).
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      id="agenciaModal"
      role="dialog"
      aria-modal="true"
      aria-label="Agencia registrada"
      className={open ? "is-open" : undefined}
    >
      <div className="agencia-overlay" onClick={() => setOpen(false)}></div>
      <div className="agencia-box">
        <img
          src="/site/img/agencia.jpeg"
          alt="Certificado de agencia registrada - TravelOz"
        />
      </div>
    </div>
  );
}
