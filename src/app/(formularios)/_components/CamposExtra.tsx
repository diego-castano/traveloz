"use client";

// ---------------------------------------------------------------------------
// Render de los campos EXTRA que el admin agrega desde FormularioDato.campos.
//
// Reusa el contrato FormField del cotizador (src/lib/cotizador-form.ts) y su
// misma semántica de nombres, así el server los levanta con `buildRespuestas`
// sin código nuevo. `prefijo` permite repetir el mismo set por pasajero
// (p0__, p1__, …) sin que los names choquen.
//
// Contra el DynamicForm de los landings hay dos simplificaciones deliberadas:
//   • "numero" es un input numérico, no el stepper (acá no se cuentan pax).
//   • "telefono" es un <input type="tel"> plano en vez del selector de país
//     full-screen: mantiene este route group autocontenido.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { esVisible, type FormField } from "@/lib/cotizador-form";
import { Ayuda, Label, inputClass } from "./ui";

function OpcionCard({
  type,
  name,
  value,
  label,
  descripcion,
  defaultChecked,
  onChange,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  descripcion?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label
      // has-[:checked] evita duplicar en estado React el "seleccionado" de cada
      // opción: el borde y el fondo salen del propio input marcado.
      className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-neutral-900/[0.14] bg-white px-3 py-2.5 transition-colors hover:border-neutral-900/25 has-[:checked]:border-[#F43E55]/70 has-[:checked]:bg-[#F43E55]/[0.04]"
    >
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="fx-check"
      />
      <span className="leading-snug">
        <span className="block text-[14px] text-neutral-800">{label}</span>
        {descripcion && (
          <span className="mt-0.5 block text-[11.5px] text-neutral-500">{descripcion}</span>
        )}
      </span>
    </label>
  );
}

export function CamposExtra({
  campos,
  prefijo = "",
}: {
  campos: FormField[];
  /** Ej. "p0__" para el primer pasajero. Vacío en el formulario de pago. */
  prefijo?: string;
}) {
  // Solo guardamos el valor de los campos de CONTROL (selección / casilla),
  // que es lo único que necesita `mostrarSi`. El resto queda uncontrolado.
  const [control, setControl] = useState<Record<string, string>>({});
  const visibles = campos.filter((c) => esVisible(c, (id) => control[id] ?? ""));

  if (visibles.length === 0) return null;

  return (
    <>
      {visibles.map((c) => {
        const name = `${prefijo}${c.id}`;
        switch (c.tipo) {
          case "nota":
            return (
              <div
                key={c.id}
                className="rounded-[10px] border border-neutral-900/[0.08] bg-neutral-50/70 px-3.5 py-3 text-[13px] leading-relaxed text-neutral-600"
              >
                {c.etiqueta && (
                  <div className="mb-0.5 font-semibold text-neutral-800">{c.etiqueta}</div>
                )}
                <div className="whitespace-pre-line">{c.contenido}</div>
              </div>
            );

          case "parrafo":
            return (
              <div key={c.id}>
                <Label requerido={c.requerido}>{c.etiqueta}</Label>
                <textarea
                  name={name}
                  rows={3}
                  required={c.requerido}
                  maxLength={5000}
                  placeholder={c.placeholder}
                  className={inputClass}
                />
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );

          case "numero":
            return (
              <div key={c.id}>
                <Label requerido={c.requerido}>{c.etiqueta}</Label>
                <input
                  name={name}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  required={c.requerido}
                  placeholder={c.placeholder}
                  className={inputClass}
                />
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );

          case "telefono":
            return (
              <div key={c.id}>
                <Label requerido={c.requerido}>{c.etiqueta}</Label>
                <input
                  name={name}
                  type="tel"
                  inputMode="tel"
                  required={c.requerido}
                  maxLength={40}
                  placeholder={c.placeholder ?? "+598 99 123 456"}
                  className={inputClass}
                />
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );

          case "rango_fechas":
            // Dos inputs con el sufijo que espera `buildRespuestas`.
            return (
              <div key={c.id}>
                <Label requerido={c.requerido}>{c.etiqueta}</Label>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <input
                    name={`${name}__desde`}
                    type="date"
                    required={c.requerido}
                    className={inputClass}
                    aria-label={`${c.etiqueta} · desde`}
                  />
                  <input
                    name={`${name}__hasta`}
                    type="date"
                    required={c.requerido}
                    className={inputClass}
                    aria-label={`${c.etiqueta} · hasta`}
                  />
                </div>
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );

          case "seleccion":
            return (
              <div key={c.id}>
                <Label requerido={c.requerido}>{c.etiqueta}</Label>
                <div className="space-y-2">
                  {(c.opciones ?? []).map((o) => (
                    <OpcionCard
                      key={o.id}
                      type="radio"
                      name={name}
                      value={o.id}
                      label={o.label}
                      descripcion={o.descripcion}
                      onChange={(checked) =>
                        checked && setControl((v) => ({ ...v, [c.id]: o.id }))
                      }
                    />
                  ))}
                </div>
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );

          case "multiple":
            return (
              <div key={c.id}>
                <Label requerido={c.requerido}>{c.etiqueta}</Label>
                <div className="space-y-2">
                  {(c.opciones ?? []).map((o) => (
                    <OpcionCard
                      key={o.id}
                      type="checkbox"
                      name={name}
                      value={o.id}
                      label={o.label}
                      descripcion={o.descripcion}
                    />
                  ))}
                </div>
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );

          case "casilla":
            return (
              <div key={c.id}>
                {/* El -my-1/py-1 agranda el área de toque sin agrandar el bloque. */}
                <label className="-my-1 flex cursor-pointer items-start gap-2.5 py-1">
                  <input
                    type="checkbox"
                    name={name}
                    value="si"
                    required={c.requerido}
                    onChange={(e) =>
                      setControl((v) => ({ ...v, [c.id]: e.target.checked ? "si" : "" }))
                    }
                    className="fx-check"
                  />
                  <span className="text-[13.5px] leading-snug text-neutral-700">{c.etiqueta}</span>
                </label>
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );

          default:
            // texto, email
            return (
              <div key={c.id}>
                <Label requerido={c.requerido}>{c.etiqueta}</Label>
                <input
                  name={name}
                  type={c.tipo === "email" ? "email" : "text"}
                  required={c.requerido}
                  maxLength={5000}
                  placeholder={c.placeholder}
                  className={inputClass}
                />
                <Ayuda>{c.ayuda}</Ayuda>
              </div>
            );
        }
      })}
    </>
  );
}
