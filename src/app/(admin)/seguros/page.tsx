"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Eye, Pencil, Copy, Trash2, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
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
import { formatCurrency } from "@/lib/utils";
import type { Seguro } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

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
    const q = search.toLowerCase();
    return seguros.filter(
      (s) =>
        s.plan.toLowerCase().includes(q) ||
        s.cobertura.toLowerCase().includes(q) ||
        (proveedorMap[s.proveedorId] ?? "").toLowerCase().includes(q),
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

  function handleSave() {
    if (editTarget) {
      updateSeguro({ ...editTarget, ...form });
      toast("success", "Seguro actualizado", `"${form.plan}" fue actualizado correctamente`);
    } else {
      createSeguro({ brandId: activeBrandId, ...form });
      toast("success", "Seguro creado", `"${form.plan}" fue creado correctamente`);
    }
    setModalOpen(false);
  }

  function handleClone(e: React.MouseEvent, s: Seguro) {
    e.stopPropagation();
    createSeguro({
      brandId: s.brandId,
      proveedorId: s.proveedorId,
      plan: `Copia de ${s.plan}`,
      cobertura: s.cobertura,
      costoPorDia: s.costoPorDia,
    });
    toast("success", "Seguro clonado", `Se creo una copia de "${s.plan}"`);
  }

  function handleOpenDelete(e: React.MouseEvent, s: Seguro) {
    e.stopPropagation();
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

  return (
    <>
      <PageHeader
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

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        onFilterToggle={() => undefined}
        placeholder="Buscar por plan, cobertura o proveedor..."
        className="mb-6"
      />

      {filteredSeguros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <ShieldCheck className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay seguros registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Cobertura</TableHead>
                <TableHead>Costo/Dia (USD)</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSeguros.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{proveedorMap[s.proveedorId] ?? "—"}</TableCell>
                  <TableCell className="font-medium text-neutral-800">
                    {s.plan}
                    {(paqueteCountMap[s.id] ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-brand-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-teal-400">
                        {paqueteCountMap[s.id]} paq.
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{s.cobertura}</TableCell>
                  <TableCell>{formatCurrency(s.costoPorDia)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={() => handleOpenEdit(s)}
                        aria-label="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={() => handleOpenEdit(s)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleClone(e, s)}
                            aria-label="Clonar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, s)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-center">
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
          <div className="flex flex-col gap-4">
            <Select
              label="Proveedor"
              options={proveedoresSeguros.map((p) => ({ value: p.id, label: p.nombre }))}
              value={form.proveedorId}
              onValueChange={(v) => setForm((f) => ({ ...f, proveedorId: v }))}
              placeholder="Seleccionar proveedor..."
            />
            <Input
              label="Plan"
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              placeholder="ej. Plan Clasico"
            />
            <Input
              label="Cobertura"
              value={form.cobertura}
              onChange={(e) => setForm((f) => ({ ...f, cobertura: e.target.value }))}
              placeholder="ej. USD 40.000"
            />
            <Input
              label="Costo/Dia (USD)"
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
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.plan.trim() || !form.proveedorId}
          >
            {editTarget ? "Guardar" : "Crear"}
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
