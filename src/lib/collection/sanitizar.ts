// Sanitizado del HTML que escribe el editor de texto rico. Se aplica al
// guardar, así lo que queda en la base ya es seguro para dibujar en el sitio.

import sanitize from "sanitize-html";
import type { ContenidoExperiencia } from "@/lib/collection/experiencia/contenido";
import type { ContenidoPagina } from "@/lib/collection/paginas/contenido";

export function sanitizarHtml(s: string): string {
  if (!s) return "";
  return sanitize(s, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "a", "ul", "ol", "li", "h3", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tag, attribs) => ({
        tagName: tag,
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
    },
  });
}

export function sanitizarContenido(c: ContenidoExperiencia): ContenidoExperiencia {
  return {
    ...c,
    intro: sanitizarHtml(c.intro),
    tramos: c.tramos.map((t) => ({
      ...t,
      relato: sanitizarHtml(t.relato),
      hotel: t.hotel ? { ...t.hotel, texto: sanitizarHtml(t.hotel.texto) } : null,
    })),
    dias: c.dias.map((d) => ({ ...d, texto: sanitizarHtml(d.texto) })),
  };
}

export function sanitizarBloques(c: ContenidoPagina): ContenidoPagina {
  return {
    ...c,
    bloques: c.bloques.map((b) =>
      b.tipo === "manifiesto" || b.tipo === "texto" || b.tipo === "imagenTexto"
        ? { ...b, texto: sanitizarHtml(b.texto) }
        : b,
    ),
  };
}
