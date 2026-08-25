// ---------------------------------------------------------------------------
// Piezas compartidas del link público de una cotización (/c/<token>).
//
// Lo usan tres lados que no se pueden importar entre sí:
//   • las actions del vendedor (emitir el link, extender la vigencia),
//   • la página pública `(cotizacion)/c/[token]`,
//   • el beacon `POST /api/cotizador/apertura`.
//
// Nada de acá toca la base ni la sesión: son helpers puros.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";

/**
 * Alfabeto del token: 32 símbolos, minúsculas y dígitos, sin los pares que se
 * confunden al dictarlo por teléfono (i/l/1, o/0 — se van las letras y quedan
 * los números). Son 32 exactos a propósito: 256 % 32 = 0, así que un byte
 * crudo se mapea a un símbolo sin sesgo y sin descartar bytes.
 */
const ALFABETO = "abcdefghjkmnpqrstuvwxyz0123456789".replace("1", "");

/** Largo del token. 8 símbolos de 32 = 40 bits ≈ 1,1 billones de combinaciones. */
export const TOKEN_LARGO = 8;

/** Forma que valida la ruta antes de ir a la base. */
export const TOKEN_RE = /^[a-z0-9]{8}$/;

/** Token nuevo, criptográficamente aleatorio. */
export function nuevoToken(): string {
  const bytes = randomBytes(TOKEN_LARGO);
  let out = "";
  for (let i = 0; i < TOKEN_LARGO; i++) out += ALFABETO[bytes[i] % ALFABETO.length];
  return out;
}

/** Normaliza lo que llegó por URL o por body y avisa si no tiene forma de token. */
export function normalizarToken(raw: unknown): string | null {
  const t = String(raw ?? "").trim().toLowerCase();
  return TOKEN_RE.test(t) ? t : null;
}

/** URL pública del link. `base` es SITE_BASE_URL, ya sin barra final. */
export function urlDeToken(base: string, token: string): string {
  return `${base.replace(/\/+$/, "")}/c/${token}`;
}

// Las secciones que mide el tracking viven en ./secciones.ts — ese módulo no
// importa `crypto` y por eso lo puede cargar también el componente cliente de
// la página pública. Se re-exportan acá para que el server tenga una sola
// puerta de entrada.
export {
  SECCIONES,
  indiceSeccion,
  seccionMasAvanzada,
  labelSeccion,
  type ClaveSeccion,
} from "./secciones";

// ---------------------------------------------------------------------------
// Dispositivo
// ---------------------------------------------------------------------------

/**
 * Familia del dispositivo a partir del User-Agent. No queremos fingerprinting:
 * alcanza con saber si la cotización se leyó en el celular o sentado frente a
 * una computadora, que es lo que cambia la conversación del vendedor.
 */
export function dispositivoDesdeUA(ua: string | null | undefined): string {
  const s = String(ua ?? "");
  if (/iPad/i.test(s)) return "iPad";
  if (/iPhone|iPod/i.test(s)) return "iPhone";
  if (/Android/i.test(s)) return "Android";
  if (!s) return "Desconocido";
  return "Desktop";
}
