// ---------------------------------------------------------------------------
// Layout del route group (landing) — cotizadores por marca.
//
// No carga el header del sitio principal, pero sí el footer completo de TravelOz
// (mismo <Footer/> que el sitio público, vía la página) más el modal "Agencia
// registrada" y el botón flotante de WhatsApp, para que el pie de los landings
// sea idéntico al del sitio. El CSS del template no se importa acá: el footer y
// estos componentes traen sus estilos colocados, y Font Awesome lo carga
// landing.css.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { preinit } from "react-dom";
import { AgenciaModal } from "@/components/public/AgenciaModal";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { getSiteSettings } from "@/lib/public-data";
import "./landing.css";

export const dynamic = "force-dynamic";

export const metadata = {
  // Los landings no deben indexarse mientras se prueban.
  robots: { index: false, follow: false },
};

export default async function LandingLayout({ children }: { children: ReactNode }) {
  // Font Awesome: los íconos del <Footer/> (redes + datos de contacto) lo usan.
  // En (public) lo trae site.css; acá lo inyectamos con preinit porque un @import
  // dentro de landing.css se pierde al concatenar el bundle (deja de ser la 1ª
  // regla y el browser lo descarta). preinit emite un <link rel="stylesheet">
  // hoisteado al <head> y dedupeado por React.
  preinit("/site/vendors/fontawesome/css/all.min.css", { as: "style" });

  const footer = await getSiteSettings("footer");

  return (
    <div className="landing-root min-h-screen bg-neutral-50 text-neutral-900">
      {children}
      <WhatsAppButton />
      <AgenciaModal certificadoUrl={footer.agencia_certificado_url} />
    </div>
  );
}
