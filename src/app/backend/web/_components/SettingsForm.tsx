"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CloudUpload,
  AlertCircle,
  Loader2,
  ChevronDown,
  Undo2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { EmailTagInput } from "@/components/ui/EmailTagInput";
import { useToast } from "@/components/ui/Toast";
import {
  getSettingsByGroup,
  updateSettings,
} from "@/actions/site-settings.actions";
import { MediaPicker } from "./MediaPicker";
import { LinkListEditor } from "./LinkListEditor";
import { useWebEdit } from "./web-edit-context";
import { getValidator, validateAll } from "./key-validators";

type Setting = Awaited<ReturnType<typeof getSettingsByGroup>>[number];

type Props = {
  group: string;
  title: string;
  blurb: string;
  publicHref?: string;
  /** Keys del grupo que NO se editan acá (ej. coming_soon_activo, que tiene su
   *  propio toggle arriba de la página). */
  excludeKeys?: string[];
};

const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * Generic group editor with autosave + inline validation + per-field tech-key
 * toggle. Loads SiteSettings by group, renders the right input kind based on
 * `type`, debounces changes to a server upsert, and refreshes the live
 * preview iframe after each successful save.
 *
 * Field type mapping:
 *   - "image_url" / "url" with media-ish keys → MediaPicker (upload + URL)
 *   - "textarea" or value > 80 chars → textarea
 *   - default → text input
 */
export function SettingsForm({ group, title, blurb, excludeKeys }: Props) {
  const { toast } = useToast();
  const { devMode, refreshPreview } = useWebEdit();

  const [items, setItems] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showDiff, setShowDiff] = useState(false);

  // Refs hold the live edits so the debounced callback always sees the latest
  // map without re-creating itself on every keystroke.
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load.
  useEffect(() => {
    setLoading(true);
    getSettingsByGroup(group)
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setItems(
          excludeKeys?.length
            ? list.filter((s) => !excludeKeys.includes(s.key))
            : list,
        );
      })
      .catch((e) => {
        setItems([]);
        toast("error", "No se pudieron cargar los settings", (e as Error).message);
      })
      .finally(() => setLoading(false));
  }, [group, toast]);

  // Tick a clock so "Guardado hace Xs" stays current without re-rendering the
  // whole form on every input change.
  useEffect(() => {
    if (status !== "saved" || !savedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status, savedAt]);

  const originals = useMemo(() => {
    const m: Record<string, string> = {};
    if (!Array.isArray(items)) return m;
    for (const it of items) m[it.key] = it.value ?? "";
    return m;
  }, [items]);

  const dirtyEntries = useMemo(
    () =>
      Object.entries(edits)
        .filter(([k, v]) => (originals[k] ?? "") !== v)
        .map(([key, value]) => ({ key, value })),
    [edits, originals],
  );

  /** Save handler (called from the debounce timer + on blur). */
  const flush = useCallback(async () => {
    const dirty = Object.entries(editsRef.current)
      .filter(([k, v]) => (originals[k] ?? "") !== v)
      .map(([key, value]) => ({ key, value }));
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
      // Refresh the local cache so dirtyEntries empties out.
      const fresh = await getSettingsByGroup(group);
      setItems(Array.isArray(fresh) ? fresh : []);
      setEdits({});
      setStatus("saved");
      setSavedAt(Date.now());
      refreshPreview();
    } catch (e) {
      setStatus("error");
      toast("error", "Error al guardar", (e as Error).message);
    }
  }, [group, originals, refreshPreview, toast]);

  /** Schedule a flush after AUTOSAVE_DEBOUNCE_MS of inactivity. */
  const schedule = useCallback(() => {
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
  }, [flush]);

  // Flush on unmount so a section change doesn't drop pending edits.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Fire-and-forget; we can't await inside cleanup.
      void flush();
    };
  }, [flush]);

  // Per-field setter — validates incrementally and schedules autosave.
  const onChangeField = (key: string, next: string) => {
    setEdits((prev) => ({ ...prev, [key]: next }));
    const err = getValidator(key)(next);
    setErrors((prev) => {
      const cp = { ...prev };
      if (err) cp[key] = err;
      else delete cp[key];
      return cp;
    });
    schedule();
  };

  const revertField = (key: string) => {
    setEdits((prev) => {
      const cp = { ...prev };
      delete cp[key];
      return cp;
    });
    setErrors((prev) => {
      const cp = { ...prev };
      delete cp[key];
      return cp;
    });
    schedule();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-500 mt-1">{blurb}</p>
        </div>
        <StatusPill
          status={status}
          savedAgo={savedAt ? Math.max(0, Math.round((now - savedAt) / 1000)) : null}
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
            label: items.find((it) => it.key === e.key)?.label ?? e.key,
          }))}
          onRevert={(k) => revertField(k)}
          onSaveNow={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            void flush();
          }}
        />
      )}

      <div className="space-y-5 bg-white rounded-lg border border-neutral-200 p-6">
        {loading && (
          <div className="text-sm text-neutral-400">Cargando…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-sm text-neutral-400">
            No hay settings cargados para este grupo. Verificá el seed.
          </div>
        )}
        {items.map((it) => {
          const current = edits[it.key] ?? it.value ?? "";
          const isVideo = it.type === "video_upload" || it.key.includes("video");
          const isMedia =
            it.type === "image_url" ||
            (it.type === "url" &&
              (isVideo ||
                it.key.includes("imagen") ||
                it.key.includes("foto") ||
                it.key.includes("hero"))) ||
            it.type === "video_upload";
          const forceUpload = it.type === "video_upload";
          // Email lists for the per-form lead destinations. Stored as a CSV
          // string in SiteSetting.value; rendered as removable chips so the
          // operator sees exactly who's going to receive each form.
          const isEmailList = it.key.startsWith("notificaciones_email_");
          // Listas de enlaces del footer: editor de filas amigable en vez de
          // JSON crudo. (El _partners_json lleva imágenes, va aparte.)
          const isLinkList = /(_links_json|_legal_json)$/.test(it.key);
          const isTextarea =
            it.type === "textarea" ||
            (!isMedia && !isEmailList && !isLinkList && (it.value?.length ?? 0) > 80);
          const error = errors[it.key];

          return (
            <div key={it.key}>
              <label className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-1.5">
                <span>{it.label ?? it.key}</span>
                {devMode && (
                  <code className="text-neutral-400 font-normal text-[10px] font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
                    {it.key}
                  </code>
                )}
              </label>
              {isMedia ? (
                <MediaPicker
                  value={current}
                  onChange={(v) => onChangeField(it.key, v)}
                  accept={isVideo ? "video/*" : "image/*"}
                  settingKey={it.key}
                  hideUrl={forceUpload}
                />
              ) : isEmailList ? (
                <EmailTagInput
                  value={current}
                  onChange={(v) => onChangeField(it.key, v)}
                  ariaInvalid={!!error}
                />
              ) : isLinkList ? (
                <LinkListEditor
                  value={current}
                  onChange={(v) => onChangeField(it.key, v)}
                />
              ) : isTextarea ? (
                <textarea
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-200"
                  rows={3}
                  value={current}
                  aria-invalid={!!error}
                  onChange={(e) => onChangeField(it.key, e.target.value)}
                  onBlur={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    void flush();
                  }}
                />
              ) : (
                <Input
                  value={current}
                  aria-invalid={!!error}
                  onChange={(e) => onChangeField(it.key, e.target.value)}
                  onBlur={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    void flush();
                  }}
                />
              )}
              {error && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status pill ────────────────────────────────────────────────────────

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
  // Errors take priority over everything else.
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

// ─── Diff panel ─────────────────────────────────────────────────────────

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
