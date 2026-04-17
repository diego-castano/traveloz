"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Layers,
  Utensils,
  Tag,
  Globe,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data/DataTable";
import {
  DataTableToolbar,
  DataTablePageHeader,
} from "@/components/ui/data/DataTableToolbar";
import { RowActions } from "@/components/ui/data/RowActions";
import { StatusDot } from "@/components/ui/data/StatusDot";
import { EmptyState } from "@/components/ui/data/EmptyState";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/Tabs";
import {
  useTemporadas,
  useTiposPaquete,
  useEtiquetas,
  useRegiones,
  useRegimenes,
  useCatalogActions,
  useCatalogLoading,
} from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { cn } from "@/components/lib/cn";
import type {
  Temporada,
  TipoPaquete,
  Etiqueta,
  Region,
  Pais,
  Ciudad,
  Regimen,
} from "@/lib/types";
import { CatalogEditor } from "./_components/CatalogEditor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ---------------------------------------------------------------------------
// TemporadasTab
// ---------------------------------------------------------------------------

function TemporadasTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const temporadas = useTemporadas();
  const { createTemporada, updateTemporada, deleteTemporada } =
    useCatalogActions();

  return (
    <CatalogEditor<Temporada>
      entityLabel="Temporada"
      entityLabelPlural="Temporadas"
      emptyIcon={Calendar}
      emptyTitle="No hay temporadas registradas"
      emptyDescription="Una temporada es un label administrable usado para clasificar paquetes por epoca del ano."
      rows={temporadas}
      columns={[
        { header: "Nombre", cell: (r) => r.nombre, variant: "primary" },
        {
          header: "Orden",
          cell: (r) => r.orden,
          variant: "mono",
          align: "right",
        },
        {
          header: "Estado",
          cell: (r) => (
            <StatusDot variant={r.activa ? "active" : "inactive"}>
              {r.activa ? "Activa" : "Inactiva"}
            </StatusDot>
          ),
        },
      ]}
      fields={[
        {
          key: "nombre",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "ej. Temporada Alta 2026",
          columns: 2,
          autoFocus: true,
        },
        {
          key: "orden",
          label: "Orden",
          type: "number",
          placeholder: "1",
        },
        { key: "activa", label: "Activa", type: "toggle" },
      ]}
      initialForm={() => ({
        nombre: "",
        orden: temporadas.length + 1,
        activa: true,
      })}
      fromRow={(r) => ({
        nombre: r.nombre,
        orden: r.orden,
        activa: r.activa,
      })}
      isValid={(f) => !!String(f.nombre ?? "").trim()}
      searchFilter={(r, q) => r.nombre.toLowerCase().includes(q)}
      searchPlaceholder="Buscar temporada..."
      onCreate={async (form) => {
        await createTemporada({
          brandId: activeBrandId,
          nombre: String(form.nombre),
          orden: Number(form.orden),
          activa: Boolean(form.activa),
        });
        toast(
          "success",
          "Temporada creada",
          `"${form.nombre}" fue creada correctamente`,
        );
      }}
      onUpdate={async (row, form) => {
        await updateTemporada({
          ...row,
          nombre: String(form.nombre),
          orden: Number(form.orden),
          activa: Boolean(form.activa),
        });
        toast(
          "success",
          "Temporada actualizada",
          `"${form.nombre}" fue actualizada correctamente`,
        );
      }}
      onDelete={async (row) => {
        await deleteTemporada(row.id);
        toast(
          "success",
          "Temporada eliminada",
          `"${row.nombre}" fue eliminada correctamente`,
        );
      }}
      canEdit={canEdit}
      pageSize={PAGE_SIZE}
    />
  );
}

// ---------------------------------------------------------------------------
// TiposPaqueteTab
// ---------------------------------------------------------------------------

function TiposPaqueteTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const tiposPaquete = useTiposPaquete();
  const { createTipoPaquete, updateTipoPaquete, deleteTipoPaquete } =
    useCatalogActions();

  return (
    <CatalogEditor<TipoPaquete>
      entityLabel="Tipo de paquete"
      entityLabelPlural="Tipos de paquete"
      emptyIcon={Layers}
      emptyTitle="No hay tipos de paquete registrados"
      emptyDescription="Los tipos de paquete clasifican la oferta (lunas de miel, grupales, familiares, etc)."
      rows={tiposPaquete}
      columns={[
        { header: "Nombre", cell: (r) => r.nombre, variant: "primary" },
        {
          header: "Orden",
          cell: (r) => r.orden,
          variant: "mono",
          align: "right",
        },
        {
          header: "Estado",
          cell: (r) => (
            <StatusDot variant={r.activo ? "active" : "inactive"}>
              {r.activo ? "Activo" : "Inactivo"}
            </StatusDot>
          ),
        },
      ]}
      fields={[
        {
          key: "nombre",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "ej. Lunas de miel",
          columns: 2,
          autoFocus: true,
        },
        {
          key: "orden",
          label: "Orden",
          type: "number",
          placeholder: "1",
        },
        { key: "activo", label: "Activo", type: "toggle" },
      ]}
      initialForm={() => ({
        nombre: "",
        orden: tiposPaquete.length + 1,
        activo: true,
      })}
      fromRow={(r) => ({
        nombre: r.nombre,
        orden: r.orden,
        activo: r.activo,
      })}
      isValid={(f) => !!String(f.nombre ?? "").trim()}
      searchFilter={(r, q) => r.nombre.toLowerCase().includes(q)}
      searchPlaceholder="Buscar tipo de paquete..."
      onCreate={async (form) => {
        await createTipoPaquete({
          brandId: activeBrandId,
          nombre: String(form.nombre),
          orden: Number(form.orden),
          activo: Boolean(form.activo),
        });
        toast(
          "success",
          "Tipo creado",
          `"${form.nombre}" fue creado correctamente`,
        );
      }}
      onUpdate={async (row, form) => {
        await updateTipoPaquete({
          ...row,
          nombre: String(form.nombre),
          orden: Number(form.orden),
          activo: Boolean(form.activo),
        });
        toast(
          "success",
          "Tipo actualizado",
          `"${form.nombre}" fue actualizado correctamente`,
        );
      }}
      onDelete={async (row) => {
        await deleteTipoPaquete(row.id);
        toast(
          "success",
          "Tipo eliminado",
          `"${row.nombre}" fue eliminado correctamente`,
        );
      }}
      canEdit={canEdit}
      pageSize={PAGE_SIZE}
    />
  );
}

// ---------------------------------------------------------------------------
// RegimenesTab
// ---------------------------------------------------------------------------

function RegimenesTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const regimenes = useRegimenes();
  const { createRegimen, updateRegimen, deleteRegimen } = useCatalogActions();

  return (
    <CatalogEditor<Regimen>
      entityLabel="Regimen"
      entityLabelPlural="Regimenes"
      emptyIcon={Utensils}
      emptyTitle="No hay regimenes registrados"
      emptyDescription="Los regimenes definen el plan de comidas (All Inclusive, Desayuno, Media Pension...)."
      rows={regimenes}
      columns={[
        { header: "Nombre", cell: (r) => r.nombre, variant: "primary" },
        {
          header: "Abreviatura",
          cell: (r) => r.abrev,
          variant: "mono",
        },
      ]}
      fields={[
        {
          key: "nombre",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "ej. All Inclusive",
          columns: 2,
          autoFocus: true,
        },
        {
          key: "abrev",
          label: "Abreviatura",
          type: "text",
          required: true,
          placeholder: "ej. AI",
          columns: 2,
        },
      ]}
      initialForm={() => ({ nombre: "", abrev: "" })}
      fromRow={(r) => ({ nombre: r.nombre, abrev: r.abrev })}
      isValid={(f) =>
        !!String(f.nombre ?? "").trim() && !!String(f.abrev ?? "").trim()
      }
      searchFilter={(r, q) =>
        r.nombre.toLowerCase().includes(q) || r.abrev.toLowerCase().includes(q)
      }
      searchPlaceholder="Buscar regimen..."
      onCreate={async (form) => {
        await createRegimen({
          brandId: activeBrandId,
          nombre: String(form.nombre),
          abrev: String(form.abrev),
        });
        toast(
          "success",
          "Regimen creado",
          `"${form.nombre}" fue creado correctamente`,
        );
      }}
      onUpdate={async (row, form) => {
        await updateRegimen({
          ...row,
          nombre: String(form.nombre),
          abrev: String(form.abrev),
        });
        toast(
          "success",
          "Regimen actualizado",
          `"${form.nombre}" fue actualizado correctamente`,
        );
      }}
      onDelete={async (row) => {
        await deleteRegimen(row.id);
        toast(
          "success",
          "Regimen eliminado",
          `"${row.nombre}" fue eliminado correctamente`,
        );
      }}
      canEdit={canEdit}
      pageSize={PAGE_SIZE}
    />
  );
}

// ---------------------------------------------------------------------------
// EtiquetasTab
// ---------------------------------------------------------------------------

function EtiquetasTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const etiquetas = useEtiquetas();
  const { createEtiqueta, updateEtiqueta, deleteEtiqueta } =
    useCatalogActions();

  return (
    <CatalogEditor<Etiqueta>
      entityLabel="Etiqueta"
      entityLabelPlural="Etiquetas"
      emptyIcon={Tag}
      emptyTitle="No hay etiquetas registradas"
      emptyDescription="Las etiquetas se usan para campanas y slugs (Black Week, Promo Nordeste, etc)."
      rows={etiquetas}
      columns={[
        {
          header: "Nombre",
          cell: (r) => (
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-neutral-200/60"
                style={{ background: r.color }}
              />
              <span className="font-semibold text-neutral-900">
                {r.nombre}
              </span>
            </div>
          ),
        },
        {
          header: "Slug",
          cell: (r) => r.slug,
          variant: "mono",
        },
      ]}
      fields={[
        {
          key: "nombre",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "ej. Black Week",
          columns: 2,
          autoFocus: true,
          onChangeSideEffect: (value) => ({ slug: slugify(value) }),
        },
        {
          key: "slug",
          label: "Slug",
          type: "text",
          required: true,
          placeholder: "ej. black-week",
          columns: 2,
        },
        {
          key: "color",
          label: "Color",
          type: "color",
          columns: 2,
        },
      ]}
      initialForm={() => ({ nombre: "", slug: "", color: "#8B5CF6" })}
      fromRow={(r) => ({ nombre: r.nombre, slug: r.slug, color: r.color })}
      isValid={(f) =>
        !!String(f.nombre ?? "").trim() && !!String(f.slug ?? "").trim()
      }
      searchFilter={(r, q) =>
        r.nombre.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
      }
      searchPlaceholder="Buscar etiqueta..."
      onCreate={async (form) => {
        await createEtiqueta({
          brandId: activeBrandId,
          nombre: String(form.nombre),
          slug: String(form.slug),
          color: String(form.color),
        });
        toast(
          "success",
          "Etiqueta creada",
          `"${form.nombre}" fue creada correctamente`,
        );
      }}
      onUpdate={async (row, form) => {
        await updateEtiqueta({
          ...row,
          nombre: String(form.nombre),
          slug: String(form.slug),
          color: String(form.color),
        });
        toast(
          "success",
          "Etiqueta actualizada",
          `"${form.nombre}" fue actualizada correctamente`,
        );
      }}
      onDelete={async (row) => {
        await deleteEtiqueta(row.id);
        toast(
          "success",
          "Etiqueta eliminada",
          `"${row.nombre}" fue eliminada correctamente`,
        );
      }}
      canEdit={canEdit}
      pageSize={PAGE_SIZE}
    />
  );
}

// ---------------------------------------------------------------------------
// RegionesPaisesTab — Region -> Pais -> Ciudad cascade (3 levels)
// ---------------------------------------------------------------------------

function slugifyRegion(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function RegionesPaisesTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const regiones = useRegiones();
  const {
    createRegion,
    updateRegion,
    deleteRegion,
    createPais,
    updatePais,
    deletePais,
    createCiudad,
    updateCiudad,
    deleteCiudad,
  } = useCatalogActions();

  // ---- Region modal state ----
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [editRegion, setEditRegion] = useState<Region | null>(null);
  const [regionForm, setRegionForm] = useState({ nombre: "", slug: "", orden: 0 });
  const [deleteRegionTarget, setDeleteRegionTarget] = useState<Region | null>(null);

  // ---- Pais modal state ----
  const [paisModalOpen, setPaisModalOpen] = useState(false);
  const [editPais, setEditPais] = useState<Pais | null>(null);
  const [createPaisInRegionId, setCreatePaisInRegionId] = useState<string | null>(null);
  const [deletePaisTarget, setDeletePaisTarget] = useState<
    (Pais & { ciudades: Ciudad[] }) | null
  >(null);
  const [paisForm, setPaisForm] = useState({
    nombre: "",
    codigo: "",
    regionId: "" as string,
  });

  const [isShaking, setIsShaking] = useState(false);

  // ---- List state ----
  const [search, setSearch] = useState("");
  const [expandedRegionIds, setExpandedRegionIds] = useState<Set<string>>(new Set());
  const [expandedPaisIds, setExpandedPaisIds] = useState<Set<string>>(new Set());

  // ---- Ciudad inline state ----
  const [addingCiudad, setAddingCiudad] = useState<string | null>(null);
  const [newCiudadNombre, setNewCiudadNombre] = useState("");
  const [editingCiudadId, setEditingCiudadId] = useState<string | null>(null);
  const [ciudadDraft, setCiudadDraft] = useState("");

  // Flat options for the Region <Select> inside the Pais modal
  const regionOptions = useMemo(
    () => regiones.map((r) => ({ value: r.id, label: r.nombre })),
    [regiones],
  );

  // Filter by search — matches any level (region / pais / ciudad). Keep parents
  // visible when a child matches so the user sees the breadcrumb context.
  const filteredRegiones = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regiones;
    return regiones
      .map((r) => {
        const regionHit = r.nombre.toLowerCase().includes(q);
        const paisesFiltered = r.paises
          .map((p) => {
            const paisHit =
              p.nombre.toLowerCase().includes(q) ||
              (p.codigo ?? "").toLowerCase().includes(q);
            const ciudadesFiltered = p.ciudades.filter((c) =>
              c.nombre.toLowerCase().includes(q),
            );
            if (regionHit || paisHit || ciudadesFiltered.length > 0) {
              return {
                ...p,
                ciudades:
                  regionHit || paisHit ? p.ciudades : ciudadesFiltered,
              };
            }
            return null;
          })
          .filter(Boolean) as typeof r.paises;
        if (regionHit || paisesFiltered.length > 0) {
          return { ...r, paises: regionHit ? r.paises : paisesFiltered };
        }
        return null;
      })
      .filter(Boolean) as typeof regiones;
  }, [regiones, search]);

  // ---- Region handlers ----

  function handleOpenCreateRegion() {
    setEditRegion(null);
    setRegionForm({ nombre: "", slug: "", orden: regiones.length + 1 });
    setRegionModalOpen(true);
  }

  function handleOpenEditRegion(r: Region) {
    setEditRegion(r);
    setRegionForm({ nombre: r.nombre, slug: r.slug, orden: r.orden });
    setRegionModalOpen(true);
  }

  async function handleSaveRegion(e?: React.FormEvent) {
    e?.preventDefault();
    const nombre = regionForm.nombre.trim();
    if (!nombre) return;
    const slug = regionForm.slug.trim() || slugifyRegion(nombre);
    if (editRegion) {
      await updateRegion({ ...editRegion, nombre, slug, orden: regionForm.orden });
      toast("success", "Region actualizada", `"${nombre}" fue actualizada correctamente`);
    } else {
      await createRegion({
        brandId: activeBrandId,
        nombre,
        slug,
        orden: regionForm.orden,
      });
      toast("success", "Region creada", `"${nombre}" fue creada correctamente`);
    }
    setRegionModalOpen(false);
  }

  async function handleConfirmDeleteRegion() {
    if (!deleteRegionTarget) return;
    const target = deleteRegionTarget;
    setIsShaking(true);
    setTimeout(async () => {
      try {
        await deleteRegion(target.id);
        toast("success", "Region eliminada", `"${target.nombre}" fue eliminada correctamente`);
        setDeleteRegionTarget(null);
      } catch (err) {
        toast(
          "error",
          "No se pudo eliminar",
          err instanceof Error ? err.message : "Intenta nuevamente",
        );
      } finally {
        setIsShaking(false);
      }
    }, 400);
  }

  // ---- Pais handlers ----

  function handleOpenCreatePais(regionId: string) {
    setEditPais(null);
    setCreatePaisInRegionId(regionId);
    setPaisForm({ nombre: "", codigo: "", regionId });
    setPaisModalOpen(true);
  }

  function handleOpenEditPais(p: Pais) {
    setEditPais(p);
    setCreatePaisInRegionId(null);
    setPaisForm({
      nombre: p.nombre,
      codigo: p.codigo ?? "",
      regionId: p.regionId ?? "",
    });
    setPaisModalOpen(true);
  }

  async function handleSavePais(e?: React.FormEvent) {
    e?.preventDefault();
    if (!paisForm.nombre.trim() || !paisForm.regionId) return;
    if (editPais) {
      await updatePais({
        ...editPais,
        nombre: paisForm.nombre,
        codigo: paisForm.codigo,
        regionId: paisForm.regionId,
      });
      toast("success", "Pais actualizado", `"${paisForm.nombre}" fue actualizado correctamente`);
    } else {
      await createPais({
        brandId: activeBrandId,
        nombre: paisForm.nombre,
        codigo: paisForm.codigo,
        regionId: paisForm.regionId,
      });
      toast("success", "Pais creado", `"${paisForm.nombre}" fue creado correctamente`);
    }
    setPaisModalOpen(false);
  }

  async function handleConfirmDeletePais() {
    if (!deletePaisTarget) return;
    const target = deletePaisTarget;
    setIsShaking(true);
    setTimeout(async () => {
      await Promise.all(target.ciudades.map((c) => deleteCiudad(c.id)));
      await deletePais(target.id);
      toast("success", "Pais eliminado", `"${target.nombre}" fue eliminado correctamente`);
      setDeletePaisTarget(null);
      setIsShaking(false);
      setExpandedPaisIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
    }, 400);
  }

  // ---- Ciudad handlers ----

  async function handleSaveCiudad(paisId: string) {
    if (!newCiudadNombre.trim()) return;
    await createCiudad({ paisId, nombre: newCiudadNombre.trim() });
    toast("success", "Ciudad agregada", `"${newCiudadNombre.trim()}" fue agregada correctamente`);
    setAddingCiudad(null);
    setNewCiudadNombre("");
  }

  async function handleSaveEditCiudad(ciudad: Ciudad) {
    if (!ciudadDraft.trim()) return;
    await updateCiudad({ ...ciudad, nombre: ciudadDraft.trim() });
    toast("success", "Ciudad actualizada", `"${ciudadDraft.trim()}" fue actualizada correctamente`);
    setEditingCiudadId(null);
    setCiudadDraft("");
  }

  async function handleDeleteCiudad(ciudad: Ciudad) {
    await deleteCiudad(ciudad.id);
    toast("success", "Ciudad eliminada", `"${ciudad.nombre}" fue eliminada correctamente`);
  }

  // ---- Expansion helpers ----
  const toggleRegion = (id: string) =>
    setExpandedRegionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePais = (id: string) =>
    setExpandedPaisIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const newRegionButton = canEdit ? (
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateRegion}>
      Nueva Region
    </Button>
  ) : undefined;

  return (
    <>
      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar region, pais o ciudad...",
        }}
        action={newRegionButton}
        className="mb-4"
      />

      {filteredRegiones.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={search ? "Sin resultados" : "No hay regiones registradas"}
          description={
            search
              ? `No encontramos regiones, paises o ciudades para "${search}".`
              : "Agrega una region para organizar paises, ciudades y destinos."
          }
          action={search ? undefined : newRegionButton}
        />
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-hairline bg-white">
          {filteredRegiones.map((region, idx) => {
            const regionExpanded = expandedRegionIds.has(region.id);
            return (
              <div
                key={region.id}
                className={cn(
                  "transition-colors",
                  idx > 0 && "border-t border-hairline",
                )}
              >
                {/* Region row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/60"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleRegion(region.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleRegion(region.id);
                    }
                  }}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                      regionExpanded && "rotate-90",
                    )}
                  />
                  <Globe className="h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-neutral-900">
                      {region.nombre}
                    </div>
                    <div className="text-[12px] text-neutral-500">
                      {region.paises.length} pais
                      {region.paises.length === 1 ? "" : "es"} ·{" "}
                      {region.paises.reduce((acc, p) => acc + p.ciudades.length, 0)} ciudades
                    </div>
                  </div>
                  {canEdit && (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => handleOpenCreatePais(region.id)}
                      >
                        Pais
                      </Button>
                      <RowActions
                        primary={{
                          icon: Pencil,
                          label: "Editar region",
                          onClick: () => handleOpenEditRegion(region),
                        }}
                        items={[
                          {
                            icon: Trash2,
                            label: "Eliminar region",
                            onClick: () => setDeleteRegionTarget(region),
                            destructive: true,
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* Paises inside region */}
                {regionExpanded && (
                  <div className="border-t border-hairline bg-neutral-50/30">
                    {region.paises.length === 0 ? (
                      <p className="px-8 py-3 text-[12.5px] text-neutral-400">
                        Sin paises asignados a esta region.
                      </p>
                    ) : (
                      region.paises.map((p) => {
                        const paisExpanded = expandedPaisIds.has(p.id);
                        return (
                          <div
                            key={p.id}
                            className="border-b border-hairline/60 last:border-b-0"
                          >
                            {/* Pais row */}
                            <div
                              className="flex items-center gap-3 px-8 py-2.5 hover:bg-neutral-100/60"
                              role="button"
                              tabIndex={0}
                              onClick={() => togglePais(p.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  togglePais(p.id);
                                }
                              }}
                            >
                              <ChevronRight
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform",
                                  paisExpanded && "rotate-90",
                                )}
                              />
                              <span className="text-[13.5px] font-medium text-neutral-800 flex-1 min-w-0">
                                {p.nombre}
                                {p.codigo && (
                                  <span className="ml-2 font-mono text-[11.5px] text-neutral-400">
                                    {p.codigo}
                                  </span>
                                )}
                              </span>
                              <span className="text-[12px] text-neutral-400 shrink-0">
                                {p.ciudades.length} ciudad
                                {p.ciudades.length === 1 ? "" : "es"}
                              </span>
                              {canEdit && (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <RowActions
                                    primary={{
                                      icon: Pencil,
                                      label: "Editar pais",
                                      onClick: () => handleOpenEditPais(p),
                                    }}
                                    items={[
                                      {
                                        icon: Trash2,
                                        label: "Eliminar pais",
                                        onClick: () => setDeletePaisTarget(p),
                                        destructive: true,
                                      },
                                    ]}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Ciudades inside pais */}
                            {paisExpanded && (
                              <div className="bg-white px-12 py-2">
                                {p.ciudades.length === 0 && addingCiudad !== p.id && (
                                  <p className="py-1.5 text-[12.5px] text-neutral-400">
                                    Sin ciudades registradas
                                  </p>
                                )}
                                {p.ciudades.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-neutral-100/60"
                                  >
                                    {editingCiudadId === c.id ? (
                                      <div className="flex flex-1 items-center gap-2">
                                        <Input
                                          size="sm"
                                          value={ciudadDraft}
                                          onChange={(e) => setCiudadDraft(e.target.value)}
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveEditCiudad(c);
                                            if (e.key === "Escape") {
                                              setEditingCiudadId(null);
                                              setCiudadDraft("");
                                            }
                                          }}
                                        />
                                        <Button
                                          variant="icon"
                                          size="xs"
                                          onClick={() => handleSaveEditCiudad(c)}
                                          aria-label="Guardar"
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="icon"
                                          size="xs"
                                          onClick={() => {
                                            setEditingCiudadId(null);
                                            setCiudadDraft("");
                                          }}
                                          aria-label="Cancelar"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-[13px] text-neutral-700">
                                          {c.nombre}
                                        </span>
                                        {canEdit && (
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="icon"
                                              size="xs"
                                              onClick={() => {
                                                setEditingCiudadId(c.id);
                                                setCiudadDraft(c.nombre);
                                                setAddingCiudad(null);
                                              }}
                                              aria-label="Editar ciudad"
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="icon"
                                              size="xs"
                                              onClick={() => handleDeleteCiudad(c)}
                                              aria-label="Eliminar ciudad"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ))}

                                {canEdit && (
                                  <>
                                    {addingCiudad === p.id ? (
                                      <div className="mt-2 flex items-center gap-2 px-2">
                                        <Input
                                          size="sm"
                                          value={newCiudadNombre}
                                          onChange={(e) => setNewCiudadNombre(e.target.value)}
                                          placeholder="Nombre de la ciudad"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveCiudad(p.id);
                                            if (e.key === "Escape") {
                                              setAddingCiudad(null);
                                              setNewCiudadNombre("");
                                            }
                                          }}
                                        />
                                        <Button
                                          variant="icon"
                                          size="xs"
                                          onClick={() => handleSaveCiudad(p.id)}
                                          aria-label="Guardar ciudad"
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="icon"
                                          size="xs"
                                          onClick={() => {
                                            setAddingCiudad(null);
                                            setNewCiudadNombre("");
                                          }}
                                          aria-label="Cancelar"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-1"
                                        onClick={() => {
                                          setAddingCiudad(p.id);
                                          setNewCiudadNombre("");
                                          setEditingCiudadId(null);
                                        }}
                                      >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Agregar ciudad
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Region Create / Edit modal */}
      <Modal open={regionModalOpen} onOpenChange={setRegionModalOpen} size="md">
        <ModalHeader
          title={editRegion ? "Editar Region" : "Nueva Region"}
          description={
            editRegion
              ? "Actualiza los datos de la region. Los paises asignados se mantendran."
              : "Agrupa paises bajo una region geografica (Europa, Caribe, etc)."
          }
          icon={
            editRegion ? (
              <Pencil className="h-5 w-5" strokeWidth={2.2} />
            ) : (
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            )
          }
        />
        <form onSubmit={handleSaveRegion}>
          <ModalBody>
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Nombre</FieldLabel>
                <Input
                  value={regionForm.nombre}
                  onChange={(e) =>
                    setRegionForm((f) => ({
                      ...f,
                      nombre: e.target.value,
                      slug: slugifyRegion(e.target.value),
                    }))
                  }
                  placeholder="ej. Caribe, Europa, Sudamerica"
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input
                  value={regionForm.slug}
                  onChange={(e) =>
                    setRegionForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="ej. caribe"
                />
              </Field>
              <Field>
                <FieldLabel>Orden</FieldLabel>
                <Input
                  type="number"
                  value={regionForm.orden}
                  onChange={(e) =>
                    setRegionForm((f) => ({
                      ...f,
                      orden: Number(e.target.value),
                    }))
                  }
                  placeholder="1"
                />
              </Field>
            </FieldGroup>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setRegionModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!regionForm.nombre.trim()}>
              {editRegion ? "Guardar cambios" : "Crear region"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Region Delete confirmation */}
      <Modal
        open={!!deleteRegionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRegionTarget(null);
            setIsShaking(false);
          }
        }}
        size="sm"
      >
        <ModalHeader
          title="Eliminar Region"
          description="Esta accion no se puede deshacer."
          icon={<Trash2 className="h-5 w-5" strokeWidth={2.2} />}
          variant="destructive"
        />
        <ModalBody>
          <motion.div
            animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-[14px] text-neutral-700">
              Vas a eliminar{" "}
              <span className="font-semibold text-neutral-900">
                {deleteRegionTarget?.nombre}
              </span>
              .
            </p>
            <p className="mt-2 text-[12.5px] text-neutral-500">
              Solo se puede eliminar una region que no tenga paises asignados.
            </p>
          </motion.div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteRegionTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDeleteRegion}>
            Eliminar definitivamente
          </Button>
        </ModalFooter>
      </Modal>

      {/* Pais Create / Edit modal */}
      <Modal open={paisModalOpen} onOpenChange={setPaisModalOpen} size="md">
        <ModalHeader
          title={editPais ? "Editar Pais" : "Nuevo Pais"}
          description={
            editPais
              ? "Actualiza los datos del pais. Las ciudades asociadas se mantendran."
              : "Registra un pais dentro de una region."
          }
          icon={
            editPais ? (
              <Pencil className="h-5 w-5" strokeWidth={2.2} />
            ) : (
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            )
          }
        />
        <form onSubmit={handleSavePais}>
          <ModalBody>
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Region</FieldLabel>
                <Select
                  value={paisForm.regionId}
                  onValueChange={(v) =>
                    setPaisForm((f) => ({ ...f, regionId: v }))
                  }
                  options={regionOptions}
                  placeholder="Seleccionar region..."
                  disabled={!!createPaisInRegionId && !editPais}
                />
              </Field>
              <Field span={2}>
                <FieldLabel required>Nombre</FieldLabel>
                <Input
                  value={paisForm.nombre}
                  onChange={(e) =>
                    setPaisForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  placeholder="ej. Argentina"
                  autoFocus
                />
              </Field>
              <Field span={2}>
                <FieldLabel>Codigo</FieldLabel>
                <Input
                  value={paisForm.codigo}
                  onChange={(e) =>
                    setPaisForm((f) => ({ ...f, codigo: e.target.value }))
                  }
                  placeholder="ej. UY, AR, BR"
                />
              </Field>
            </FieldGroup>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setPaisModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!paisForm.nombre.trim() || !paisForm.regionId}
            >
              {editPais ? "Guardar cambios" : "Crear pais"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Pais Delete confirmation modal */}
      <Modal
        open={!!deletePaisTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePaisTarget(null);
            setIsShaking(false);
          }
        }}
        size="sm"
      >
        <ModalHeader
          title="Eliminar Pais"
          description="Esta accion no se puede deshacer."
          icon={<Trash2 className="h-5 w-5" strokeWidth={2.2} />}
          variant="destructive"
        />
        <ModalBody>
          <motion.div
            animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-[14px] text-neutral-700">
              Vas a eliminar{" "}
              <span className="font-semibold text-neutral-900">
                {deletePaisTarget?.nombre}
              </span>
              .
            </p>
            {deletePaisTarget && deletePaisTarget.ciudades.length > 0 && (
              <p className="mt-2 text-[12.5px] text-amber-600">
                Se eliminaran {deletePaisTarget.ciudades.length} ciudades asociadas.
              </p>
            )}
            <p className="mt-2 text-[12.5px] text-neutral-500">
              Los paquetes vinculados mantendran su referencia historica.
            </p>
          </motion.div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeletePaisTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDeletePais}>
            Eliminar definitivamente
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// CatalogosPage (default export)
// ---------------------------------------------------------------------------

export default function CatalogosPage() {
  const loading = useCatalogLoading();

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <>
      <DataTablePageHeader
        title="Catalogos"
        subtitle="Temporadas, tipos de paquete, etiquetas, regiones y regimenes"
      />
      <Tabs defaultValue="temporadas" layoutId="catalogos-tabs">
        <TabsList className="mb-0">
          <TabsTrigger value="temporadas">Temporadas</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Paquete</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="regiones">Regiones y Paises</TabsTrigger>
          <TabsTrigger value="regimenes">Regimenes</TabsTrigger>
        </TabsList>
        <TabsContent value="temporadas">
          <TemporadasTab />
        </TabsContent>
        <TabsContent value="tipos">
          <TiposPaqueteTab />
        </TabsContent>
        <TabsContent value="etiquetas">
          <EtiquetasTab />
        </TabsContent>
        <TabsContent value="regiones">
          <RegionesPaisesTab />
        </TabsContent>
        <TabsContent value="regimenes">
          <RegimenesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
