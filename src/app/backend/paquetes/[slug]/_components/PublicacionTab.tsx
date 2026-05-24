"use client";

// ---------------------------------------------------------------------------
// Publicación — single tab that controls EVERYTHING related to the public
// life of a paquete. Replaces the former FrontendTab + PublicacionTab split:
//
//   • `publicado` (boolean) — is this visible on the public site RIGHT NOW.
//   • `estado` (enum) — internal lifecycle: BORRADOR → EN_REVISION → ACTIVO
//     → ARCHIVADO. Toggling "Publicar" auto-bumps estado to ACTIVO when the
//     paquete is still in BORRADOR/EN_REVISION (handled server-side in
//     updatePaqueteFrontend). Moving estado OUT of ACTIVO auto-unpublishes
//     (handled in updatePaqueteLifecycle).
//
// All public-content fields (slug, hero, textos, SEO, servicios incluidos)
// live here too; the rest of the lifecycle bits (estado, destacado, validez,
// etiquetas) moved here from the former PublicacionTab.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Save, ExternalLink, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { Tag, type TagColor } from "@/components/ui/Tag";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
import { useToast } from "@/components/ui/Toast";
import {
  MultiSelectCombobox,
  type Option,
} from "@/components/ui/MultiSelectCombobox";
import {
  getPaqueteFrontendData,
  updatePaqueteFrontend,
  updatePaqueteLifecycle,
  assignPaqueteEtiqueta,
  removePaqueteEtiqueta,
  setPaqueteServicios,
} from "@/actions/paquete-frontend.actions";
import {
  listServicios,
  createServicio,
} from "@/actions/catalogo-servicios.actions";
import { MediaPicker } from "@/app/backend/web/_components/MediaPicker";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedWarn } from "@/hooks/useUnsavedWarn";
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import { useEtiquetas } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePackageActions } from "@/components/providers/PackageProvider";
import type { EstadoPaquete } from "@/lib/types";

type Servicio = { id: string; nombre: string; icon: string; activo?: boolean };

type EtiquetaAssignment = {
  id: string;
  etiqueta: { id: string; nombre: string; slug: string; color: string };
};

// ---------------------------------------------------------------------------
// Estado options — pipeline visible to the operator. INACTIVO is intentionally
// absent: legacy rows still using it show up tagged "(legado)" in the list
// view, but new edits should only choose between the four canonical states.
// ---------------------------------------------------------------------------
const ESTADO_OPTIONS: { value: EstadoPaquete; label: string }[] = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "ACTIVO", label: "Activo" },
  { value: "ARCHIVADO", label: "Archivado" },
];

const hexToTagColor: Record<string, TagColor> = {
  "#22c55e": "green",
  "#06b6d4": "blue",
  "#8b5cf6": "violet",
  "#1e293b": "teal",
  "#f97316": "orange",
  "#ec4899": "red",
  "#3b82f6": "blue",
  "#14b8a6": "teal",
};

function getTagColor(hex: string): TagColor {
  return hexToTagColor[hex.toLowerCase()] ?? "teal";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function PublicacionTab({ paqueteId }: { paqueteId: string }) {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { updatePaquete: updatePaqueteCache } = usePackageActions();
  const allEtiquetas = useEtiquetas();

  const [data, setData] = useState<Awaited<
    ReturnType<typeof getPaqueteFrontendData>
  > | null>(null);
  const [catalog, setCatalog] = useState<Servicio[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignedEtiquetas, setAssignedEtiquetas] = useState<EtiquetaAssignment[]>([]);
  const [isPending, start] = useTransition();

  // Form: public-content fields (saved via updatePaqueteFrontend) + lifecycle
  // fields (saved via updatePaqueteLifecycle). Kept in one state object so the
  // sticky save bar and autosave work uniformly.
  const [form, setForm] = useState({
    slug: "",
    publicado: false,
    metaTitle: "",
    metaDescription: "",
    heroImage: "",
    textoIntro: "",
    textoIncluye: "",
    itinerarioPublico: "",
    textoCondiciones: "",
    // Lifecycle
    estado: "BORRADOR" as EstadoPaquete,
    destacado: false,
    validezDesde: "" as string | null,
    validezHasta: "" as string | null,
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
            textoIntro: d.textoIntro ?? "",
            textoIncluye: d.textoIncluye ?? "",
            itinerarioPublico: d.itinerarioPublico ?? "",
            textoCondiciones: d.textoCondiciones ?? "",
            estado: d.estado,
            destacado: d.destacado,
            validezDesde: d.validezDesde ?? "",
            validezHasta: d.validezHasta ?? "",
          });
          setSelected(d.serviciosIncluidos.map((x) => x.servicio.id));
          setAssignedEtiquetas(d.etiquetas);
        }
        setCatalog(s);
      },
    );
  }, [paqueteId]);

  const assignedEtiquetaIds = useMemo(
    () => new Set(assignedEtiquetas.map((pe) => pe.etiqueta.id)),
    [assignedEtiquetas],
  );

  const availableEtiquetas = useMemo(
    () => allEtiquetas.filter((e) => !assignedEtiquetaIds.has(e.id)),
    [allEtiquetas, assignedEtiquetaIds],
  );

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

  // ---------------------------------------------------------------------------
  // Save — frontend fields (slug/publicado/textos/SEO) + servicios. Lifecycle
  // fields go through their own action so we can keep the publish gate scoped
  // to publicado-only transitions.
  // ---------------------------------------------------------------------------
  const saveFrontend = useCallback(async () => {
    const res = await updatePaqueteFrontend(paqueteId, {
      slug: form.slug,
      publicado: form.publicado,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      heroImage: form.heroImage,
      textoIntro: form.textoIntro,
      textoIncluye: form.textoIncluye,
      itinerarioPublico: form.itinerarioPublico,
      textoCondiciones: form.textoCondiciones,
    });
    if (!res.ok && res.reason === "publish_blocked") {
      return { ok: false, missing: res.missing };
    }
    // Server may have auto-bumped estado to ACTIVO — reflect it locally.
    if (res.ok && form.publicado && form.estado !== "ACTIVO") {
      setForm((p) => ({ ...p, estado: "ACTIVO" }));
    }
    await setPaqueteServicios(
      paqueteId,
      selected.map((id, i) => ({ servicioId: id, orden: i })),
    );
    return { ok: true };
  }, [paqueteId, form, selected]);

  const onForceSave = () =>
    start(async () => {
      try {
        const res = await saveFrontend();
        if (!res.ok && res.missing) {
          toast(
            "warning",
            "No se puede publicar todavía",
            `Falta: ${res.missing.join("; ")}.`,
          );
          setForm((prev) => ({ ...prev, publicado: false }));
          return;
        }
        toast(
          "success",
          "Cambios guardados",
          "El sitio público se actualiza en menos de 1 minuto.",
        );
      } catch (e) {
        toast("error", "Error al guardar", (e as Error).message);
      }
    });

  // ---------------------------------------------------------------------------
  // Auto-save — refs let the debounced handler always read latest state
  // without re-creating the useAutoSave handler on every keystroke.
  // ---------------------------------------------------------------------------
  const formRef = useRef(form);
  const selectedRef = useRef(selected);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const handleAutoSave = useCallback(async () => {
    const f = formRef.current;
    const res = await updatePaqueteFrontend(paqueteId, {
      slug: f.slug,
      publicado: f.publicado,
      metaTitle: f.metaTitle,
      metaDescription: f.metaDescription,
      heroImage: f.heroImage,
      textoIntro: f.textoIntro,
      textoIncluye: f.textoIncluye,
      itinerarioPublico: f.itinerarioPublico,
      textoCondiciones: f.textoCondiciones,
    });
    if (!res.ok && res.reason === "publish_blocked") {
      toast(
        "warning",
        "No se puede publicar todavía",
        `Falta: ${res.missing.join("; ")}.`,
      );
      setForm((prev) => ({ ...prev, publicado: false }));
      return;
    }
    if (res.ok && formRef.current.publicado && formRef.current.estado !== "ACTIVO") {
      setForm((p) => ({ ...p, estado: "ACTIVO" }));
    }
    await setPaqueteServicios(
      paqueteId,
      selectedRef.current.map((id, i) => ({ servicioId: id, orden: i })),
    );
  }, [paqueteId, toast]);

  const { status: autoSaveStatus, markDirty } = useAutoSave({
    onSave: handleAutoSave,
    enabled: !!data,
  });

  // Warn the operator if they close the tab while autosave is mid-flight or
  // there are unsaved keystrokes pending the debounce.
  useUnsavedWarn(autoSaveStatus);

  const patch = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      markDirty();
    },
    [markDirty],
  );
  const patchSelected = useCallback(
    (next: string[]) => {
      setSelected(next);
      markDirty();
    },
    [markDirty],
  );

  // ---------------------------------------------------------------------------
  // Lifecycle handlers — fire-and-forget server calls (no debounce: estado is
  // a discrete pick, not a typing-stream). Failures surface as a toast.
  // ---------------------------------------------------------------------------
  const handleEstadoChange = (value: string) => {
    const newEstado = value as EstadoPaquete;
    setForm((p) => ({ ...p, estado: newEstado }));
    updatePaqueteLifecycle(paqueteId, { estado: newEstado })
      .then((r) => {
        if (r.unpublished) {
          setForm((p) => ({ ...p, publicado: false }));
          toast(
            "info",
            "Despublicado",
            `Se quitó del sitio público al cambiar el estado a ${newEstado}.`,
          );
        } else {
          toast("success", "Estado actualizado", `Nuevo estado: ${newEstado}`);
        }
      })
      .catch((e) => toast("error", "Error", (e as Error).message));
  };

  const handleDestacadoToggle = (checked: boolean) => {
    setForm((p) => ({ ...p, destacado: checked }));
    updatePaqueteLifecycle(paqueteId, { destacado: checked })
      .then(() =>
        toast(
          "success",
          checked ? "Marcado como destacado" : "Destacado removido",
        ),
      )
      .catch((e) => toast("error", "Error", (e as Error).message));
  };

  const handleValidezChange = (desde: string, hasta: string) => {
    if (!desde && !hasta) return;
    const next = {
      validezDesde: desde || form.validezDesde,
      validezHasta: hasta || form.validezHasta,
    };
    setForm((p) => ({ ...p, ...next }));
    updatePaqueteLifecycle(paqueteId, next)
      .then(() => toast("success", "Periodo de validez actualizado"))
      .catch((e) => toast("error", "Error", (e as Error).message));
  };

  const handleAddEtiqueta = async (etiquetaId: string) => {
    try {
      const created = await assignPaqueteEtiqueta(paqueteId, etiquetaId);
      const etiqueta = allEtiquetas.find((e) => e.id === etiquetaId);
      if (etiqueta) {
        setAssignedEtiquetas((prev) => [
          ...prev,
          {
            id: created.id,
            etiqueta: {
              id: etiqueta.id,
              nombre: etiqueta.nombre,
              slug: etiqueta.slug,
              color: etiqueta.color,
            },
          },
        ]);
      }
      toast("success", "Etiqueta asignada", etiqueta?.nombre ?? "");
    } catch (e) {
      toast("error", "Error", (e as Error).message);
    }
  };

  const handleRemoveEtiqueta = async (paqueteEtiquetaId: string) => {
    try {
      await removePaqueteEtiqueta(paqueteEtiquetaId);
      setAssignedEtiquetas((prev) =>
        prev.filter((pe) => pe.id !== paqueteEtiquetaId),
      );
      toast("info", "Etiqueta removida");
    } catch (e) {
      toast("error", "Error", (e as Error).message);
    }
  };

  if (!data) {
    return <div className="p-6 text-sm text-neutral-500">Cargando datos…</div>;
  }

  const previewUrl =
    form.publicado && form.slug ? `/destinos/ver/${form.slug}` : null;
  const disabled = !canEdit;

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Header / state bar */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Publicación
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Controlá si este paquete aparece en el sitio público y editá toda su
            ficha pública.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${
              form.publicado
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-neutral-100 text-neutral-600 ring-neutral-200"
            }`}
          >
            {form.publicado ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
            {form.publicado ? "Publicado" : "Borrador"}
          </span>
        </div>
      </div>

      {/* Section 1 — Estado y visibilidad */}
      <Section
        title="Estado y visibilidad"
        description="El estado describe en qué etapa del flujo interno está el paquete. El toggle Publicar lo hace visible (o no) en el sitio público; al publicar, si está en Borrador o En revisión, se pasa automáticamente a Activo."
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Slug (URL pública)
            </label>
            <div className="flex gap-2">
              <Input
                value={form.slug}
                onChange={(e) => patch("slug", slugify(e.target.value))}
                placeholder="ej. buzios-7-noches"
                className="flex-1"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => patch("slug", slugify(data.titulo))}
                className="text-[11px] text-violet-600 hover:underline px-2"
                title="Generar desde el título"
                disabled={disabled}
              >
                Auto
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 font-mono">
              /destinos/[región]/{form.slug || "<slug>"}
            </p>
          </div>
          <div className="flex items-center pt-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.publicado}
                onChange={(e) => patch("publicado", e.target.checked)}
                className="w-4 h-4 rounded text-violet-600"
                disabled={disabled}
              />
              <span className="text-sm text-neutral-700">
                Publicar en el sitio
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Estado del paquete
            </label>
            <Select
              value={form.estado}
              onValueChange={handleEstadoChange}
              options={ESTADO_OPTIONS}
              disabled={disabled}
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Workflow interno: Borrador → En revisión → Activo → Archivado.
            </p>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2">
              <Toggle
                checked={form.destacado}
                onCheckedChange={handleDestacadoToggle}
                disabled={disabled}
                label="Destacado en home"
              />
              <Star className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Periodo de validez
          </label>
          <PeriodPicker
            valueFrom={form.validezDesde ?? ""}
            valueTo={form.validezHasta ?? ""}
            onChange={handleValidezChange}
            disabled={disabled}
            placeholder="Seleccionar periodo de validez..."
          />
          <p className="text-[11px] text-neutral-500 mt-1">
            El paquete se auto-desactiva al llegar a la fecha "hasta".
          </p>
        </div>
      </Section>

      {/* Section 2 — Etiquetas */}
      <Section
        title="Etiquetas"
        description="Campañas, promociones y filtros que aplican a este paquete."
      >
        <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
          {assignedEtiquetas.length === 0 ? (
            <p className="text-[13px] text-neutral-400 italic">
              Sin etiquetas asignadas
            </p>
          ) : (
            assignedEtiquetas.map((pe) => (
              <Tag
                key={pe.id}
                color={getTagColor(pe.etiqueta.color)}
                removable={canEdit}
                onRemove={() => handleRemoveEtiqueta(pe.id)}
              >
                {pe.etiqueta.nombre}
              </Tag>
            ))
          )}
        </div>

        {canEdit && availableEtiquetas.length > 0 && (
          <div className="max-w-xs">
            <Select
              value=""
              onValueChange={handleAddEtiqueta}
              options={availableEtiquetas.map((e) => ({
                value: e.id,
                label: e.nombre,
              }))}
              placeholder="Agregar etiqueta..."
            />
          </div>
        )}
      </Section>

      {/* Section 3 — Slider de fotos (hero + galería) */}
      <Section
        title="Slider de fotos"
        description="El paquete muestra un carrusel de fotos en su detalle público. La foto principal aparece primero. Las fotos extra se administran en la pestaña Fotos."
      >
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Foto principal del slider
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (primera diapositiva del carrusel)
            </span>
          </label>
          <MediaPicker
            value={form.heroImage}
            onChange={(v) => patch("heroImage", v)}
            accept="image/*"
          />
        </div>

        {data.fotos.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-neutral-700 mb-2">
              Fotos del slider ({data.fotos.length})
              <span className="text-neutral-400 font-normal ml-1">
                — ya cargadas en la pestaña Fotos
              </span>
            </p>
            <div className="grid grid-cols-6 gap-2">
              {data.fotos.map((f) => {
                const active = form.heroImage === f.url;
                return (
                  <button
                    key={f.url}
                    type="button"
                    onClick={() => patch("heroImage", active ? "" : f.url)}
                    title={
                      active ? "Foto principal" : "Marcar como principal"
                    }
                    className={`relative aspect-[4/3] rounded-md border-2 overflow-hidden transition ${
                      active
                        ? "border-violet-500 ring-2 ring-violet-200"
                        : "border-transparent hover:border-neutral-300"
                    }`}
                  >
                    <img
                      src={f.url}
                      alt={f.alt}
                      className="w-full h-full object-cover"
                    />
                    {active && (
                      <span className="absolute top-1 right-1 bg-violet-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        PRINCIPAL
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Este paquete no tiene fotos en el slider todavía. Agregalas en la
            pestaña{" "}
            <a href={`?tab=fotos`} className="font-semibold underline">
              Fotos
            </a>{" "}
            y volvé acá para elegir la principal.
          </div>
        )}
      </Section>

      {/* Section 4 — Texto principal */}
      <Section
        title="Textos del paquete"
        description="Lo que el viajero ve al entrar al detalle."
      >
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Texto introductorio
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (sobre el destino, aparece arriba del itinerario)
            </span>
          </label>
          <textarea
            value={form.textoIntro}
            onChange={(e) => patch("textoIntro", e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            rows={6}
            placeholder="Por qué este destino, qué lo hace especial, etc."
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Itinerario público
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (día a día — distinto al itinerario interno Amadeus)
            </span>
          </label>
          <textarea
            value={form.itinerarioPublico}
            onChange={(e) => patch("itinerarioPublico", e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm leading-relaxed bg-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            rows={10}
            placeholder={`Día 1 — Llegada y traslado al hotel.\nDía 2 — City tour por el centro histórico.\nDía 3 — Excursión a las playas…`}
            disabled={disabled}
          />
        </div>
      </Section>

      {/* Section 5 — Incluye */}
      <Section
        title="Qué incluye"
        description="Servicios incluidos (con icono auto-detectado por palabra clave). Una línea = un bullet."
      >
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Lo que incluye
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (cada línea es un bullet — el icono se elige automáticamente: ✈ pasaje, 🧳 equipaje, 🚌 traslado, 🏨 alojamiento)
            </span>
          </label>
          <textarea
            value={form.textoIncluye}
            onChange={(e) => patch("textoIncluye", e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            rows={8}
            placeholder={`Pasaje aéreo Montevideo / Río de Janeiro / Montevideo\nCarry on de cabina\nTraslados aeropuerto / hotel / aeropuerto\n7 noches con régimen All Inclusive\nTasas e impuestos incluidos`}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            Servicios estructurados (catálogo)
            <span className="text-neutral-400 font-normal ml-2 text-xs">
              (opcional — para reusar servicios entre paquetes con icono fijo)
            </span>
          </label>
          <MultiSelectCombobox
            options={options}
            value={selected}
            onChange={patchSelected}
            placeholder="Agregar servicios del catálogo…"
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
            Si dejás esto vacío se usan los bullets del textarea de arriba. Gestioná el catálogo en{" "}
            <a
              href="/backend/catalogos/servicios"
              className="text-violet-600 hover:underline"
            >
              Catálogo de servicios
            </a>
            .
          </p>
        </div>
      </Section>

      {/* Section 6 — Condiciones */}
      <Section
        title="Condiciones específicas"
        description="Política de cancelación, pagos, requisitos especiales."
      >
        <textarea
          value={form.textoCondiciones}
          onChange={(e) => patch("textoCondiciones", e.target.value)}
          className="w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          rows={8}
          placeholder="Notas que aparecen al final del detalle. Si lo dejás vacío se muestran las condiciones generales del sitio."
          disabled={disabled}
        />
      </Section>

      {/* Section 7 — SEO */}
      <Section
        title="SEO"
        description="Cómo aparece en Google y al compartir en redes."
      >
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Meta title
          </label>
          <Input
            value={form.metaTitle}
            onChange={(e) => patch("metaTitle", e.target.value)}
            maxLength={60}
            placeholder={data.titulo}
            disabled={disabled}
          />
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {form.metaTitle.length}/60 — si lo dejás vacío, usa el título del paquete.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Meta description
          </label>
          <textarea
            value={form.metaDescription}
            onChange={(e) => patch("metaDescription", e.target.value)}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            rows={2}
            maxLength={160}
            placeholder="Resumen de hasta 160 caracteres para los resultados de búsqueda."
            disabled={disabled}
          />
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {form.metaDescription.length}/160
          </p>
        </div>

        {(form.metaTitle || form.metaDescription) && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 mt-3">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
              Vista previa SERP
            </p>
            <div className="text-blue-700 text-sm hover:underline cursor-pointer truncate">
              {form.metaTitle || data.titulo} — TravelOz
            </div>
            <div className="text-green-800 text-[11px] mt-0.5">
              traveloz.com.uy/destinos/.../{form.slug || "<slug>"}
            </div>
            {form.metaDescription && (
              <div className="text-neutral-600 text-[12px] mt-1 line-clamp-2">
                {form.metaDescription}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Sticky autosave bar */}
      <div className="sticky bottom-4 bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-lg shadow-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <AutoSaveIndicator status={autoSaveStatus} />
          <span>Los cambios se autoguardan; el sitio se actualiza en &lt; 1 min.</span>
        </div>
        <Button
          onClick={onForceSave}
          disabled={isPending || autoSaveStatus === "saving"}
          variant="secondary"
          size="sm"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Guardando…" : "Forzar guardado"}
        </Button>
      </div>
    </div>
  );
}
