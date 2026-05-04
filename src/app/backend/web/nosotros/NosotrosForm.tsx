"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  getSettingsByGroup,
  updateSettings,
} from "@/actions/site-settings.actions";
import { MediaPicker } from "../_components/MediaPicker";
import { RichTextEditor } from "../_components/RichTextEditor";

type Section = {
  id: string;
  title: string;
  description?: string;
  fields: Array<
    | { kind: "text"; key: string; label: string }
    | { kind: "textarea"; key: string; label: string; rows?: number }
    | { kind: "rich"; key: string; label: string; rows?: number; placeholder?: string }
    | { kind: "image"; key: string; label: string; help?: string }
  >;
};

const SECTIONS: Section[] = [
  {
    id: "hero",
    title: "Encabezado",
    description: "Título y subtítulo que aparecen al inicio de la página /about.",
    fields: [
      { kind: "text", key: "nosotros_titulo", label: "Título principal" },
      { kind: "textarea", key: "nosotros_subtitulo", label: "Subtítulo", rows: 2 },
    ],
  },
  {
    id: "historia",
    title: "Historia y misión",
    description: "Bloque principal con imagen a la derecha.",
    fields: [
      {
        kind: "rich",
        key: "nosotros_historia",
        label: "Historia",
        rows: 8,
        placeholder: "Contá cómo nació la agencia…",
      },
      {
        kind: "rich",
        key: "nosotros_mision",
        label: "Misión",
        rows: 4,
      },
      { kind: "image", key: "nosotros_imagen", label: "Imagen principal" },
    ],
  },
  {
    id: "valores",
    title: "Valores y propósito",
    description: "Segundo bloque con imagen a la izquierda.",
    fields: [
      { kind: "rich", key: "nosotros_valores", label: "Valores", rows: 5 },
      { kind: "rich", key: "nosotros_proposito", label: "Propósito", rows: 5 },
      { kind: "image", key: "nosotros_imagen2", label: "Imagen secundaria" },
    ],
  },
  {
    id: "cierre",
    title: "Frase de cierre",
    description: "Texto destacado al final de la página.",
    fields: [
      { kind: "rich", key: "nosotros_cierre", label: "Frase de cierre", rows: 3 },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

export function NosotrosForm() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isPending, start] = useTransition();

  useEffect(() => {
    setLoading(true);
    getSettingsByGroup("nosotros")
      .then((rows) => {
        const map: Record<string, string> = {};
        for (const r of rows) map[r.key] = r.value ?? "";
        setValues(map);
        setOriginals(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(
    () => ALL_KEYS.some((k) => (values[k] ?? "") !== (originals[k] ?? "")),
    [values, originals],
  );

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const onSave = () =>
    start(async () => {
      try {
        const updates = ALL_KEYS.filter(
          (k) => (values[k] ?? "") !== (originals[k] ?? ""),
        ).map((k) => ({ key: k, value: values[k] ?? "" }));
        if (updates.length === 0) return;
        await updateSettings(updates);
        setOriginals(values);
        toast(
          "success",
          "Cambios guardados",
          "El sitio público se actualiza en menos de 1 minuto.",
        );
      } catch (e) {
        toast("error", "Error", (e as Error).message);
      }
    });

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Página Nosotros
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Editá los textos e imágenes de <code>/about</code>. Los bloques
            soportan formato (negrita, cursiva, subrayado, listas y links).
          </p>
        </div>
        <a
          href="/about"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver en el sitio
        </a>
      </div>

      {loading && (
        <div className="text-sm text-neutral-400">Cargando…</div>
      )}

      {!loading &&
        SECTIONS.map((section) => (
          <section
            key={section.id}
            className="bg-white rounded-lg border border-neutral-200"
          >
            <header className="px-6 py-4 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">
                {section.title}
              </h3>
              {section.description && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  {section.description}
                </p>
              )}
            </header>
            <div className="px-6 py-5 space-y-5">
              {section.fields.map((f) => {
                const current = values[f.key] ?? "";
                return (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      {f.label}
                    </label>
                    {f.kind === "text" && (
                      <Input
                        value={current}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                    )}
                    {f.kind === "textarea" && (
                      <textarea
                        value={current}
                        rows={f.rows ?? 3}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-y"
                      />
                    )}
                    {f.kind === "rich" && (
                      <RichTextEditor
                        value={current}
                        onChange={(v) => set(f.key, v)}
                        rows={f.rows}
                        placeholder={f.placeholder}
                      />
                    )}
                    {f.kind === "image" && (
                      <MediaPicker
                        value={current}
                        onChange={(v) => set(f.key, v)}
                        accept="image/*"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

      <div className="flex items-center justify-between sticky bottom-4 bg-white/90 backdrop-blur-sm rounded-lg border border-neutral-200 px-4 py-3 shadow-lg">
        <div className="text-xs text-neutral-500">
          {dirty ? "Hay cambios sin guardar" : "Todo guardado"}
        </div>
        <Button
          onClick={onSave}
          disabled={isPending || !dirty}
          variant="primary"
          size="sm"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
