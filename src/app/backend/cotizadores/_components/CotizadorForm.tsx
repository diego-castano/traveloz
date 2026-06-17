"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCotizadorLanding,
  updateCotizadorLanding,
  type CotizadorUpsertInput,
} from "@/actions/cotizador.actions";

type Initial = Partial<CotizadorUpsertInput> & { id?: string };

export function CotizadorForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nombreMarca, setNombreMarca] = useState(initial?.nombreMarca ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [textoInstitucional, setTextoInstitucional] = useState(
    initial?.textoInstitucional ?? "",
  );
  const [colorPrimario, setColorPrimario] = useState(initial?.colorPrimario ?? "#1a1a2e");
  const [emailsRaw, setEmailsRaw] = useState((initial?.emailsDestino ?? []).join(", "));
  const [publicado, setPublicado] = useState(initial?.publicado ?? false);

  const isEdit = Boolean(initial?.id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailsDestino = emailsRaw
      .split(/[,\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: CotizadorUpsertInput = {
      nombreMarca,
      slug: slug || nombreMarca,
      logoUrl: logoUrl || null,
      textoInstitucional: textoInstitucional || null,
      colorPrimario: colorPrimario || null,
      emailsDestino,
      publicado,
    };

    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateCotizadorLanding(initial.id, payload);
        } else {
          const created = await createCotizadorLanding(payload);
          router.push(`/backend/cotizadores/${created.id}`);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <Field label="Nombre de la marca">
        <input
          value={nombreMarca}
          onChange={(e) => setNombreMarca(e.target.value)}
          required
          maxLength={120}
          className={inputClass}
        />
      </Field>

      <Field
        label="Slug público"
        hint="El landing queda en traveloz.com.uy/<slug>. Solo minúsculas, números y guiones."
      >
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="se genera del nombre si lo dejás vacío"
          maxLength={60}
          className={inputClass}
        />
      </Field>

      <Field label="URL del logo" hint="Opcional. Si no hay logo se muestra el nombre.">
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          maxLength={500}
          className={inputClass}
        />
      </Field>

      <Field label="Texto institucional" hint="Opcional. Una línea breve arriba del formulario.">
        <textarea
          value={textoInstitucional}
          onChange={(e) => setTextoInstitucional(e.target.value)}
          rows={3}
          maxLength={2000}
          className={inputClass}
        />
      </Field>

      <Field label="Color principal" hint="Hex #RRGGBB para el botón del landing.">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(colorPrimario) ? colorPrimario : "#1a1a2e"}
            onChange={(e) => setColorPrimario(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-neutral-300"
          />
          <input
            value={colorPrimario}
            onChange={(e) => setColorPrimario(e.target.value)}
            maxLength={7}
            className={`${inputClass} w-32`}
          />
        </div>
      </Field>

      <Field
        label="Emails destino"
        hint="A dónde se notifican los envíos (separá con comas). El envío real se activa cuando Resend esté configurado."
      >
        <input
          value={emailsRaw}
          onChange={(e) => setEmailsRaw(e.target.value)}
          placeholder="ventas@marca.com, otra@marca.com"
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={publicado}
          onChange={(e) => setPublicado(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-neutral-700">
          Publicado (visible en su URL)
        </span>
      </label>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 font-semibold text-white transition disabled:opacity-60"
        >
          {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cotizador"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/backend/cotizadores")}
          className="rounded-lg border border-neutral-300 px-5 py-2.5 font-medium text-neutral-600"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
