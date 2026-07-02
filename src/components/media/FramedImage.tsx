import * as React from "react";

interface FramedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "style"> {
  src: string;
  alt?: string;
  /** Punto focal horizontal del recorte, 0-100 (%). Default 50 (centro). */
  posX?: number;
  /** Punto focal vertical del recorte, 0-100 (%). Default 50 (centro). */
  posY?: number;
  /** Acercamiento, >= 1. Default 1 (sin zoom). */
  zoom?: number;
  style?: React.CSSProperties;
}

/**
 * Imagen recortada por un marco (object-fit: cover) con punto focal y zoom
 * configurables. Usar SIEMPRE dentro de un contenedor con `overflow: hidden`
 * y dimensiones/aspecto definidos.
 *
 * El mismo componente se usa en el frontend público (hero/slider) y en la
 * previsualización del editor del backend, de modo que lo que el operador
 * encuadra es exactamente lo que se ve publicado (WYSIWYG).
 */
export function FramedImage({
  src,
  alt = "",
  posX = 50,
  posY = 50,
  zoom = 1,
  style,
  ...imgProps
}: FramedImageProps) {
  const position = `${posX}% ${posY}%`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      {...imgProps}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: position,
        transform: zoom && zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: position,
        ...style,
      }}
    />
  );
}
