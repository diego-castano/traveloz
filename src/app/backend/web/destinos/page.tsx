"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  listRegionesForFrontend,
  updateRegionFrontend,
} from "@/actions/region-frontend.actions";
import { MediaPicker } from "../_components/MediaPicker";

type Row = Awaited<ReturnType<typeof listRegionesForFrontend>>[number];
type Edits = Record<
  string,
  Partial<Pick<Row, "nombre" | "slug" | "orden" | "heroImage" | "descripcion">>
>;

export default function WebDestinosPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Edits>({});
  const [, start] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    listRegionesForFrontend()
      .then((rs) => {
        setRows(rs);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const patch = (id: string, p: Edits[string]) => {
    setEdits((e) => ({ ...e, [id]: { ...(e[id] ?? {}), ...p } }));
  };

  const onSave = (id: string) =>
    start(async () => {
      const data = edits[id];
      if (!data) return;
      setSavingId(id);
      try {
        await updateRegionFrontend(id, data);
        setEdits((e) => {
          const { [id]: _, ...rest } = e;
          return rest;
        });
        await refresh();
        toast("success", "Región actualizada");
      } catch (e) {
        toast("error", "Error", (e as Error).message);
      } finally {
        setSavingId(null);
      }
    });

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Destinos</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Editá la foto, descripción y orden de cada región. Aparecen en{" "}
            <a
              href="/destinos"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 hover:underline inline-flex items-center gap-0.5"
            >
              /destinos <ExternalLink className="w-3 h-3" />
            </a>
            . Para crear regiones nuevas, usá <strong>Catálogos</strong>.
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-neutral-400">Cargando regiones…</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center text-sm text-neutral-500">
          No hay regiones cargadas todavía.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((r) => {
          const e = edits[r.id] ?? {};
          const dirty = Object.keys(e).length > 0;
          const value = (k: keyof typeof e) =>
            (e[k] ?? r[k] ?? "") as string;

          return (
            <div
              key={r.id}
              className="bg-white rounded-lg border border-neutral-200 p-5"
            >
              <div className="flex items-baseline gap-3 mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {value("nombre")}
                </h3>
                <span className="text-xs text-neutral-400 font-mono">
                  /destinos/{value("slug")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Nombre
                  </label>
                  <Input
                    value={value("nombre")}
                    onChange={(ev) =>
                      patch(r.id, { nombre: ev.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Slug (URL)
                  </label>
                  <Input
                    value={value("slug")}
                    onChange={(ev) => patch(r.id, { slug: ev.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Orden
                  </label>
                  <Input
                    type="number"
                    value={String(e.orden ?? r.orden ?? 0)}
                    onChange={(ev) =>
                      patch(r.id, { orden: Number(ev.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Foto principal
                </label>
                <MediaPicker
                  value={value("heroImage")}
                  onChange={(v) => patch(r.id, { heroImage: v })}
                  accept="image/*"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  rows={2}
                  placeholder="Texto que aparece en la cabecera de la página de la región"
                  value={value("descripcion")}
                  onChange={(ev) =>
                    patch(r.id, { descripcion: ev.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                {dirty && (
                  <span className="text-xs text-amber-600">
                    Cambios sin guardar
                  </span>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onSave(r.id)}
                  disabled={!dirty || savingId === r.id}
                >
                  <Save className="w-4 h-4" />
                  {savingId === r.id ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
