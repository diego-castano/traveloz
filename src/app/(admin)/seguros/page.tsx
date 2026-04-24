"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Copy, Trash2, ShieldCheck } from "lucide-react";
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
import { EmptyState } from "@/components/ui/data/EmptyState";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import {
  useSeguros,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import {
  useProveedores,
} from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useServiceLoading } from "@/components/providers/ServiceProvider";
import { formatCurrency } from "@/lib/utils";
import type { Seguro } from "@/lib/types";
import { matchesSearch } from "@/lib/search";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

function nullableId(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

// ---------------------------------------------------------------------------
// SegurosPage
// ---------------------------------------------------------------------------

export default function SegurosPage() {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();

  // Data hooks
  const seguros = useSeguros();
  const { createSeguro, updateSeguro, deleteSeguro } = useServiceActions();
  const allProveedores = useProveedores();
  const proveedoresSeguros = useMemo(
    () => allProveedores.filter((p) => p.servicio === "SEGUROS" && !p.deletedAt),
    [allProveedores],
  );
  const packageState = usePackageState();
  const loading = useServiceLoading();

  // Package usage count map
  const paqueteCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    for (const pa of packageState.paqueteSeguros) {
      const key = `${pa.seguroId}::${pa.paqueteId}`;
      if (!seen.has(key)) {
        seen.add(key);
        map[pa.seguroId] = (map[pa.seguroId] ?? 0) + 1;
      }
    }
    return map;
  }, [packageState.paqueteSeguros]);

  // Proveedor lookup map for O(1) display in table (use allProveedores for name resolution)
  const proveedorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allProveedores) {
      map[p.id] = p.nombre;
    }
    return map;
  }, [allProveedores]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Seguro | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Seguro | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    proveedorId: "",
    plan: "",
    cobertura: "",
    costoPorDia: 0,
  });

  // List state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredSeguros = useMemo(() => {
    if (!search.trim()) return seguros;
    return seguros.filter((s) =>
      matchesSearch(search, s.plan, s.cobertura, proveedorMap[s.proveedorId]),
    );
  }, [seguros, search, proveedorMap]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredSeguros.length / PAGE_SIZE);

  const paginatedSeguros = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSeguros.slice(start, start + PAGE_SIZE);
  }, [filteredSeguros, page]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpenCreate() {
    setEditTarget(null);
    setForm({ proveedorId: "", plan: "", cobertura: "", costoPorDia: 0 });
    setModalOpen(true);
  }

  function handleOpenEdit(s: Seguro) {
    setEditTarget(s);
    setForm({
      proveedorId: s.proveedorId,
      plan: s.plan,
      cobertura: s.cobertura,
      costoPorDia: s.costoPorDia,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const payload = {
      proveedorId: nullableId(form.proveedorId),
      plan: form.plan.trim(),
      cobertura: form.cobertura.trim() || null,
      costoPorDia: form.costoPorDia,
    };

    setSaving(true);
    try {
      if (editTarget) {
        await updateSeguro({ ...editTarget, ...payload } as any);
        toast("success", "Seguro actualizado", `"${payload.plan}" fue actualizado correctamente`);
      } else {
        await createSeguro({ brandId: activeBrandId, ...payload } as any);
        setPage(1);
        setSearch("");
        toast("success", "Seguro creado", `"${payload.plan}" fue creado correctamente`);
      }
      setModalOpen(false);
    } catch (err) {
      toast(
        "error",
        "Error al guardar",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClone(s: Seguro) {
    createSeguro({
      brandId: s.brandId,
      proveedorId: s.proveedorId,
      plan: `Copia de ${s.plan}`,
      cobertura: s.cobertura,
      costoPorDia: s.costoPorDia,
    });
    toast("success", "Seguro clonado", `Se creo una copia de "${s.plan}"`);
  }

  function handleOpenDelete(s: Seguro) {
    setDeleteTarget(s);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteSeguro(deleteTarget.id);
      toast("success", "Seguro eliminado", `"${deleteTarget.plan}" fue eliminado correctamente`);
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
        title="Seguros"
        subtitle="Gestion de seguros de viaje"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Nuevo Seguro
            </Button>
          ) : undefined
        }
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por plan, cobertura o proveedor...",
        }}
        className="mb-4"
      />

      {filteredSeguros.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No hay seguros registrados"
          description="Registra un plan de seguro de viaje para poder asignarlo a paquetes."
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreate}
              >
                Nuevo Seguro
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead>Proveedor</DataTableHead>
                <DataTableHead>Plan</DataTableHead>
                <DataTableHead>Cobertura</DataTableHead>
                <DataTableHead align="right">Costo/Dia (USD)</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedSeguros.map((s) => (
                <DataTableRow
                  key={s.id}
                  onClick={() => handleOpenEdit(s)}
                  interactive
                >
                  <DataTableCell variant="muted">
                    {proveedorMap[s.proveedorId] ?? "—"}
                  </DataTableCell>
                  <DataTableCell variant="muted">{s.plan}</DataTableCell>
                  <DataTableCell variant="primary">
                    {s.cobertura}
                    {(paqueteCountMap[s.id] ?? 0) > 0 && (
                      <span className="ml-2 font-mono text-[10.5px] text-neutral-400">
                        {paqueteCountMap[s.id]} paq.
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell variant="price" align="right">
                    {formatCurrency(s.costoPorDia)}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => handleOpenEdit(s),
                      }}
                      items={
                        canEdit
                          ? [
                              {
                                icon: Copy,
                                label: "Clonar",
                                onClick: () => handleClone(s),
                              },
                              {
                                icon: Trash2,
                                label: "Eliminar",
                                onClick: () => handleOpenDelete(s),
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
        <ModalHeader title={editTarget ? "Editar Seguro" : "Nuevo Seguro"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <FieldGroup columns={2}>
            <Field span={2}>
              <FieldLabel>Proveedor</FieldLabel>
              <Select
                options={proveedoresSeguros.map((p) => ({ value: p.id, label: p.nombre }))}
                value={form.proveedorId}
                onValueChange={(v) => setForm((f) => ({ ...f, proveedorId: v }))}
                placeholder="Seleccionar proveedor..."
              />
            </Field>
            <Field>
              <FieldLabel>Plan</FieldLabel>
              <Input
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                placeholder="ej. Plan Clasico"
              />
            </Field>
            <Field>
              <FieldLabel>Cobertura</FieldLabel>
              <Input
                value={form.cobertura}
                onChange={(e) => setForm((f) => ({ ...f, cobertura: e.target.value }))}
                placeholder="ej. USD 40.000"
              />
            </Field>
            <Field span={2}>
              <FieldLabel>Costo/Dia (USD)</FieldLabel>
              <Input
                type="number"
                value={form.costoPorDia === 0 ? "" : String(form.costoPorDia)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    costoPorDia: e.target.value === "" ? 0 : Number(e.target.value),
                  }))
                }
                placeholder="0"
              />
            </Field>
          </FieldGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.plan.trim() || !form.proveedorId}
          >
            {saving ? "Guardando..." : editTarget ? "Guardar" : "Crear"}
          </Button>
        </ModalFooter>
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
        <ModalHeader title="Eliminar Seguro">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={
              isShaking
                ? { x: [...interactions.deleteShake.animate.x] }
                : {}
            }
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-neutral-700">
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.plan}&rdquo;?
            </p>
            <p className="text-sm text-neutral-400 mt-2">
              Esta accion no se puede deshacer.
            </p>
          </motion.div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
