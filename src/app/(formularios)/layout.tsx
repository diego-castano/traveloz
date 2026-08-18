// ---------------------------------------------------------------------------
// Layout del route group (formularios) — las dos pantallas públicas por
// vendedor: /datos-de-pasajeros/<slug> y /datos-de-pago/<slug>.
//
// Identidad propia y sobria: app-bar con el logo de TravelOz y NADA de
// navegación. Quien llega acá viene de un link personal de su asesor y tiene
// una sola tarea; cualquier menú es una salida que no queremos ofrecer.
//
// El pie sí es el <Footer/> público completo (trae los datos de contacto de la
// agencia desde el CMS), para que el pasajero vea a quién le está escribiendo.
// No cargamos el tracker de atribución ni el botón flotante de WhatsApp: estas
// páginas manejan documentos y tarjetas, no son superficie de marketing.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { preinit } from "react-dom";
import { Footer } from "@/components/public/Footer";
import "./formularios.css";

export const dynamic = "force-dynamic";

export const metadata = {
  // Links personales con datos de terceros: fuera de los buscadores, siempre.
  robots: { index: false, follow: false },
};

// Degradado violeta → fucsia, el mismo de los landings de cotizador. Va en una
// banda de altura fija detrás del hero: si lo estiráramos a todo el alto, un
// formulario de 12 pasajeros lo dejaría casi plano.
const BANDA = "linear-gradient(180deg, #7a5cd1 0%, #ad5285 100%)";

export default function FormulariosLayout({ children }: { children: ReactNode }) {
  // Font Awesome: los íconos del <Footer/> lo usan. Con preinit sale un
  // <link rel="stylesheet"> hoisteado al <head> (un @import dentro del CSS se
  // pierde al concatenar el bundle).
  preinit("/site/vendors/fontawesome/css/all.min.css", { as: "style" });

  return (
    <div className="formularios-root relative flex min-h-screen flex-col bg-[#f5f3f9] text-neutral-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] sm:h-[440px]"
        style={{ background: BANDA }}
      />

      <header className="sticky top-0 z-20 border-b border-neutral-200/60 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-center px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-logo.webp" alt="TravelOz" className="h-10 w-auto" />
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>

      <Footer />
    </div>
  );
}
