// ---------------------------------------------------------------------------
// /robots.txt — driven by SiteSettings (group="robots") so the admin can
// flip the site between three modes from /backend/web/robots:
//
//   • "open"        — production-ready: allow all crawlers on /, disallow
//                     /backend, /api, /presentacion_traveloz. Sitemap declared.
//   • "maintenance" — disallow everything (used during launches / rebrands).
//   • "custom"      — admin pastes their own body verbatim. Power-user escape
//                     hatch; recommended only when the open/maintenance modes
//                     don't fit.
//
// In "open" mode the admin can also append extra paths to disallow (one per
// line in `robots_extra_disallow`) without writing the whole file.
// ---------------------------------------------------------------------------

import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/public-data";

function getBaseUrl(): string {
  const raw =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings("robots");
  const mode = (settings.robots_mode ?? "open").trim().toLowerCase();
  const base = getBaseUrl();
  const sitemap = `${base}/sitemap.xml`;

  if (mode === "maintenance") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap,
    };
  }

  if (mode === "custom") {
    // The MetadataRoute.Robots shape requires structured rules — when the
    // admin wants a fully bespoke body, we still return a structured object
    // so Next renders valid syntax, but we read each non-empty line as a
    // Disallow. For more exotic configs they can write directly to
    // `public/robots.txt` (it wins over this route).
    const body = (settings.robots_custom_body ?? "").trim();
    if (body) {
      const disallows = body
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("Disallow:"))
        .map((l) => l.replace(/^Disallow:\s*/, ""));
      return {
        rules: [
          {
            userAgent: "*",
            disallow: disallows.length > 0 ? disallows : "/",
          },
        ],
        sitemap,
      };
    }
    // fall through to "open" if custom body was empty
  }

  // "open" (default)
  const extra = (settings.robots_extra_disallow ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Regla de oro de esta lista: Disallow NO saca nada del buscador.
        // Solo impide rastrear, y una URL que Google no puede leer se queda en
        // el índice sin título ni descripción, imposible de corregir. Sirve
        // para lo que nunca debe ser pedido; para lo que quiero FUERA del
        // índice va noindex (meta o X-Robots-Tag) con el rastreo permitido, o
        // directamente un 404.
        //
        // Por eso NO están acá:
        //   /html_inicial   → la plantilla original se mudó a docs/, ya no se
        //                     sirve: responde 404 y eso la saca del índice.
        //   /mockups, /presentacion_traveloz → siguen sirviéndose, con
        //                     X-Robots-Tag: noindex (ver next.config.mjs).
        //   /cotizador      → es un 308 a /backend/cotizador. Bloqueado, Google
        //                     no puede seguir el redirect y la URL vieja queda
        //                     colgada para siempre.
        disallow: [
          // El panel y la API: no son contenido, y detrás hay login. Acá el
          // Disallow es lo correcto, no hay nada que sacar de ningún índice.
          "/backend",
          "/backend/",
          "/api/",
          // Links personales de datos de pasajeros / pago y el link público de
          // cotización. Llevan datos de terceros (nombre, itinerario, precio).
          // Las páginas ya salen con meta robots "noindex, nofollow, nocache",
          // así que si alguna vez alguien comparte un link en público, Google
          // lo rastrea y lo descarta. El Disallow queda como segunda barrera:
          // los tokens no son adivinables, así que en la práctica nunca se
          // piden. Si algún día aparece uno indexado como URL pelada, hay que
          // sacar estas tres líneas para que Google pueda leer el noindex.
          "/datos-de-pasajeros",
          "/datos-de-pago",
          "/c",
          ...extra,
        ],
      },
    ],
    sitemap,
  };
}
