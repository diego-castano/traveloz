"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitContactForm } from "@/actions/public-forms.actions";
import { FormStatus } from "@/components/public/FormStatus";
import HoneypotField from "@/components/public/HoneypotField";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="contact-btn" disabled={pending}>
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function ContactForm() {
  const [result, formAction] = useFormState(submitContactForm, null);
  return (
    <form id="contact-form" action={formAction}>
      <HoneypotField />
      <ul className="row">
        <li className="col-sm-12">
          <label htmlFor="f_name">Nombre Completo</label>
          <input
            type="text"
            id="f_name"
            name="nombre"
            placeholder="Nombre completo *"
            required
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="phn">Teléfono</label>
          <input
            type="text"
            id="phn"
            name="telefono"
            placeholder="Teléfono *"
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email *"
            required
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="msg">Comentarios</label>
          <textarea id="msg" name="comentarios" placeholder="Comentarios" />
        </li>
      </ul>
      <div className="text-center">
        <SubmitButton />
      </div>
      <FormStatus result={result} />
    </form>
  );
}
