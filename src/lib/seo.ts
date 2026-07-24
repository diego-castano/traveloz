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
  /**
   * Canonical path for this route (e.g. "/destinos" or
   * `/destinos/${region}/${slug}`). Relative to `metadataBase`, so pass the
   * path only — no host. Omit on noindex/404 responses. When set it also
   * anchors the Open Graph `url`.
   */
  path?: string;
};

// Defaults por ruta en código: garantizan title + description ÚNICOS y
// descriptivos en cada página estática aunque el admin no haya cargado las
// claves `seo_<ruta>_*` en /backend (group="seo"). El CMS sigue ganando: si
// una clave existe, pisa a estos valores. Tono de marca, castellano
// rioplatense, descripciones ~150 caracteres.
const ROUTE_DEFAULTS: Record<
  Exclude<SeoRouteKey, never>,
  { title?: string; description: string }
> = {
  home: {
    // title lo maneja el default global (seo_default_title) — es el mismo.
    description:
      "Agencia de viajes uruguaya. Diseñamos viajes a medida a todo el mundo: Caribe, Brasil, Europa, Estados Unidos y más. Cotizá tu próxima escapada con nosotros.",
  },
  destinos: {
    title: "Destinos | TravelOz",
    description:
      "Explorá todos los destinos de TravelOz: Caribe, Brasil, Europa, Estados Unidos, Asia y Oceanía. Encontrá el paquete ideal para tu próximo viaje.",
  },
  about: {
    title: "Nosotros | TravelOz",
    description:
      "Conocé a TravelOz: quiénes somos, cómo trabajamos y por qué diseñamos cada viaje a tu medida. Tu agencia de viajes de confianza en Uruguay.",
  },
  contact: {
    title: "Contacto | TravelOz",
    description:
      "Escribinos y conversemos sobre tu próximo viaje. El equipo de TravelOz responde tus dudas y te arma un presupuesto a medida, sin compromiso.",
  },
  corporativo: {
    title: "Viajes corporativos | TravelOz",
    description:
      "Gestión de viajes de empresa con TravelOz: vuelos, hoteles, eventos y logística para tu equipo. Un servicio corporativo pensado para simplificarte todo.",
  },
  cotizar: {
    title: "Cotizá tu viaje | TravelOz",
    description:
      "Completá el formulario y recibí tu presupuesto personalizado en menos de 24 horas. Diseñamos tu viaje a medida, sin costo de cotización.",
  },
  faq: {
    title: "Preguntas frecuentes | TravelOz",
    description:
      "Resolvé tus dudas sobre reservas, pagos, documentación y equipaje. Todo lo que necesitás saber para viajar tranquilo con TravelOz.",
  },
  terms: {
    title: "Términos y condiciones | TravelOz",
    description:
      "Términos y condiciones de compra de TravelOz: reservas, pagos, cancelaciones y políticas de nuestros paquetes y servicios de viaje.",
  },
  work: {
    title: "Trabajá con nosotros | TravelOz",
    description:
      "¿Querés sumarte a TravelOz? Conocé nuestras búsquedas y postulate. Estamos transformando la forma de viajar y queremos hacerlo con gente como vos.",
  },
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
  // Fallback en código: pieza 1200x630 con el degradado + logo de marca
  // (public/site/img/og-default.jpg). El campo seo_default_og_image del
  // admin la pisa si el equipo carga otra.
  const defaultImage =
    (s.seo_default_og_image ?? "").trim() || "/site/img/og-default.jpg";
  const twitterHandle = (s.seo_twitter_handle ?? "").trim();

  const routeDefaults = route === "default" ? undefined : ROUTE_DEFAULTS[route];
  const routeTitle =
    route === "default" ? "" : (s[`seo_${route}_title`] ?? "").trim();
  const routeDescription =
    route === "default" ? "" : (s[`seo_${route}_description`] ?? "").trim();

  // `||` (not `??`) so empty CMS strings fall through to the next fallback —
  // `??` would freeze an empty title as the final value. Prioridad:
  // override explícito → CMS (seo_<ruta>_*) → default por ruta (código) →
  // default global. Así cada página estática tiene title/description únicos
  // incluso sin datos cargados en el admin.
  const title =
    overrides.title || routeTitle || routeDefaults?.title || defaultTitle;
  const description =
    overrides.description ||
    routeDescription ||
    routeDefaults?.description ||
    defaultDescription;
  const image = overrides.image || defaultImage;

  // Canonical: relative path resolved against `metadataBase`. Skipped on
  // noindex responses (404s / gated pages) — a canonical there would tell
  // crawlers to index a page we're explicitly hiding.
  const canonicalPath =
    overrides.path && !overrides.noindex ? overrides.path : undefined;

  const md: Metadata = {
    metadataBase: new URL(base),
    title,
    description,
    ...(canonicalPath ? { alternates: { canonical: canonicalPath } } : {}),
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      ...(canonicalPath ? { url: canonicalPath } : {}),
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
