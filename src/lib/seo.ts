// ---------------------------------------------------------------------------
// SEO helpers — used by `generateMetadata` in each public route to assemble a
// Metadata object from the CMS (SiteSetting group="seo") with safe fallbacks.
//
// Pattern:
//   export async function generateMetadata(): Promise<Metadata> {
//     return buildSeoMetadata("home");          // uses seo_home_title etc
//   }
//
// Routes that need dynamic overrides (paquete detail) can call:
//   buildSeoMetadata("default", { title, description, image })
//
// All entries are optional — missing ones fall back to the seo_default_* keys.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/public-data";

export type SeoRouteKey =
  | "home"
  | "destinos"
  | "about"
  | "contact"
  | "corporativo"
  | "cotizar"
  | "faq"
  | "terms"
  | "work";

type Overrides = {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
};

export function getBaseUrl(): string {
  const raw =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * Build a Metadata object for a known route key, optionally overriding
 * specific fields (used by paquete detail pages where the title comes from
 * the entity, not the CMS).
 */
export async function buildSeoMetadata(
  route: SeoRouteKey | "default",
  overrides: Overrides = {},
): Promise<Metadata> {
  const s = await getSiteSettings("seo");
  const base = getBaseUrl();

  const siteName = (s.seo_site_name ?? "TravelOz").trim() || "TravelOz";
  const defaultTitle =
    (s.seo_default_title ?? "").trim() ||
    `${siteName} — Diseñamos tu viaje, creamos tu historia`;
  const defaultDescription =
    (s.seo_default_description ?? "").trim() ||
    `Agencia de viajes en Uruguay.`;
  const defaultImage = (s.seo_default_og_image ?? "").trim();
  const twitterHandle = (s.seo_twitter_handle ?? "").trim();

  const routeTitle =
    route === "default" ? "" : (s[`seo_${route}_title`] ?? "").trim();
  const routeDescription =
    route === "default" ? "" : (s[`seo_${route}_description`] ?? "").trim();

  // `||` (not `??`) so empty CMS strings fall through to the default — `??`
  // would freeze an empty title as the final value.
  const title = overrides.title || routeTitle || defaultTitle;
  const description =
    overrides.description || routeDescription || defaultDescription;
  const image = overrides.image || defaultImage;

  const md: Metadata = {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(twitterHandle ? { creator: `@${twitterHandle}` } : {}),
      ...(image ? { images: [image] } : {}),
    },
    ...(overrides.noindex ? { robots: { index: false, follow: false } } : {}),
  };

  return md;
}
