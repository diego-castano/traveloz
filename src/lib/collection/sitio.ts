// Piezas puras del sitio público de Collection (collection.traveloz.com.uy):
// hosts, URL canónica, si se indexa y la metadata de cada página. Sin imports
// de servidor: lo usa también el middleware.
//
// next.config.mjs lee las mismas dos variables (COLLECTION_HOSTS y
// COLLECTION_INDEXAR) en el build para las reescrituras y el X-Robots-Tag: si
// cambian acá, cambian allá.

import type { Metadata } from "next";

export const URL_SITIO = "https://collection.traveloz.com.uy";
export const NOMBRE_SITIO = "Traveloz Collection";

/** Hosts que sirven el sitio. `collection.localhost` es para probar en local. */
export const HOSTS_COLLECTION = (process.env.COLLECTION_HOSTS || "collection.traveloz.com.uy")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)
  .concat("collection.localhost");

export function esHostCollection(host: string | null | undefined): boolean {
  const h = (host ?? "").split(":")[0].toLowerCase();
  return HOSTS_COLLECTION.includes(h);
}

/** Hasta el lanzamiento el sitio no se indexa (RN12). Fase 5 puede pasarlo a un ajuste. */
export function sitioIndexable(): boolean {
  return process.env.COLLECTION_INDEXAR === "1";
}

export const urlAbsoluta = (ruta: string) => (/^https?:\/\//.test(ruta) ? ruta : `${URL_SITIO}${ruta.startsWith("/") ? "" : "/"}${ruta}`);

/** Metadata de una página del sitio. `titulo` vacío = el título por defecto de la marca. */
export function metaSitio(o: { titulo?: string; descripcion?: string; ruta: string; imagen?: string | null }): Metadata {
  const indexa = sitioIndexable();
  const url = urlAbsoluta(o.ruta);
  const tituloSocial = o.titulo ? `${o.titulo} | ${NOMBRE_SITIO}` : NOMBRE_SITIO;
  const imagenes = o.imagen ? [{ url: urlAbsoluta(o.imagen) }] : undefined;
  return {
    ...(o.titulo ? { title: o.titulo } : { title: { absolute: NOMBRE_SITIO } }),
    description: o.descripcion || undefined,
    alternates: { canonical: url },
    robots: { index: indexa, follow: indexa },
    openGraph: {
      type: "website",
      siteName: NOMBRE_SITIO,
      locale: "es_UY",
      url,
      title: tituloSocial,
      description: o.descripcion || undefined,
      images: imagenes,
    },
    twitter: {
      card: imagenes ? "summary_large_image" : "summary",
      title: tituloSocial,
      description: o.descripcion || undefined,
      images: imagenes?.map((i) => i.url),
    },
  };
}

/** Recorta un texto para la descripción de Google sin cortar palabras. */
export function resumen(t: string, max = 160): string {
  const limpio = t.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** BreadcrumbList de schema.org desde pares nombre/ruta. */
export function migasJsonLd(migas: { nombre: string; ruta: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      item: urlAbsoluta(m.ruta),
    })),
  };
}
