"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Users, Key } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
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
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useUsers, useUserActions } from "@/components/providers/UserProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useUserLoading } from "@/components/providers/UserProvider";
import type { AuthUser, Role } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const roleDotVariant: Record<Role, "active" | "pending" | "draft"> = {
  ADMIN: "active",
  VENDEDOR: "draft",
  MARKETING: "pending",
};

const roleLabel: Record<Role, string> = {
  ADMIN: "Admin",
  VENDEDOR: "Vendedor",
  MARKETING: "Marketing",
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "MARKETING", label: "Marketing" },
];

const ROLE_FILTERS = [
  { key: "ADMIN", label: "Admin" },
  { key: "VENDEDOR", label: "Vendedor" },
  { key: "MARKETING", label: "Marketing" },
];

// ---------------------------------------------------------------------------
// PerfilesPage
// ---------------------------------------------------------------------------

const DEFAULT_BRAND_ID = "brand-1";

export default function PerfilesPage() {
  const { isAdmin, canEdit } = useAuth();
  const { toast } = useToast();
  const { brands } = useBrand();

  // Data hooks
  const users = useUsers();
  const { createUser, updateUser, changePassword, deleteUser, checkEmailAvailable } = useUserActions();
  const loading = useUserLoading();

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
    brandId: DEFAULT_BRAND_ID,
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
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
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
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
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
      brandId: DEFAULT_BRAND_ID,
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

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
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

  async function handlePasswordSave(e?: React.FormEvent) {
    e?.preventDefault();
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

  function handleOpenDelete(u: AuthUser) {
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

  const passwordMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

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

  const passwordFormMismatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword !== passwordForm.confirmPassword;

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
      <DataTablePageHeader
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

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por nombre o email...",
        }}
        filters={ROLE_FILTERS}
        activeFilter={roleFilter}
        onFilterChange={setRoleFilter}
        className="mb-4"
      />

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay usuarios registrados"
          description="Crea un nuevo usuario para gestionar los accesos al sistema."
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
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead>Nombre</DataTableHead>
                <DataTableHead>Email</DataTableHead>
                <DataTableHead>Rol</DataTableHead>
                <DataTableHead>Estado</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedUsers.map((u) => {
                const isActive = (u as any).isActive !== false;
                return (
                  <DataTableRow
                    key={u.id}
                    onClick={() => handleOpenEdit(u)}
                    interactive
                  >
                    <DataTableCell variant="primary">{u.name}</DataTableCell>
                    <DataTableCell variant="muted">{u.email}</DataTableCell>
                    <DataTableCell>
                      <StatusDot variant={roleDotVariant[u.role]}>
                        {roleLabel[u.role]}
                      </StatusDot>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusDot variant={isActive ? "active" : "inactive"}>
                        {isActive ? "Activo" : "Inactivo"}
                      </StatusDot>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <RowActions
                        primary={{
                          icon: Pencil,
                          label: "Editar",
                          onClick: () => handleOpenEdit(u),
                        }}
                        items={
                          canEdit
                            ? [
                                {
                                  icon: Key,
                                  label: "Cambiar password",
                                  onClick: () => handleOpenPasswordChange(u),
                                },
                                {
                                  icon: Trash2,
                                  label: "Eliminar",
                                  onClick: () => handleOpenDelete(u),
                                  destructive: true,
                                },
                              ]
                            : []
                        }
                      />
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
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
          title={editTarget ? "Editar Usuario" : "Nuevo Usuario"}
          description={
            editTarget
              ? "Actualiza los datos del usuario y su estado de acceso."
              : "Registra un usuario con su rol y marca asociada."
          }
          icon={<Plus className="h-5 w-5" strokeWidth={2.4} />}
        />
        <form onSubmit={handleSave}>
          <ModalBody>
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Nombre</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nombre completo"
                  autoFocus
                />
              </Field>
              <Field span={2} invalid={!!emailError}>
                <FieldLabel required>Email</FieldLabel>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    setEmailError("");
                  }}
                  onBlur={() => validateEmail(form.email)}
                  placeholder="email@empresa.com"
                />
                <FieldError>{emailError}</FieldError>
              </Field>

              <Field>
                <FieldLabel required>Rol</FieldLabel>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v as Role }))
                  }
                  options={ROLE_OPTIONS}
                />
              </Field>
              <Field>
                <FieldLabel required>Marca</FieldLabel>
                <Select
                  value={form.brandId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, brandId: v }))
                  }
                  options={brands.map((b) => ({
                    value: b.id,
                    label: b.name,
                  }))}
                />
              </Field>

              {!editTarget && (
                <>
                  <Field>
                    <FieldLabel required>Password</FieldLabel>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                      placeholder="Minimo 6 caracteres"
                    />
                  </Field>
                  <Field invalid={passwordMismatch}>
                    <FieldLabel required>Confirmar Password</FieldLabel>
                    <Input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Repita la password"
                    />
                    {passwordMismatch && (
                      <FieldError>Las passwords no coinciden</FieldError>
                    )}
                  </Field>
                </>
              )}

              {editTarget && (
                <Field span={2}>
                  <div className="flex items-center justify-between pt-2 border-t border-hairline">
                    <div>
                      <p className="text-sm font-medium text-neutral-700">
                        Usuario activo
                      </p>
                      <p className="text-xs text-neutral-400">
                        Los usuarios inactivos no pueden iniciar sesion
                      </p>
                    </div>
                    <Toggle
                      checked={form.isActive}
                      onCheckedChange={(checked) =>
                        setForm((f) => ({ ...f, isActive: checked }))
                      }
                    />
                  </div>
                </Field>
              )}
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
            <Button
              type="submit"
              loading={saving}
              disabled={editTarget ? !isEditFormValid : !isCreateFormValid}
            >
              {editTarget ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Password change modal */}
      <Modal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        size="sm"
      >
        <ModalHeader
          title="Cambiar Password"
          description={
            passwordTarget
              ? `Nueva password para ${passwordTarget.name}.`
              : undefined
          }
          icon={<Key className="h-5 w-5" strokeWidth={2.4} />}
        />
        <form onSubmit={handlePasswordSave}>
          <ModalBody>
            <FieldGroup columns={1}>
              <Field>
                <FieldLabel required>Nueva Password</FieldLabel>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="Minimo 6 caracteres"
                  autoFocus
                />
              </Field>
              <Field invalid={passwordFormMismatch}>
                <FieldLabel required>Confirmar Password</FieldLabel>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Repita la password"
                />
                {passwordFormMismatch && (
                  <FieldError>Las passwords no coinciden</FieldError>
                )}
              </Field>
            </FieldGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPasswordModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!isPasswordFormValid}
            >
              Cambiar Password
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
          title="Eliminar Usuario"
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
              Vas a eliminar a{" "}
              <span className="font-semibold text-neutral-900">
                {deleteTarget?.name}
              </span>
              .
            </p>
            <p className="mt-2 text-[12.5px] text-neutral-500">
              El usuario perdera acceso inmediato al sistema.
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
