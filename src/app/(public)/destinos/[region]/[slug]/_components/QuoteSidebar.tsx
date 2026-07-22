"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitQuoteForm } from "@/actions/public-forms.actions";
import { DateRangePicker } from "@/components/public/DateRangePicker";
import { PassengerCounter } from "@/components/public/PassengerCounter";
import { SelectField } from "@/components/public/SelectField";
import { FormStatus } from "@/components/public/FormStatus";
import { FormSuccess } from "@/components/public/FormSuccess";
import HoneypotField from "@/components/public/HoneypotField";

// Botón con estado pending: se deshabilita mientras se envía para que no se
// puedan disparar varios leads con clicks repetidos (bug reportado).
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btns" disabled={pending}>
      {pending ? "Enviando…" : "Enviar consulta"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// QuoteSidebar — right column form using the `sidebar-form sticky` markup
// from html_inicial/destinos-detalle.html. Includes a large-price block at
// the top, then the contact form with date picker, passenger counter and
// contact-preference select. site.css already styles `.sidebar-form ul/li`,
// `.large-price`, `.btns`, etc — we only need the right class names + tree.
// ---------------------------------------------------------------------------

const PHONE_CODES = [
  { code: "+598", flag: "🇺🇾" },
  { code: "+54", flag: "🇦🇷" },
  { code: "+55", flag: "🇧🇷" },
  { code: "+595", flag: "🇵🇾" },
  { code: "+56", flag: "🇨🇱" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+1", flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" },
];

export function QuoteSidebar({
  paqueteId,
  paqueteTitulo,
  precioDesde,
  precioDesdeMoneda,
}: {
  paqueteId: string;
  paqueteTitulo: string;
  precioDesde: number | null;
  precioDesdeMoneda: string | null;
}) {
  const [result, action] = useFormState(submitQuoteForm, null);

  // Always render the price block — the reference always shows it. When
  // precioDesde is null, fall back to a "Consultar" pill so the layout stays
  // consistent and the user is encouraged to ask for a quote.
  const hasPrice = precioDesde !== null;

  return (
    <div className="sidebar-form sticky">
      <div className="large-price">
        <div className="price-left">
          <span className="d-block title">DESDE</span>
          <span className="d-block title2">{precioDesdeMoneda ?? "USD"}</span>
        </div>
        <div className="price-right">
          <span
            className="main-price d-block"
            style={!hasPrice ? { fontSize: 38, lineHeight: 1 } : undefined}
          >
            {hasPrice ? precioDesde : "Consultar"}
          </span>
        </div>
      </div>
      <span className="d-block price-desc text-center">
        {hasPrice
          ? "Por persona en base doble"
          : "Cotización personalizada según fechas y pasajeros"}
      </span>

      {result?.ok ? (
        <FormSuccess
          variant="onLight"
          title="¡Consulta enviada!"
          text="Recibimos tu consulta. Nuestro equipo te va a contactar a la brevedad con la propuesta de tu viaje."
        />
      ) : (
        <>
      <span className="d-block form-title">Contactate con nosotros</span>

      <form action={action}>
        <HoneypotField />
        <input type="hidden" name="paqueteId" value={paqueteId} />
        <ul>
          <li>
            <label htmlFor="dateRange">Fecha de viaje*</label>
            <DateRangePicker
              nameFrom="fechaDesde"
              nameTo="fechaHasta"
              placeholder="Fecha de viaje"
            />
          </li>
          <li>
            <label>Pasajeros*</label>
            {/* Default 2 adultos: el precio se muestra "por persona en base
                doble", así que la consulta parte de una pareja. */}
            <PassengerCounter initial={{ adultos: 2, ninos: 0, infantes: 0 }} />
          </li>
          <li>
            <label htmlFor="quote-nombre">Nombre*</label>
            <input
              type="text"
              id="quote-nombre"
              name="nombre"
              placeholder="Nombre completo *"
              required
            />
          </li>
          <li>
            <label htmlFor="quote-pref">Preferencia de contacto</label>
            <SelectField
              id="quote-pref"
              name="preferencia"
              placeholder="Preferencia de contacto"
              options={[
                { value: "LLAMADA", label: "Llamada telefónica" },
                { value: "EMAIL", label: "E-mail" },
                { value: "WHATSAPP", label: "WhatsApp" },
              ]}
            />
          </li>
          <li>
            <label htmlFor="quote-email">E-mail*</label>
            <input
              type="email"
              id="quote-email"
              name="email"
              placeholder="Tu Email *"
              required
            />
          </li>
          <li>
            <label htmlFor="quote-telefono">Teléfono*</label>
            <div className="phone-field">
              <select name="telefonoCodigo" defaultValue="+598">
                {PHONE_CODES.map((p) => (
                  <option value={p.code} key={p.code}>
                    {p.code} {p.flag}
                  </option>
                ))}
              </select>
              <input
                type="text"
                id="quote-telefono"
                name="telefono"
                placeholder="Teléfono"
              />
            </div>
          </li>
          <li className="field-grow">
            <label htmlFor="quote-coment">Comentarios</label>
            <textarea
              id="quote-coment"
              name="comentarios"
              placeholder="Indicanos qué hotel preferís, flexibilidad de fechas, adicionales, etc."
            />
          </li>
        </ul>
        <div className="text-center">
          <SubmitButton />
        </div>
        {result && !result.ok && <FormStatus result={result} />}
      </form>
        </>
      )}
    </div>
  );
}
