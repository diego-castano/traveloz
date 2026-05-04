"use client";

import { useFormState } from "react-dom";
import { submitQuoteForm } from "@/actions/public-forms.actions";
import { DateRangePicker } from "@/components/public/DateRangePicker";
import { PassengerCounter } from "@/components/public/PassengerCounter";
import { FormStatus } from "@/components/public/FormStatus";

export function QuoteSidebar({
  paqueteId,
  paqueteTitulo,
}: {
  paqueteId: string;
  paqueteTitulo: string;
}) {
  const [result, action] = useFormState(submitQuoteForm, null);
  return (
    <aside
      className="quote-sidebar"
      style={{
        position: "sticky",
        top: 100,
        background: "#fff",
        padding: 24,
        borderRadius: 8,
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
      }}
    >
      <h3 style={{ fontSize: 20, marginBottom: 6 }}>Contactate con nosotros</h3>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Cotización personalizada para{" "}
        <strong>{paqueteTitulo}</strong>
      </p>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="hidden" name="paqueteId" value={paqueteId} />
        <DateRangePicker
          nameFrom="fechaDesde"
          nameTo="fechaHasta"
          placeholder="Fechas del viaje"
        />
        <PassengerCounter />
        <input
          name="nombre"
          placeholder="Nombre *"
          required
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email *"
          required
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
        />
        <input
          name="telefono"
          placeholder="Teléfono"
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
        />
        <select
          name="preferencia"
          defaultValue=""
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
        >
          <option value="">Preferencia de contacto</option>
          <option value="LLAMADA">Llamada</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        <textarea
          name="comentarios"
          placeholder="Comentarios"
          rows={3}
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
        />
        <button type="submit" className="hero-btn" style={{ marginTop: 8 }}>
          Enviar consulta
        </button>
        <FormStatus result={result} />
      </form>
    </aside>
  );
}
