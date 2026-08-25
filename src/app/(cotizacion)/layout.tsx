// ---------------------------------------------------------------------------
// Layout del link público de cotización (/c/<token>).
//
// Antes esta pantalla colgaba del route group (formularios) y heredaba su
// chrome: app-bar violeta de lado a lado y el footer oscuro del sitio, con
// cuatro columnas de links. Una cotización que llega por WhatsApp no es una
// página del sitio: es un documento dirigido a una persona. Todo lo que la
// rodea tiene que desaparecer detrás de la hoja.
//
// Lo que queda: el wordmark chico arriba, la hoja, y un cierre discreto con
// los datos de la agencia (los mismos del CMS que usa el footer público, sin
// su maquetación). Fondo tintado con el violeta de marca, nada de gris puro.
//
// El CSS del cotizador se inyecta acá y no en la página: así el chrome también
// puede usar sus variables y el wordmark, y la pantalla de link vencido —que
// vive del otro lado del `return`— hereda la misma identidad.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { CSS } from "@/app/backend/cotizador/_mockup/styles";
import { getSiteSettings } from "@/lib/public-data";
import { Wordmark } from "@/app/backend/cotizador/_mockup/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  // Un link con el nombre, el destino y el precio de una persona no entra a
  // ningún buscador. Nunca.
  robots: { index: false, follow: false },
};

export default async function CotizacionLayout({ children }: { children: ReactNode }) {
  const general = await getSiteSettings("general");
  const direccion = general.general_address?.trim() || "";
  const telefono = general.general_phone?.trim() || "";
  const email = general.general_email?.trim() || "";

  return (
    <div className="ctz ctz-pub">
      {/* El CSS del cotizador entero: la ficha del pasajero depende de sus
          variables (.ctz), de las animaciones y de las reglas de impresión. La
          ampliación de la CSP para las fuentes la agrega next.config.mjs en
          /c/:path*. */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="ctz-pub-top" data-ctz-chrome>
        <Wordmark size={19} />
      </header>

      <main className="ctz-pub-main">{children}</main>

      <footer className="ctz-pub-pie" data-ctz-chrome>
        <p className="ctz-pub-pie-l">
          {[direccion, telefono].filter(Boolean).join(" · ")}
        </p>
        <p className="ctz-pub-pie-l">
          {email && (
            <a href={`mailto:${email}`}>{email}</a>
          )}
          {email && " · "}
          <a href="https://traveloz.com.uy" target="_blank" rel="noreferrer">
            traveloz.com.uy
          </a>
        </p>
      </footer>
    </div>
  );
}
