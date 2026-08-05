"use client";

// Client island for the application form. Wraps useFormState + multipart
// upload to /api/upload via submitWorkWithUsForm.

import { useFormState, useFormStatus } from "react-dom";
import { submitWorkWithUsForm } from "@/actions/public-forms.actions";
import { FormSuccess } from "@/components/public/FormSuccess";
import { FileUploadField } from "@/components/public/FileUploadField";
import HoneypotField from "@/components/public/HoneypotField";

function SubmitButton() {
  const { pending } = useFormStatus();
  // Estilo (violeta, ancho completo) viene de `.work-with-us form button` en
  // site.css, igual que la referencia. Acá solo el feedback de "enviando".
  return (
    <button
      type="submit"
      className="contact-btn"
      disabled={pending}
      style={{ cursor: pending ? "wait" : "pointer", opacity: pending ? 0.7 : 1 }}
    >
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function WorkForm() {
  const [result, formAction] = useFormState(submitWorkWithUsForm, null);

  if (result?.ok) {
    return (
      <FormSuccess
        variant="onLight"
        title="¡Postulación enviada!"
        text="Gracias por tu interés en trabajar con nosotros. Vamos a revisar tu CV y te contactamos si avanzamos con tu perfil."
      />
    );
  }

  return (
    <form action={formAction} encType="multipart/form-data">
      <HoneypotField />
      {/* El aviso de error va ARRIBA del formulario, no abajo del boton: el
          form es largo y en el celular el mensaje quedaba fuera de pantalla,
          asi que el visitante creia que no habia pasado nada (lo reporto el
          cliente cuando le corto el limite de envios). */}
      {result && !result.ok && (
        <p
          role="alert"
          style={{
            color: "#c0392b",
            background: "#fdecea",
            border: "1px solid #f5c6c2",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 18,
          }}
        >
          {result.message}
        </p>
      )}
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
        <li className="col-sm-12 field-grow">
          <label htmlFor="msg">Mensaje</label>
          <textarea
            id="msg"
            name="motivacion"
            placeholder="¿Qué te motiva a trabajar en Traveloz? *"
            required
          />
        </li>
        <li className="col-sm-12">
          <FileUploadField name="cv" required />
        </li>
      </ul>
      <div className="text-start mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
