"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useMemo, useRef } from "react";
import { submitCotizadorLead, type FormResult } from "@/actions/cotizador.actions";

function SubmitButton({ color }: { color: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ background: color }}
      className="w-full rounded-lg px-5 py-3 font-semibold text-white transition disabled:opacity-60"
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

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-semibold text-emerald-800">{state.message}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Honeypot — invisible para humanos. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Nombre</label>
        <input
          name="nombre"
          required
          maxLength={200}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
        />
      </div>

      <div className="flex gap-3">
        <div className="w-24">
          <label className="mb-1 block text-sm font-medium text-neutral-700">Cód.</label>
          <input
            name="paisCodigo"
            placeholder="+598"
            maxLength={6}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-neutral-700">Teléfono</label>
          <input
            name="telefono"
            maxLength={50}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          ¿Qué viaje tenés en mente?
        </label>
        <textarea
          name="comentarios"
          rows={4}
          maxLength={5000}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
        />
      </div>

      {state && !state.ok && (
        <p className="text-sm font-medium text-red-600">{state.message}</p>
      )}

      <SubmitButton color={color} />
    </form>
  );
}
