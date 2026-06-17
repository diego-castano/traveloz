// ---------------------------------------------------------------------------
// Footer del landing de cotizador — versión solo-contacto del footer de TravelOz.
// Sin navegación ni links externos: únicamente datos de contacto (dirección,
// email, teléfono, horario, WhatsApp) leídos de SiteSettings. El visitante no
// puede salir a otra parte del sitio.
// ---------------------------------------------------------------------------

import { MapPin, Mail, Phone, Clock, MessageCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/public-data";

export async function LandingFooter() {
  const general = await getSiteSettings("general");
  const footer = await getSiteSettings("footer");

  const address = general.general_address?.trim();
  const email = general.general_email?.trim();
  const phone = general.general_phone?.trim();
  const hours = general.general_hours?.trim();
  const whatsapp = general.general_whatsapp?.trim();
  const copyright =
    footer.footer_copyright?.trim() ||
    `© ${new Date().getFullYear()} TravelOz. Todos los derechos reservados.`;

  const items = [
    address && { icon: MapPin, text: address, href: undefined },
    email && { icon: Mail, text: email, href: `mailto:${email}` },
    phone && { icon: Phone, text: phone, href: `tel:${phone.replace(/\s/g, "")}` },
    whatsapp && {
      icon: MessageCircle,
      text: "WhatsApp",
      href: whatsapp.startsWith("http")
        ? whatsapp
        : `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`,
    },
    hours && { icon: Clock, text: hours, href: undefined },
  ].filter(Boolean) as { icon: typeof MapPin; text: string; href?: string }[];

  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Contacto
        </p>
        <ul className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
          {items.map((it, i) => {
            const Icon = it.icon;
            const inner = (
              <span className="inline-flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
                <span>{it.text}</span>
              </span>
            );
            return (
              <li key={i}>
                {it.href ? (
                  <a
                    href={it.href}
                    target={it.href.startsWith("http") ? "_blank" : undefined}
                    rel={it.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="transition hover:text-white"
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-center text-xs text-neutral-500">{copyright}</p>
      </div>
    </footer>
  );
}
