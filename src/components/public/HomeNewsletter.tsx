"use client";

import { useFormState } from "react-dom";
import { submitNewsletterForm } from "@/actions/public-forms.actions";
import { FormStatus } from "./FormStatus";
import HoneypotField from "./HoneypotField";

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
  const [result, action] = useFormState(submitNewsletterForm, null);
  const bg = bgImage?.trim() || "/site/img/cta-bg.webp";
  const icon = iconImage?.trim() || "/site/img/newsletter-icon.svg";
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
          <form action={action}>
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
            />
            <button type="submit">{button}</button>
          </form>
          <FormStatus result={result} />
        </div>
      </div>
    </section>
  );
}
