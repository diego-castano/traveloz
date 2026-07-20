/**
 * Atribución de pauta — lado SERVIDOR.
 *
 * Aislado del núcleo puro (`atribucion.ts`) porque importa `next/headers`: eso
 * lo vuelve server-only (un client component que lo importe rompería el build
 * de Next). Lo consumen los 6 submits de lead (fase B) para adjuntar el snapshot
 * de atribución al convertir.
 *
 * `cookies()` en server actions/route handlers está probado en este repo (la
 * sesión de next-auth se lee así). La nota histórica sobre headers inaccesibles
 * en server actions aplica a `referer`/`user-agent`, no a la cookie.
 */

import { cookies } from "next/headers";
import { ATTR_COOKIE, parseAtribucion, type Touch } from "./atribucion";

/**
 * Lee y valida la cookie `tvz_attr` del request actual. Devuelve el `vid` más
 * los touches first/last (o `null` cada uno si no existen), o `null` si no hay
 * cookie válida. JAMÁS tira: un fallo acá no puede tumbar el guardado de un lead.
 */
export function leerAtribucion(): {
  vid: string;
  first: Touch | null;
  last: Touch | null;
} | null {
  try {
    const raw = cookies().get(ATTR_COOKIE)?.value;
    const atrib = parseAtribucion(raw);
    if (!atrib) return null;
    return {
      vid: atrib.vid,
      first: atrib.first ?? null,
      last: atrib.last ?? null,
    };
  } catch {
    return null;
  }
}
