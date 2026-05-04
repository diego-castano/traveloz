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
import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { AgenciaModal } from "@/components/public/AgenciaModal";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import "./site.css";

// Public site is data-driven from CMS (SiteSettings) and Postgres. Skip SSG
// at build time so the build doesn't depend on a live DB inside Railway's
// build environment (postgres.railway.internal isn't always reachable from
// the build runner). `unstable_cache` with `revalidate: 60` still gives us
// effective ISR-style caching at runtime.
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="main-wrapper">
        <Header />
        {children}
        <Footer />
      </div>

      <WhatsAppButton />
      <AgenciaModal />
    </>
  );
}
