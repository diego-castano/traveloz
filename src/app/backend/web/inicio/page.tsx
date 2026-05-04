"use client";

import { useEffect, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  getSettingsByGroup,
  updateSettings,
} from "@/actions/site-settings.actions";

type Setting = Awaited<ReturnType<typeof getSettingsByGroup>>[number];

export default function WebInicioPage() {
  const [items, setItems] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isPending, start] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    getSettingsByGroup("home").then(setItems);
  }, []);

  const dirty = Object.keys(edits).length > 0;

  const onSave = () =>
    start(async () => {
      try {
        await updateSettings(
          Object.entries(edits).map(([key, value]) => ({ key, value })),
        );
        setEdits({});
        const fresh = await getSettingsByGroup("home");
        setItems(fresh);
        toast("success", "Cambios guardados", "El sitio público se actualiza en menos de 1 minuto.");
      } catch (e) {
        toast("error", "Error", (e as Error).message);
      }
    });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Página de inicio
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Hero, slider de categorías, testimonios y newsletter de la home pública.
        </p>
      </div>

      <div className="space-y-5 bg-white rounded-lg border border-neutral-200 p-6">
        {items.length === 0 && (
          <div className="text-sm text-neutral-400">
            No hay settings cargados. Corre <code>npm run seed:public</code>{" "}
            para inicializar.
          </div>
        )}
        {items.map((it) => {
          const current = edits[it.key] ?? it.value;
          const isTextarea = it.type === "textarea" || (it.value?.length ?? 0) > 80;
          return (
            <div key={it.key}>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                {it.label ?? it.key}
                <span className="text-neutral-400 font-normal ml-2 text-[10px]">
                  ({it.key})
                </span>
              </label>
              {isTextarea ? (
                <textarea
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm bg-white"
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

      <div className="flex justify-end">
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
