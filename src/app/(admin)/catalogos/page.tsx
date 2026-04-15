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
  usePaises,
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
// PaisesTab — hand-rolled (nested Pais -> Ciudad cascade)
// ---------------------------------------------------------------------------

function PaisesTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const paises = usePaises();
  const {
    createPais,
    updatePais,
    deletePais,
    createCiudad,
    updateCiudad,
    deleteCiudad,
  } = useCatalogActions();

  // ---- Pais modal state ----
  const [paisModalOpen, setPaisModalOpen] = useState(false);
  const [editPais, setEditPais] = useState<Pais | null>(null);
  const [deletePaisTarget, setDeletePaisTarget] = useState<
    (Pais & { ciudades: Ciudad[] }) | null
  >(null);
  const [isShaking, setIsShaking] = useState(false);
  const [paisForm, setPaisForm] = useState({ nombre: "", codigo: "" });

  // ---- List state ----
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedPaisId, setExpandedPaisId] = useState<string | null>(null);

  // ---- Ciudad inline state ----
  const [addingCiudad, setAddingCiudad] = useState<string | null>(null);
  const [newCiudadNombre, setNewCiudadNombre] = useState("");
  const [editingCiudadId, setEditingCiudadId] = useState<string | null>(null);
  const [ciudadDraft, setCiudadDraft] = useState("");

  const filteredPaises = useMemo(() => {
    if (!search.trim()) return paises;
    const q = search.toLowerCase();
    return paises.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q),
    );
  }, [paises, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredPaises.length / PAGE_SIZE));
  const paginatedPaises = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPaises.slice(start, start + PAGE_SIZE);
  }, [filteredPaises, page]);

  // ---- Pais handlers ----

  function handleOpenCreatePais() {
    setEditPais(null);
    setPaisForm({ nombre: "", codigo: "" });
    setPaisModalOpen(true);
  }

  function handleOpenEditPais(p: Pais) {
    setEditPais(p);
    setPaisForm({ nombre: p.nombre, codigo: p.codigo });
    setPaisModalOpen(true);
  }

  async function handleSavePais(e?: React.FormEvent) {
    e?.preventDefault();
    if (!paisForm.nombre.trim()) return;
    if (editPais) {
      await updatePais({ ...editPais, ...paisForm });
      toast(
        "success",
        "Pais actualizado",
        `"${paisForm.nombre}" fue actualizado correctamente`,
      );
    } else {
      await createPais({ brandId: activeBrandId, ...paisForm });
      toast(
        "success",
        "Pais creado",
        `"${paisForm.nombre}" fue creado correctamente`,
      );
    }
    setPaisModalOpen(false);
  }

  function handleOpenDeletePais(p: Pais & { ciudades: Ciudad[] }) {
    setDeletePaisTarget(p);
  }

  async function handleConfirmDeletePais() {
    if (!deletePaisTarget) return;
    setIsShaking(true);
    const target = deletePaisTarget;
    setTimeout(async () => {
      // Cascade delete ciudades first
      await Promise.all(target.ciudades.map((c) => deleteCiudad(c.id)));
      await deletePais(target.id);
      toast(
        "success",
        "Pais eliminado",
        `"${target.nombre}" fue eliminado correctamente`,
      );
      setDeletePaisTarget(null);
      setIsShaking(false);
      if (expandedPaisId === target.id) setExpandedPaisId(null);
    }, 400);
  }

  // ---- Ciudad handlers ----

  async function handleSaveCiudad(paisId: string) {
    if (!newCiudadNombre.trim()) return;
    await createCiudad({ paisId, nombre: newCiudadNombre.trim() });
    toast(
      "success",
      "Ciudad agregada",
      `"${newCiudadNombre.trim()}" fue agregada correctamente`,
    );
    setAddingCiudad(null);
    setNewCiudadNombre("");
  }

  async function handleSaveEditCiudad(ciudad: Ciudad) {
    if (!ciudadDraft.trim()) return;
    await updateCiudad({ ...ciudad, nombre: ciudadDraft.trim() });
    toast(
      "success",
      "Ciudad actualizada",
      `"${ciudadDraft.trim()}" fue actualizada correctamente`,
    );
    setEditingCiudadId(null);
    setCiudadDraft("");
  }

  async function handleDeleteCiudad(ciudad: Ciudad) {
    await deleteCiudad(ciudad.id);
    toast(
      "success",
      "Ciudad eliminada",
      `"${ciudad.nombre}" fue eliminada correctamente`,
    );
  }

  const newPaisButton = canEdit ? (
    <Button
      leftIcon={<Plus className="h-4 w-4" />}
      onClick={handleOpenCreatePais}
    >
      Nuevo Pais
    </Button>
  ) : undefined;

  return (
    <>
      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar pais o codigo...",
        }}
        action={newPaisButton}
        className="mb-4"
      />

      {filteredPaises.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No hay paises registrados"
          description="Agrega un pais para organizar ciudades y destinos."
          action={newPaisButton}
        />
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead className="w-8"></DataTableHead>
                <DataTableHead>Nombre</DataTableHead>
                <DataTableHead>Codigo</DataTableHead>
                <DataTableHead>Ciudades</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedPaises.map((p) => (
                <PaisRow
                  key={p.id}
                  pais={p}
                  canEdit={canEdit}
                  expanded={expandedPaisId === p.id}
                  onToggleExpand={() =>
                    setExpandedPaisId(expandedPaisId === p.id ? null : p.id)
                  }
                  onEdit={() => handleOpenEditPais(p)}
                  onDelete={() => handleOpenDeletePais(p)}
                  addingCiudad={addingCiudad}
                  newCiudadNombre={newCiudadNombre}
                  setNewCiudadNombre={setNewCiudadNombre}
                  onStartAddCiudad={() => {
                    setAddingCiudad(p.id);
                    setNewCiudadNombre("");
                    setEditingCiudadId(null);
                  }}
                  onCancelAddCiudad={() => {
                    setAddingCiudad(null);
                    setNewCiudadNombre("");
                  }}
                  onSaveNewCiudad={() => handleSaveCiudad(p.id)}
                  editingCiudadId={editingCiudadId}
                  ciudadDraft={ciudadDraft}
                  setCiudadDraft={setCiudadDraft}
                  onStartEditCiudad={(c) => {
                    setEditingCiudadId(c.id);
                    setCiudadDraft(c.nombre);
                    setAddingCiudad(null);
                  }}
                  onCancelEditCiudad={() => {
                    setEditingCiudadId(null);
                    setCiudadDraft("");
                  }}
                  onSaveEditCiudad={handleSaveEditCiudad}
                  onDeleteCiudad={handleDeleteCiudad}
                />
              ))}
            </DataTableBody>
          </DataTable>

          {totalPages > 1 && (
            <div className="mt-5 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Pais Create / Edit modal */}
      <Modal open={paisModalOpen} onOpenChange={setPaisModalOpen} size="md">
        <ModalHeader
          title={editPais ? "Editar Pais" : "Nuevo Pais"}
          description={
            editPais
              ? "Actualiza los datos del pais. Las ciudades asociadas se mantendran."
              : "Registra un pais que puedas usar para organizar destinos y ciudades."
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPaisModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!paisForm.nombre.trim()}>
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
            animate={
              isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}
            }
            transition={
              isShaking ? interactions.deleteShake.transition : undefined
            }
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
                Se eliminaran {deletePaisTarget.ciudades.length} ciudades
                asociadas.
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
// PaisRow — isolated subcomponent (table row + expandable ciudades panel)
// ---------------------------------------------------------------------------

interface PaisRowProps {
  pais: Pais & { ciudades: Ciudad[] };
  canEdit: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;

  addingCiudad: string | null;
  newCiudadNombre: string;
  setNewCiudadNombre: (v: string) => void;
  onStartAddCiudad: () => void;
  onCancelAddCiudad: () => void;
  onSaveNewCiudad: () => void;

  editingCiudadId: string | null;
  ciudadDraft: string;
  setCiudadDraft: (v: string) => void;
  onStartEditCiudad: (c: Ciudad) => void;
  onCancelEditCiudad: () => void;
  onSaveEditCiudad: (c: Ciudad) => void;
  onDeleteCiudad: (c: Ciudad) => void;
}

function PaisRow({
  pais: p,
  canEdit,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  addingCiudad,
  newCiudadNombre,
  setNewCiudadNombre,
  onStartAddCiudad,
  onCancelAddCiudad,
  onSaveNewCiudad,
  editingCiudadId,
  ciudadDraft,
  setCiudadDraft,
  onStartEditCiudad,
  onCancelEditCiudad,
  onSaveEditCiudad,
  onDeleteCiudad,
}: PaisRowProps) {
  return (
    <>
      <DataTableRow onClick={onEdit} interactive>
        <DataTableCell className="w-8">
          <button
            type="button"
            className="flex items-center text-neutral-400 transition-colors hover:text-neutral-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={expanded ? "Colapsar ciudades" : "Expandir ciudades"}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        </DataTableCell>
        <DataTableCell variant="primary">{p.nombre}</DataTableCell>
        <DataTableCell variant="mono">{p.codigo}</DataTableCell>
        <DataTableCell variant="muted">
          {p.ciudades.length} ciudades
        </DataTableCell>
        <DataTableCell align="right">
          <RowActions
            primary={{
              icon: Pencil,
              label: "Editar",
              onClick: () => onEdit(),
            }}
            items={
              canEdit
                ? [
                    {
                      icon: Trash2,
                      label: "Eliminar",
                      onClick: () => onDelete(),
                      destructive: true,
                    },
                  ]
                : []
            }
          />
        </DataTableCell>
      </DataTableRow>

      {expanded && (
        <tr>
          <td
            colSpan={5}
            className="border-b border-hairline bg-neutral-50/40 px-8 py-3"
          >
            {p.ciudades.length === 0 && addingCiudad !== p.id && (
              <p className="py-2 text-[12.5px] text-neutral-400">
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
                        if (e.key === "Enter") onSaveEditCiudad(c);
                        if (e.key === "Escape") onCancelEditCiudad();
                      }}
                    />
                    <Button
                      variant="icon"
                      size="xs"
                      onClick={() => onSaveEditCiudad(c)}
                      aria-label="Guardar"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="icon"
                      size="xs"
                      onClick={onCancelEditCiudad}
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
                          onClick={() => onStartEditCiudad(c)}
                          aria-label="Editar ciudad"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={() => onDeleteCiudad(c)}
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
                        if (e.key === "Enter") onSaveNewCiudad();
                        if (e.key === "Escape") onCancelAddCiudad();
                      }}
                    />
                    <Button
                      variant="icon"
                      size="xs"
                      onClick={onSaveNewCiudad}
                      aria-label="Guardar ciudad"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="icon"
                      size="xs"
                      onClick={onCancelAddCiudad}
                      aria-label="Cancelar"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={onStartAddCiudad}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Agregar ciudad
                  </Button>
                )}
              </>
            )}
          </td>
        </tr>
      )}
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
        subtitle="Temporadas, tipos de paquete, etiquetas, paises y regimenes"
      />
      <Tabs defaultValue="temporadas" layoutId="catalogos-tabs">
        <TabsList className="mb-0">
          <TabsTrigger value="temporadas">Temporadas</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Paquete</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="paises">Paises y Ciudades</TabsTrigger>
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
        <TabsContent value="paises">
          <PaisesTab />
        </TabsContent>
        <TabsContent value="regimenes">
          <RegimenesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
