// Sitio público de Traveloz Collection. next.config.mjs reescribe acá todo lo
// que llega por el host de Collection; desde cualquier otro host esta carpeta
// no existe (salvo localhost, para probar).

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fuenteDisplay, fuenteTexto } from "@/components/collection/shell/fuentes";
import { AtribucionTracker } from "@/components/public/AtribucionTracker";
import { CabeceraSitio } from "@/components/collection/sitio/chrome/CabeceraSitio";
import { PieSitio } from "@/components/collection/sitio/chrome/PieSitio";
import { AvisoCookies } from "@/components/collection/sitio/chrome/AvisoCookies";
import { esHostCollection, NOMBRE_SITIO, sitioIndexable, URL_SITIO } from "@/lib/collection/sitio";
import "@/components/collection/sitio/chrome/chrome.css";

export async function generateMetadata(): Promise<Metadata> {
  const indexa = sitioIndexable();
  return {
    metadataBase: new URL(URL_SITIO),
    title: { template: `%s | ${NOMBRE_SITIO}`, default: NOMBRE_SITIO },
    robots: { index: indexa, follow: indexa },
  };
}

export default function SitioCollectionLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0].toLowerCase();
  if (!esHostCollection(host) && host !== "localhost" && host !== "127.0.0.1") notFound();

  return (
    <div className={`sitio ${fuenteDisplay.variable} ${fuenteTexto.variable} min-h-screen bg-col-base font-col-text text-col-ink`}>
      <CabeceraSitio />
      <main className="sitio-main">{children}</main>
      <PieSitio />
      <AvisoCookies />
      <AtribucionTracker />
    </div>
  );
}
