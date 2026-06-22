// ---------------------------------------------------------------------------
// Floating WhatsApp button -- ports <a class="footer-whatsapp"> from the HTML.
// Server component: reads the WhatsApp link from SiteSettings group=general
// so the operator can change it from /backend/web/general without a redeploy.
//
// Accepts three input shapes so the operator can paste whatever the WhatsApp
// share dialog gave them:
//   • Full URL ("https://wa.me/..." or "https://wa.link/...")  → used as-is
//   • Raw number with formatting ("+598 96 992 288")           → wa.me/digits
//   • Bare digits ("59896992288")                              → wa.me/digits
// ---------------------------------------------------------------------------

import { getSiteSettings } from "@/lib/public-data";
import "./WhatsAppButton.css";

function resolveWhatsAppHref(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export async function WhatsAppButton() {
  const settings = await getSiteSettings("general");
  // Hide the button entirely when no link is configured rather than
  // shipping a broken `wa.me/`.
  const href = resolveWhatsAppHref(settings.general_whatsapp ?? "");
  if (!href) return null;

  return (
    <a
      className="footer-whatsapp"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
    >
      <img src="/site/img/whatsapp.webp" alt="WhatsApp" loading="lazy" decoding="async" />
    </a>
  );
}
