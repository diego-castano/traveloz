"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { submitContactForm } from "@/actions/public-forms.actions";
import HoneypotField from "@/components/public/HoneypotField";

// `done` mantiene el botón bloqueado entre el ok del action y la navegación a
// /gracias: si no, vuelve a "Enviar" habilitado por un instante y se puede
// mandar el lead dos veces.
function SubmitButton({ done }: { done: boolean }) {
  const { pending } = useFormStatus();
  const busy = pending || done;
  return (
    <button type="submit" className="contact-btn" disabled={busy}>
      {busy ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function ContactForm() {
  const router = useRouter();
  const [result, formAction] = useFormState(submitContactForm, null);

  // Envío exitoso → página de conversión dedicada (el cliente mide el pageview
  // en GTM). Los errores siguen mostrándose inline, sin navegar.
  useEffect(() => {
    if (result?.ok) router.push("/gracias?form=contacto");
  }, [result, router]);

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
        <SubmitButton done={result?.ok === true} />
      </div>
      {result && !result.ok && (
        <p style={{ color: "#ffb8bf", marginTop: 15 }} className="text-center" role="alert">
          {result.message}
        </p>
      )}
    </form>
  );
}
