"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  getSettingsByGroup,
  updateSettings,
} from "@/actions/site-settings.actions";
import { MediaPicker } from "./MediaPicker";

type Setting = Awaited<ReturnType<typeof getSettingsByGroup>>[number];

type Props = {
  group: string;
  title: string;
  blurb: string;
  publicHref?: string;
};

/**
 * Generic group editor: loads SiteSettings by group, renders inputs/textareas/
 * media pickers based on the `type` column, and upserts on save.
 *
 * Field type mapping:
 *   - "image_url" / "url" with media-ish keys → MediaPicker (upload + URL)
 *   - "textarea" or value > 80 chars → textarea
 *   - default → text input
 */
export function SettingsForm({ group, title, blurb, publicHref }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isPending, start] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSettingsByGroup(group)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [group]);

  const dirty = Object.keys(edits).length > 0;

  const onSave = () =>
    start(async () => {
      try {
        await updateSettings(
          Object.entries(edits).map(([key, value]) => ({ key, value })),
        );
        setEdits({});
        const fresh = await getSettingsByGroup(group);
        setItems(fresh);
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
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-500 mt-1">{blurb}</p>
        </div>
        {publicHref && (
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver en el sitio
          </a>
        )}
      </div>

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
          const isMedia =
            it.type === "image_url" ||
            (it.type === "url" &&
              (it.key.includes("video") ||
                it.key.includes("imagen") ||
                it.key.includes("foto") ||
                it.key.includes("hero")));
          const isTextarea =
            it.type === "textarea" || (it.value?.length ?? 0) > 80;

          return (
            <div key={it.key}>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                {it.label ?? it.key}
                <span className="text-neutral-400 font-normal ml-2 text-[10px]">
                  {it.key}
                </span>
              </label>
              {isMedia ? (
                <MediaPicker
                  value={current}
                  onChange={(v) => setEdits({ ...edits, [it.key]: v })}
                  accept={
                    it.key.includes("video")
                      ? "video/*"
                      : "image/*"
                  }
                />
              ) : isTextarea ? (
                <textarea
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  rows={3}
                  value={current}
                  onChange={(e) =>
                    setEdits({ ...edits, [it.key]: e.target.value })
                  }
                />
              ) : (
                <Input
                  value={current}
                  onChange={(e) =>
                    setEdits({ ...edits, [it.key]: e.target.value })
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between sticky bottom-4 bg-white/80 backdrop-blur-sm rounded-lg border border-neutral-200 px-4 py-3 shadow-lg">
        <div className="text-xs text-neutral-500">
          {dirty
            ? `${Object.keys(edits).length} cambio(s) sin guardar`
            : "Todo guardado"}
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
