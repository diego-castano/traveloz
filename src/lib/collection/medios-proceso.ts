// Procesamiento de fotos de Collection. Función pura (sin bucket ni DB) para
// poder probarla suelta; registrarMedio la usa y después sube los buffers.

import sharp from "sharp";

export const ANCHOS_VARIANTE = [480, 960, 1600, 2400] as const;

export interface FotoProcesada {
  ancho: number;
  alto: number;
  colorDominante: string;
  placeholder: string;
  variantes: { w: number; h: number; buffer: Buffer }[];
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

export async function procesarFoto(original: Buffer): Promise<FotoProcesada> {
  // rotate() aplica el EXIF; el buffer ya rotado se usa para todo lo demás.
  const base = await sharp(original).rotate().toBuffer({ resolveWithObject: true });
  const ancho = base.info.width;
  const alto = base.info.height;

  const { dominant } = await sharp(base.data).stats();
  const colorDominante = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;

  const mini = await sharp(base.data)
    .resize({ width: 24 })
    .webp({ quality: 40 })
    .toBuffer();
  const placeholder = `data:image/webp;base64,${mini.toString("base64")}`;

  // Sin agrandar: solo anchos <= al original, y siempre al menos una variante.
  const anchos: number[] = ANCHOS_VARIANTE.filter((w) => w <= ancho);
  if (anchos.length === 0) anchos.push(ancho);

  const variantes = await Promise.all(
    anchos.map(async (w) => {
      const r = await sharp(base.data)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      return { w: r.info.width, h: r.info.height, buffer: r.data };
    }),
  );

  return { ancho, alto, colorDominante, placeholder, variantes };
}

/**
 * Imagen para compartir (Open Graph): recorta el original rotado con el
 * encuadre 1.91:1 (normalizado 0..1) y lo lleva a 1200 × 630 en JPEG.
 */
export async function generarOg(original: Buffer, r: { x: number; y: number; w: number; h: number }): Promise<Buffer> {
  const base = await sharp(original).rotate().toBuffer({ resolveWithObject: true });
  const W = base.info.width;
  const H = base.info.height;
  const left = Math.min(W - 1, Math.max(0, Math.round(r.x * W)));
  const top = Math.min(H - 1, Math.max(0, Math.round(r.y * H)));
  const width = Math.max(1, Math.min(W - left, Math.round(r.w * W)));
  const height = Math.max(1, Math.min(H - top, Math.round(r.h * H)));
  return sharp(base.data)
    .extract({ left, top, width, height })
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
}
