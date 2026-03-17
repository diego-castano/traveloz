"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Eye,
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
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  useTemporadas,
  useTiposPaquete,
  useEtiquetas,
  usePaises,
  useRegimenes,
  useCatalogActions,
} from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/lib/cn";
import type { Temporada, TipoPaquete, Etiqueta, Pais, Ciudad, Regimen } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// TemporadasTab
// ---------------------------------------------------------------------------

function TemporadasTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const temporadas = useTemporadas();
  const { createTemporada, updateTemporada, deleteTemporada } = useCatalogActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Temporada | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Temporada | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [form, setForm] = useState({ nombre: "", orden: 1, activa: true });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredTemporadas = useMemo(() => {
    if (!search.trim()) return temporadas;
    const q = search.toLowerCase();
    return temporadas.filter((t) => t.nombre.toLowerCase().includes(q));
  }, [temporadas, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredTemporadas.length / PAGE_SIZE);

  const paginatedTemporadas = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTemporadas.slice(start, start + PAGE_SIZE);
  }, [filteredTemporadas, page]);

  function handleOpenCreate() {
    setEditTarget(null);
    setForm({ nombre: "", orden: temporadas.length + 1, activa: true });
    setModalOpen(true);
  }

  function handleOpenEdit(t: Temporada) {
    setEditTarget(t);
    setForm({ nombre: t.nombre, orden: t.orden, activa: t.activa });
    setModalOpen(true);
  }

  function handleSave() {
    if (editTarget) {
      updateTemporada({ ...editTarget, ...form });
      toast("success", "Temporada actualizada", `"${form.nombre}" fue actualizada correctamente`);
    } else {
      createTemporada({ brandId: activeBrandId, ...form });
      toast("success", "Temporada creada", `"${form.nombre}" fue creada correctamente`);
    }
    setModalOpen(false);
  }

  function handleOpenDelete(e: React.MouseEvent, t: Temporada) {
    e.stopPropagation();
    setDeleteTarget(t);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteTemporada(deleteTarget.id);
      toast("success", "Temporada eliminada", `"${deleteTarget.nombre}" fue eliminada correctamente`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          filters={[]}
          onFilterToggle={() => undefined}
          placeholder="Buscar temporada..."
          className="flex-1"
        />
        {canEdit && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Nueva Temporada
          </Button>
        )}
      </div>

      {filteredTemporadas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Calendar className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay temporadas registradas</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTemporadas.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-neutral-800">{t.nombre}</TableCell>
                  <TableCell className="text-neutral-500">{t.orden}</TableCell>
                  <TableCell>
                    <Badge variant={t.activa ? "active" : "draft"} size="sm">
                      {t.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={() => handleOpenEdit(t)}
                        aria-label="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={() => handleOpenEdit(t)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, t)}
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
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="md">
        <ModalHeader title={editTarget ? "Editar Temporada" : "Nueva Temporada"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="ej. Temporada Alta 2026"
            />
            <Input
              label="Orden"
              type="number"
              value={String(form.orden)}
              onChange={(e) => setForm((f) => ({ ...f, orden: Number(e.target.value) }))}
              placeholder="1"
            />
            <Select
              label="Estado"
              options={[
                { value: "true", label: "Activa" },
                { value: "false", label: "Inactiva" },
              ]}
              value={String(form.activa)}
              onValueChange={(v) => setForm((f) => ({ ...f, activa: v === "true" }))}
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
        <ModalHeader title="Eliminar Temporada">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-neutral-700">
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?
            </p>
            <p className="text-sm text-neutral-400 mt-2">Esta accion no se puede deshacer.</p>
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

// ---------------------------------------------------------------------------
// TiposPaqueteTab
// ---------------------------------------------------------------------------

function TiposPaqueteTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const tiposPaquete = useTiposPaquete();
  const { createTipoPaquete, updateTipoPaquete, deleteTipoPaquete } = useCatalogActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TipoPaquete | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TipoPaquete | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [form, setForm] = useState({ nombre: "", orden: 1, activo: true });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredTipos = useMemo(() => {
    if (!search.trim()) return tiposPaquete;
    const q = search.toLowerCase();
    return tiposPaquete.filter((t) => t.nombre.toLowerCase().includes(q));
  }, [tiposPaquete, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredTipos.length / PAGE_SIZE);

  const paginatedTipos = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTipos.slice(start, start + PAGE_SIZE);
  }, [filteredTipos, page]);

  function handleOpenCreate() {
    setEditTarget(null);
    setForm({ nombre: "", orden: tiposPaquete.length + 1, activo: true });
    setModalOpen(true);
  }

  function handleOpenEdit(t: TipoPaquete) {
    setEditTarget(t);
    setForm({ nombre: t.nombre, orden: t.orden, activo: t.activo });
    setModalOpen(true);
  }

  function handleSave() {
    if (editTarget) {
      updateTipoPaquete({ ...editTarget, ...form });
      toast("success", "Tipo actualizado", `"${form.nombre}" fue actualizado correctamente`);
    } else {
      createTipoPaquete({ brandId: activeBrandId, ...form });
      toast("success", "Tipo creado", `"${form.nombre}" fue creado correctamente`);
    }
    setModalOpen(false);
  }

  function handleOpenDelete(e: React.MouseEvent, t: TipoPaquete) {
    e.stopPropagation();
    setDeleteTarget(t);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteTipoPaquete(deleteTarget.id);
      toast("success", "Tipo eliminado", `"${deleteTarget.nombre}" fue eliminado correctamente`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          filters={[]}
          onFilterToggle={() => undefined}
          placeholder="Buscar tipo de paquete..."
          className="flex-1"
        />
        {canEdit && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Nuevo Tipo
          </Button>
        )}
      </div>

      {filteredTipos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Layers className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay tipos de paquete registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTipos.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-neutral-800">{t.nombre}</TableCell>
                  <TableCell className="text-neutral-500">{t.orden}</TableCell>
                  <TableCell>
                    <Badge variant={t.activo ? "active" : "draft"} size="sm">
                      {t.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={() => handleOpenEdit(t)}
                        aria-label="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={() => handleOpenEdit(t)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, t)}
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
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="md">
        <ModalHeader title={editTarget ? "Editar Tipo de Paquete" : "Nuevo Tipo de Paquete"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="ej. Lunas de miel"
            />
            <Input
              label="Orden"
              type="number"
              value={String(form.orden)}
              onChange={(e) => setForm((f) => ({ ...f, orden: Number(e.target.value) }))}
              placeholder="1"
            />
            <Select
              label="Estado"
              options={[
                { value: "true", label: "Activo" },
                { value: "false", label: "Inactivo" },
              ]}
              value={String(form.activo)}
              onValueChange={(v) => setForm((f) => ({ ...f, activo: v === "true" }))}
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
        <ModalHeader title="Eliminar Tipo de Paquete">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-neutral-700">
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?
            </p>
            <p className="text-sm text-neutral-400 mt-2">Esta accion no se puede deshacer.</p>
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

// ---------------------------------------------------------------------------
// RegimenesTab
// ---------------------------------------------------------------------------

function RegimenesTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const regimenes = useRegimenes();
  const { createRegimen, updateRegimen, deleteRegimen } = useCatalogActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Regimen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Regimen | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [form, setForm] = useState({ nombre: "", abrev: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredRegimenes = useMemo(() => {
    if (!search.trim()) return regimenes;
    const q = search.toLowerCase();
    return regimenes.filter(
      (r) => r.nombre.toLowerCase().includes(q) || r.abrev.toLowerCase().includes(q),
    );
  }, [regimenes, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredRegimenes.length / PAGE_SIZE);

  const paginatedRegimenes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRegimenes.slice(start, start + PAGE_SIZE);
  }, [filteredRegimenes, page]);

  function handleOpenCreate() {
    setEditTarget(null);
    setForm({ nombre: "", abrev: "" });
    setModalOpen(true);
  }

  function handleOpenEdit(r: Regimen) {
    setEditTarget(r);
    setForm({ nombre: r.nombre, abrev: r.abrev });
    setModalOpen(true);
  }

  function handleSave() {
    if (editTarget) {
      updateRegimen({ ...editTarget, ...form });
      toast("success", "Regimen actualizado", `"${form.nombre}" fue actualizado correctamente`);
    } else {
      createRegimen({ brandId: activeBrandId, ...form });
      toast("success", "Regimen creado", `"${form.nombre}" fue creado correctamente`);
    }
    setModalOpen(false);
  }

  function handleOpenDelete(e: React.MouseEvent, r: Regimen) {
    e.stopPropagation();
    setDeleteTarget(r);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteRegimen(deleteTarget.id);
      toast("success", "Regimen eliminado", `"${deleteTarget.nombre}" fue eliminado correctamente`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          filters={[]}
          onFilterToggle={() => undefined}
          placeholder="Buscar regimen..."
          className="flex-1"
        />
        {canEdit && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Nuevo Regimen
          </Button>
        )}
      </div>

      {filteredRegimenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Utensils className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay regimenes registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Abreviatura</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRegimenes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-neutral-800">{r.nombre}</TableCell>
                  <TableCell className="font-mono text-xs text-neutral-400">{r.abrev}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={() => handleOpenEdit(r)}
                        aria-label="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={() => handleOpenEdit(r)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, r)}
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
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="md">
        <ModalHeader title={editTarget ? "Editar Regimen" : "Nuevo Regimen"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="ej. All Inclusive"
            />
            <Input
              label="Abreviatura"
              required
              value={form.abrev}
              onChange={(e) => setForm((f) => ({ ...f, abrev: e.target.value }))}
              placeholder="ej. AI"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!form.nombre.trim() || !form.abrev.trim()}>
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
        <ModalHeader title="Eliminar Regimen">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-neutral-700">
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?
            </p>
            <p className="text-sm text-neutral-400 mt-2">Esta accion no se puede deshacer.</p>
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

// ---------------------------------------------------------------------------
// EtiquetasTab
// ---------------------------------------------------------------------------

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function EtiquetasTab() {
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();
  const etiquetas = useEtiquetas();
  const { createEtiqueta, updateEtiqueta, deleteEtiqueta } = useCatalogActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Etiqueta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Etiqueta | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [form, setForm] = useState({ nombre: "", slug: "", color: "#8B5CF6" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredEtiquetas = useMemo(() => {
    if (!search.trim()) return etiquetas;
    const q = search.toLowerCase();
    return etiquetas.filter(
      (e) => e.nombre.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q),
    );
  }, [etiquetas, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredEtiquetas.length / PAGE_SIZE);

  const paginatedEtiquetas = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredEtiquetas.slice(start, start + PAGE_SIZE);
  }, [filteredEtiquetas, page]);

  function handleOpenCreate() {
    setEditTarget(null);
    setForm({ nombre: "", slug: "", color: "#8B5CF6" });
    setModalOpen(true);
  }

  function handleOpenEdit(e: Etiqueta) {
    setEditTarget(e);
    setForm({ nombre: e.nombre, slug: e.slug, color: e.color });
    setModalOpen(true);
  }

  function handleSave() {
    if (editTarget) {
      updateEtiqueta({ ...editTarget, ...form });
      toast("success", "Etiqueta actualizada", `"${form.nombre}" fue actualizada correctamente`);
    } else {
      createEtiqueta({ brandId: activeBrandId, ...form });
      toast("success", "Etiqueta creada", `"${form.nombre}" fue creada correctamente`);
    }
    setModalOpen(false);
  }

  function handleOpenDelete(e: React.MouseEvent, et: Etiqueta) {
    e.stopPropagation();
    setDeleteTarget(et);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteEtiqueta(deleteTarget.id);
      toast("success", "Etiqueta eliminada", `"${deleteTarget.nombre}" fue eliminada correctamente`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          filters={[]}
          onFilterToggle={() => undefined}
          placeholder="Buscar etiqueta..."
          className="flex-1"
        />
        {canEdit && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Nueva Etiqueta
          </Button>
        )}
      </div>

      {filteredEtiquetas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Tag className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay etiquetas registradas</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEtiquetas.map((et) => (
                <TableRow key={et.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-neutral-200/60 flex-shrink-0"
                        style={{ background: et.color }}
                      />
                      <span className="font-medium text-neutral-800">{et.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-400">{et.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={() => handleOpenEdit(et)}
                        aria-label="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={() => handleOpenEdit(et)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, et)}
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
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="md">
        <ModalHeader title={editTarget ? "Editar Etiqueta" : "Nueva Etiqueta"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              required
              value={form.nombre}
              onChange={(e) => {
                const v = e.target.value;
                if (!editTarget) {
                  setForm((f) => ({ ...f, nombre: v, slug: slugify(v) }));
                } else {
                  setForm((f) => ({ ...f, nombre: v }));
                }
              }}
              placeholder="ej. Black Week"
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="ej. black-week"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium" style={{ color: "#2D2F4D" }}>
                Color
              </label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-full cursor-pointer rounded-glass-sm border border-neutral-200/80 bg-white/70"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!form.nombre.trim() || !form.slug.trim()}>
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
        <ModalHeader title="Eliminar Etiqueta">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-neutral-700">
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?
            </p>
            <p className="text-sm text-neutral-400 mt-2">Esta accion no se puede deshacer.</p>
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

// ---------------------------------------------------------------------------
// PaisesTab
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

  // Pais-level modal state
  const [paisModalOpen, setPaisModalOpen] = useState(false);
  const [editPais, setEditPais] = useState<Pais | null>(null);
  const [deletePaisTarget, setDeletePaisTarget] = useState<(Pais & { ciudades: Ciudad[] }) | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [paisForm, setPaisForm] = useState({ nombre: "", codigo: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Expand state
  const [expandedPaisId, setExpandedPaisId] = useState<string | null>(null);

  // Ciudad inline state
  const [addingCiudad, setAddingCiudad] = useState<string | null>(null); // paisId
  const [newCiudadNombre, setNewCiudadNombre] = useState("");
  const [editingCiudadId, setEditingCiudadId] = useState<string | null>(null);
  const [ciudadDraft, setCiudadDraft] = useState("");

  const filteredPaises = useMemo(() => {
    if (!search.trim()) return paises;
    const q = search.toLowerCase();
    return paises.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q),
    );
  }, [paises, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredPaises.length / PAGE_SIZE);

  const paginatedPaises = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPaises.slice(start, start + PAGE_SIZE);
  }, [filteredPaises, page]);

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

  function handleSavePais() {
    if (editPais) {
      updatePais({ ...editPais, ...paisForm });
      toast("success", "Pais actualizado", `"${paisForm.nombre}" fue actualizado correctamente`);
    } else {
      createPais({ brandId: activeBrandId, ...paisForm });
      toast("success", "Pais creado", `"${paisForm.nombre}" fue creado correctamente`);
    }
    setPaisModalOpen(false);
  }

  function handleOpenDeletePais(e: React.MouseEvent, p: Pais & { ciudades: Ciudad[] }) {
    e.stopPropagation();
    setDeletePaisTarget(p);
  }

  function handleConfirmDeletePais() {
    if (!deletePaisTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      // Cascade delete ciudades first
      deletePaisTarget.ciudades.forEach((c) => deleteCiudad(c.id));
      deletePais(deletePaisTarget.id);
      toast("success", "Pais eliminado", `"${deletePaisTarget.nombre}" fue eliminado correctamente`);
      setDeletePaisTarget(null);
      setIsShaking(false);
      if (expandedPaisId === deletePaisTarget.id) setExpandedPaisId(null);
    }, 400);
  }

  function handleSaveCiudad(paisId: string) {
    if (!newCiudadNombre.trim()) return;
    createCiudad({ paisId, nombre: newCiudadNombre.trim() });
    toast("success", "Ciudad agregada", `"${newCiudadNombre.trim()}" fue agregada correctamente`);
    setAddingCiudad(null);
    setNewCiudadNombre("");
  }

  function handleSaveEditCiudad(ciudad: Ciudad) {
    if (!ciudadDraft.trim()) return;
    updateCiudad({ ...ciudad, nombre: ciudadDraft.trim() });
    toast("success", "Ciudad actualizada", `"${ciudadDraft.trim()}" fue actualizada correctamente`);
    setEditingCiudadId(null);
    setCiudadDraft("");
  }

  function handleDeleteCiudad(ciudad: Ciudad) {
    deleteCiudad(ciudad.id);
    toast("success", "Ciudad eliminada", `"${ciudad.nombre}" fue eliminada correctamente`);
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          filters={[]}
          onFilterToggle={() => undefined}
          placeholder="Buscar pais..."
          className="flex-1"
        />
        {canEdit && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreatePais}>
            Nuevo Pais
          </Button>
        )}
      </div>

      {filteredPaises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Globe className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay paises registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Codigo</TableHead>
                <TableHead>Ciudades</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPaises.map((p) => (
                <>
                  <TableRow key={p.id}>
                    <TableCell className="w-8">
                      <button
                        className="flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                        onClick={() =>
                          setExpandedPaisId(expandedPaisId === p.id ? null : p.id)
                        }
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedPaisId === p.id && "rotate-90",
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-neutral-800">{p.nombre}</TableCell>
                    <TableCell className="font-mono text-xs text-neutral-400">
                      {p.codigo}
                    </TableCell>
                    <TableCell className="text-neutral-400 text-sm">
                      {p.ciudades.length} ciudades
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={() => handleOpenEditPais(p)}
                          aria-label="Ver / Editar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={() => handleOpenEditPais(p)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={(e) => handleOpenDeletePais(e, p)}
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedPaisId === p.id && (
                    <tr key={`${p.id}-ciudades`}>
                      <td colSpan={5} className="bg-neutral-50/30 px-8 pb-3 pt-1">
                        {p.ciudades.length === 0 && addingCiudad !== p.id && (
                          <p className="text-xs text-neutral-400 py-2">Sin ciudades registradas</p>
                        )}
                        {p.ciudades.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-100/40 transition-colors"
                          >
                            {editingCiudadId === c.id ? (
                              <div className="flex items-center gap-2 flex-1">
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
                                <span className="text-sm text-neutral-700">{c.nombre}</span>
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

                        {/* Add ciudad inline */}
                        {canEdit && (
                          <>
                            {addingCiudad === p.id ? (
                              <div className="flex items-center gap-2 mt-2 px-2">
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
                                className="mt-2"
                                onClick={() => {
                                  setAddingCiudad(p.id);
                                  setNewCiudadNombre("");
                                  setEditingCiudadId(null);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar ciudad
                              </Button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-center">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Pais Create / Edit modal */}
      <Modal open={paisModalOpen} onOpenChange={setPaisModalOpen} size="md">
        <ModalHeader title={editPais ? "Editar Pais" : "Nuevo Pais"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              required
              value={paisForm.nombre}
              onChange={(e) => setPaisForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="ej. Argentina"
            />
            <Input
              label="Codigo"
              value={paisForm.codigo}
              onChange={(e) => setPaisForm((f) => ({ ...f, codigo: e.target.value }))}
              placeholder="ej. UY, AR, BR"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setPaisModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSavePais} disabled={!paisForm.nombre.trim()}>
            {editPais ? "Guardar" : "Crear"}
          </Button>
        </ModalFooter>
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
        <ModalHeader title="Eliminar Pais">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}}
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-neutral-700">
              Esta seguro que desea eliminar &ldquo;{deletePaisTarget?.nombre}&rdquo;?
            </p>
            {deletePaisTarget && deletePaisTarget.ciudades.length > 0 && (
              <p className="text-sm text-amber-600 mt-2">
                Se eliminaran {deletePaisTarget.ciudades.length} ciudades asociadas.
              </p>
            )}
            <p className="text-sm text-neutral-400 mt-2">Esta accion no se puede deshacer.</p>
          </motion.div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeletePaisTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDeletePais}>
            Eliminar
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
  return (
    <>
      <PageHeader
        title="Catalogos"
        subtitle="Temporadas, tipos, etiquetas, paises y regimenes"
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
