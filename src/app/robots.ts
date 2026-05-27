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
        disallow: [
          "/backend",
          "/backend/",
          "/api/",
          "/presentacion_traveloz",
          ...extra,
        ],
      },
    ],
    sitemap,
  };
}
