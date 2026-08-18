"use client";

// ---------------------------------------------------------------------------
// Formulario público de datos de pago.
//
// Un solo bloque, sin repetición. El número y el vencimiento se formatean en
// vivo (grupos de 4 y MM/AA) porque tipear 16 dígitos corridos en un celular
// es donde más se equivoca la gente.
//
// Nada de lo que se escribe acá se guarda en claro: la server action cifra el
// cuerpo con AES-256-GCM y solo persiste titular, emisor y últimos 4. El
// microcopy de las 72 horas está a la vista a propósito — es la promesa que
// hace que alguien se anime a cargar su tarjeta en un formulario web.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { submitDatosPago, type FormResult } from "@/actions/datos-publico.actions";
import type { FormField } from "@/lib/cotizador-form";
import { CamposExtra } from "./CamposExtra";
import { ACENTO, Campo, ErrorMsg, Exito, Honeypot, Label, SubmitButton, inputClass } from "./ui";

// Espejo cosmético de `detectarEmisor` (src/lib/datos-cifrado.ts). Solo sirve
// para mostrar la marca mientras se tipea; el emisor que se persiste lo decide
// el server con la misma tabla.
function emisorVisual(digitos: string): string | null {
  if (/^4/.test(digitos)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digitos)) return "Mastercard";
  if (/^3[47]/.test(digitos)) return "Amex";
  if (/^(6011|65|64[4-9]|622)/.test(digitos)) return "Discover";
  if (/^3(0[0-5]|[68])/.test(digitos)) return "Diners";
  return null;
}

function formatearNumero(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 19);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

function formatearVencimiento(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function PagoForm({
  slug,
  token,
  campos,
}: {
  slug: string;
  token: string | null;
  campos: FormField[];
}) {
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [autorizo, setAutorizo] = useState(false);

  const action = useMemo(() => submitDatosPago.bind(null, slug, token), [slug, token]);
  const [state, formAction] = useFormState<FormResult | null, FormData>(action, null);

  const emisor = emisorVisual(numero.replace(/\D/g, ""));

  if (state?.ok) {
    return (
      <Exito
        titulo={state.message}
        detalle="Por seguridad no guardamos una copia visible: si necesitás cambiar algo, escribile a tu asesor y te manda un link nuevo."
      />
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <Honeypot />

      <Campo
        name="titular"
        label="Titular de la tarjeta"
        requerido
        required
        maxLength={150}
        autoComplete="cc-name"
        ayuda="Tal cual figura impreso en el frente."
      />

      <Campo
        name="documentoTitular"
        label="Documento del titular"
        requerido
        required
        maxLength={40}
        inputMode="numeric"
        placeholder="Cédula o DNI"
      />

      <div>
        <Label requerido htmlFor="numero">
          Número de tarjeta
        </Label>
        <div className="relative">
          <input
            id="numero"
            name="numero"
            value={numero}
            onChange={(e) => setNumero(formatearNumero(e.target.value))}
            required
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            className={`${inputClass} pr-24 tracking-[0.06em] tabular-nums`}
          />
          {emisor && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
              {emisor}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label requerido htmlFor="vencimiento">
            Vencimiento
          </Label>
          <input
            id="vencimiento"
            name="vencimiento"
            value={vencimiento}
            onChange={(e) => setVencimiento(formatearVencimiento(e.target.value))}
            required
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            className={`${inputClass} tabular-nums`}
          />
        </div>
        <Campo
          name="cvv"
          label="Código de seguridad"
          requerido
          required
          inputMode="numeric"
          autoComplete="cc-csc"
          maxLength={4}
          pattern="\d{3,4}"
          placeholder="123"
          ayuda="3 dígitos al dorso (4 en Amex)."
        />
      </div>

      <div>
        <Label htmlFor="cuotas">Cuotas</Label>
        <select id="cuotas" name="cuotas" className={inputClass} defaultValue="">
          <option value="">Sin especificar</option>
          <option value="1">1 pago</option>
          {[2, 3, 6, 9, 12, 18, 24].map((n) => (
            <option key={n} value={String(n)}>
              {n} cuotas
            </option>
          ))}
        </select>
      </div>

      <CamposExtra campos={campos} />

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="autorizo"
            value="si"
            required
            checked={autorizo}
            onChange={(e) => setAutorizo(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ accentColor: ACENTO }}
          />
          <span className="text-[14px] leading-relaxed text-neutral-700">
            Soy el titular de la tarjeta (o cuento con su autorización) y autorizo a TravelOz a
            usar estos datos para el pago de los servicios contratados.
          </span>
        </label>
      </div>

      {state && !state.ok && <ErrorMsg>{state.message}</ErrorMsg>}

      <SubmitButton>Enviar datos de pago</SubmitButton>

      <div className="space-y-2 pt-1">
        <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-neutral-500">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-neutral-400" />
          Los datos viajan cifrados y se eliminan automáticamente a las 72 horas.
        </p>
        <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-neutral-400">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
          Tu asesor ve el número una sola vez, dentro del panel. Nunca viaja por email ni por
          WhatsApp.
        </p>
      </div>
    </form>
  );
}
