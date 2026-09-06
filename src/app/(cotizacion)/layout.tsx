// ---------------------------------------------------------------------------
// Layout del link público de cotización (/c/<token>).
//
// Antes esta pantalla colgaba del route group (formularios) y heredaba su
// chrome: app-bar violeta de lado a lado y el footer oscuro del sitio, con
// cuatro columnas de links. Una cotización que llega por WhatsApp no es una
// página del sitio: es un documento dirigido a una persona. Todo lo que la
// rodea tiene que desaparecer detrás de la hoja.
//
// Lo que queda: el wordmark chico arriba y la hoja. Nada más. Abajo había un
// cierre con la dirección, el teléfono y el mail de la agencia, y el cliente
// pidió sacarlo: esos datos ya están en la firma del vendedor, adentro de la
// hoja, así que afuera solo repetían y ensuciaban el final. Fondo tintado con
// el violeta de marca, nada de gris puro.
//
// El CSS del cotizador se inyecta acá y no en la página: así el chrome también
// puede usar sus variables y el wordmark, y la pantalla de link vencido —que
// vive del otro lado del `return`— hereda la misma identidad.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { CSS } from "@/app/backend/cotizador/_mockup/styles";
import { Wordmark } from "@/app/backend/cotizador/_mockup/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  // Un link con el nombre, el destino y el precio de una persona no entra a
  // ningún buscador. Nunca.
  robots: { index: false, follow: false },
};

export default function CotizacionLayout({ children }: { children: ReactNode }) {
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
    </div>
  );
}
