"use client";

import { useFormState } from "react-dom";
import { submitQuoteForm } from "@/actions/public-forms.actions";
import { DateRangePicker } from "@/components/public/DateRangePicker";
import { PassengerCounter } from "@/components/public/PassengerCounter";
import { FormStatus } from "@/components/public/FormStatus";
import HoneypotField from "@/components/public/HoneypotField";

export function CotizarForm() {
  const [result, action] = useFormState(submitQuoteForm, null);
  return (
    <div
      style={{
        background: "#fff",
        padding: 32,
        borderRadius: 8,
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
      }}
    >
      <form
        action={action}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <HoneypotField />
        <input
          name="destino"
          placeholder="¿A dónde querés ir? *"
          required
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <DateRangePicker
          nameFrom="fechaDesde"
          nameTo="fechaHasta"
          placeholder="Fechas del viaje"
        />
        <PassengerCounter />
        <input
          name="nombre"
          placeholder="Nombre completo *"
          required
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email *"
          required
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <input
          name="telefono"
          placeholder="Teléfono"
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <select
          name="preferencia"
          defaultValue=""
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          <option value="">Preferencia de contacto</option>
          <option value="LLAMADA">Llamada</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        <textarea
          name="comentarios"
          placeholder="Contanos más sobre tu viaje (presupuesto, intereses, fechas flexibles…)"
          rows={4}
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          style={{
            marginTop: 8,
            padding: "12px 28px",
            borderRadius: 50,
            background: "#F43E55",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Enviar consulta
        </button>
        <FormStatus result={result} />
      </form>
    </div>
  );
}
