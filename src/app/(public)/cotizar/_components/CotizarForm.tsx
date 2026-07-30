"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { submitQuoteForm } from "@/actions/public-forms.actions";
import { DateRangePicker } from "@/components/public/DateRangePicker";
import { PassengerCounter } from "@/components/public/PassengerCounter";
import { SelectField } from "@/components/public/SelectField";
import { FormStatus } from "@/components/public/FormStatus";
import HoneypotField from "@/components/public/HoneypotField";

// --- Botón de envío con estado pending (mismo patrón que ContactForm /
// CorporativoView). Hereda el look píldora blanca de `.contact-btn`.
// `done` lo deja bloqueado entre el ok del action y la navegación a /gracias,
// para que no rebote a "Enviar consulta" habilitado por un instante.
function SubmitButton({ done }: { done: boolean }) {
  const { pending } = useFormStatus();
  const busy = pending || done;
  return (
    <button type="submit" className="contact-btn" disabled={busy}>
      {busy ? "Enviando…" : "Enviar consulta"}
    </button>
  );
}

export function CotizarForm() {
  const router = useRouter();
  const [result, action] = useFormState(submitQuoteForm, null);

  // --- Éxito: navegamos a /gracias, la página de conversión que el cliente
  // mide en GTM. Los errores se siguen mostrando inline (FormStatus).
  useEffect(() => {
    if (result?.ok) router.push("/gracias?form=cotizar");
  }, [result, router]);

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
            autoComplete="name"
            required
          />
        </li>
        {/* Igual que el form del detalle de paquete: el obligatorio es el
            teléfono y el email pasa a opcional (pedido del cliente). */}
        <li className="col-sm-12">
          <label htmlFor="q_email">Email</label>
          <input
            type="email"
            id="q_email"
            name="email"
            placeholder="Email"
            autoComplete="email"
          />
        </li>
        <li className="col-sm-12">
          <label htmlFor="q_phone">Teléfono</label>
          {/* type/inputMode "tel" → teclado numérico del celular, no QWERTY. */}
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            id="q_phone"
            name="telefono"
            placeholder="Teléfono *"
            required
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
        <SubmitButton done={result?.ok === true} />
      </div>
      {result && !result.ok && <FormStatus result={result} />}
    </form>
  );
}
