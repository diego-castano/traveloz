// ---------------------------------------------------------------------------
// Bóveda de datos de pago — cifrado AES-256-GCM.
//
// El número de tarjeta, el vencimiento, el CVV y el documento del titular
// NUNCA se persisten en claro ni se loguean. Entran acá como objeto, salen
// como tres Buffers (payload / iv / tag) que son lo único que toca la DB.
//
// La clave vive en la env DATOS_PAGO_KEY (32 bytes en base64). Si falta o es
// inválida, `bovedaDisponible()` devuelve false y el formulario público de
// pago muestra "no disponible". PROHIBIDO guardar en claro como fallback: es
// preferible perder un envío que dejar un PAN legible en la base.
//
// Para generar la clave:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// ---------------------------------------------------------------------------

import crypto from "node:crypto";

const ALGORITMO = "aes-256-gcm";
// GCM recomienda 96 bits de IV: es el tamaño para el que está especificado el
// contador interno; usar 16 bytes obliga a un GHASH extra y no suma seguridad.
const IV_BYTES = 12;

/** Cuerpo sensible que se cifra. Nada de esto queda legible en la DB. */
export interface DatosTarjeta {
  numero: string;
  vencimiento: string;
  cvv: string;
  documentoTitular: string;
  cuotas: string | null;
  /**
   * Campos EXTRA que el admin agregó al formulario de pago. Van adentro del
   * sobre cifrado porque DatosPagoCifrado no tiene columna `respuestas` y
   * todo lo que se tipea en esa pantalla se trata como sensible por defecto.
   */
  extras: { id: string; etiqueta: string; valor: string }[];
}

/**
 * Los tres pedazos que van a las columnas Bytes de DatosPagoCifrado. Van como
 * Uint8Array y no como Buffer porque el cliente de Prisma tipa `Bytes` así.
 */
export interface SobreCifrado {
  payload: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  tag: Uint8Array<ArrayBuffer>;
}

// ---------------------------------------------------------------------------
// Clave
// ---------------------------------------------------------------------------

function leerClave(): Buffer | null {
  const raw = process.env.DATOS_PAGO_KEY?.trim();
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    // Buffer.from(base64) no falla ante basura: descarta lo que no es base64 y
    // devuelve algo más corto. El largo exacto es la única validación confiable.
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

/** ¿Está configurada la bóveda? Sin clave, el formulario de pago no abre. */
export function bovedaDisponible(): boolean {
  return leerClave() !== null;
}

// ---------------------------------------------------------------------------
// Cifrar / descifrar
// ---------------------------------------------------------------------------

export function cifrar(obj: DatosTarjeta): SobreCifrado {
  const key = leerClave();
  if (!key) throw new Error("DATOS_PAGO_KEY no configurada.");
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITMO, key, iv);
  const payload = Buffer.concat([
    cipher.update(JSON.stringify(obj), "utf8"),
    cipher.final(),
  ]);
  // Copia a un Uint8Array propio: el tipo `Bytes` de Prisma no acepta el
  // Buffer<ArrayBufferLike> que devuelve node:crypto.
  return {
    payload: Uint8Array.from(payload),
    iv: Uint8Array.from(iv),
    tag: Uint8Array.from(cipher.getAuthTag()),
  };
}

export function descifrar(sobre: SobreCifrado): DatosTarjeta {
  const key = leerClave();
  if (!key) throw new Error("DATOS_PAGO_KEY no configurada.");
  const decipher = crypto.createDecipheriv(ALGORITMO, key, sobre.iv);
  decipher.setAuthTag(sobre.tag);
  const plano = Buffer.concat([
    decipher.update(Buffer.from(sobre.payload)),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plano) as DatosTarjeta;
}

// ---------------------------------------------------------------------------
// Derivados que SÍ quedan en claro (los únicos).
// Se calculan ANTES de cifrar: el vendedor necesita reconocer la tarjeta en el
// listado sin abrir la bóveda, y el email de aviso solo lleva estos dos.
// ---------------------------------------------------------------------------

/** Deja solo dígitos: el formulario manda el número en grupos de 4. */
export function soloDigitos(numero: string): string {
  return numero.replace(/\D/g, "");
}

export function ultimos4(numero: string): string {
  return soloDigitos(numero).slice(-4);
}

/**
 * Emisor por prefijo BIN. Tabla corta a propósito: alcanza para etiquetar el
 * registro en el admin, no es un validador de rangos IIN.
 */
export function detectarEmisor(numero: string): string {
  const d = soloDigitos(numero);
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^(6011|65|64[4-9]|622)/.test(d)) return "Discover";
  if (/^3(0[0-5]|[68])/.test(d)) return "Diners";
  return "Otra";
}

/**
 * Algoritmo de Luhn. Corta el 90% de los tipeos mal hechos antes de ocupar
 * un registro de la bóveda; NO dice nada sobre si la tarjeta existe.
 */
export function luhnValido(numero: string): boolean {
  const d = soloDigitos(numero);
  if (d.length < 13 || d.length > 19) return false;
  let suma = 0;
  let doble = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (doble) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
    doble = !doble;
  }
  return suma % 10 === 0;
}

/**
 * "MM/AA" → último instante del mes de vencimiento, o null si el formato es
 * inválido. Una tarjeta vence al FINAL del mes impreso, por eso el corte va
 * al día 1 del mes siguiente.
 */
export function vencimientoADate(mmaa: string): Date | null {
  const m = mmaa.trim().match(/^(\d{2})\s*\/?\s*(\d{2})$/);
  if (!m) return null;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return new Date(Date.UTC(anio, mes, 1, 0, 0, 0));
}

/** ¿El vencimiento es futuro? (mes en curso incluido). */
export function vencimientoVigente(mmaa: string): boolean {
  const corte = vencimientoADate(mmaa);
  return corte !== null && corte.getTime() > Date.now();
}
