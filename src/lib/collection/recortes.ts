// Encuadres de las fotos de Collection: uno por aspecto, guardado en la foto
// (ColMedio.recortes) y reusado en cada lugar que muestra ese aspecto. El
// rectángulo va normalizado 0..1 sobre el original ya rotado. Sin imports de
// servidor: lo usan el sitio, el backoffice y las actions.

import type { CSSProperties } from "react";
import { z } from "zod";

export const ASPECTOS = ["16:9", "4:5", "1:1", "4:3", "1.91:1"] as const;
export type Aspecto = (typeof ASPECTOS)[number];

/** 1.91:1 es exactamente 1200 × 630, la medida de la imagen para compartir. */
export const VALOR_ASPECTO: Record<Aspecto, number> = {
  "16:9": 16 / 9,
  "4:5": 4 / 5,
  "1:1": 1,
  "4:3": 4 / 3,
  "1.91:1": 1200 / 630,
};

/** Dónde se ve cada aspecto, para el editor y la biblioteca. */
export const USO_ASPECTO: Record<Aspecto, string> = {
  "16:9": "Portada horizontal",
  "4:5": "Tarjeta y celular",
  "1:1": "Cuadrado",
  "4:3": "Tarjeta del journal",
  "1.91:1": "Google y WhatsApp",
};

export interface Recorte {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Solo 1.91:1: el JPEG de 1200 × 630 que genera el servidor. */
  url?: string;
}
export type Recortes = Partial<Record<Aspecto, Recorte>>;

const n01 = z.number().min(0).max(1);
export const recorteSchema = z
  .object({ x: n01, y: n01, w: n01, h: n01 })
  .refine((r) => r.w > 0.02 && r.h > 0.02, "Encuadre demasiado chico.")
  .refine((r) => r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001, "El encuadre se sale de la foto.");

/** Lo que manda el editor: por aspecto, el rectángulo nuevo o null para volver al automático. */
export const cambioRecortesSchema = z.partialRecord(z.enum(ASPECTOS), recorteSchema.nullable());
export type CambioRecortes = Partial<Record<Aspecto, Omit<Recorte, "url"> | null>>;

export function recorteValido(r: unknown): r is Recorte {
  return recorteSchema.safeParse(r).success;
}

/** Lee la columna JSON y descarta lo que no sea un aspecto conocido con un rectángulo sano. */
export function leerRecortes(json: unknown): Recortes {
  const out: Recortes = {};
  if (!json || typeof json !== "object") return out;
  for (const a of ASPECTOS) {
    const r = (json as Record<string, unknown>)[a];
    if (recorteValido(r)) {
      const { x, y, w, h, url } = r as Recorte;
      out[a] = typeof url === "string" && url ? { x, y, w, h, url } : { x, y, w, h };
    }
  }
  return out;
}

export const centroDelRecorte = (r: Recorte) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * CSS de la <img> dentro de una caja overflow-hidden con el aspecto del
 * recorte: la región elegida llena la caja exacta. `imgAspect` = ancho/alto
 * de la foto, así la altura sale sin esperar a que cargue.
 */
export function estiloRecorte(r: Recorte, imgAspect: number): CSSProperties {
  return {
    position: "absolute",
    left: `${(-r.x / r.w) * 100}%`,
    top: `${(-r.y / r.h) * 100}%`,
    width: `${100 / r.w}%`,
    height: "auto",
    maxWidth: "none",
    aspectRatio: String(imgAspect),
  };
}

/** Aspecto real (ancho/alto en píxeles) de un recorte sobre una foto. */
export const aspectoDelRecorte = (r: Recorte, imgAspect: number) => (r.w / r.h) * imgAspect;

/** El rectángulo más grande de ese aspecto, centrado en el foco sin salirse. */
export function recortePorFoco(aspecto: Aspecto, imgAspect: number, focoX = 0.5, focoY = 0.5): Recorte {
  const rel = VALOR_ASPECTO[aspecto] / imgAspect;
  const w = rel <= 1 ? rel : 1;
  const h = rel <= 1 ? 1 : 1 / rel;
  const fijar = (c: number, lado: number) => Math.min(1 - lado, Math.max(0, c - lado / 2));
  return { x: fijar(focoX, w), y: fijar(focoY, h), w, h };
}

/** Diferencia relativa tolerada entre la caja y el recorte para dibujarlo exacto. */
export const TOLERANCIA = 0.03;

/**
 * De los encuadres pedidos que tiene la foto, el más cercano al aspecto de la
 * caja. `exacto` si la caja tiene ese aspecto (con tolerancia).
 */
export function elegirRecorte(
  recortes: Recortes | undefined,
  pedidos: readonly Aspecto[],
  caja: number | null,
): { aspecto: Aspecto; recorte: Recorte; exacto: boolean } | null {
  let mejor: { aspecto: Aspecto; recorte: Recorte; d: number } | null = null;
  for (const a of pedidos) {
    const r = recortes?.[a];
    if (!r) continue;
    const d = caja ? Math.abs(Math.log(caja / VALOR_ASPECTO[a])) : Infinity;
    if (!mejor || d < mejor.d) mejor = { aspecto: a, recorte: r, d };
  }
  if (!mejor) return null;
  return { aspecto: mejor.aspecto, recorte: mejor.recorte, exacto: mejor.d <= Math.log(1 + TOLERANCIA) };
}
