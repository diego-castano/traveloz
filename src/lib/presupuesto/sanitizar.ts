// ---------------------------------------------------------------------------
// Limpieza del HTML que el vendedor escribe y que el pasajero termina viendo.
//
// `notasCliente` y `mensajeHtml` salen de un contenteditable del editor y se
// pintan con `dangerouslySetInnerHTML` en la ficha del pasajero. Entre esas dos
// puntas hay un guardado en base y un link público sin sesión: cualquier
// `<script>`, `onerror=` o `javascript:` que entre por ahí se ejecuta del lado
// del pasajero, con la marca puesta.
//
// La allowlist es la que necesita un bloc de notas de viaje: texto con formato,
// listas, títulos, links e imágenes propias. Nada de `style` (deja meter
// `position:fixed` encima de los botones), nada de `on*`, nada de esquemas
// raros. `img` solo desde /api/image/ o https: — es lo que sube el editor.
//
// Se aplica en dos lugares, y los dos hacen falta:
//   • al GUARDAR (crearPresupuesto / guardarPresupuesto), para que lo sucio no
//     llegue a la base ni al PDF ni al email;
//   • en `contenidoPublico`, para que lo que ya está guardado sucio de antes
//     tampoco se pinte.
//
// Este módulo es de servidor: `sanitize-html` arrastra un parser entero y no
// tiene por qué viajarle al navegador de nadie.
// ---------------------------------------------------------------------------

import sanitizeHtml from "sanitize-html";

/** Rutas relativas que aceptamos en `src`: solo el proxy de imágenes propio. */
const RUTA_IMAGEN_PROPIA = /^\/api\/image\//i;

const OPCIONES: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "b", "strong", "i", "em", "u", "s",
    "ul", "ol", "li",
    "h1", "h2", "h3", "h4",
    "blockquote", "span", "div",
    "a", "img",
  ],
  allowedAttributes: {
    a: ["href", "rel", "target"],
    // `style` en las imágenes lo escribimos NOSOTROS en el transform de abajo,
    // con una regla fija; el `style` que venga del editor se descarta igual
    // que en cualquier otra etiqueta.
    img: ["src", "alt", "width", "height", "style"],
  },
  // Ni `style` (salvo el que reponemos en `img`) ni `class`: el CSS de la hoja
  // lo pone la marca, no el texto pegado. `on*` no está en ninguna lista.
  allowedSchemes: ["http", "https"],
  allowedSchemesByTag: { img: ["http", "https"] },
  // `true` deja pasar `/api/image/…`; el filtro fino lo hace transformTags.
  allowProtocolRelative: false,
  allowedSchemesAppliedToAttributes: ["href", "src"],
  disallowedTagsMode: "discard",
  // Una imagen a la que le sacamos el src no tiene nada que hacer en la hoja.
  exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  // Un `<img src="/api/image/x">` es relativo y sanitize-html lo deja pasar
  // sin mirar el esquema; el transform de abajo se encarga de que sea ESE
  // prefijo y no `/backend/algo`.
  transformTags: {
    a: (nombre, attribs) => {
      const href = String(attribs.href ?? "");
      // Un link que no sale del navegador (javascript:, data:) ya lo mató el
      // filtro de esquemas; acá solo se le pone la armadura al que quedó.
      const limpios: Record<string, string> = href
        ? { href, rel: "noopener noreferrer", target: "_blank" }
        : {};
      return { tagName: "a", attribs: limpios };
    },
    img: (nombre, attribs) => {
      const src = String(attribs.src ?? "").trim();
      const absoluta = /^https?:\/\//i.test(src);
      const propia = RUTA_IMAGEN_PROPIA.test(src);
      if (!absoluta && !propia) {
        // Ni URL http(s) ni imagen nuestra: se cae el src y el tag queda
        // vacío, que es lo mismo que borrarlo pero sin romper el markup.
        return { tagName: "img", attribs: {} };
      }
      // El editor inserta las imágenes con `max-width:100%` y esquinas
      // redondeadas. El `style` del vendedor no se conserva (ahí entraba un
      // `position:fixed` tapando el botón de confirmar): se repone el nuestro,
      // que es el que la nota necesita para no desbordar la hoja.
      const limpios: Record<string, string> = {
        src,
        style: "max-width:100%;height:auto;border-radius:12px;margin:6px 0",
      };
      if (attribs.alt) limpios.alt = String(attribs.alt);
      if (attribs.width) limpios.width = String(attribs.width);
      if (attribs.height) limpios.height = String(attribs.height);
      return { tagName: "img", attribs: limpios };
    },
  },
};

/**
 * HTML de notas listo para pintar. Devuelve "" para todo lo que no sea string:
 * un null en `notasCliente` no puede terminar en `dangerouslySetInnerHTML`.
 */
export function sanitizarHtmlNotas(html: unknown): string {
  if (typeof html !== "string" || html === "") return "";
  return sanitizeHtml(html, OPCIONES);
}

/**
 * Los campos HTML del contenido, saneados antes de escribirlos.
 *
 * Se llama desde las actions y no desde el Zod a propósito: el esquema lo
 * comparte el cliente (el editor importa `parseContenido`) y meter
 * `sanitize-html` ahí adentro le mandaría el parser entero al navegador.
 */
export function sanitizarContenidoGuardado<
  T extends { notasCliente?: unknown; mensajeHtml?: unknown },
>(contenido: T): T {
  return {
    ...contenido,
    notasCliente: sanitizarHtmlNotas(contenido.notasCliente),
    mensajeHtml: sanitizarHtmlNotas(contenido.mensajeHtml),
  };
}
