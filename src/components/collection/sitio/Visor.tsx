"use client";

// Visor a pantalla completa de la galería. Se carga solo cuando alguien abre
// una foto (next/dynamic desde la página), así no pesa en la primera carga.

import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import type { MedioVista } from "@/lib/collection/experiencia/contenido";

// Sin archivo (borradores, demo): un rectángulo del color del medio.
const svgDeColor = (m: MedioVista) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${m.ancho ?? 1600}" height="${m.alto ?? 1067}"><rect width="100%" height="100%" fill="${m.colorDominante ?? "#4A5859"}"/></svg>`,
  )}`;

export default function Visor({
  fotos,
  indice,
  onCerrar,
}: {
  fotos: (MedioVista & { leyendaUso: string })[];
  indice: number;
  onCerrar: () => void;
}) {
  const slides = fotos.map((m) => {
    const src = m.tipo === "VIDEO" ? m.posterUrl : m.variantes.at(-1)?.url ?? m.url;
    return {
      src: src || svgDeColor(m),
      alt: m.alt,
      width: m.ancho ?? undefined,
      height: m.alto ?? undefined,
      srcSet: m.variantes.map((v) => ({ src: v.url, width: v.w, height: v.h })),
      title: m.leyendaUso || undefined,
      description: m.credito ? `Foto: ${m.credito}` : undefined,
    };
  });
  return (
    <Lightbox
      open={indice >= 0}
      index={Math.max(0, indice)}
      close={onCerrar}
      slides={slides}
      plugins={[Captions, Counter]}
      captions={{ descriptionTextAlign: "start" }}
      animation={{ fade: 300, swipe: 500, easing: { fade: "cubic-bezier(0.22,1,0.36,1)", swipe: "cubic-bezier(0.22,1,0.36,1)" } }}
      styles={{
        // El contador va abajo a la derecha: arriba a la izquierda pisaba el título de la foto.
        container: {
          backgroundColor: "rgba(50,55,59,0.97)",
          ...({ "--yarl__counter_top": "unset", "--yarl__counter_bottom": "0", "--yarl__counter_left": "unset", "--yarl__counter_right": "0" } as React.CSSProperties),
        },
        captionsTitle: { fontFamily: "var(--font-col-display), Georgia, serif", fontWeight: 400, fontSize: 22 },
        captionsDescription: { fontFamily: "var(--font-col-text), sans-serif", fontSize: 13, color: "#DCDCDC" },
      }}
    />
  );
}
