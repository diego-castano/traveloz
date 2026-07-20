// ---------------------------------------------------------------------------
// AtribucionTracker — captura de atribución de pauta en el cliente.
//
// Render null. Por cada página que se ve (full reload o navegación client-side)
// aplica las reglas first/last sobre la cookie `tvz_attr` y manda un beacon
// fire-and-forget a /api/visita para registrar el historial anónimo.
//
// Se dispara con `usePathname()` en un `useEffect` keyeado por pathname (mismo
// patrón que CotizarCTA): cubre los full reloads del sitio (remonta por página)
// y las navegaciones client-side existentes (CotizarCTA, páginas de newsletter).
//
// Montado en (public)/layout —AMBOS branches, incluido el de Coming Soon— y en
// (landing)/layout, para capturar también al visitante anónimo con el gate
// activo (si no, la cookie no existiría al pasar a una landing).
// ---------------------------------------------------------------------------

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  ATTR_COOKIE,
  ATTR_MAX_AGE,
  actualizarAtribucion,
  extraerTouch,
  parseAtribucion,
  serializeAtribucion,
} from "@/lib/atribucion";

// Último URL beaconeado en ESTA pestaña. Vive a nivel de módulo (no useRef) para
// sobrevivir a remontajes y al doble effect de StrictMode en dev — así el mismo
// pageview no genera dos filas en PaginaVista.
let ultimoUrlBeacon: string | null = null;

/** Lee el valor crudo de una cookie desde `document.cookie`. */
function leerCookie(nombre: string): string | undefined {
  const prefijo = nombre + "=";
  const partes = document.cookie ? document.cookie.split("; ") : [];
  for (const p of partes) {
    if (p.startsWith(prefijo)) return p.slice(prefijo.length);
  }
  return undefined;
}

/** UUID v4. Usa `crypto.randomUUID` y cae a un fallback simple si no existe. */
function generarVid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // browsers viejos / contextos no seguros: caemos al fallback.
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function AtribucionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Defensivo: el admin nunca debe trackear (tampoco montamos el tracker ahí).
    if (!pathname || pathname.startsWith("/backend")) return;

    try {
      const previa = parseAtribucion(leerCookie(ATTR_COOKIE));
      const touch = extraerTouch({
        search: window.location.search,
        referrer: document.referrer,
        pathname,
        host: window.location.host,
        now: Date.now(),
      });
      const { atrib } = actualizarAtribucion(previa, touch, generarVid);

      // Escribimos SIEMPRE para renovar el TTL (cookie rodante). `Secure` solo
      // en https: en dev (http://localhost) el browser rechaza cookies Secure.
      // No httpOnly: la cookie la escribe y lee este JS.
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${ATTR_COOKIE}=${serializeAtribucion(
        atrib,
      )}; path=/; max-age=${ATTR_MAX_AGE}; SameSite=Lax${secure}`;

      // Beacon fire-and-forget. Guard de módulo contra duplicados (StrictMode /
      // remontajes): un mismo pathname+search no se beaconea dos veces seguidas.
      const url = (pathname + window.location.search).slice(0, 500);
      if (url !== ultimoUrlBeacon) {
        ultimoUrlBeacon = url;
        const ref = document.referrer
          ? document.referrer.slice(0, 500)
          : undefined;
        fetch("/api/visita", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vid: atrib.vid, url, ref }),
        }).catch(() => {});
      }
    } catch {
      // Nada del tracking puede romper la navegación del usuario.
    }
  }, [pathname]);

  return null;
}
