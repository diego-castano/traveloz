// ---------------------------------------------------------------------------
// Floating WhatsApp button -- ports <a class="footer-whatsapp"> from the HTML.
// Server component: reads the WhatsApp number from SiteSettings group=general
// so the operator can change it from /backend/web/general without a redeploy.
// ---------------------------------------------------------------------------

import { getSiteSettings } from "@/lib/public-data";

// Format `+59899000000` or `59899000000` → digits only for wa.me.
function digitsOnly(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function WhatsAppButton() {
  const settings = await getSiteSettings("general");
  const rawNumber = settings.general_whatsapp?.trim() ?? "";
  // Hide the button entirely when no number is configured rather than
  // shipping a broken link that opens wa.me/0.
  if (!rawNumber) return null;
  const number = digitsOnly(rawNumber);
  if (!number) return null;

  return (
    <a
      className="footer-whatsapp"
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
    >
      <img src="/site/img/whatsapp.webp" alt="WhatsApp" />
    </a>
  );
}
