// Límites de los videos de Collection, compartidos por la subida (navegador),
// las actions y los lugares de portada. Sin imports de servidor.

const MB = 1024 * 1024;

/** Solo MP4 y WebM: el .MOV no se reproduce en todos los navegadores. */
export const TIPOS_VIDEO = ["video/mp4", "video/webm"];

export const VIDEO_MAX_PESO = 50 * MB;
export const VIDEO_MAX_SEG = 120;

/** Portadas y fondos: un bucle corto que cargue rápido en el celular. */
export const PORTADA_MAX_PESO = 10 * MB;
export const PORTADA_MAX_SEG = 20;

export const MENSAJE_MOV =
  "Los videos .MOV no se ven en todos los navegadores. Exportalo como MP4 (H.264) y volvé a subirlo.";

export const esMov = (f: { name: string; type: string }) => f.type === "video/quicktime" || /\.mov$/i.test(f.name);

const mb = (b: number) => `${(b / MB).toFixed(1).replace(".", ",")} MB`;
const seg = (s: number) => `${Math.round(s)} segundos`;

/** Motivo para rechazar un video en la biblioteca, o null si entra. */
export function motivoVideo(peso: number | null, duracion: number | null | undefined): string | null {
  if (peso !== null && peso > VIDEO_MAX_PESO) return `El video pesa ${mb(peso)} y el máximo es 50 MB. Comprimilo y volvé a subirlo.`;
  if (duracion && duracion > VIDEO_MAX_SEG) return `El video dura más de 2 minutos (${seg(duracion)}). Recortalo y volvé a subirlo.`;
  return null;
}

/** Motivo para no usar un video como portada o fondo, o null si entra. */
export function motivoPortada(peso: number | null, duracion: number | null | undefined): string | null {
  const pasa = [
    peso !== null && peso > PORTADA_MAX_PESO ? `pesa ${mb(peso)}` : "",
    duracion && duracion > PORTADA_MAX_SEG ? `dura ${seg(duracion)}` : "",
  ].filter(Boolean);
  if (!pasa.length) return null;
  return `Este video ${pasa.join(" y ")}. Para portada y fondo usá uno de hasta 10 MB y 20 segundos (ideal: 6 MB y 12 segundos).`;
}
