"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Eye, Pencil, Trash2, ShieldCheck, Users } from "lucide-react";
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
import { useUsers, useUserActions } from "@/components/providers/UserProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import type { AuthUser, Role } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const roleBadgeVariant: Record<Role, "active" | "pending" | "draft"> = {
  ADMIN: "active",
  VENDEDOR: "pending",
  MARKETING: "draft",
};

const roleBadgeLabel: Record<Role, string> = {
  ADMIN: "Admin",
  VENDEDOR: "Vendedor",
  MARKETING: "Marketing",
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "MARKETING", label: "Marketing" },
];

// ---------------------------------------------------------------------------
// PerfilesPage
// ---------------------------------------------------------------------------

export default function PerfilesPage() {
  const { isAdmin, canEdit } = useAuth();
  const { toast } = useToast();
  const { activeBrandId, brands } = useBrand();

  // Data hooks
  const users = useUsers();
  const { createUser, updateUser, deleteUser } = useUserActions();

  // Brand name lookup map
  const brandMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of brands) {
      map[b.id] = b.name;
    }
    return map;
  }, [brands]);

  // Brand options for select
  const brandOptions = useMemo(
    () => brands.map((b) => ({ value: b.id, label: b.name })),
    [brands],
  );

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Form state
  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: Role;
    brandId: string;
    password: string;
  }>({
    name: "",
    email: "",
    role: "VENDEDOR",
    brandId: activeBrandId,
    password: "",
  });

  // List state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpenCreate() {
    setEditTarget(null);
    setForm({ name: "", email: "", role: "VENDEDOR", brandId: activeBrandId, password: "" });
    setModalOpen(true);
  }

  function handleOpenEdit(u: AuthUser) {
    setEditTarget(u);
    setForm({ name: u.name, email: u.email, role: u.role, brandId: u.brandId, password: "" });
    setModalOpen(true);
  }

  function handleSave() {
    if (editTarget) {
      updateUser({ ...editTarget, name: form.name, email: form.email, role: form.role, brandId: form.brandId });
      toast("success", "Usuario actualizado", `"${form.name}" fue actualizado correctamente`);
    } else {
      createUser({ name: form.name, email: form.email, role: form.role, brandId: form.brandId, password: form.password });
      toast("success", "Usuario creado", `"${form.name}" fue creado correctamente`);
    }
    setModalOpen(false);
  }

  function handleOpenDelete(e: React.MouseEvent, u: AuthUser) {
    e.stopPropagation();
    setDeleteTarget(u);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteUser(deleteTarget.id);
      toast("success", "Usuario eliminado", `"${deleteTarget.name}" fue eliminado correctamente`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // ADMIN-only guard
  // ---------------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <ShieldCheck className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Acceso restringido a administradores</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <PageHeader
        title="Perfiles y Roles"
        subtitle="Gestion de usuarios y permisos"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Nuevo Usuario
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

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Users className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay usuarios registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-neutral-800">
                    {u.name}
                  </TableCell>
                  <TableCell className="text-neutral-500">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[u.role]} size="sm">
                      {roleBadgeLabel[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>{brandMap[u.brandId] ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={() => handleOpenEdit(u)}
                        aria-label="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={() => handleOpenEdit(u)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, u)}
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
        <ModalHeader title={editTarget ? "Editar Usuario" : "Nuevo Usuario"}>
          {null}
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre completo"
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@empresa.com"
            />
            {!editTarget && (
              <Input
                label="Password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Ingrese password"
              />
            )}
            <Select
              label="Rol"
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
              options={ROLE_OPTIONS}
            />
            <Select
              label="Marca"
              value={form.brandId}
              onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}
              options={brandOptions}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.email.trim() || (!editTarget && !form.password.trim())}
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
        <ModalHeader title="Eliminar Usuario">{null}</ModalHeader>
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
              Esta seguro que desea eliminar a &ldquo;{deleteTarget?.name}&rdquo;?
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
