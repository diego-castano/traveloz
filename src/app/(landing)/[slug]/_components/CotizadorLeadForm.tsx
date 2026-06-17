"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { submitCotizadorLead, type FormResult } from "@/actions/cotizador.actions";
import { PhoneField } from "./PhoneField";
import { DateRangeField } from "./DateRangeField";

// font-size 16px (text-base): por debajo de eso iOS hace auto-zoom al enfocar.
const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-medium text-neutral-600">{children}</label>;
}

// Fila de stepper full-width (va dentro de un contenedor agrupado con divide-y).
// Full-width evita que los controles se pisen como pasaba con el grid de 3 cols.
function StepperRow({
  label,
  sublabel,
  name,
  value,
  setValue,
  min = 0,
  color,
}: {
  label: string;
  sublabel?: string;
  name: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="leading-tight">
        <div className="text-[15px] font-medium text-neutral-800">{label}</div>
        {sublabel && <div className="text-xs text-neutral-400">{sublabel}</div>}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setValue(Math.max(min, value - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition active:scale-95 hover:border-neutral-500 disabled:opacity-30"
          disabled={value <= min}
          aria-label={`Menos ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-4 text-center text-base font-semibold tabular-nums" style={{ color }}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => setValue(Math.min(20, value + 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition active:scale-95 hover:border-neutral-500"
          aria-label={`Más ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function SubmitButton({ color }: { color: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ background: color }}
      className="mt-1 w-full rounded-full px-6 py-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Solicitar cotización"}
    </button>
  );
}

export function CotizadorLeadForm({
  landingId,
  color,
}: {
  landingId: string;
  color: string;
}) {
  const action = useMemo(() => submitCotizadorLead.bind(null, landingId), [landingId]);
  const [state, formAction] = useFormState<FormResult | null, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [adultos, setAdultos] = useState(2);
  const [ninos, setNinos] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setAdultos(2);
      setNinos(0);
    }
  }, [state]);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: color }}
        >
          <Check className="h-7 w-7 text-white" />
        </div>
        <p className="text-lg font-semibold text-neutral-900">{state.message}</p>
        <p className="mt-1 text-sm text-neutral-500">Te vamos a contactar a la brevedad.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div>
        <Label>¿A dónde querés ir? *</Label>
        <input name="destino" required maxLength={200} placeholder="Ej. Caribe, Europa, Brasil…" className={inputClass} />
      </div>

      <div>
        <Label>Fechas del viaje</Label>
        <DateRangeField color={color} />
      </div>

      <div>
        <Label>Pasajeros</Label>
        <div className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-300">
          <StepperRow
            label="Adultos"
            name="adultos"
            value={adultos}
            setValue={setAdultos}
            min={1}
            color={color}
          />
          <StepperRow
            label="Niños"
            sublabel="2 a 11 años"
            name="ninos"
            value={ninos}
            setValue={setNinos}
            color={color}
          />
        </div>
      </div>

      <div className="h-px bg-neutral-100" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Nombre completo *</Label>
          <input name="nombre" required maxLength={200} className={inputClass} />
        </div>
        <div>
          <Label>Email *</Label>
          <input name="email" type="email" required maxLength={254} className={inputClass} />
        </div>
      </div>

      <div>
        <Label>Teléfono / WhatsApp</Label>
        <PhoneField />
      </div>

      <div>
        <Label>¿Cómo preferís que te contactemos?</Label>
        <select name="preferencia" defaultValue="" className={inputClass}>
          <option value="">Sin preferencia</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="LLAMADA">Llamada</option>
          <option value="EMAIL">Email</option>
        </select>
      </div>

      <div>
        <Label>Contanos más sobre tu viaje</Label>
        <textarea
          name="comentarios"
          rows={4}
          maxLength={5000}
          placeholder="Presupuesto, intereses, fechas flexibles…"
          className={inputClass}
        />
      </div>

      {state && !state.ok && (
        <p className="text-sm font-medium text-red-600">{state.message}</p>
      )}

      <SubmitButton color={color} />
      <p className="text-center text-xs text-neutral-400">
        Tus datos se usan solo para responder tu consulta.
      </p>
    </form>
  );
}
