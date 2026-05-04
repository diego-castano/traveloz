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

type Field =
  | { kind: "text"; key: string; label: string; help?: string }
  | { kind: "rich"; key: string; label: string; rows?: number; help?: string }
  | { kind: "image"; key: string; label: string; help?: string }
  | { kind: "video"; key: string; label: string; help?: string };

type Section = {
  id: string;
  title: string;
  description?: string;
  fields?: Field[];
  cards?: { id: string; title: string; fields: Field[] }[];
};

const SECTIONS: Section[] = [
  {
    id: "hero",
    title: "Hero",
    description:
      "Video de fondo y título grande que se escribe a máquina al cargar la página.",
    fields: [
      {
        kind: "text",
        key: "corporativo_hero_titulo",
        label: "Título principal",
        help: "Aparece animado encima del video.",
      },
      {
        kind: "video",
        key: "corporativo_hero_video",
        label: "Video de fondo",
        help: "MP4 recomendado (silenciado, con loop).",
      },
    ],
  },
  {
    id: "valores",
    title: "3 cards de valores",
    description:
      "Tres tarjetas con icono que aparecen debajo del hero. Cada una tiene un título y un texto.",
    cards: [
      {
        id: "1",
        title: "Card 1 — Nuestros valores",
        fields: [
          { kind: "text", key: "corporativo_valores_titulo_1", label: "Título" },
          { kind: "rich", key: "corporativo_valores_texto_1", label: "Texto", rows: 4 },
        ],
      },
      {
        id: "2",
        title: "Card 2 — ¿Cómo trabajamos?",
        fields: [
          { kind: "text", key: "corporativo_valores_titulo_2", label: "Título" },
          { kind: "rich", key: "corporativo_valores_texto_2", label: "Texto", rows: 4 },
        ],
      },
      {
        id: "3",
        title: "Card 3 — Atención 24/7",
        fields: [
          { kind: "text", key: "corporativo_valores_titulo_3", label: "Título" },
          { kind: "rich", key: "corporativo_valores_texto_3", label: "Texto", rows: 4 },
        ],
      },
    ],
  },
  {
    id: "clientes",
    title: "Sección clientes",
    description:
      "Título de la sección. Los logos se editan en /backend/web/clientes.",
    fields: [
      {
        kind: "text",
        key: "corporativo_clientes_titulo",
        label: "Título de la sección",
      },
    ],
  },
  {
    id: "form",
    title: "Form de contacto",
    description:
      "Título arriba del formulario. Los miembros del equipo se editan en /backend/web/equipo.",
    fields: [
      {
        kind: "text",
        key: "corporativo_form_titulo",
        label: "Título del form",
      },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => [
  ...(s.fields ?? []).map((f) => f.key),
  ...(s.cards ?? []).flatMap((c) => c.fields.map((f) => f.key)),
]);

export function CorporativoForm() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isPending, start] = useTransition();

  useEffect(() => {
    setLoading(true);
    getSettingsByGroup("corporativo")
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
            Página Corporativo
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Editá los textos, video y cards de <code>/corporativo</code>. Los
            bloques de texto largo soportan formato (negrita, cursiva,
            subrayado, listas y links).
          </p>
        </div>
        <a
          href="/corporativo"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver en el sitio
        </a>
      </div>

      {loading && <div className="text-sm text-neutral-400">Cargando…</div>}

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
              {section.fields?.map((f) => (
                <FieldRow
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  onChange={(v) => set(f.key, v)}
                />
              ))}
              {section.cards?.map((card) => (
                <div
                  key={card.id}
                  className="rounded-md border border-neutral-200 bg-neutral-50/50 px-4 py-4 space-y-4"
                >
                  <div className="text-xs font-semibold text-neutral-700">
                    {card.title}
                  </div>
                  {card.fields.map((f) => (
                    <FieldRow
                      key={f.key}
                      field={f}
                      value={values[f.key] ?? ""}
                      onChange={(v) => set(f.key, v)}
                    />
                  ))}
                </div>
              ))}
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

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1.5">
        {field.label}
      </label>
      {field.kind === "text" && (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.kind === "rich" && (
        <RichTextEditor value={value} onChange={onChange} rows={field.rows} />
      )}
      {field.kind === "image" && (
        <MediaPicker value={value} onChange={onChange} accept="image/*" />
      )}
      {field.kind === "video" && (
        <MediaPicker value={value} onChange={onChange} accept="video/*" />
      )}
      {field.help && (
        <p className="text-[11px] text-neutral-500 mt-1">{field.help}</p>
      )}
    </div>
  );
}
