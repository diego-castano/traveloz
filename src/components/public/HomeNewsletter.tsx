"use client";

import { useState, useTransition } from "react";
import { submitNewsletterForm } from "@/actions/public-forms.actions";
import { FormStatus } from "./FormStatus";
import HoneypotField from "./HoneypotField";

// Lee un param de la URL (?utm_source=…). Trim + cap a 255 chars para
// no guardar strings patológicos. Si no existe o falla el parse, null.
function readUtm(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = new URL(window.location.href).searchParams.get(name);
    if (!v) return null;
    const t = v.trim();
    return t ? t.slice(0, 255) : null;
  } catch {
    return null;
  }
}

export function HomeNewsletter({
  label,
  button,
  bgImage,
  iconImage,
}: {
  label: string;
  button: string;
  /** Background image of the newsletter band — SiteSetting home_newsletter_bg. */
  bgImage?: string;
  /** Icon shown inside the email input — SiteSetting home_newsletter_icon. */
  iconImage?: string;
}) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const bg = bgImage?.trim() || "/site/img/cta-bg.webp";
  const icon = iconImage?.trim() || "/site/img/newsletter-icon.svg";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // LGPD / GDPR: adjuntamos la metadata de consentimiento al submit.
    // Los headers HTTP no son accesibles desde server actions de Next 14
    // (la request al action no trae referer/UA), asi que los capturamos
    // en el cliente y los pasamos por FormData.
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent || "";
      fd.set("_consentUserAgent", ua.slice(0, 500));
      fd.set("_consentUrl", window.location.href.slice(0, 1000));
      fd.set("_utmSource", readUtm("utm_source") ?? "");
      fd.set("_utmMedium", readUtm("utm_medium") ?? "");
      fd.set("_utmCampaign", readUtm("utm_campaign") ?? "");
      fd.set("_utmContent", readUtm("utm_content") ?? "");
      fd.set("_utmTerm", readUtm("utm_term") ?? "");
    }

    startTransition(async () => {
      const r = await submitNewsletterForm(null, fd);
      setResult(r);
    });
  };

  return (
    <section className="content-area relative cta-area">
      <img
        className="footer-cta-bg"
        src={bg}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="container z-99">
        <div className="site-form style1">
          <form onSubmit={onSubmit}>
            <HoneypotField />
            <label htmlFor="newsletter-email">
              <img src={icon} alt="" loading="lazy" decoding="async" />
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              placeholder={label}
              required
              disabled={isPending}
            />
            <button type="submit" disabled={isPending}>
              {isPending ? "..." : button}
            </button>
          </form>
          <FormStatus result={result} />
        </div>
      </div>
    </section>
  );
}
