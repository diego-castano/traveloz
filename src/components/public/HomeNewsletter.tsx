"use client";

import { useFormState } from "react-dom";
import { submitNewsletterForm } from "@/actions/public-forms.actions";
import { FormStatus } from "./FormStatus";

export function HomeNewsletter({
  label,
  button,
}: {
  label: string;
  button: string;
}) {
  const [result, action] = useFormState(submitNewsletterForm, null);
  return (
    <section className="content-area relative cta-area">
      <img
        className="footer-cta-bg"
        src="/site/img/cta-bg.webp"
        alt=""
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="container z-99">
        <div className="site-form style1">
          <form action={action}>
            <label htmlFor="newsletter-email">
              <img src="/site/img/newsletter-icon.svg" alt="" />
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
