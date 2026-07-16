// ---------------------------------------------------------------------------
// Media-hints registry — per SiteSetting key, the dimensions / weight the
// public site expects. Used by MediaPicker to:
//   • show the admin the recommended target before they upload
//   • warn (non-blocking) if the upload doesn't match
// Add new keys as you go — missing keys fall back to the generic accept-string
// hint baked into MediaPicker.
// ---------------------------------------------------------------------------

export type MediaHint = {
  /** Display label, e.g. "1920×1080 (landscape)" */
  label: string;
  /** Width × height pair for the strict-match warning */
  width?: number;
  height?: number;
  /** Tolerance: how many px the upload can deviate before warning (default 64) */
  tolerance?: number;
  /** Max recommended weight in KB (warning only) */
  maxKB?: number;
  /** Free-form usage note shown under the field */
  usage?: string;
};

export const MEDIA_HINTS: Record<string, MediaHint> = {
  // ─── Home ────────────────────────────────────────────────────────────
  home_hero_video: {
    label: "Video hero · 1920×1080 · MP4 H.264, ≤ 8 MB",
    maxKB: 8000,
    usage: "Loop silencioso de fondo; el alto del hero es 100vh.",
  },
  home_newsletter_bg: {
    label: "Fondo newsletter · 1920×400 · WebP/JPG",
    width: 1920,
    height: 400,
    tolerance: 200,
    maxKB: 400,
    usage: "Banda inferior, full-width, debajo de testimonios.",
  },
  home_newsletter_icon: {
    label: "Icono newsletter · 24×24 · SVG (preferido) o PNG transparente",
    width: 24,
    height: 24,
    tolerance: 16,
    maxKB: 30,
  },

  // ─── Header / Footer / global ────────────────────────────────────────
  header_logo: {
    label: "Logo header · ~180×60 · PNG/WebP transparente",
    width: 180,
    height: 60,
    tolerance: 40,
    maxKB: 100,
  },
  footer_logo: {
    label: "Logo footer · ~180×60 · PNG/WebP transparente",
    width: 180,
    height: 60,
    tolerance: 40,
    maxKB: 100,
  },
  agencia_certificado_url: {
    label: "Certificado agencia · cualquier ratio · WebP/JPG/PDF-rendered",
    maxKB: 500,
  },

  // ─── Nosotros (/about) ───────────────────────────────────────────────
  nosotros_imagen: {
    label: "Foto equipo principal · 1200×800 (3:2) · WebP/JPG",
    width: 1200,
    height: 800,
    tolerance: 200,
    maxKB: 600,
  },
  nosotros_imagen2: {
    label: "Foto equipo secundaria · 1200×800 (3:2) · WebP/JPG",
    width: 1200,
    height: 800,
    tolerance: 200,
    maxKB: 600,
  },

  // ─── Corporativo ─────────────────────────────────────────────────────
  corporativo_hero_video: {
    label: "Video hero corporativo · 1920×1080 · MP4 H.264, ≤ 8 MB",
    maxKB: 8000,
  },
  corporativo_valores_icon_1: {
    label: "Icono card 1 · 64×64 · PNG/WebP transparente o SVG",
    width: 64,
    height: 64,
    tolerance: 24,
    maxKB: 40,
  },
  corporativo_valores_icon_2: {
    label: "Icono card 2 · 64×64 · PNG/WebP transparente o SVG",
    width: 64,
    height: 64,
    tolerance: 24,
    maxKB: 40,
  },
  corporativo_valores_icon_3: {
    label: "Icono card 3 · 64×64 · PNG/WebP transparente o SVG",
    width: 64,
    height: 64,
    tolerance: 24,
    maxKB: 40,
  },

  // ─── FAQ / Terms banners ─────────────────────────────────────────────
  faq_banner_desktop: {
    label: "Banner FAQ desktop · 1920×400 · WebP/JPG",
    width: 1920,
    height: 400,
    tolerance: 200,
    maxKB: 400,
  },
  faq_banner_mobile: {
    label: "Banner FAQ mobile · 750×500 · WebP/JPG",
    width: 750,
    height: 500,
    tolerance: 150,
    maxKB: 250,
  },
  terms_banner_desktop: {
    label: "Banner Términos desktop · 1920×400 · WebP/JPG",
    width: 1920,
    height: 400,
    tolerance: 200,
    maxKB: 400,
  },
  terms_banner_mobile: {
    label: "Banner Términos mobile · 750×500 · WebP/JPG",
    width: 750,
    height: 500,
    tolerance: 150,
    maxKB: 250,
  },

  // ─── Cotizar — cards "¿Por qué elegirnos?" ───────────────────────────
  cotizar_porque_card_1_icon: {
    label: "Icono card 1 · 64×64 · PNG/WebP transparente o SVG",
    width: 64,
    height: 64,
    tolerance: 24,
    maxKB: 40,
  },
  cotizar_porque_card_2_icon: {
    label: "Icono card 2 · 64×64 · PNG/WebP transparente o SVG",
    width: 64,
    height: 64,
    tolerance: 24,
    maxKB: 40,
  },
  cotizar_porque_card_3_icon: {
    label: "Icono card 3 · 64×64 · PNG/WebP transparente o SVG",
    width: 64,
    height: 64,
    tolerance: 24,
    maxKB: 40,
  },

  // ─── Work With Us ────────────────────────────────────────────────────
  workwithus_imagen: {
    label: "Imagen lateral · 800×900 (3:4) · WebP/JPG",
    width: 800,
    height: 900,
    tolerance: 150,
    maxKB: 500,
  },
  workwithus_video_url: {
    label: "Video lateral · 1080×1350 (4:5) · MP4 H.264, ≤ 15 MB",
    maxKB: 15360,
    usage:
      "Loop silencioso con autoplay. Si está vacío, se muestra la imagen lateral. Encodear liviano (≤ 1 Mbps, sin audio) para que cargue rápido.",
  },
  workwithus_video_poster: {
    label: "Poster del video · 810×1012 (4:5) · WebP/JPG liviano",
    width: 810,
    height: 1012,
    tolerance: 300,
    maxKB: 120,
    usage:
      "Primer frame del video: se muestra al instante mientras el video buffea. Si está vacío, se muestra un spinner.",
  },
};

/** Convenience helper: returns the hint for a key or null. */
export function getMediaHint(key?: string): MediaHint | null {
  if (!key) return null;
  return MEDIA_HINTS[key] ?? null;
}
