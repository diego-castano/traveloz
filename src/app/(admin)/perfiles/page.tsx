"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Users, Key } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
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
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useUserLoading } from "@/components/providers/UserProvider";
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

const ROLE_FILTER_OPTIONS = [
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
  const { createUser, updateUser, changePassword, deleteUser, checkEmailAvailable } = useUserActions();
  const loading = useUserLoading();

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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "VENDEDOR" as Role,
    brandId: activeBrandId,
    password: "",
    confirmPassword: "",
    isActive: true,
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Validation state
  const [emailError, setEmailError] = useState("");

  // List state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Email validation
  // ---------------------------------------------------------------------------
  const validateEmail = useCallback(
    async (email: string) => {
      if (!email.trim()) {
        setEmailError("");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError("Email invalido");
        return;
      }
      // Skip duplicate check if editing and email unchanged
      if (editTarget && editTarget.email === email) {
        setEmailError("");
        return;
      }
      try {
        const available = await checkEmailAvailable(email);
        setEmailError(available ? "" : "Este email ya esta registrado");
      } catch {
        setEmailError("");
      }
    },
    [editTarget, checkEmailAvailable],
  );

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredUsers = useMemo(() => {
    let result = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter.size > 0) {
      result = result.filter((u) => roleFilter.has(u.role));
    }
    return result;
  }, [users, search, roleFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

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
    setForm({
      name: "",
      email: "",
      role: "VENDEDOR",
      brandId: activeBrandId,
      password: "",
      confirmPassword: "",
      isActive: true,
    });
    setEmailError("");
    setModalOpen(true);
  }

  function handleOpenEdit(u: AuthUser) {
    setEditTarget(u);
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      brandId: u.brandId,
      password: "",
      confirmPassword: "",
      isActive: (u as any).isActive !== false,
    });
    setEmailError("");
    setModalOpen(true);
  }

  function handleOpenPasswordChange(u: AuthUser) {
    setPasswordTarget(u);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editTarget) {
        await updateUser({
          ...editTarget,
          name: form.name,
          email: form.email,
          role: form.role,
          brandId: form.brandId,
          isActive: form.isActive,
        } as any);
        toast("success", "Usuario actualizado", `"${form.name}" fue actualizado correctamente`);
      } else {
        await createUser({
          name: form.name,
          email: form.email,
          role: form.role,
          brandId: form.brandId,
          password: form.password,
        });
        toast("success", "Usuario creado", `"${form.name}" fue creado correctamente`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave() {
    if (!passwordTarget) return;
    setSaving(true);
    try {
      await changePassword(passwordTarget.id, passwordForm.newPassword);
      toast("success", "Password actualizada", `Password de "${passwordTarget.name}" fue cambiada`);
      setPasswordModalOpen(false);
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo cambiar la password");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenDelete(e: React.MouseEvent, u: AuthUser) {
    e.stopPropagation();
    setDeleteTarget(u);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(async () => {
      try {
        await deleteUser(deleteTarget.id);
        toast("success", "Usuario eliminado", `"${deleteTarget.name}" fue eliminado correctamente`);
      } catch (err: any) {
        toast("error", "Error", err?.message ?? "No se pudo eliminar el usuario");
      }
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  const isCreateFormValid =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    !emailError &&
    form.password.length >= 6 &&
    form.password === form.confirmPassword;

  const isEditFormValid =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    !emailError;

  const isPasswordFormValid =
    passwordForm.newPassword.length >= 6 &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  // ---------------------------------------------------------------------------
  // Loading guard
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

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
        filters={ROLE_FILTER_OPTIONS.map((f) => ({
          ...f,
          active: roleFilter.has(f.value),
        }))}
        onFilterToggle={(value) =>
          setRoleFilter((prev) => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
          })
        }
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
                <TableHead>Estado</TableHead>
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
                  <TableCell>{brandMap[u.brandId] ?? "\u2014"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={(u as any).isActive !== false ? "active" : "inactive"}
                      size="sm"
                    >
                      {(u as any).isActive !== false ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
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
                            onClick={() => handleOpenPasswordChange(u)}
                            aria-label="Cambiar password"
                          >
                            <Key className="h-4 w-4" />
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
            <div>
              <Input
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }));
                  setEmailError("");
                }}
                onBlur={() => validateEmail(form.email)}
                placeholder="email@empresa.com"
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
            </div>
            {!editTarget && (
              <>
                <div>
                  <Input
                    label="Password"
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Minimo 6 caracteres"
                  />
                  {form.password.length > 0 && form.password.length < 6 && (
                    <p className="text-xs text-amber-500 mt-1">La password debe tener al menos 6 caracteres</p>
                  )}
                </div>
                <div>
                  <Input
                    label="Confirmar Password"
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repita la password"
                  />
                  {form.confirmPassword.length > 0 && form.password !== form.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Las passwords no coinciden</p>
                  )}
                </div>
              </>
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
            {editTarget && (
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <div>
                  <p className="text-sm font-medium text-neutral-700">Usuario activo</p>
                  <p className="text-xs text-neutral-400">Los usuarios inactivos no pueden iniciar sesion</p>
                </div>
                <Toggle
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                />
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={editTarget ? !isEditFormValid : !isCreateFormValid}
          >
            {editTarget ? "Guardar" : "Crear"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Password change modal */}
      <Modal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} size="sm">
        <ModalHeader title="Cambiar Password">{null}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-neutral-500 mb-4">
            Cambiar password de <strong>{passwordTarget?.name}</strong>
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <Input
                label="Nueva Password"
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                placeholder="Minimo 6 caracteres"
              />
              {passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 6 && (
                <p className="text-xs text-amber-500 mt-1">La password debe tener al menos 6 caracteres</p>
              )}
            </div>
            <div>
              <Input
                label="Confirmar Password"
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                placeholder="Repita la password"
              />
              {passwordForm.confirmPassword.length > 0 &&
                passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Las passwords no coinciden</p>
                )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setPasswordModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handlePasswordSave}
            loading={saving}
            disabled={!isPasswordFormValid}
          >
            Cambiar Password
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
