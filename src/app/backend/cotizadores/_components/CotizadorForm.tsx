"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { MediaPicker } from "@/app/backend/web/_components/MediaPicker";
import { normalizeSlug } from "@/lib/cotizador";
import { camposEstandar, type FormField } from "@/lib/cotizador-form";
import {
  createCotizadorLanding,
  updateCotizadorLanding,
  type CotizadorUpsertInput,
} from "@/actions/cotizador.actions";
import { EmailChips } from "./EmailChips";
import { FormBuilder } from "./FormBuilder";
import { DynamicForm } from "@/app/(landing)/[slug]/_components/DynamicForm";

// Color de marca del landing (fijo, igual que la landing pública).
const PREVIEW_COLOR = "#F43E55";

type Initial = Partial<CotizadorUpsertInput> & { id?: string };

export function CotizadorForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nombreMarca, setNombreMarca] = useState(initial?.nombreMarca ?? "");
  const [tituloHero, setTituloHero] = useState(initial?.tituloHero ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  // WordPress-style: el slug se deriva del nombre hasta que el usuario lo edita.
  const [slugEdited, setSlugEdited] = useState(Boolean(initial?.slug));
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [textoInstitucional, setTextoInstitucional] = useState(
    initial?.textoInstitucional ?? "",
  );
  const [emails, setEmails] = useState<string[]>(initial?.emailsDestino ?? []);
  // El formulario nuevo (o una landing sin campos) arranca sembrado con la
  // cotización estándar.
  const [campos, setCampos] = useState<FormField[]>(
    initial?.campos?.length ? initial.campos : camposEstandar(),
  );
  const [publicado, setPublicado] = useState(initial?.publicado ?? false);

  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (!slugEdited) setSlug(normalizeSlug(nombreMarca));
  }, [nombreMarca, slugEdited]);

  const slugPreview = normalizeSlug(slug) || "tu-marca";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: CotizadorUpsertInput = {
      nombreMarca,
      slug: slug || nombreMarca,
      tituloHero: tituloHero || null,
      logoUrl: logoUrl || null,
      textoInstitucional: textoInstitucional || null,
      colorPrimario: null,
      emailsDestino: emails,
      campos,
      publicado,
    };

    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateCotizadorLanding(initial.id, payload);
          toast("success", "Cambios guardados", "El cotizador se actualizó.");
          router.refresh();
        } else {
          const created = await createCotizadorLanding(payload);
          toast("success", "Cotizador creado", `Disponible en /${created.slug}`);
          router.push(`/backend/cotizadores/${created.id}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo guardar.";
        setError(msg);
        toast("error", "No se pudo guardar", msg);
      }
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <form onSubmit={submit} className="space-y-5">
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
          label="Título del landing"
          hint="El encabezado grande del landing. Por defecto: “Cotizá tu viaje”."
        >
          <input
            value={tituloHero}
            onChange={(e) => setTituloHero(e.target.value)}
            placeholder="Cotizá tu viaje"
            maxLength={120}
            className={inputClass}
          />
        </Field>

        <Field label="URL del landing">
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder="Se genera del nombre"
            maxLength={80}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            Escribí lo que quieras, lo convertimos en una dirección. Tu landing:{" "}
            <span className="font-mono text-neutral-700">traveloz.com.uy/{slugPreview}</span>
          </p>
        </Field>

        <Field label="Logo de la marca" hint="Subí un archivo. Se guarda en el bucket.">
          <MediaPicker value={logoUrl} onChange={setLogoUrl} accept="image/*" hideUrl />
        </Field>

        <Field label="Texto institucional" hint="Opcional. Aparece bajo el título del landing.">
          <textarea
            value={textoInstitucional}
            onChange={(e) => setTextoInstitucional(e.target.value)}
            rows={3}
            maxLength={2000}
            className={inputClass}
          />
        </Field>

        <Field
          label="Campos del formulario"
          hint="Agregá, ordená (arrastrando) y configurá los campos que verá quien cotiza. Nombre y email se piden siempre."
        >
          <FormBuilder campos={campos} onChange={setCampos} />
        </Field>

        <Field
          label="Emails destino"
          hint="A dónde se notifican los envíos. Escribí uno y Enter (o coma), o pegá varios separados por coma."
        >
          <EmailChips value={emails} onChange={setEmails} />
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

      {/* Vista previa en vivo */}
      <aside className="h-fit xl:sticky xl:top-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Vista previa
        </p>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          <div className="px-5 pb-2 pt-6 text-center">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              {tituloHero.trim() || "Cotizá tu viaje"}
            </h2>
            {textoInstitucional.trim() && (
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">
                {textoInstitucional.trim()}
              </p>
            )}
          </div>
          <div className="p-4">
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <DynamicForm campos={campos} color={PREVIEW_COLOR} preview />
            </div>
          </div>
        </div>
      </aside>
    </div>
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
