"use client";

// Client island for the application form. Wraps useFormState + multipart
// upload to /api/upload via submitWorkWithUsForm.

import { useFormState, useFormStatus } from "react-dom";
import { submitWorkWithUsForm } from "@/actions/public-forms.actions";
import { FormStatus } from "@/components/public/FormStatus";
import { FileUploadField } from "@/components/public/FileUploadField";
import HoneypotField from "@/components/public/HoneypotField";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%",
        padding: "12px 28px",
        borderRadius: 30,
        background: "#F43E55",
        color: "#fff",
        fontSize: 16,
        fontWeight: 600,
        border: "none",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function WorkForm() {
  const [result, formAction] = useFormState(submitWorkWithUsForm, null);

  return (
    <form action={formAction} encType="multipart/form-data">
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
      <FormStatus result={result} />
    </form>
  );
}
