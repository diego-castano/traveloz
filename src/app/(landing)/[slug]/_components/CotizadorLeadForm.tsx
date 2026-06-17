"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { submitCotizadorLead, type FormResult } from "@/actions/cotizador.actions";

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-neutral-700">{children}</label>;
}

function Stepper({
  label,
  name,
  value,
  setValue,
  min = 0,
  color,
}: {
  label: string;
  name: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-300 px-3 py-2">
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setValue(Math.max(min, value - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition hover:border-neutral-500 disabled:opacity-40"
          disabled={value <= min}
          aria-label={`Menos ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums" style={{ color }}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => setValue(Math.min(20, value + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition hover:border-neutral-500"
          aria-label={`Más ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
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
      className="mt-1 w-full rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
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
  const [infantes, setInfantes] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setAdultos(2);
      setNinos(0);
      setInfantes(0);
    }
  }, [state]);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-800">{state.message}</p>
        <p className="mt-1 text-sm text-emerald-700">Te vamos a contactar a la brevedad.</p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Desde</Label>
          <input type="date" name="fechaDesde" className={inputClass} />
        </div>
        <div>
          <Label>Hasta</Label>
          <input type="date" name="fechaHasta" className={inputClass} />
        </div>
      </div>

      <div>
        <Label>Pasajeros</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stepper label="Adultos" name="adultos" value={adultos} setValue={setAdultos} min={1} color={color} />
          <Stepper label="Niños" name="ninos" value={ninos} setValue={setNinos} color={color} />
          <Stepper label="Infantes" name="infantes" value={infantes} setValue={setInfantes} color={color} />
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Teléfono</Label>
          <div className="flex gap-2">
            <input name="paisCodigo" placeholder="+598" maxLength={6} className={`${inputClass} w-24`} />
            <input name="telefono" maxLength={50} className={`${inputClass} flex-1`} />
          </div>
        </div>
        <div>
          <Label>Preferencia de contacto</Label>
          <select name="preferencia" defaultValue="" className={inputClass}>
            <option value="">Sin preferencia</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="LLAMADA">Llamada</option>
            <option value="EMAIL">Email</option>
          </select>
        </div>
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
    </form>
  );
}
