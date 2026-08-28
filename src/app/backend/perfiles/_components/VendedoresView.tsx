"use client";

// ---------------------------------------------------------------------------
// VendedoresView · vista comercial de vendedores dentro de /backend/perfiles
// (Fase 3: vendedores FUSIONADOS en Perfiles, no un módulo aparte).
//
// Muestra los usuarios con rol VENDEDOR o ADMIN como tarjetas (avatar,
// contacto, estado del link público, contador de envíos recibidos). Cada
// tarjeta copia los links personales sin abrir la ficha: "Pasajeros", "Pago" y
// "Ambos" (este último con etiquetas, listo para pegar en WhatsApp).
//
// La ficha edita TODO en un solo paso: foto, firma de email, teléfono y
// whatsapp por updateVendedorPerfil, y nombre/email/rol por updateUser (con sus
// salvaguardas de usuario protegido y último admin). Ningún click de la ficha
// descarta cambios sin confirmar: cerrar o saltar a otra pantalla con cambios
// pendientes abre un aviso.
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import {
  Users,
  Phone,
  MessageCircle,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Inbox,
  ShieldCheck,
  AlertTriangle,
  Key,
  Hash,
  ExternalLink,
  Upload,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusDot } from "@/components/ui/data/StatusDot";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { ImageUploader, type ImageItem } from "@/components/ui/ImageUploader";
import { uploadFile } from "@/components/lib/upload";
import { ModalHeader, ModalBody, ModalFooter, Modal } from "@/components/ui/Modal";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/form/Field";
import { DataTableToolbar } from "@/components/ui/data/DataTableToolbar";
import { EmptyState } from "@/components/ui/data/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useUserActions } from "@/components/providers/UserProvider";
import type { AuthUser, Role } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Links públicos derivados del slug
// ---------------------------------------------------------------------------

// El sitio público vive en el apex. En el server esto sale de SITE_BASE_URL
// (src/lib/datos-email.ts), pero acá no hay env expuesta al cliente: repetimos
// el mismo destino para que lo copiado sirva para pegar en un WhatsApp, no la
// URL interna de Railway ni un localhost.
const PUBLIC_SITE_URL = "https://traveloz.com.uy";

function linksDeSlug(slug: string) {
  return {
    pasajeros: `${PUBLIC_SITE_URL}/datos-de-pasajeros/${slug}`,
    pago: `${PUBLIC_SITE_URL}/datos-de-pago/${slug}`,
  };
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "MARKETING", label: "Marketing" },
];

// ---------------------------------------------------------------------------
// VendedoresView
// ---------------------------------------------------------------------------

interface VendedoresViewProps {
  /** Ya filtrados a role VENDEDOR/ADMIN por el padre. */
  users: AuthUser[];
  canEdit: boolean;
  /** Abre el modal de contraseña que ya existe en la vista Usuarios y roles. */
  onCambiarPassword: (user: AuthUser) => void;
  /** Abre el modal de PIN que ya existe en la vista Usuarios y roles. */
  onGestionarPin: (user: AuthUser) => void;
}

export function VendedoresView({
  users,
  canEdit,
  onCambiarPassword,
  onGestionarPin,
}: VendedoresViewProps) {
  const { getEnviosCountPorVendedor } = useUserActions();

  const [search, setSearch] = useState("");
  const [envioCounts, setEnvioCounts] = useState<Record<string, number>>({});
  const [fichaUser, setFichaUser] = useState<AuthUser | null>(null);

  // Guardia de cambios sin guardar: la ficha avisa si está sucia y toda salida
  // (cerrar, Escape, click en el fondo, saltar a contraseña/PIN) pasa por acá.
  const [fichaSucia, setFichaSucia] = useState(false);
  const [salidaPendiente, setSalidaPendiente] = useState<(() => void) | null>(null);

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

  const cerrarFicha = useCallback(() => {
    setFichaSucia(false);
    setFichaUser(null);
  }, []);

  /** Corre `accion` salvo que haya cambios sin guardar: ahí pide confirmación. */
  const pedirSalida = useCallback(
    (accion: () => void) => {
      if (fichaSucia) {
        setSalidaPendiente(() => accion);
        return;
      }
      accion();
    },
    [fichaSucia],
  );

  function descartarYSalir() {
    const accion = salidaPendiente;
    setSalidaPendiente(null);
    setFichaSucia(false);
    accion?.();
  }

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
          if (!open) pedirSalida(cerrarFicha);
        }}
        size="lg"
      >
        {fichaUser && (
          <FichaVendedor
            user={fichaUser}
            canEdit={canEdit}
            onDirtyChange={setFichaSucia}
            confirmandoSalida={!!salidaPendiente}
            onCancelarSalida={() => setSalidaPendiente(null)}
            onDescartarSalida={descartarYSalir}
            onRequestClose={() => pedirSalida(cerrarFicha)}
            onCambiarPassword={() =>
              pedirSalida(() => {
                const target = fichaUser;
                setFichaSucia(false);
                setFichaUser(null);
                onCambiarPassword(target);
              })
            }
            onGestionarPin={() =>
              pedirSalida(() => {
                const target = fichaUser;
                setFichaSucia(false);
                setFichaUser(null);
                onGestionarPin(target);
              })
            }
          />
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// VendedorCard
// ---------------------------------------------------------------------------

type CopiaTipo = "pasajeros" | "pago" | "ambos";

function VendedorCard({
  user,
  enviosCount,
  onOpen,
}: {
  user: AuthUser;
  enviosCount: number;
  onOpen: () => void;
}) {
  const { toast } = useToast();
  const [copiado, setCopiado] = useState<CopiaTipo | null>(null);

  const estado = !user.slug
    ? { variant: "inactive" as const, label: "Sin slug" }
    : user.linkActivo === false
      ? { variant: "warning" as const, label: "Apagado" }
      : { variant: "active" as const, label: "Activo" };

  const links = user.slug ? linksDeSlug(user.slug) : null;

  async function copiar(tipo: CopiaTipo) {
    if (!links) return;
    const texto =
      tipo === "pasajeros"
        ? links.pasajeros
        : tipo === "pago"
          ? links.pago
          : `Datos de pasajeros: ${links.pasajeros}\nDatos de pago: ${links.pago}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);
      setTimeout(() => setCopiado((c) => (c === tipo ? null : c)), 1400);
      toast(
        "success",
        tipo === "ambos" ? "Links copiados" : "Link copiado",
        tipo === "pasajeros"
          ? `Datos de pasajeros de ${user.name}.`
          : tipo === "pago"
            ? `Datos de pago de ${user.name}.`
            : `Los dos links de ${user.name}, listos para pegar.`,
      );
    } catch {
      toast("error", "No se pudo copiar", "El navegador bloqueó el portapapeles.");
    }
  }

  return (
    <div className="group flex flex-col rounded-[14px] border border-hairline bg-white text-left shadow-[0_1px_2px_rgba(17,17,36,0.03)] transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_10px_24px_-16px_rgba(17,17,36,0.25)]">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col gap-3 rounded-t-[14px] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-violet-300"
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
      </button>

      <div className="mx-4 flex items-center justify-between border-t border-hairline py-3">
        <StatusDot variant={estado.variant}>{estado.label}</StatusDot>
        <span
          className="flex items-center gap-1 text-[11.5px] font-medium text-neutral-500"
          title="Envíos de pasajeros recibidos"
        >
          <Inbox className="h-3.5 w-3.5" />
          {enviosCount}
        </span>
      </div>

      {/* Copiar sin abrir la ficha. Sin slug no hay nada que copiar. */}
      {links && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline px-4 py-2.5">
          <span className="mr-auto text-[10.5px] uppercase tracking-[0.08em] text-neutral-400">
            Copiar link
          </span>
          <CopyChip
            label="Pasajeros"
            copiado={copiado === "pasajeros"}
            onClick={() => copiar("pasajeros")}
          />
          <CopyChip label="Pago" copiado={copiado === "pago"} onClick={() => copiar("pago")} />
          <CopyChip label="Ambos" copiado={copiado === "ambos"} onClick={() => copiar("ambos")} />
        </div>
      )}
    </div>
  );
}

function CopyChip({
  label,
  copiado,
  onClick,
}: {
  label: string;
  copiado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Copiar link de ${label.toLowerCase()}`}
      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-violet-300"
    >
      {copiado ? (
        <Check className="h-3 w-3 text-[#1F8A54]" />
      ) : (
        <Copy className="h-3 w-3 text-neutral-400" />
      )}
      {copiado ? "Copiado" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// FichaVendedor · contenido del modal (cuenta + comercial + links personales)
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
  onDirtyChange,
  confirmandoSalida,
  onCancelarSalida,
  onDescartarSalida,
  onRequestClose,
  onCambiarPassword,
  onGestionarPin,
}: {
  user: AuthUser;
  canEdit: boolean;
  onDirtyChange: (sucia: boolean) => void;
  confirmandoSalida: boolean;
  onCancelarSalida: () => void;
  onDescartarSalida: () => void;
  onRequestClose: () => void;
  onCambiarPassword: () => void;
  onGestionarPin: () => void;
}) {
  const { toast } = useToast();
  const {
    updateVendedorPerfil,
    updateUser,
    getLinksVendedor,
    setLinkActivo,
    regenerarSlug,
  } = useUserActions();

  // ── Estado del formulario ──
  const [telefono, setTelefono] = useState(user.telefono ?? "");
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ?? "");
  const [fotoUrl, setFotoUrl] = useState<string | null>(user.fotoUrl ?? null);
  const [firmaUrl, setFirmaUrl] = useState<string | null>(user.firmaUrl ?? null);
  // El frame fijo no se elige: lo genera la subida y sigue a la firma.
  const [firmaEstaticaUrl, setFirmaEstaticaUrl] = useState<string | null>(
    user.firmaEstaticaUrl ?? null,
  );
  const [nombre, setNombre] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [rol, setRol] = useState<Role>(user.role);
  const [guardando, setGuardando] = useState(false);
  const [cuentaError, setCuentaError] = useState("");

  // Referencia de "lo último guardado". Se mueve por partes: si lo comercial
  // guardó bien y la cuenta falló, la foto ya quedó firme y no se pierde.
  const [base, setBase] = useState({
    fotoUrl: user.fotoUrl ?? null,
    firmaUrl: user.firmaUrl ?? null,
    firmaEstaticaUrl: user.firmaEstaticaUrl ?? null,
    telefono: user.telefono ?? "",
    whatsapp: user.whatsapp ?? "",
    nombre: user.name,
    email: user.email,
    rol: user.role as Role,
  });

  const comercialSucio =
    fotoUrl !== base.fotoUrl ||
    firmaUrl !== base.firmaUrl ||
    firmaEstaticaUrl !== base.firmaEstaticaUrl ||
    telefono.trim() !== base.telefono.trim() ||
    whatsapp.trim() !== base.whatsapp.trim();

  const cuentaSucia =
    nombre.trim() !== base.nombre.trim() ||
    email.trim().toLowerCase() !== base.email.trim().toLowerCase() ||
    rol !== base.rol;

  const sucio = comercialSucio || cuentaSucia;

  useEffect(() => {
    onDirtyChange(sucio);
  }, [sucio, onDirtyChange]);

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

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nombreValido = nombre.trim().length > 0;

  async function handleGuardar() {
    if (!canEdit || !sucio) return;
    setCuentaError("");

    if (cuentaSucia && !nombreValido) {
      setCuentaError("El nombre no puede quedar vacío.");
      return;
    }
    if (cuentaSucia && !emailValido) {
      setCuentaError("Email inválido.");
      return;
    }

    setGuardando(true);

    // Primero lo comercial. Si después falla la cuenta (email duplicado,
    // usuario protegido), la foto recién cargada ya quedó guardada.
    if (comercialSucio) {
      try {
        await updateVendedorPerfil(user.id, {
          fotoUrl, firmaUrl, firmaEstaticaUrl, telefono, whatsapp,
        });
        setBase((b) => ({ ...b, fotoUrl, firmaUrl, firmaEstaticaUrl, telefono, whatsapp }));
      } catch (err: any) {
        setGuardando(false);
        toast("error", "Error", err?.message ?? "No se pudo guardar el perfil");
        return;
      }
    }

    if (cuentaSucia) {
      try {
        await updateUser({
          ...user,
          name: nombre.trim(),
          email: email.trim(),
          role: rol,
        });
        setBase((b) => ({
          ...b,
          nombre: nombre.trim(),
          email: email.trim(),
          rol,
        }));
      } catch (err: any) {
        setGuardando(false);
        setCuentaError(err?.message ?? "No se pudo actualizar la cuenta.");
        toast(
          "warning",
          "Guardado parcial",
          comercialSucio
            ? "Foto y contacto quedaron guardados. Revisá el error en Cuenta."
            : "Revisá el error en la sección Cuenta.",
        );
        return;
      }
    }

    setGuardando(false);
    toast("success", "Perfil actualizado", `Los datos de "${nombre.trim()}" fueron guardados.`);
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

  async function handleCopyAmbos() {
    if (!links?.pasajerosUrl || !links.pagoUrl) return;
    const texto = `Datos de pasajeros: ${links.pasajerosUrl}\nDatos de pago: ${links.pagoUrl}`;
    try {
      await navigator.clipboard.writeText(texto);
      toast("success", "Links copiados", "Los dos links, listos para pegar.");
    } catch {
      toast("error", "No se pudo copiar", "Copiá los links manualmente.");
    }
  }

  const avatarImages: ImageItem[] = fotoUrl ? [{ id: "foto", url: fotoUrl }] : [];
  const protegido = !!user.isProtected;
  const rolSaleDeLaLista = rol === "MARKETING" && base.rol !== "MARKETING";

  return (
    <>
      <ModalHeader
        title={user.name}
        description={user.email}
        icon={<Users className="h-5 w-5" strokeWidth={2.4} />}
        onClose={onRequestClose}
      />
      <ModalBody>
        <div className="flex flex-col gap-6">
          {/* Aviso de salida con cambios sin guardar */}
          {confirmandoSalida && (
            <div className="flex flex-col gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 p-3.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[12.5px] leading-relaxed text-amber-900">
                  Tenés cambios sin guardar en esta ficha. Si salís ahora se pierden.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="xs" onClick={onCancelarSalida}>
                  Seguir editando
                </Button>
                <Button variant="danger" size="xs" onClick={onDescartarSalida}>
                  Descartar y salir
                </Button>
              </div>
            </div>
          )}

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

          {/* ── Firma de email (GIF) ──
              Pedido del cliente 28/08: la firma institucional es un GIF
              animado y tiene que subirse tal cual. Por eso no usa
              ImageUploader (recorta y el server convierte a WebP, lo que deja
              la animación en un solo frame): va por `raw`, sin recorte. */}
          <div className="border-t border-hairline pt-5">
            <p className="mb-2 text-label font-medium text-neutral-500">Firma de email (GIF)</p>
            <FirmaUploader
              url={firmaUrl}
              nombre={user.name}
              folder={`firmas/${user.id}`}
              disabled={!canEdit}
              onChange={(nueva, fija) => {
                setFirmaUrl(nueva);
                setFirmaEstaticaUrl(fija);
              }}
            />
          </div>

          {/* ── Cuenta: nombre, email y rol ── */}
          <div className="border-t border-hairline pt-5">
            <h4 className="mb-3 text-[13px] font-semibold text-neutral-900">Cuenta</h4>
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Nombre</FieldLabel>
                <Input
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setCuentaError("");
                  }}
                  placeholder="Nombre completo"
                  disabled={!canEdit}
                />
              </Field>
              <Field span={2} invalid={!!cuentaError}>
                <FieldLabel required>Email</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setCuentaError("");
                  }}
                  placeholder="email@empresa.com"
                  disabled={!canEdit || protegido}
                />
              </Field>
              <Field span={2}>
                <FieldLabel required>Rol</FieldLabel>
                <Select
                  value={rol}
                  onValueChange={(v) => {
                    setRol(v as Role);
                    setCuentaError("");
                  }}
                  options={ROLE_OPTIONS}
                  disabled={!canEdit || protegido}
                />
                {protegido && (
                  <p className="mt-1.5 text-[11.5px] text-neutral-400">
                    Administrador protegido: su email y su rol no se pueden cambiar.
                  </p>
                )}
                {rolSaleDeLaLista && (
                  <p className="mt-1.5 text-[11.5px] text-amber-700">
                    Con rol Marketing deja de aparecer en esta lista: se edita desde
                    Usuarios y roles.
                  </p>
                )}
              </Field>
            </FieldGroup>
            {cuentaError && (
              <div className="mt-2">
                <FieldError>{cuentaError}</FieldError>
              </div>
            )}
          </div>

          {/* ── Contacto comercial ── */}
          <div className="border-t border-hairline pt-5">
            <h4 className="mb-3 text-[13px] font-semibold text-neutral-900">Contacto</h4>
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
          </div>

          {/* ── Acceso: vive en otra pantalla, avisamos antes de saltar ── */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
              <span className="mr-auto text-[12px] text-neutral-500">
                Contraseña y PIN se cambian en otra pantalla.
              </span>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Key className="h-3.5 w-3.5" />}
                rightIcon={<ExternalLink className="h-3 w-3" />}
                onClick={onCambiarPassword}
              >
                Cambiar contraseña
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Hash className="h-3.5 w-3.5" />}
                rightIcon={<ExternalLink className="h-3 w-3" />}
                onClick={onGestionarPin}
              >
                {user.hasPin ? "Cambiar PIN" : "Asignar PIN"}
              </Button>
            </div>
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

                <div className="flex flex-wrap items-center gap-2">
                  {links.pasajerosUrl && links.pagoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                      className="w-fit"
                      onClick={handleCopyAmbos}
                    >
                      Copiar ambos
                    </Button>
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
                </div>

                {/* Confirmación inline · evitamos un segundo Modal anidado */}
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
        {sucio && (
          <span className="mr-auto text-[11.5px] text-amber-700">Cambios sin guardar</span>
        )}
        <Button variant="ghost" onClick={onRequestClose}>
          Cerrar
        </Button>
        {canEdit && (
          <Button loading={guardando} disabled={!sucio} onClick={handleGuardar}>
            Guardar cambios
          </Button>
        )}
      </ModalFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// FirmaUploader · sube el GIF de la firma sin tocarlo
//
// Input de archivo pelado (sin recorte, sin compresión del navegador) contra
// /api/upload con `raw=1`. La URL queda en el estado de la ficha: recién se
// persiste cuando el operador aprieta "Guardar cambios", igual que la foto.
//
// Con un GIF animado el server devuelve además `staticUrl` —el último frame en
// WebP— y el uploader lo entrega junto con la firma: el PDF imprime ese, porque
// Chromium congela el GIF en un frame cualquiera.
// Quitar no borra del bucket a propósito — el archivo queda huérfano y lo
// levanta /api/files/gc-orphans, que es el patrón del repo.
// ---------------------------------------------------------------------------

/** Tope del camino `raw` del pipeline. Se avisa acá para no gastar la subida. */
const FIRMA_MAX_BYTES = 2 * 1024 * 1024;
const FIRMA_ACCEPT = "image/gif,image/png,image/jpeg";

function FirmaUploader({
  url,
  nombre,
  folder,
  disabled,
  onChange,
}: {
  url: string | null;
  nombre: string;
  folder: string;
  disabled: boolean;
  /** `(firma, frameFijo)`. Los dos van juntos: se setean y se limpian a la vez. */
  onChange: (url: string | null, estatica: string | null) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // El input se limpia siempre: si no, elegir el mismo archivo dos veces
    // seguidas no dispara el change y parece que no pasó nada.
    e.target.value = "";
    if (!file) return;

    if (!FIRMA_ACCEPT.split(",").includes(file.type)) {
      toast("error", "Formato no admitido", "La firma tiene que ser GIF, PNG o JPG.");
      return;
    }
    if (file.size > FIRMA_MAX_BYTES) {
      toast("error", "Archivo muy grande", "La firma no puede pasar de 2 MB.");
      return;
    }

    setSubiendo(true);
    try {
      const subido = await uploadFile(file, { folder, raw: true });
      onChange(subido.url, subido.staticUrl ?? null);
      toast(
        "success",
        "Firma cargada",
        subido.staticUrl
          ? "Se guardó también el frame fijo para el PDF. Acordate de guardar los cambios."
          : "Acordate de guardar los cambios.",
      );
    } catch (err: any) {
      toast("error", "No se pudo subir", err?.message ?? "Probá de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        id="firma-gif-input"
        data-testid="firma-gif-input"
        type="file"
        accept={FIRMA_ACCEPT}
        className="sr-only"
        aria-label="Firma de email (GIF)"
        disabled={disabled}
        onChange={handleFile}
      />

      {url ? (
        <div className="overflow-hidden rounded-[10px] border border-hairline bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Firma de email · ${nombre}`}
            data-testid="firma-gif-preview"
            className="block h-auto w-full"
          />
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center">
          <p className="text-[12.5px] text-neutral-500">
            Sin firma cargada. La cotización y los emails usan la firma de siempre.
          </p>
        </div>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={subiendo}
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            onClick={() => inputRef.current?.click()}
          >
            {url ? "Reemplazar firma" : "Subir firma"}
          </Button>
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => onChange(null, null)}
            >
              Quitar firma
            </Button>
          )}
          <span className="text-[11.5px] text-neutral-400">
            GIF animado 1800 × 585, hasta 2 MB. Se sube tal cual, sin recortar.
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkRow · url + QR + copiar
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
        alt={`Código QR · ${label}`}
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
