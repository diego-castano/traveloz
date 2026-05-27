// ---------------------------------------------------------------------------
// Home (/) — server component, reads SiteSettings + CategoriasDestacadas +
// Testimonios from Prisma via the cached public-data helpers. Each section
// is editable from /backend/web/*.
// ---------------------------------------------------------------------------

import {
  getSiteSettings,
  getCategoriasDestacadas,
  getTestimoniosPublicados,
} from "@/lib/public-data";
import { HomeHero } from "@/components/public/HomeHero";
import { HomeCategorias } from "@/components/public/HomeCategorias";
import { HomeTestimonios } from "@/components/public/HomeTestimonios";
import { HomeNewsletter } from "@/components/public/HomeNewsletter";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata("home");
}

export default async function HomePage() {
  const [settings, categorias, testimonios] = await Promise.all([
    getSiteSettings("home"),
    getCategoriasDestacadas(),
    getTestimoniosPublicados(),
  ]);

  return (
    <>
      <HomeHero
        title={
          settings.home_hero_title ?? "Diseñamos tu viaje, creamos tu historia."
        }
        subtitle={
          settings.home_hero_subtitle ??
          "Experiencias únicas hechas a tu medida."
        }
        ctaText={settings.home_hero_cta_text ?? "Ver más"}
        ctaLink={settings.home_hero_cta_link ?? "/destinos"}
        videoUrl={
          settings.home_hero_video ??
          "/site/video/video-banner-traveloz.mp4"
        }
      />
      <HomeCategorias
        items={categorias}
        title={settings.home_categorias_title}
      />
      <HomeTestimonios
        title={
          settings.home_testimonios_title ?? "Relatos de nuestros viajeros"
        }
        items={testimonios}
      />
      <HomeNewsletter
        label={settings.home_newsletter_label ?? "Unite al newsletter"}
        button={settings.home_newsletter_button ?? "Suscribirse"}
        bgImage={settings.home_newsletter_bg}
        iconImage={settings.home_newsletter_icon}
      />
    </>
  );
}
