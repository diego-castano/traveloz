"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, ExternalLink, Settings2, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  listRegionesForFrontend,
  updateRegionFrontend,
} from "@/actions/region-frontend.actions";
import { MediaPicker } from "../_components/MediaPicker";
import { SettingsForm } from "../_components/SettingsForm";

type Row = Awaited<ReturnType<typeof listRegionesForFrontend>>[number];
type Edits = Record<
  string,
  Partial<Pick<Row, "heroImage" | "descripcion">>
>;

// ---------------------------------------------------------------------------
// Web → Destinos: visuals-only editor for catalog regions.
//
// Identity (nombre, slug, orden, paises, ciudades) is owned by Catalogos →
// Regiones y Paises. Here you only edit the public-facing image and the
// description that appears on /destinos and /destinos/<slug>.
// ---------------------------------------------------------------------------
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
    <div className="p-8 max-w-4xl space-y-8">
      <SettingsForm
        group="destinos"
        title="Página /destinos — Cabecera y CTA"
        blurb="Título, subtítulo y CTA inferior de la página índice de destinos. Las regiones se editan abajo."
        publicHref="/destinos"
      />

      <div className="flex items-start justify-between gap-4 pt-2 border-t border-neutral-200/80">
        <div className="pt-6">
          <h2 className="text-xl font-semibold text-neutral-900">Regiones</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Foto y descripción de cada región para la página{" "}
            <a
              href="/destinos"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 hover:underline inline-flex items-center gap-0.5"
            >
              /destinos <ExternalLink className="w-3 h-3" />
            </a>
            .
          </p>
        </div>
        <a
          href="/backend/catalogos?tab=regiones"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Administrar regiones en Catálogos
        </a>
      </div>

      <div className="rounded-md border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs text-violet-900/80">
        Las regiones se crean, renombran y ordenan desde{" "}
        <strong>Catálogos → Regiones y Países</strong>. Acá editás solo la
        imagen y el texto que se muestran en el sitio público.
      </div>

      {loading && (
        <div className="text-sm text-neutral-400">Cargando regiones…</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center text-sm text-neutral-500">
          No hay regiones cargadas todavía. Agregalas desde Catálogos.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((r) => {
          const e = edits[r.id] ?? {};
          const dirty = Object.keys(e).length > 0;
          const heroImage = (e.heroImage ?? r.heroImage ?? "") as string;
          const descripcion = (e.descripcion ?? r.descripcion ?? "") as string;

          return (
            <div
              key={r.id}
              className="bg-white rounded-lg border border-neutral-200 p-5"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="flex items-baseline gap-3 min-w-0">
                  <Globe className="w-4 h-4 text-neutral-400 shrink-0 self-center" />
                  <h3 className="text-lg font-semibold text-neutral-900 truncate">
                    {r.nombre}
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono truncate">
                    /destinos/{r.slug}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 shrink-0">
                  orden {r.orden}
                </span>
              </div>
              <div className="text-xs text-neutral-500 mb-4 ml-7">
                {r.paisesCount} país{r.paisesCount === 1 ? "" : "es"} ·{" "}
                {r.ciudadesCount} ciudad{r.ciudadesCount === 1 ? "" : "es"}
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Foto principal
                </label>
                <MediaPicker
                  value={heroImage}
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
                  value={descripcion}
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
