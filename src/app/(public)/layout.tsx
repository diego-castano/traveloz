// ---------------------------------------------------------------------------
// Public site layout
//
// Wraps every public route (/, /destinos, /about, /contact, /faq, /terms,
// /work-with-us, /corporativo) with header, footer, modals, and the
// Bootstrap + custom CSS stack ported from html_inicial/.
//
// CSS strategy: site.css is imported (Next bundles it into the (public) layout
// chunk and ships it in <head>). All vendor CSS (Bootstrap, FontAwesome,
// Slick, fonts.css) is @imported from the top of site.css so font-face rules
// land in <head> too -- JSX <link rel="stylesheet"> tags would otherwise land
// in <body>, losing the cascade race.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { preload } from "react-dom";
import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { AgenciaModal } from "@/components/public/AgenciaModal";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { ComingSoon } from "@/components/public/ComingSoon";
import { getSiteSettings } from "@/lib/public-data";
import { auth } from "@/lib/auth.config";
import "./site.css";
// Boneyard pre-generated bones. Built by `npm run bones` (local) and
// committed to the repo so Railway doesn't need a headless browser at build.
import "@/bones/registry";

// Public site is data-driven from CMS (SiteSettings) and Postgres. Skip SSG
// at build time so the build doesn't depend on a live DB inside Railway's
// build environment (postgres.railway.internal isn't always reachable from
// the build runner). `unstable_cache` with `revalidate: 60` still gives us
// effective ISR-style caching at runtime.
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  // Las fuentes viven detrás de dos saltos render-blocking (layout.css →
  // @import fonts.css → .woff2). El preload las baja en paralelo desde el
  // primer byte del HTML y evita el swap tardío en el texto del hero.
  const fontOpts = {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  } as const;
  preload("/site/fonts/ClarikaGeometric-Light.woff2", fontOpts);
  preload("/site/fonts/ClarikaGeometric-Bold.woff2", fontOpts);
  preload("/site/fonts/Rufina-Bold.woff2", fontOpts);

  // Coming Soon gate: el sitio principal arranca en "Próximamente". El público
  // anónimo ve el placeholder; el equipo logueado ve el sitio real (y así el
  // live-preview del admin, que corre con la sesión del usuario, sigue
  // funcionando). El toggle vive en /backend/cotizadores. Ausente → activo.
  const [footerSettings, generalSettings, session] = await Promise.all([
    getSiteSettings("footer"),
    getSiteSettings("general"),
    auth(),
  ]);
  const comingSoon = generalSettings.coming_soon_activo !== "false";
  if (comingSoon && !session?.user) {
    return (
      <ComingSoon
        titulo={generalSettings.coming_soon_titulo}
        mensaje={generalSettings.coming_soon_mensaje}
      />
    );
  }

  return (
    <>
      <div className="main-wrapper">
        <Header />
        {children}
        <Footer />
      </div>

      <WhatsAppButton />
      <AgenciaModal certificadoUrl={footerSettings.agencia_certificado_url} />
    </>
  );
}
