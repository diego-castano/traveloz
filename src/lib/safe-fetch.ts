import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// ---------------------------------------------------------------------------
// SSRF-safe fetch for user-supplied URLs (/api/upload/by-url).
//
// Threat model: un admin (o una sesión robada) pega una URL que apunta a la
// red interna — metadata de la nube (169.254.169.254), servicios
// *.railway.internal, localhost, etc. — y usa el servidor como proxy.
//
// Defensa: antes de cada request (incluyendo cada salto de redirect) se
// resuelve el hostname y se rechaza si CUALQUIER dirección resuelta cae en un
// rango privado/reservado. Redirects se siguen manualmente para re-validar.
// ---------------------------------------------------------------------------

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".railway.internal",
  ".internal",
  ".local",
  ".localhost",
];

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p))) return true;
  const [a, b] = parts;
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10.0.0.0/8
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 0) || // 192.0.0.0/24 + 192.0.2.0/24 doc
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast + reserved + broadcast
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return (
    lower === "::" ||
    lower === "::1" || // loopback
    lower.startsWith("fe80") || // link-local
    lower.startsWith("fc") || // unique-local fc00::/7
    lower.startsWith("fd") ||
    lower.startsWith("ff") // multicast
  );
}

function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // not an IP — treat as unsafe
}

/** Throws UnsafeUrlError unless the URL is http(s) and resolves to a public IP. */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URL inválida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Solo se aceptan URLs http(s)");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("No se aceptan URLs con credenciales");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname === "localhost" ||
    BLOCKED_HOSTNAME_SUFFIXES.some((sfx) => hostname.endsWith(sfx))
  ) {
    throw new UnsafeUrlError("Destino no permitido");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError("Destino no permitido");
    }
    return url;
  }

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("No se pudo resolver el dominio");
  }
  if (addresses.length === 0) {
    throw new UnsafeUrlError("No se pudo resolver el dominio");
  }
  if (addresses.some((addr) => isPrivateAddress(addr.address))) {
    throw new UnsafeUrlError("Destino no permitido");
  }
  return url;
}

const MAX_REDIRECTS = 5;

/**
 * fetch() que valida el destino contra rangos privados en la URL inicial y en
 * cada redirect. Devuelve la Response final (nunca una 3xx).
 */
export async function safeFetch(
  rawUrl: string,
  init?: Omit<RequestInit, "redirect">,
): Promise<Response> {
  let current = (await assertPublicUrl(rawUrl)).toString();

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status < 300 || res.status >= 400) return res;

    const location = res.headers.get("location");
    if (!location) return res;
    // Drenar el body del redirect para no filtrar el socket.
    res.body?.cancel?.();
    const next = new URL(location, current).toString();
    current = (await assertPublicUrl(next)).toString();
  }
  throw new UnsafeUrlError("Demasiados redirects");
}
