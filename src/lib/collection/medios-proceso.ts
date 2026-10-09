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
