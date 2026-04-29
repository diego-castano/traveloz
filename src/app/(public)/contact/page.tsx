"use client";

// ---------------------------------------------------------------------------
// /contact (CONTACTO) -- 1:1 port of html_inicial/contact.html.
//
// Form posts to submitContactForm via React's useFormState. Stub for now;
// Fase 5 wires it to Prisma (MensajeContacto).
// ---------------------------------------------------------------------------

import { useFormState, useFormStatus } from "react-dom";
import { submitContactForm } from "@/actions/public-forms.actions";
import { FormStatus } from "@/components/public/FormStatus";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="contact-btn" disabled={pending}>
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export default function ContactPage() {
  const [result, formAction] = useFormState(submitContactForm, null);

  return (
    <section
      className="content-area contact-area gradient-page-bg"
      id="contact-box"
    >
      <div className="container">
        <div className="content-box style2 contact-form-wrapper">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-md-10 text-center mb_50">
              <h1 className="h2 text_white mb-4 section-heading">
                ¡Conversemos!
              </h1>
              <p className="sub-text text_white">
                Ideas, comentarios, preguntas... Todo lo que quieras compartir{" "}
                <br className="d-none d-md-block" />
                es bienvenido, ¡queremos escucharte!
              </p>
            </div>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-5 col-md-7">
              <form id="contact-form" action={formAction}>
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
                    <textarea
                      id="msg"
                      name="comentarios"
                      placeholder="Comentarios"
                    />
                  </li>
                </ul>
                <div className="text-center">
                  <SubmitButton />
                </div>
                <FormStatus result={result} />
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
