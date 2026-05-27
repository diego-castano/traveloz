"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  CloudUpload,
  AlertCircle,
  Loader2,
  ChevronDown,
  Undo2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  getSettingsByGroup,
  updateSettings,
} from "@/actions/site-settings.actions";
import { MediaPicker } from "../_components/MediaPicker";
import { RichTextEditor } from "../_components/RichTextEditor";
import { useWebEdit } from "../_components/web-edit-context";
import { getValidator, validateAll } from "../_components/key-validators";

const AUTOSAVE_DEBOUNCE_MS = 1500;

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
          { kind: "image", key: "corporativo_valores_icon_1", label: "Icono" },
          { kind: "text", key: "corporativo_valores_titulo_1", label: "Título" },
          { kind: "rich", key: "corporativo_valores_texto_1", label: "Texto", rows: 4 },
        ],
      },
      {
        id: "2",
        title: "Card 2 — ¿Cómo trabajamos?",
        fields: [
          { kind: "image", key: "corporativo_valores_icon_2", label: "Icono" },
          { kind: "text", key: "corporativo_valores_titulo_2", label: "Título" },
          { kind: "rich", key: "corporativo_valores_texto_2", label: "Texto", rows: 4 },
        ],
      },
      {
        id: "3",
        title: "Card 3 — Atención 24/7",
        fields: [
          { kind: "image", key: "corporativo_valores_icon_3", label: "Icono" },
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

// ---------------------------------------------------------------------------
// CorporativoForm — bespoke editor for /corporativo. Uses the shared autosave/
// validation/preview shell pattern from SettingsForm but keeps the static
// section + card layout that's specific to this page.
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((s) => [
    ...(s.fields ?? []).map((f) => [f.key, f.label] as const),
    ...(s.cards ?? []).flatMap((c) =>
      c.fields.map((f) => [f.key, `${c.title} — ${f.label}`] as const),
    ),
  ]),
);

export function CorporativoForm() {
  const { toast } = useToast();
  const { devMode, refreshPreview } = useWebEdit();

  const [values, setValues] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showDiff, setShowDiff] = useState(false);

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const originalsRef = useRef(originals);
  originalsRef.current = originals;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (status !== "saved" || !savedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status, savedAt]);

  const dirtyEntries = useMemo(
    () =>
      ALL_KEYS.filter((k) => (values[k] ?? "") !== (originals[k] ?? "")).map(
        (k) => ({ key: k, value: values[k] ?? "" }),
      ),
    [values, originals],
  );

  const flush = useCallback(async () => {
    const dirty = ALL_KEYS.filter(
      (k) => (valuesRef.current[k] ?? "") !== (originalsRef.current[k] ?? ""),
    ).map((k) => ({ key: k, value: valuesRef.current[k] ?? "" }));
    if (dirty.length === 0) return;

    const validation = validateAll(dirty);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setStatus("error");
      return;
    }
    setErrors({});
    setStatus("saving");
    try {
      await updateSettings(dirty);
      setOriginals(valuesRef.current);
      setStatus("saved");
      setSavedAt(Date.now());
      refreshPreview();
    } catch (e) {
      setStatus("error");
      toast("error", "Error al guardar", (e as Error).message);
    }
  }, [refreshPreview, toast]);

  const schedule = useCallback(() => {
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
  }, [flush]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush();
    };
  }, [flush]);

  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    const err = getValidator(k)(v);
    setErrors((prev) => {
      const cp = { ...prev };
      if (err) cp[k] = err;
      else delete cp[k];
      return cp;
    });
    schedule();
  };

  const revertField = (k: string) => {
    setValues((p) => ({ ...p, [k]: originals[k] ?? "" }));
    setErrors((prev) => {
      const cp = { ...prev };
      delete cp[k];
      return cp;
    });
    schedule();
  };

  const onSaveNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flush();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
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
        <StatusPill
          status={status}
          savedAgo={
            savedAt ? Math.max(0, Math.round((now - savedAt) / 1000)) : null
          }
          dirtyCount={dirtyEntries.length}
          errorCount={Object.keys(errors).length}
          onShowDiff={() => setShowDiff((v) => !v)}
          showDiff={showDiff}
        />
      </div>

      {showDiff && dirtyEntries.length > 0 && (
        <DiffPanel
          entries={dirtyEntries.map((e) => ({
            ...e,
            originalValue: originals[e.key] ?? "",
            label: FIELD_LABELS[e.key] ?? e.key,
          }))}
          onRevert={revertField}
          onSaveNow={onSaveNow}
        />
      )}

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
                  onBlur={onSaveNow}
                  error={errors[f.key]}
                  showKey={devMode}
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
                      onBlur={onSaveNow}
                      error={errors[f.key]}
                      showKey={devMode}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  onBlur,
  error,
  showKey,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  showKey?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1.5">
        <span>{field.label}</span>
        {showKey && (
          <code className="text-neutral-400 font-normal text-[10px] font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
            {field.key}
          </code>
        )}
      </label>
      {field.kind === "text" && (
        <Input
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
      {field.kind === "rich" && (
        <RichTextEditor value={value} onChange={onChange} rows={field.rows} />
      )}
      {field.kind === "image" && (
        <MediaPicker
          value={value}
          onChange={onChange}
          accept="image/*"
          settingKey={field.key}
        />
      )}
      {field.kind === "video" && (
        <MediaPicker
          value={value}
          onChange={onChange}
          accept="video/*"
          settingKey={field.key}
        />
      )}
      {error && (
        <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      {!error && field.help && (
        <p className="text-[11px] text-neutral-500 mt-1">{field.help}</p>
      )}
    </div>
  );
}

// ─── Reused presentational primitives (mirror SettingsForm) ──────────────

function StatusPill({
  status,
  savedAgo,
  dirtyCount,
  errorCount,
  onShowDiff,
  showDiff,
}: {
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  savedAgo: number | null;
  dirtyCount: number;
  errorCount: number;
  onShowDiff: () => void;
  showDiff: boolean;
}) {
  if (errorCount > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs">
        <AlertCircle className="w-3.5 h-3.5" />
        {errorCount} error{errorCount === 1 ? "" : "es"} de validación
      </div>
    );
  }
  if (status === "saving") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Guardando…
      </div>
    );
  }
  if (status === "dirty") {
    return (
      <button
        type="button"
        onClick={onShowDiff}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs hover:bg-amber-100"
      >
        <CloudUpload className="w-3.5 h-3.5" />
        {dirtyCount} cambio{dirtyCount === 1 ? "" : "s"} pendiente
        {dirtyCount === 1 ? "" : "s"}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${showDiff ? "rotate-180" : ""}`}
        />
      </button>
    );
  }
  if (status === "saved") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
        <Check className="w-3.5 h-3.5" />
        {savedAgo !== null && savedAgo < 3
          ? "Guardado"
          : `Guardado hace ${savedAgo}s`}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 text-xs">
      <Check className="w-3.5 h-3.5" />
      Todo guardado
    </div>
  );
}

function DiffPanel({
  entries,
  onRevert,
  onSaveNow,
}: {
  entries: Array<{
    key: string;
    label: string;
    value: string;
    originalValue: string;
  }>;
  onRevert: (key: string) => void;
  onSaveNow: () => void;
}) {
  return (
    <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-amber-900">
          Cambios pendientes ({entries.length})
        </div>
        <button
          type="button"
          onClick={onSaveNow}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700"
        >
          Guardar ahora
        </button>
      </div>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.key}
            className="text-xs bg-white border border-amber-200 rounded-md p-2.5"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-medium text-neutral-800">{e.label}</span>
              <button
                type="button"
                onClick={() => onRevert(e.key)}
                className="inline-flex items-center gap-0.5 text-[10px] text-neutral-500 hover:text-red-600"
                title="Descartar este cambio"
              >
                <Undo2 className="w-3 h-3" /> Descartar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DiffSide tone="old" value={e.originalValue || "(vacío)"} />
              <DiffSide tone="new" value={e.value || "(vacío)"} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiffSide({
  tone,
  value,
}: {
  tone: "old" | "new";
  value: string;
}) {
  return (
    <div
      className={`rounded-md border px-2 py-1.5 text-[11px] font-mono whitespace-pre-wrap break-words ${
        tone === "old"
          ? "bg-red-50/60 border-red-200 text-red-900"
          : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
      }`}
    >
      <div className="text-[9px] uppercase tracking-wider opacity-60 mb-0.5">
        {tone === "old" ? "Antes" : "Después"}
      </div>
      {value}
    </div>
  );
}
