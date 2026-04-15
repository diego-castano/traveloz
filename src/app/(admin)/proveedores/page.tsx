"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  Building2,
  Bus,
  ShieldCheck,
  Map,
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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/form/Field";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import {
  useProveedores,
  useCatalogActions,
  useCatalogLoading,
} from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import type { Proveedor, CategoriaServicio } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const SERVICE_FILTERS = [
  { key: "TRASLADOS", label: "Traslados", icon: Bus },
  { key: "SEGUROS", label: "Seguros", icon: ShieldCheck },
  { key: "CIRCUITOS", label: "Circuitos", icon: Map },
];

const SERVICE_LABEL: Record<CategoriaServicio, string> = {
  TRASLADOS: "Traslados",
  SEGUROS: "Seguros",
  CIRCUITOS: "Circuitos",
};

// ---------------------------------------------------------------------------
// ProveedoresPage
// ---------------------------------------------------------------------------

export default function ProveedoresPage() {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();

  // Data hooks
  const proveedores = useProveedores();
  const { createProveedor, updateProveedor, deleteProveedor } =
    useCatalogActions();
  const loading = useCatalogLoading();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Proveedor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Proveedor | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Form state
  const [form, setForm] = useState({
    nombre: "",
    contacto: "",
    email: "",
    telefono: "",
    notas: "",
    servicio: "SEGUROS" as CategoriaServicio,
  });

  // List state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtroServicio, setFiltroServicio] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filteredProveedores = useMemo(() => {
    return proveedores.filter((p) => {
      if (filtroServicio && p.servicio !== filtroServicio) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.nombre.toLowerCase().includes(q) &&
          !(p.email ?? "").toLowerCase().includes(q) &&
          !(p.contacto ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [proveedores, search, filtroServicio]);

  useEffect(() => {
    setPage(1);
  }, [search, filtroServicio]);

  const totalPages = Math.ceil(filteredProveedores.length / PAGE_SIZE);

  const paginatedProveedores = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProveedores.slice(start, start + PAGE_SIZE);
  }, [filteredProveedores, page]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpenCreate() {
    setEditTarget(null);
    setForm({
      nombre: "",
      contacto: "",
      email: "",
      telefono: "",
      notas: "",
      servicio: "SEGUROS",
    });
    setModalOpen(true);
  }

  function handleOpenEdit(p: Proveedor) {
    setEditTarget(p);
    setForm({
      nombre: p.nombre,
      contacto: p.contacto ?? "",
      email: p.email ?? "",
      telefono: p.telefono ?? "",
      notas: p.notas ?? "",
      servicio: p.servicio,
    });
    setModalOpen(true);
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.nombre.trim()) return;
    if (editTarget) {
      await updateProveedor({ ...editTarget, ...form });
      toast(
        "success",
        "Proveedor actualizado",
        `"${form.nombre}" fue actualizado correctamente`,
      );
    } else {
      await createProveedor({ brandId: activeBrandId, ...form });
      toast(
        "success",
        "Proveedor creado",
        `"${form.nombre}" fue creado correctamente`,
      );
    }
    setModalOpen(false);
  }

  async function handleClone(p: Proveedor) {
    await createProveedor({
      brandId: p.brandId,
      nombre: `Copia de ${p.nombre}`,
      contacto: p.contacto ?? "",
      email: p.email ?? "",
      telefono: p.telefono ?? "",
      notas: p.notas ?? "",
      servicio: p.servicio,
    });
    toast("success", "Proveedor clonado", `Se creo una copia de "${p.nombre}"`);
  }

  function handleOpenDelete(p: Proveedor) {
    setDeleteTarget(p);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(async () => {
      await deleteProveedor(deleteTarget.id);
      toast(
        "success",
        "Proveedor eliminado",
        `"${deleteTarget.nombre}" fue eliminado correctamente`,
      );
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <>
      <DataTablePageHeader
        title="Proveedores"
        subtitle="Proveedores de traslados, seguros y circuitos"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Nuevo Proveedor
            </Button>
          ) : undefined
        }
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por nombre, contacto o email...",
        }}
        filters={SERVICE_FILTERS}
        activeFilter={filtroServicio}
        onFilterChange={setFiltroServicio}
        className="mb-4"
      />

      {filteredProveedores.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hay proveedores registrados"
          description="Registra un proveedor para poder asignarlo a traslados, seguros o circuitos."
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreate}
              >
                Nuevo Proveedor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead>Nombre</DataTableHead>
                <DataTableHead>Servicio</DataTableHead>
                <DataTableHead>Contacto</DataTableHead>
                <DataTableHead>Email</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedProveedores.map((p) => (
                <DataTableRow
                  key={p.id}
                  onClick={() => handleOpenEdit(p)}
                  interactive
                >
                  <DataTableCell variant="primary">{p.nombre}</DataTableCell>
                  <DataTableCell>
                    <StatusDot
                      variant={
                        p.servicio === "TRASLADOS"
                          ? "active"
                          : p.servicio === "SEGUROS"
                            ? "draft"
                            : "pending"
                      }
                    >
                      {SERVICE_LABEL[p.servicio]}
                    </StatusDot>
                  </DataTableCell>
                  <DataTableCell variant="muted">
                    {p.contacto ?? "—"}
                  </DataTableCell>
                  <DataTableCell variant="muted">
                    {p.email ?? "—"}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => handleOpenEdit(p),
                      }}
                      items={
                        canEdit
                          ? [
                              {
                                icon: Copy,
                                label: "Clonar",
                                onClick: () => handleClone(p),
                              },
                              {
                                icon: Trash2,
                                label: "Eliminar",
                                onClick: () => handleOpenDelete(p),
                                destructive: true,
                              },
                            ]
                          : []
                      }
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>

          <div className="mt-5 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="md">
        <ModalHeader
          title={editTarget ? "Editar Proveedor" : "Nuevo Proveedor"}
          description={
            editTarget
              ? "Actualiza los datos del proveedor. Los servicios vinculados mantendran la relacion."
              : "Registra un proveedor que puedas asignar a traslados, seguros o circuitos."
          }
          icon={<Plus className="h-5 w-5" strokeWidth={2.4} />}
        />
        <form onSubmit={handleSave}>
          <ModalBody>
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Nombre</FieldLabel>
                <Input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  placeholder="Nombre del proveedor"
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel>Servicio</FieldLabel>
                <Select
                  value={form.servicio}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      servicio: v as CategoriaServicio,
                    }))
                  }
                  options={[
                    { value: "TRASLADOS", label: "Traslados" },
                    { value: "SEGUROS", label: "Seguros" },
                    { value: "CIRCUITOS", label: "Circuitos" },
                  ]}
                />
              </Field>
              <Field>
                <FieldLabel>Contacto</FieldLabel>
                <Input
                  value={form.contacto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contacto: e.target.value }))
                  }
                  placeholder="Nombre del contacto"
                />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="contacto@proveedor.com"
                />
              </Field>
              <Field>
                <FieldLabel>Telefono</FieldLabel>
                <Input
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  placeholder="+598 9 123 4567"
                />
              </Field>
              <Field span={2}>
                <FieldLabel>Notas</FieldLabel>
                <Input
                  value={form.notas}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notas: e.target.value }))
                  }
                  placeholder="Notas internas sobre el proveedor"
                />
              </Field>
            </FieldGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!form.nombre.trim()}>
              {editTarget ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setIsShaking(false);
          }
        }}
        size="sm"
      >
        <ModalHeader
          title="Eliminar Proveedor"
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
                {deleteTarget?.nombre}
              </span>
              .
            </p>
            <p className="mt-2 text-[12.5px] text-neutral-500">
              Los traslados, seguros o circuitos que lo tengan vinculado
              mantendran la referencia historica pero no podras asignarlo a
              nuevos servicios.
            </p>
          </motion.div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Eliminar definitivamente
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
