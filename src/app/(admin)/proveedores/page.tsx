"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Eye, Pencil, Copy, Trash2, Building2 } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Input } from "@/components/ui/Input";
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
  useProveedores,
  useCatalogActions,
} from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import type { Proveedor } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// ProveedoresPage
// ---------------------------------------------------------------------------

export default function ProveedoresPage() {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();

  // Data hooks
  const proveedores = useProveedores();
  const { createProveedor, updateProveedor, deleteProveedor } = useCatalogActions();

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
  });

  // List state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredProveedores = useMemo(() => {
    if (!search.trim()) return proveedores;
    const q = search.toLowerCase();
    return proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q),
    );
  }, [proveedores, search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

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
    setForm({ nombre: "", contacto: "", email: "", telefono: "", notas: "" });
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
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (editTarget) {
      updateProveedor({ ...editTarget, ...form });
      toast("success", "Proveedor actualizado", `"${form.nombre}" fue actualizado correctamente`);
    } else {
      createProveedor({ brandId: activeBrandId, ...form });
      toast("success", "Proveedor creado", `"${form.nombre}" fue creado correctamente`);
    }
    setModalOpen(false);
  }

  function handleClone(e: React.MouseEvent, p: Proveedor) {
    e.stopPropagation();
    createProveedor({
      brandId: p.brandId,
      nombre: `Copia de ${p.nombre}`,
      contacto: p.contacto ?? "",
      email: p.email ?? "",
      telefono: p.telefono ?? "",
      notas: p.notas ?? "",
    });
    toast("success", "Proveedor clonado", `Se creo una copia de "${p.nombre}"`);
  }

  function handleOpenDelete(e: React.MouseEvent, p: Proveedor) {
    e.stopPropagation();
    setDeleteTarget(p);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteProveedor(deleteTarget.id);
      toast("success", "Proveedor eliminado", `"${deleteTarget.nombre}" fue eliminado correctamente`);
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
        title="Proveedores"
        subtitle="Gestion de proveedores de servicios"
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

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        onFilterToggle={() => undefined}
        placeholder="Buscar por nombre o email..."
        className="mb-6"
      />

      {filteredProveedores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Building2 className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay proveedores registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-neutral-800">
                    {p.nombre}
                  </TableCell>
                  <TableCell>{p.contacto ?? "—"}</TableCell>
                  <TableCell>{p.email ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={() => handleOpenEdit(p)}
                        aria-label="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={() => handleOpenEdit(p)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleClone(e, p)}
                            aria-label="Clonar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, p)}
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
        <ModalHeader title={editTarget ? "Editar Proveedor" : "Nuevo Proveedor"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del proveedor"
            />
            <Input
              label="Contacto"
              value={form.contacto}
              onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
              placeholder="Nombre del contacto"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@proveedor.com"
            />
            <Input
              label="Telefono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="+54 11 1234-5678"
            />
            <Input
              label="Notas"
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!form.nombre.trim()}>
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
        <ModalHeader title="Eliminar Proveedor">{null}</ModalHeader>
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
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?
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
