"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  MultiSelectCombobox,
  type Option,
} from "@/components/ui/MultiSelectCombobox";
import {
  getPaqueteFrontendData,
  updatePaqueteFrontend,
  setPaqueteServicios,
} from "@/actions/paquete-frontend.actions";
import {
  listServicios,
  createServicio,
} from "@/actions/catalogo-servicios.actions";

type Servicio = { id: string; nombre: string; icon: string; activo?: boolean };

export function FrontendTab({ paqueteId }: { paqueteId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getPaqueteFrontendData>
  > | null>(null);
  const [catalog, setCatalog] = useState<Servicio[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({
    slug: "",
    publicado: false,
    metaTitle: "",
    metaDescription: "",
    heroImage: "",
    textoIncluye: "",
  });

  useEffect(() => {
    Promise.all([getPaqueteFrontendData(paqueteId), listServicios()]).then(
      ([d, s]) => {
        if (d) {
          setData(d);
          setForm({
            slug: d.slug ?? "",
            publicado: d.publicado,
            metaTitle: d.metaTitle ?? "",
            metaDescription: d.metaDescription ?? "",
            heroImage: d.heroImage ?? "",
            textoIncluye: d.textoIncluye ?? "",
          });
          setSelected(d.serviciosIncluidos.map((x) => x.servicio.id));
        }
        setCatalog(s);
      },
    );
  }, [paqueteId]);

  const options: Option[] = catalog
    .filter((s) => s.activo !== false)
    .map((s) => ({
      value: s.id,
      label: s.nombre,
      icon: (
        <img
          src={`/site/img/p-${s.icon}-icon.png`}
          alt=""
          className="w-4 h-4"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ),
    }));

  const onSave = () =>
    start(async () => {
      try {
        await updatePaqueteFrontend(paqueteId, form);
        await setPaqueteServicios(
          paqueteId,
          selected.map((id, i) => ({ servicioId: id, orden: i })),
        );
        toast("success", "Cambios guardados");
      } catch (e) {
        toast("error", "Error al guardar", (e as Error).message);
      }
    });

  if (!data) {
    return (
      <div className="p-6 text-sm text-neutral-500">Cargando datos…</div>
    );
  }

  const previewUrl = form.publicado && form.slug
    ? `/destinos/${form.slug.split("/")[0] || "ver"}/${form.slug}`
    : null;

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Contenido público (Frontend)</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Editá la URL, SEO, imagen y servicios incluidos del paquete tal
            como aparecerá en el sitio público.
          </p>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-violet-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver en el sitio
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            URL pública (slug)
          </label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="ej. buzios-7-noches"
          />
          <p className="text-xs text-neutral-500 mt-1">
            <code className="text-[11px]">
              /destinos/[region]/{form.slug || "<slug>"}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2 pt-7">
          <input
            type="checkbox"
            id="publicado"
            checked={form.publicado}
            onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="publicado" className="text-sm">
            Visible en el sitio público
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          Meta title (SEO) — máx 60
        </label>
        <Input
          value={form.metaTitle}
          onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
          maxLength={60}
        />
        <p className="text-[11px] text-neutral-400 mt-0.5">
          {form.metaTitle.length}/60
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          Meta description (SEO) — máx 160
        </label>
        <textarea
          value={form.metaDescription}
          onChange={(e) =>
            setForm({ ...form, metaDescription: e.target.value })
          }
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm bg-white"
          rows={2}
          maxLength={160}
        />
        <p className="text-[11px] text-neutral-400 mt-0.5">
          {form.metaDescription.length}/160
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          Hero image — elegí de la galería del paquete
        </label>
        <select
          value={form.heroImage}
          onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">— Seleccionar —</option>
          {data.fotos.map((f) => (
            <option key={f.url} value={f.url}>
              {f.alt || f.url}
            </option>
          ))}
        </select>
        {form.heroImage && (
          <img
            src={form.heroImage}
            alt=""
            className="mt-2 max-h-48 rounded border border-neutral-200"
          />
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          Texto introductorio &ldquo;Incluye&rdquo;
        </label>
        <textarea
          value={form.textoIncluye}
          onChange={(e) => setForm({ ...form, textoIncluye: e.target.value })}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm bg-white"
          rows={3}
          placeholder="Texto que aparece encima de la lista de servicios incluidos…"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          Servicios incluidos
        </label>
        <MultiSelectCombobox
          options={options}
          value={selected}
          onChange={setSelected}
          placeholder="Agregar servicios…"
          onCreate={async (name) => {
            const created = await createServicio({
              nombre: name,
              icon: "flight",
            });
            setCatalog((c) => [
              ...c,
              { id: created.id, nombre: created.nombre, icon: created.icon },
            ]);
            return {
              value: created.id,
              label: created.nombre,
              icon: (
                <img
                  src={`/site/img/p-${created.icon}-icon.png`}
                  alt=""
                  className="w-4 h-4"
                />
              ),
            };
          }}
        />
        <p className="text-[11px] text-neutral-400 mt-1">
          ¿Falta un servicio? Agregalo desde{" "}
          <a
            href="/backend/catalogos/servicios"
            className="text-violet-600 hover:underline"
          >
            Servicios incluidos
          </a>
          .
        </p>
      </div>

      <div className="flex justify-end pt-4 border-t border-neutral-200">
        <Button
          onClick={onSave}
          disabled={isPending}
          variant="primary"
          size="sm"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
