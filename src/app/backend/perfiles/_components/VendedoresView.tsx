"use client";

// ---------------------------------------------------------------------------
// VendedoresView — vista comercial de vendedores dentro de /backend/perfiles
// (Fase 3: vendedores FUSIONADOS en Perfiles, no un módulo aparte).
//
// Muestra los usuarios con rol VENDEDOR o ADMIN como tarjetas (avatar,
// contacto, estado del link público, contador de envíos recibidos). La ficha
// de cada uno permite editar foto/teléfono/whatsapp y gestionar sus dos links
// personales (/datos-de-pasajeros/<slug> y /datos-de-pago/<slug>): copiar,
// ver QR, prender/apagar, y regenerar el slug con confirmación inline (el
// link viejo deja de resolver de inmediato).
//
// Nombre/email/rol NO se editan acá — "Editar nombre, email y rol" delega en
// el modal que ya existe en la vista "Usuarios y roles" (page.tsx).
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users,
  Phone,
  MessageCircle,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Inbox,
  Pencil,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusDot } from "@/components/ui/data/StatusDot";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { ImageUploader, type ImageItem } from "@/components/ui/ImageUploader";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { DataTableToolbar } from "@/components/ui/data/DataTableToolbar";
import { EmptyState } from "@/components/ui/data/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useUserActions } from "@/components/providers/UserProvider";
import type { AuthUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// VendedoresView
// ---------------------------------------------------------------------------

interface VendedoresViewProps {
  /** Ya filtrados a role VENDEDOR/ADMIN por el padre. */
  users: AuthUser[];
  canEdit: boolean;
  /** Abre el modal "Editar Usuario" que ya existe en la vista Usuarios y roles. */
  onEditUsuario: (user: AuthUser) => void;
}

export function VendedoresView({ users, canEdit, onEditUsuario }: VendedoresViewProps) {
  const { getEnviosCountPorVendedor } = useUserActions();

  const [search, setSearch] = useState("");
  const [envioCounts, setEnvioCounts] = useState<Record<string, number>>({});
  const [fichaUser, setFichaUser] = useState<AuthUser | null>(null);

  // El contador es cosmético: si la query falla, las tarjetas simplemente
  // muestran 0 en vez de romper la vista.
  useEffect(() => {
    getEnviosCountPorVendedor()
      .then(setEnvioCounts)
      .catch(() => setEnvioCounts({}));
  }, [getEnviosCountPorVendedor]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <>
      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar vendedor por nombre o email...",
        }}
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay vendedores"
          description="Los usuarios con rol Vendedor o Admin aparecen acá con su link personal."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <VendedorCard
              key={u.id}
              user={u}
              enviosCount={envioCounts[u.id] ?? 0}
              onOpen={() => setFichaUser(u)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!fichaUser}
        onOpenChange={(open) => {
          if (!open) setFichaUser(null);
        }}
        size="lg"
      >
        {fichaUser && (
          <FichaVendedor
            user={fichaUser}
            canEdit={canEdit}
            onClose={() => setFichaUser(null)}
            onEditUsuario={() => {
              onEditUsuario(fichaUser);
              setFichaUser(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// VendedorCard
// ---------------------------------------------------------------------------

function VendedorCard({
  user,
  enviosCount,
  onOpen,
}: {
  user: AuthUser;
  enviosCount: number;
  onOpen: () => void;
}) {
  const estado = !user.slug
    ? { variant: "inactive" as const, label: "Sin slug" }
    : user.linkActivo === false
      ? { variant: "warning" as const, label: "Apagado" }
      : { variant: "active" as const, label: "Activo" };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-[14px] border border-hairline bg-white p-4 text-left shadow-[0_1px_2px_rgba(17,17,36,0.03)] transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_10px_24px_-16px_rgba(17,17,36,0.25)]"
    >
      <div className="flex items-start gap-3">
        <Avatar src={user.fotoUrl ?? undefined} name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-neutral-900">{user.name}</p>
          <p className="truncate text-[12.5px] text-neutral-500">{user.email}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {user.role === "ADMIN" && (
              <ShieldCheck
                className="h-3.5 w-3.5 text-brand-violet-600"
                aria-label="Administrador"
              />
            )}
            <span className="text-[10.5px] uppercase tracking-[0.08em] text-neutral-400">
              {user.role === "ADMIN" ? "Admin" : "Vendedor"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-[12.5px] text-neutral-600">
        <span className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          {user.telefono || <span className="text-neutral-300">Sin teléfono</span>}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          {user.whatsapp || <span className="text-neutral-300">Sin WhatsApp</span>}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-hairline pt-3">
        <StatusDot variant={estado.variant}>{estado.label}</StatusDot>
        <span
          className="flex items-center gap-1 text-[11.5px] font-medium text-neutral-500"
          title="Envíos de pasajeros recibidos"
        >
          <Inbox className="h-3.5 w-3.5" />
          {enviosCount}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// FichaVendedor — contenido del modal (foto/contacto + links personales)
// ---------------------------------------------------------------------------

interface LinksVendedor {
  slug: string | null;
  linkActivo: boolean;
  pasajerosUrl: string | null;
  pagoUrl: string | null;
  pasajerosQr: string | null;
  pagoQr: string | null;
}

function FichaVendedor({
  user,
  canEdit,
  onClose,
  onEditUsuario,
}: {
  user: AuthUser;
  canEdit: boolean;
  onClose: () => void;
  onEditUsuario: () => void;
}) {
  const { toast } = useToast();
  const { updateVendedorPerfil, getLinksVendedor, setLinkActivo, regenerarSlug } =
    useUserActions();

  // ── Foto / contacto ──
  const [telefono, setTelefono] = useState(user.telefono ?? "");
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ?? "");
  const [fotoUrl, setFotoUrl] = useState<string | null>(user.fotoUrl ?? null);
  const [savingPerfil, setSavingPerfil] = useState(false);

  // ── Links personales ──
  const [links, setLinks] = useState<LinksVendedor | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [togglingLink, setTogglingLink] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmingRegenerar, setConfirmingRegenerar] = useState(false);
  const [copied, setCopied] = useState<"pasajeros" | "pago" | null>(null);

  const loadLinks = useCallback(async () => {
    setLoadingLinks(true);
    try {
      const result = await getLinksVendedor(user.id);
      setLinks({
        slug: result.slug,
        linkActivo: result.linkActivo,
        pasajerosUrl: result.pasajerosUrl,
        pagoUrl: result.pagoUrl,
        pasajerosQr: result.pasajerosQr,
        pagoQr: result.pagoQr,
      });
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudieron cargar los links");
    } finally {
      setLoadingLinks(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  async function handleSavePerfil() {
    setSavingPerfil(true);
    try {
      await updateVendedorPerfil(user.id, { fotoUrl, telefono, whatsapp });
      toast("success", "Perfil actualizado", `Los datos de "${user.name}" fueron guardados.`);
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo guardar el perfil");
    } finally {
      setSavingPerfil(false);
    }
  }

  async function handleToggleLink(next: boolean) {
    setTogglingLink(true);
    try {
      await setLinkActivo(user.id, next);
      setLinks((prev) => (prev ? { ...prev, linkActivo: next } : prev));
      toast(
        "success",
        next ? "Link activado" : "Link apagado",
        next
          ? "El link vuelve a resolver."
          : "Los formularios muestran la página de cortesía en vez de un 404.",
      );
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo actualizar el link");
    } finally {
      setTogglingLink(false);
    }
  }

  async function handleConfirmRegenerar() {
    setRegenerating(true);
    try {
      await regenerarSlug(user.id);
      toast(
        "success",
        links?.slug ? "Link regenerado" : "Link generado",
        links?.slug ? "El link viejo dejó de funcionar." : "Ya podés compartirlo.",
      );
      setConfirmingRegenerar(false);
      await loadLinks();
    } catch (err: any) {
      toast("error", "Error", err?.message ?? "No se pudo generar el link");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy(url: string, label: "pasajeros" | "pago") {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1400);
    } catch {
      toast("error", "No se pudo copiar", "Copiá el link manualmente.");
    }
  }

  const avatarImages: ImageItem[] = fotoUrl ? [{ id: "foto", url: fotoUrl }] : [];

  return (
    <>
      <ModalHeader
        title={user.name}
        description={user.email}
        icon={<Users className="h-5 w-5" strokeWidth={2.4} />}
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-6">
          {/* ── Foto de perfil ── */}
          <div>
            <p className="mb-2 text-label font-medium text-neutral-500">Foto de perfil</p>
            <ImageUploader
              images={avatarImages}
              onAdd={canEdit ? (urls) => setFotoUrl(urls[0] ?? null) : undefined}
              onRemove={canEdit ? () => setFotoUrl(null) : undefined}
              onReplace={canEdit ? (_id, url) => setFotoUrl(url) : undefined}
              maxImages={1}
              aspect={1}
              cropTitle="Recortar foto de perfil"
              folder={`vendedores/${user.id}`}
              enableBulkSelect={false}
            />
          </div>

          {/* ── Contacto ── */}
          <FieldGroup columns={2}>
            <Field>
              <FieldLabel>Teléfono</FieldLabel>
              <Input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+598 9x xxx xxx"
                disabled={!canEdit}
              />
            </Field>
            <Field>
              <FieldLabel>WhatsApp</FieldLabel>
              <Input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+598 9x xxx xxx"
                disabled={!canEdit}
              />
            </Field>
          </FieldGroup>

          {canEdit && (
            <div className="-mt-2 flex justify-end">
              <Button size="sm" loading={savingPerfil} onClick={handleSavePerfil}>
                Guardar cambios
              </Button>
            </div>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={onEditUsuario}
              className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-brand-violet-600 hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar nombre, email y rol
            </button>
          )}

          {/* ── Links personales ── */}
          <div className="border-t border-hairline pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-neutral-900">Links personales</h4>
              {links?.slug && (
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-neutral-500">
                    {links.linkActivo ? "Activo" : "Apagado"}
                  </span>
                  <Toggle
                    checked={links.linkActivo}
                    disabled={!canEdit || togglingLink}
                    onCheckedChange={handleToggleLink}
                  />
                </div>
              )}
            </div>

            {loadingLinks ? (
              <p className="text-[12.5px] text-neutral-400">Cargando links...</p>
            ) : !links?.slug ? (
              <div className="rounded-[10px] border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center">
                <p className="text-[12.5px] text-neutral-500">
                  Este usuario todavía no tiene link personal.
                </p>
                {canEdit && (
                  <Button
                    size="sm"
                    className="mt-3"
                    leftIcon={<Link2 className="h-3.5 w-3.5" />}
                    loading={regenerating}
                    onClick={handleConfirmRegenerar}
                  >
                    Generar link
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {links.pasajerosUrl && links.pasajerosQr && (
                  <LinkRow
                    label="Datos de pasajeros"
                    url={links.pasajerosUrl}
                    qr={links.pasajerosQr}
                    copied={copied === "pasajeros"}
                    onCopy={() => handleCopy(links.pasajerosUrl!, "pasajeros")}
                  />
                )}
                {links.pagoUrl && links.pagoQr && (
                  <LinkRow
                    label="Datos de pago"
                    url={links.pagoUrl}
                    qr={links.pagoQr}
                    copied={copied === "pago"}
                    onCopy={() => handleCopy(links.pagoUrl!, "pago")}
                  />
                )}

                {canEdit && !confirmingRegenerar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    className="w-fit"
                    onClick={() => setConfirmingRegenerar(true)}
                  >
                    Regenerar slug
                  </Button>
                )}

                {/* Confirmación inline — evitamos un segundo Modal anidado */}
                {confirmingRegenerar && (
                  <div className="flex flex-col gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 p-3.5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <p className="text-[12.5px] leading-relaxed text-amber-900">
                        El link actual deja de funcionar de inmediato. Quien lo tenga guardado
                        (por ejemplo, en un email ya enviado) va a ver la página de cortesía.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setConfirmingRegenerar(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        loading={regenerating}
                        onClick={handleConfirmRegenerar}
                      >
                        Regenerar de todos modos
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// LinkRow — url + QR + copiar
// ---------------------------------------------------------------------------

function LinkRow({
  label,
  url,
  qr,
  copied,
  onCopy,
}: {
  label: string;
  url: string;
  qr: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-hairline bg-neutral-50/60 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt={`Código QR — ${label}`}
        className="h-16 w-16 shrink-0 rounded-md border border-hairline bg-white"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium text-neutral-500">{label}</p>
        <p className="truncate text-[12.5px] text-neutral-800">{url}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        leftIcon={
          copied ? (
            <Check className="h-3.5 w-3.5 text-[#1F8A54]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )
        }
        onClick={onCopy}
      >
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}
