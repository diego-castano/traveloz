// /robots.txt del sitio de Collection (la reescritura por host lo trae acá).
// Hasta el lanzamiento no deja rastrear nada (ver sitioIndexable()).

import { headers } from "next/headers";
import { esHostCollection, sitioIndexable, URL_SITIO } from "@/lib/collection/sitio";

export const dynamic = "force-dynamic";

export function GET() {
  if (!esHostCollection(headers().get("host"))) return new Response("Not found", { status: 404 });
  const cuerpo = sitioIndexable()
    ? `User-agent: *\nAllow: /\n\nSitemap: ${URL_SITIO}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(cuerpo, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
