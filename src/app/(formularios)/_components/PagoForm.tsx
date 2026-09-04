"use client";

// ---------------------------------------------------------------------------
// Formulario público de datos de pago.
//
// Dos bloques: PASAJERO arriba (a nombre de quién es el pago) y TARJETA
// abajo. El orden importa: el titular de la tarjeta muchas veces no es quien
// viaja, y el vendedor y Administración buscan por el pasajero.
//
// El número y el vencimiento se formatean en vivo (grupos de 4 y MM/AA)
// porque tipear 16 dígitos corridos en un celular es donde más se equivoca la
// gente.
//
// De la tarjeta no se guarda nada en claro: la server action cifra el cuerpo
// con AES-256-GCM y solo persiste emisor y últimos 4. Sí quedan legibles el
// pasajero y el titular, que son la identidad del registro. El microcopy de
// las 96 horas está a la vista a propósito - es la promesa que hace que
// alguien se anime a cargar su tarjeta en un formulario web.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Lock } from "lucide-react";
import { submitDatosPago, type FormResult } from "@/actions/datos-publico.actions";
import type { FormField } from "@/lib/cotizador-form";
import { CamposExtra } from "./CamposExtra";
import {
  Campo,
  ErrorMsg,
  Exito,
  Honeypot,
  Label,
  Seccion,
  Separador,
  SubmitButton,
  inputClass,
} from "./ui";

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

/**
 * Cuotas ofrecidas. Espejo de CUOTAS_OPCIONES en src/lib/datos-form.ts, que es
 * quien valida del lado del server (ese módulo trae Prisma y no puede entrar
 * a un bundle cliente). Si una lista cambia, la otra también.
 */
const CUOTAS = [1, 2, 3, 4, 5, 6];

function formatearVencimiento(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/**
 * Este es el único formulario de datos que rompe el coral de marca: pide
 * número de tarjeta, y el cliente no quiere ni un pixel de rojo cerca de eso
 * ("transmite alarma"). Pisa acá las variables que ui.tsx expone
 * (`--form-acento` / `--form-acento-sombra`, con fallback a coral) por el
 * violeta del cotizador, y con eso viaja todo el formulario: campos y botón.
 *
 * La pantalla de éxito ya no las necesita —el tick va violeta por defecto en
 * los dos formularios—, así que el pisado quedó solo para el form.
 */
const acentoVars = {
  "--form-acento": "#785AE5",
  "--form-acento-sombra": "rgba(120,90,229,0.9)",
} as React.CSSProperties;

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
    <form action={formAction} className="space-y-6 sm:space-y-7" style={acentoVars}>
      <Honeypot />

      {/* ── Pasajero ────────────────────────────────────────────────────── */}
      <section className="space-y-3.5">
        <Seccion>Pasajero</Seccion>
        <Campo
          name="pasajeroNombre"
          label="Nombre y apellido del pasajero"
          requerido
          required
          maxLength={150}
          autoComplete="name"
          ayuda="A nombre de quién es el viaje que se está pagando."
        />
        <Campo
          name="pasajeroDocumento"
          label="Documento del pasajero"
          requerido
          required
          maxLength={40}
          ayuda="Cédula o pasaporte."
        />
      </section>

      <Separador />

      {/* ── Tarjeta ─────────────────────────────────────────────────────── */}
      <section className="space-y-3.5">
        <Seccion>Tarjeta</Seccion>

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
              className={`${inputClass} fx-input--cc fx-num`}
            />
            {emisor && (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-neutral-900/[0.08] bg-neutral-50 px-1.5 py-[3px] text-[10.5px] font-semibold text-neutral-500">
                {emisor}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
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
              className={`${inputClass} fx-num`}
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
            className="fx-num"
          />
        </div>

        <div>
          <Label htmlFor="cuotas">Cuotas</Label>
          <select id="cuotas" name="cuotas" className={inputClass} defaultValue="">
            <option value="">Sin especificar</option>
            {CUOTAS.map((n) => (
              <option key={n} value={String(n)}>
                {n === 1 ? "1 pago" : `${n} cuotas`}
              </option>
            ))}
          </select>
        </div>

        <CamposExtra campos={campos} />
      </section>

      <Separador />

      {/* ── Autorización + envío ────────────────────────────────────────── */}
      <div className="space-y-3.5">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-neutral-900/[0.1] bg-neutral-50/70 px-3.5 py-3.5 transition-colors hover:border-neutral-900/20 has-[:checked]:border-[#785AE5]/60 has-[:checked]:bg-[#785AE5]/[0.035]">
          <input
            type="checkbox"
            name="autorizo"
            value="si"
            required
            checked={autorizo}
            onChange={(e) => setAutorizo(e.target.checked)}
            className="fx-check"
          />
          <span className="text-[13px] leading-relaxed text-neutral-700">
            Soy el titular de la tarjeta (o cuento con su autorización) y autorizo a TravelOz a
            usar estos datos para el pago de los servicios contratados.
          </span>
        </label>

        {state && !state.ok && <ErrorMsg>{state.message}</ErrorMsg>}

        <SubmitButton>Enviar datos de pago</SubmitButton>

        {/* Nota de confianza, no advertencia: candado fino, gris, sin fondo de
            alerta. Es la razón por la que alguien se anima a cargar la tarjeta. */}
        <div className="flex items-start gap-2.5 rounded-[10px] border border-neutral-900/[0.07] bg-neutral-50/60 px-3.5 py-3">
          <Lock className="mt-[2px] h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={1.6} />
          <div className="space-y-1">
            <p className="text-[12px] leading-relaxed text-neutral-600">
              Los datos viajan cifrados y se eliminan automáticamente a las 96 horas.
            </p>
            <p className="text-[11.5px] leading-relaxed text-neutral-400">
              Tu asesor los ve una sola vez en el panel con su clave, y Administración de la
              agencia los recibe para procesar el cobro. Cada acceso queda registrado.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
