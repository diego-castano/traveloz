// ---------------------------------------------------------------------------
// image-src — helper para servir thumbnails de las cards al tamaño real de
// pantalla en vez del original de 1-3 MB.
//
// El proxy /api/image ya soporta ?w=<ancho> (resize on-the-fly con sharp +
// Cache-Control immutable). Este helper arma el `src` + `srcSet` para que el
// navegador baje solo la variante que necesita. Es una función pura (sin deps
// de runtime) para poder importarla desde componentes client.
//
// Solo transformamos URLs internas `/api/image/...`. URLs externas y el
// placeholder SVG local pasan sin tocar (el proxy no las sirve / sharp no
// reencodea svg). Los anchos coinciden con la whitelist THUMB_WIDTHS del route.
// ---------------------------------------------------------------------------

// Debe ser subconjunto de THUMB_WIDTHS en src/app/api/image/[...path]/route.ts.
const DEFAULT_WIDTHS = [320, 480, 640, 960] as const;

// `sizes` por defecto para las cards. La card nunca supera ~380px CSS de ancho
// (grid 4-up en xxl ≈ 304px, 1-up en mobile ≈ 100vw). Sobreestimar un poco es
// seguro: el navegador elige el candidato inmediatamente mayor, nunca borroso.
export const CARD_SIZES =
  "(max-width: 575px) 100vw, (max-width: 991px) 50vw, (max-width: 1399px) 33vw, 25vw";

export function cardImage(
  url: string,
  widths: readonly number[] = DEFAULT_WIDTHS,
): { src: string; srcSet?: string } {
  if (!url.startsWith("/api/image/")) return { src: url };
  const list = widths.length ? widths : DEFAULT_WIDTHS;
  // Fallback src = ancho intermedio; solo lo usan navegadores sin srcset.
  const fallback = list[Math.min(1, list.length - 1)];
  return {
    src: `${url}?w=${fallback}`,
    srcSet: list.map((w) => `${url}?w=${w} ${w}w`).join(", "),
  };
}
