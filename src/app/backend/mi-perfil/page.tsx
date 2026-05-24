"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Hash, Key, ShieldCheck, User as UserIcon } from "lucide-react";
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  setMyPin,
} from "@/actions/user.actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/form/Field";
import { FormSection } from "@/components/ui/form/FormSection";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";

type Profile = Awaited<ReturnType<typeof getMyProfile>>;

const PIN_REGEX = /^\d{4,6}$/;

export default function MiPerfilPage() {
  const { toast } = useToast();
  const { update: refreshSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const [pinForm, setPinForm] = useState({
    current: "",
    currentPassword: "",
    next: "",
    confirm: "",
  });
  const [savingPin, setSavingPin] = useState(false);

  const reload = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
      setProfileForm({ name: p.name, email: p.email });
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo cargar tu perfil.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading || !profile) return <PageSkeleton variant="detail" />;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateMyProfile({
        name: profileForm.name,
        ...(profile!.isProtected ? {} : { email: profileForm.email }),
      });
      await refreshSession();
      await reload();
      toast("success", "Perfil actualizado", "Tus datos fueron guardados.");
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast("error", "Error", "Las contraseñas no coinciden.");
      return;
    }
    if (pwForm.next.length < 8) {
      toast("error", "Error", "La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSavingPassword(true);
    try {
      await changeMyPassword(pwForm.current, pwForm.next);
      setPwForm({ current: "", next: "", confirm: "" });
      toast("success", "Contraseña actualizada", "Tu contraseña fue cambiada.");
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo cambiar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault();
    if (pinForm.next !== pinForm.confirm) {
      toast("error", "Error", "Los PIN no coinciden.");
      return;
    }
    if (!PIN_REGEX.test(pinForm.next)) {
      toast("error", "Error", "El PIN debe tener entre 4 y 6 dígitos.");
      return;
    }
    setSavingPin(true);
    try {
      await setMyPin({
        pin: pinForm.next,
        ...(profile!.hasPin
          ? {
              currentPin: pinForm.current || undefined,
              currentPassword: pinForm.currentPassword || undefined,
            }
          : {}),
      });
      setPinForm({ current: "", currentPassword: "", next: "", confirm: "" });
      await reload();
      toast("success", "PIN actualizado", "Podés ingresar con tu PIN desde el login.");
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo actualizar el PIN.");
    } finally {
      setSavingPin(false);
    }
  }

  async function handleClearPin() {
    setSavingPin(true);
    try {
      await setMyPin({
        pin: null,
        currentPin: pinForm.current || undefined,
        currentPassword: pinForm.currentPassword || undefined,
      });
      setPinForm({ current: "", currentPassword: "", next: "", confirm: "" });
      await reload();
      toast("success", "PIN eliminado", "Tu PIN fue eliminado.");
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo eliminar el PIN.");
    } finally {
      setSavingPin(false);
    }
  }

  const pinMismatch = pinForm.confirm.length > 0 && pinForm.next !== pinForm.confirm;
  const pwMismatch = pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm;

  return (
    <>
      <DataTablePageHeader
        title="Mi perfil"
        subtitle="Editá tus datos, contraseña y PIN de acceso rápido."
      />

      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Datos personales */}
        <FormSection
          title="Datos"
          description="Tu nombre se muestra en el sistema. El email se usa para iniciar sesión."
        >
          <form onSubmit={handleSaveProfile}>
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel>
                  <UserIcon className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
                  Nombre
                </FieldLabel>
                <Input
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field span={2}>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={profileForm.email}
                  disabled={!!profile.isProtected}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
                {profile.isProtected && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                    <ShieldCheck className="h-3 w-3" />
                    Tu usuario es un administrador protegido — el email no puede modificarse.
                  </p>
                )}
              </Field>
            </FieldGroup>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={savingProfile}>
                Guardar datos
              </Button>
            </div>
          </form>
        </FormSection>

        {/* Cambiar contraseña */}
        <FormSection
          title="Contraseña"
          description="Cambiá tu contraseña. Necesitás ingresar la actual para confirmar."
        >
          <form onSubmit={handleChangePassword}>
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>
                  <Key className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
                  Contraseña actual
                </FieldLabel>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.current}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, current: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel required>Nueva contraseña</FieldLabel>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.next}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, next: e.target.value }))
                  }
                  placeholder="Mínimo 8 caracteres"
                />
              </Field>
              <Field invalid={pwMismatch}>
                <FieldLabel required>Confirmar nueva</FieldLabel>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.confirm}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, confirm: e.target.value }))
                  }
                />
                {pwMismatch && <FieldError>Las contraseñas no coinciden.</FieldError>}
              </Field>
            </FieldGroup>
            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                loading={savingPassword}
                disabled={
                  !pwForm.current ||
                  pwForm.next.length < 8 ||
                  pwForm.next !== pwForm.confirm
                }
              >
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </FormSection>

        {/* PIN */}
        <FormSection
          title="PIN de acceso rápido"
          description={
            profile.hasPin
              ? "Tenés un PIN configurado. Podés cambiarlo o eliminarlo aquí."
              : "Configurá un PIN de 4-6 dígitos para ingresar más rápido desde el login."
          }
        >
          <form onSubmit={handleSavePin}>
            <FieldGroup columns={2}>
              {profile.hasPin && (
                <>
                  <Field>
                    <FieldLabel>PIN actual</FieldLabel>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="off"
                      value={pinForm.current}
                      onChange={(e) =>
                        setPinForm((f) => ({
                          ...f,
                          current: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      placeholder="O ingresá tu contraseña al lado"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>… o contraseña actual</FieldLabel>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={pinForm.currentPassword}
                      onChange={(e) =>
                        setPinForm((f) => ({ ...f, currentPassword: e.target.value }))
                      }
                      placeholder="Solo si no recordás el PIN"
                    />
                  </Field>
                </>
              )}
              <Field>
                <FieldLabel required>
                  <Hash className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
                  Nuevo PIN
                </FieldLabel>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  value={pinForm.next}
                  onChange={(e) =>
                    setPinForm((f) => ({
                      ...f,
                      next: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="4 a 6 dígitos"
                />
              </Field>
              <Field invalid={pinMismatch}>
                <FieldLabel required>Confirmar PIN</FieldLabel>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  value={pinForm.confirm}
                  onChange={(e) =>
                    setPinForm((f) => ({
                      ...f,
                      confirm: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                />
                {pinMismatch && <FieldError>Los PIN no coinciden.</FieldError>}
              </Field>
            </FieldGroup>
            <div className="mt-4 flex justify-end gap-2">
              {profile.hasPin && (
                <Button
                  type="button"
                  variant="ghost"
                  loading={savingPin}
                  onClick={handleClearPin}
                >
                  Eliminar PIN
                </Button>
              )}
              <Button
                type="submit"
                loading={savingPin}
                disabled={
                  !PIN_REGEX.test(pinForm.next) || pinForm.next !== pinForm.confirm
                }
              >
                {profile.hasPin ? "Cambiar PIN" : "Activar PIN"}
              </Button>
            </div>
          </form>
        </FormSection>
      </div>
    </>
  );
}
