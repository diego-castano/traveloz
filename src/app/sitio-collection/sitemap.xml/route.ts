// /sitemap.xml del sitio de Collection: solo lo publicado.

import { headers } from "next/headers";
import { slugsParaSitemap } from "@/lib/collection/sitio-datos";
import { esHostCollection, urlAbsoluta } from "@/lib/collection/sitio";

export const dynamic = "force-dynamic";

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  if (!esHostCollection(headers().get("host"))) return new Response("Not found", { status: 404 });
  const urls = await slugsParaSitemap();
  const cuerpo = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${xml(urlAbsoluta(u.ruta))}</loc>${u.modificada ? `<lastmod>${u.modificada}</lastmod>` : ""}</url>`,
    ),
    "</urlset>",
  ].join("\n");
  return new Response(cuerpo, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
