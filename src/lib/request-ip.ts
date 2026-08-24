// ---------------------------------------------------------------------------
// La IP del que pide, leída del extremo CONFIABLE de X-Forwarded-For.
//
// El proxy de Railway APENDEA la IP real al final de la lista. El primer
// elemento lo escribe el cliente: mandar `X-Forwarded-For: 1.2.3.4` en el curl
// alcanza para aparecer con esa IP. Entonces la última es la única que no se
// puede falsear, y es la que usan el beacon de apertura, el lector de
// itinerarios, la página pública y las actions del link.
//
// A propósito distinto del `split(",")[0]` de los formularios públicos, que es
// código viejo y mide otra cosa (geolocalizar un lead, no frenar un abuso).
// ---------------------------------------------------------------------------

/** Cualquier cosa que sepa leer headers: `Headers`, `ReadonlyHeaders`, un mock. */
interface LeeHeaders {
  get(name: string): string | null;
}

/** IP confiable a partir de los headers pelados. */
export function ipConfiableDeHeaders(h: LeeHeaders): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const partes = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length) return partes[partes.length - 1]!;
  }
  return h.get("x-real-ip");
}

/** Igual, a partir de una request (`Request` o `NextRequest`). */
export function ipConfiable(req: { headers: LeeHeaders }): string | null {
  return ipConfiableDeHeaders(req.headers);
}
