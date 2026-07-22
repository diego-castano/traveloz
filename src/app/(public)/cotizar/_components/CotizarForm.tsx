"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitQuoteForm } from "@/actions/public-forms.actions";
import { DateRangePicker } from "@/components/public/DateRangePicker";
import { PassengerCounter } from "@/components/public/PassengerCounter";
import { SelectField } from "@/components/public/SelectField";
import { FormStatus } from "@/components/public/FormStatus";
import { FormSuccess } from "@/components/public/FormSuccess";
import HoneypotField from "@/components/public/HoneypotField";

// --- Botón de envío con estado pending (mismo patrón que ContactForm /
// CorporativoView). Hereda el look píldora blanca de `.contact-btn`.
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="contact-btn" disabled={pending}>
      {pending ? "Enviando…" : "Enviar consulta"}
    </button>
  );
}

export function CotizarForm() {
  const [result, action] = useFormState(submitQuoteForm, null);

  // --- Éxito: reemplazamos el formulario por una tarjeta de confirmación
  // animada (check + copy), en vez de dejar el form relleno con un mensajito
  // abajo (confundía al cliente). Mantiene el branding del degradado violeta
  // con texto blanco. Ver `.quote-success` en site.css.
  if (result?.ok) {
    return (
      <FormSuccess
        variant="onGradient"
        title="¡Consulta enviada!"
        text="Gracias por escribirnos. Nuestro equipo te va a contactar a la brevedad, en menos de 24 horas, con tu propuesta de viaje."
      />
    );
  }

  // --- Sin tarjeta blanca ni estilos inline: el form vive dentro de
  // `.contact-form-wrapper` (page.tsx) y hereda los inputs translúcidos con
  // borde blanco del diseño aprobado. Los pickers usan variant="onGradient"
  // para acompañar ese tema.
  return (
    <form action={action}>
      <HoneypotField />
      <ul className="row">
        <li className="col-sm-12">
          <label htmlFor="q_destino">Ciudad de destino</label>
          <input
            type="text"
            id="q_destino"
            name="destino"
            placeholder="¿A dónde querés ir? *"
            required
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="q_dates">Fechas</label>
          <DateRangePicker
            nameFrom="fechaDesde"
            nameTo="fechaHasta"
            placeholder="Fechas del viaje"
            variant="onGradient"
          />
        </li>
        <li className="col-sm-12">
          <label>Pasajeros</label>
          <PassengerCounter variant="onGradient" />
        </li>
        <li className="col-sm-12">
          <label htmlFor="q_name">Nombre completo</label>
          <input
            type="text"
            id="q_name"
            name="nombre"
            placeholder="Nombre completo *"
            required
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="q_email">Email</label>
          <input
            type="email"
            id="q_email"
            name="email"
            placeholder="Email *"
            required
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="q_phone">Teléfono</label>
          <input
            type="text"
            id="q_phone"
            name="telefono"
            placeholder="Teléfono"
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="q_pref">Preferencia de contacto</label>
          <SelectField
            id="q_pref"
            name="preferencia"
            placeholder="Preferencia de contacto"
            variant="onGradient"
            options={[
              { value: "LLAMADA", label: "Llamada" },
              { value: "EMAIL", label: "Email" },
              { value: "WHATSAPP", label: "WhatsApp" },
            ]}
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="q_obs">Comentarios</label>
          <textarea
            id="q_obs"
            name="comentarios"
            placeholder="Contanos más sobre tu viaje (presupuesto, intereses, fechas flexibles…)"
          />
        </li>
      </ul>
      <div className="text-center">
        <SubmitButton />
      </div>
      <FormStatus result={result} />
    </form>
  );
}
