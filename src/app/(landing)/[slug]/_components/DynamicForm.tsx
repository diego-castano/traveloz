"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { submitCotizadorLead, type FormResult } from "@/actions/cotizador.actions";
import { esVisible, type FormField } from "@/lib/cotizador-form";
import { PhoneField } from "./PhoneField";
import { DateRangeField } from "./DateRangeField";

// font-size 16px (text-base): por debajo de eso iOS hace auto-zoom al enfocar.
const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";

function Label({ children, requerido }: { children: React.ReactNode; requerido?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-neutral-600">
      {children}
      {requerido && <span className="text-red-500"> *</span>}
    </label>
  );
}

function Stepper({
  value,
  setValue,
  color,
}: {
  value: number;
  setValue: (n: number) => void;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-300 px-2.5 py-2 sm:px-3">
      <button
        type="button"
        onClick={() => setValue(Math.max(0, value - 1))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition active:scale-95 hover:border-neutral-500 disabled:opacity-30"
        disabled={value <= 0}
        aria-label="Menos"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[1.25rem] text-center text-base font-semibold tabular-nums" style={{ color }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => setValue(Math.min(20, value + 1))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition active:scale-95 hover:border-neutral-500"
        aria-label="Más"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function OptionCard({
  type,
  name,
  value,
  label,
  descripcion,
  checked,
  required,
  onChange,
  color,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  descripcion?: string;
  checked: boolean;
  required?: boolean;
  onChange: () => void;
  color: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition"
      style={{
        borderColor: checked ? color : "rgb(212 212 212)",
        background: checked ? `${color}0d` : "white",
      }}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        required={required}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ accentColor: color }}
      />
      <span className="leading-snug">
        <span className="block text-[15px] text-neutral-800">{label}</span>
        {descripcion && <span className="mt-0.5 block text-xs text-neutral-500">{descripcion}</span>}
      </span>
    </label>
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

// Formulario dinámico: renderiza `campos` por tipo y resuelve la visibilidad
// condicional en el cliente. Lo usan tanto la landing pública (live) como la
// vista previa del constructor (`preview`, sin envío).
export function DynamicForm({
  campos,
  color,
  landingId,
  preview = false,
}: {
  campos: FormField[];
  color: string;
  landingId?: string;
  preview?: boolean;
}) {
  // Valor de los campos de control (selección/casilla) para evaluar mostrarSi.
  const [valores, setValores] = useState<Record<string, string>>({});
  const [multiples, setMultiples] = useState<Record<string, string[]>>({});
  const [numeros, setNumeros] = useState<Record<string, number>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const action = useMemo(
    () => submitCotizadorLead.bind(null, landingId ?? ""),
    [landingId],
  );
  const [state, formAction] = useFormState<FormResult | null, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setValores({});
      setMultiples({});
      setNumeros({});
    }
  }, [state]);

  const visible = (c: FormField) => esVisible(c, (id) => valores[id] ?? "");

  function toggleMultiple(id: string, optId: string) {
    setMultiples((m) => {
      const cur = m[id] ?? [];
      return { ...m, [id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
    });
  }

  function renderField(c: FormField) {
    switch (c.tipo) {
      case "nota":
        return (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
            {c.etiqueta && <div className="mb-1 font-medium text-neutral-800">{c.etiqueta}</div>}
            <div className="whitespace-pre-line">{c.contenido}</div>
          </div>
        );
      case "parrafo":
        return (
          <div>
            <Label requerido={c.requerido}>{c.etiqueta}</Label>
            <textarea
              name={c.id}
              rows={4}
              required={c.requerido}
              maxLength={5000}
              placeholder={c.placeholder}
              className={inputClass}
            />
            {c.ayuda && <p className="mt-1 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
      case "numero":
        return (
          <div>
            <Label requerido={c.requerido}>{c.etiqueta}</Label>
            <Stepper
              value={numeros[c.id] ?? 0}
              setValue={(n) => setNumeros((m) => ({ ...m, [c.id]: n }))}
              color={color}
            />
            <input type="hidden" name={c.id} value={numeros[c.id] ?? 0} />
            {c.ayuda && <p className="mt-1 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
      case "telefono":
        return (
          <div>
            <Label requerido={c.requerido}>{c.etiqueta}</Label>
            <PhoneField name={c.id} />
            {c.ayuda && <p className="mt-1 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
      case "rango_fechas":
        return (
          <div>
            <Label requerido={c.requerido}>{c.etiqueta}</Label>
            <DateRangeField name={c.id} color={color} />
            {c.ayuda && <p className="mt-1 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
      case "seleccion":
        return (
          <div>
            <Label requerido={c.requerido}>{c.etiqueta}</Label>
            <div className="space-y-2">
              {(c.opciones ?? []).map((o) => (
                <OptionCard
                  key={o.id}
                  type="radio"
                  name={c.id}
                  value={o.id}
                  label={o.label}
                  descripcion={o.descripcion}
                  checked={(valores[c.id] ?? "") === o.id}
                  required={c.requerido}
                  onChange={() => setValores((v) => ({ ...v, [c.id]: o.id }))}
                  color={color}
                />
              ))}
            </div>
            {c.ayuda && <p className="mt-1 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
      case "multiple":
        return (
          <div>
            <Label requerido={c.requerido}>{c.etiqueta}</Label>
            <div className="space-y-2">
              {(c.opciones ?? []).map((o) => (
                <OptionCard
                  key={o.id}
                  type="checkbox"
                  name={c.id}
                  value={o.id}
                  label={o.label}
                  descripcion={o.descripcion}
                  checked={(multiples[c.id] ?? []).includes(o.id)}
                  onChange={() => toggleMultiple(c.id, o.id)}
                  color={color}
                />
              ))}
            </div>
            {c.ayuda && <p className="mt-1 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
      case "casilla":
        return (
          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name={c.id}
                value="si"
                required={c.requerido}
                checked={(valores[c.id] ?? "") === "si"}
                onChange={(e) => setValores((v) => ({ ...v, [c.id]: e.target.checked ? "si" : "" }))}
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: color }}
              />
              <span className="text-[15px] leading-snug text-neutral-700">{c.etiqueta}</span>
            </label>
            {c.ayuda && <p className="mt-1 pl-7 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
      default:
        // texto, email
        return (
          <div>
            <Label requerido={c.requerido}>{c.etiqueta}</Label>
            <input
              name={c.id}
              type={c.tipo === "email" ? "email" : "text"}
              required={c.requerido}
              maxLength={5000}
              placeholder={c.placeholder}
              className={inputClass}
            />
            {c.ayuda && <p className="mt-1 text-xs text-neutral-400">{c.ayuda}</p>}
          </div>
        );
    }
  }

  // Agrupa campos de número consecutivos en una fila de 2 columnas: un número
  // suelto no debe ocupar el 100% del ancho (adultos/niños quedan 50/50).
  const visibles = campos.filter(visible);
  const filas: JSX.Element[] = [];
  for (let i = 0; i < visibles.length; ) {
    const c = visibles[i];
    if (c.tipo === "numero") {
      const grupo: FormField[] = [];
      while (i < visibles.length && visibles[i].tipo === "numero") {
        grupo.push(visibles[i]);
        i++;
      }
      filas.push(
        <div key={`num-${grupo[0].id}`} className="grid grid-cols-2 gap-3 sm:gap-4">
          {grupo.map((g) => (
            <div key={g.id}>{renderField(g)}</div>
          ))}
        </div>,
      );
    } else {
      filas.push(<div key={c.id}>{renderField(c)}</div>);
      i++;
    }
  }

  const body = (
    <>
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {/* Contacto fijo: siempre arriba de todo, en todas las marcas. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label requerido>Nombre completo</Label>
          <input name="nombre" required maxLength={200} className={inputClass} />
        </div>
        <div>
          <Label requerido>Email</Label>
          <input name="email" type="email" required maxLength={254} className={inputClass} />
        </div>
      </div>
      <div className="h-px bg-neutral-100" />

      {filas}
    </>
  );

  if (preview) {
    return (
      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {body}
        <button
          type="button"
          disabled
          style={{ background: color }}
          className="mt-1 w-full rounded-full px-6 py-4 text-base font-semibold text-white opacity-90"
        >
          Solicitar cotización
        </button>
        <p className="text-center text-xs text-neutral-400">Vista previa — el botón no envía.</p>
      </form>
    );
  }

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
      {body}
      {state && !state.ok && <p className="text-sm font-medium text-red-600">{state.message}</p>}
      <SubmitButton color={color} />
      <p className="text-center text-xs text-neutral-400">
        Tus datos se usan solo para responder tu consulta.
      </p>
    </form>
  );
}
