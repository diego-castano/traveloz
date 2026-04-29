"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Send,
  Tag,
  Mail,
  Clock,
  Plus,
} from "lucide-react";
import * as notificacionActions from "@/actions/notificacion.actions";
import { useBrand } from "@/components/providers/BrandProvider";
import {
  useCatalogActions,
  useEtiquetas,
} from "@/components/providers/CatalogProvider";
import {
  usePaquetes,
  usePackageState,
  useAllOpcionesHoteleras,
} from "@/components/providers/PackageProvider";
import { useAereos, useServiceState } from "@/components/providers/ServiceProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useCatalogLoading } from "@/components/providers/CatalogProvider";
import { usePackageLoading } from "@/components/providers/PackageProvider";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data/DataTable";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { StatusDot } from "@/components/ui/data/StatusDot";
import { Field, FieldLabel } from "@/components/ui/form/Field";
import { formatCurrency, computePaquetePrecios } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<number, string> = {
  1: "Etiqueta",
  2: "Paquetes",
  3: "Seleccion",
  4: "Enviar",
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ---------------------------------------------------------------------------
// Estado -> StatusDot variant mapping
// ---------------------------------------------------------------------------

function estadoDotVariant(estado: string): "active" | "pending" | "draft" {
  if (estado === "ACTIVO") return "active";
  if (estado === "INACTIVO") return "pending";
  return "draft";
}

// ---------------------------------------------------------------------------
// NotificacionesPage
// ---------------------------------------------------------------------------

export default function NotificacionesPage() {
  // --- Wizard state ---
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedEtiquetaId, setSelectedEtiquetaId] = useState<string | null>(
    null,
  );
  const [selectedPaqueteIds, setSelectedPaqueteIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSending, setIsSending] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [tagForm, setTagForm] = useState({
    nombre: "",
    slug: "",
    color: "#3BBFAD",
  });

  // --- Email subject + body state ---
  const [emailSubject, setEmailSubject] = useState(
    "Nuevos paquetes disponibles",
  );
  const [emailBody, setEmailBody] = useState(
    "Descubrí las ultimas ofertas de tu marca favorita.",
  );

  // --- Notification history ---
  const [historial, setHistorial] = useState<
    Awaited<ReturnType<typeof notificacionActions.getNotificaciones>>
  >([]);

  // --- Data hooks ---
  const etiquetas = useEtiquetas();
  const paquetes = usePaquetes();
  const state = usePackageState();
  const allOpciones = useAllOpcionesHoteleras();
  const aereos = useAereos();
  const serviceState = useServiceState();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();
  const { canEdit } = useAuth();
  const { createEtiqueta } = useCatalogActions();
  const loading = useCatalogLoading() || usePackageLoading();

  // Per-paquete price derivation (Fase 2): computes "desde" price live from
  // current service prices + factor per opción, so notificaciones stay in sync
  // after service edits without requiring a paquete save.
  const preciosMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computePaquetePrecios>> = {};
    for (const paq of paquetes) {
      map[paq.id] = computePaquetePrecios(paq, allOpciones, state, serviceState);
    }
    return map;
  }, [paquetes, allOpciones, state, serviceState]);

  function getPrecioDesde(paqueteId: string, fallback: number): number {
    const pricing = preciosMap[paqueteId];
    if (!pricing || pricing.min === null) return fallback;
    return pricing.min;
  }

  // --- Load notification history ---
  const loadHistorial = useCallback(() => {
    notificacionActions
      .getNotificaciones(activeBrandId)
      .then(setHistorial)
      .catch(console.error);
  }, [activeBrandId]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  // --- Derived data ---
  const filteredPaquetes = useMemo(() => {
    if (!selectedEtiquetaId) return [];
    return paquetes.filter((p) =>
      state.paqueteEtiquetas.some(
        (pe) => pe.paqueteId === p.id && pe.etiquetaId === selectedEtiquetaId,
      ),
    );
  }, [paquetes, state.paqueteEtiquetas, selectedEtiquetaId]);

  useEffect(() => {
    setSelectedPaqueteIds(new Set());
  }, [selectedEtiquetaId]);

  const selectedPaquetesList = useMemo(
    () => filteredPaquetes.filter((p) => selectedPaqueteIds.has(p.id)),
    [filteredPaquetes, selectedPaqueteIds],
  );

  const aereoMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const a of aereos) {
      map[a.id] = a.destino;
    }
    return map;
  }, [aereos]);

  function getDestinoForPaquete(paqueteId: string): string {
    const pa = state.paqueteAereos.find((pa) => pa.paqueteId === paqueteId);
    if (!pa) return "Sin destino";
    return aereoMap[pa.aereoId] ?? "Sin destino";
  }

  const selectedEtiqueta = etiquetas.find((e) => e.id === selectedEtiquetaId);

  // Paquete count per etiqueta
  function paqueteCountForEtiqueta(etiquetaId: string): number {
    return state.paqueteEtiquetas.filter(
      (pe) =>
        pe.etiquetaId === etiquetaId &&
        paquetes.some((p) => p.id === pe.paqueteId),
    ).length;
  }

  function openCreateTagModal() {
    setTagForm({ nombre: "", slug: "", color: "#3BBFAD" });
    setTagModalOpen(true);
  }

  async function handleCreateTag(e?: React.FormEvent) {
    e?.preventDefault();
    const nombre = tagForm.nombre.trim();
    const slug = tagForm.slug.trim() || slugify(nombre);
    if (!nombre || !slug) return;

    setIsCreatingTag(true);
    try {
      const created = await createEtiqueta({
        brandId: activeBrandId,
        nombre,
        slug,
        color: tagForm.color,
      });
      setSelectedEtiquetaId(created.id);
      setTagModalOpen(false);
      toast("success", "Etiqueta creada", `"${nombre}" fue creada correctamente`);
    } catch (err) {
      toast(
        "error",
        "Error al crear etiqueta",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    } finally {
      setIsCreatingTag(false);
    }
  }

  // --- Navigation logic ---
  function isSiguienteDisabled(): boolean {
    if (step === 1) return !selectedEtiquetaId;
    if (step === 3) return selectedPaquetesList.length === 0;
    return false;
  }

  function handleNext() {
    if (step < 4) setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
  }

  function handleBack() {
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
  }

  async function handleSend() {
    if (!selectedEtiquetaId) return;
    setIsSending(true);
    try {
      await notificacionActions.createNotificacion({
        etiquetaId: selectedEtiquetaId,
        paqueteIds: selectedPaquetesList.map((p) => p.id),
      });
      toast(
        "success",
        "Notificaciones enviadas",
        `${selectedPaquetesList.length} paquetes notificados exitosamente`,
      );
      setStep(1);
      setSelectedEtiquetaId(null);
      setSelectedPaqueteIds(new Set());
      loadHistorial();
    } catch {
      toast("error", "Error", "No se pudieron enviar las notificaciones.");
    } finally {
      setIsSending(false);
    }
  }

  // --- Step 3: checkbox helpers ---
  const allSelected =
    filteredPaquetes.length > 0 &&
    filteredPaquetes.every((p) => selectedPaqueteIds.has(p.id));

  function togglePaquete(paqueteId: string) {
    setSelectedPaqueteIds((prev) => {
      const next = new Set(prev);
      if (next.has(paqueteId)) {
        next.delete(paqueteId);
      } else {
        next.add(paqueteId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedPaqueteIds(new Set());
    } else {
      setSelectedPaqueteIds(new Set(filteredPaquetes.map((p) => p.id)));
    }
  }

  // ---------------------------------------------------------------------------
  // Step Indicator — clean horizontal line stepper
  // ---------------------------------------------------------------------------

  function StepIndicator() {
    return (
      <div className="flex items-center justify-between px-2 py-6">
        {[1, 2, 3, 4].map((n, idx) => {
          const isCompleted = n < step;
          const isActive = n === step;
          const reached = isCompleted || isActive;
          return (
            <div key={n} className="flex flex-1 items-center last:flex-none">
              {/* Dot + label */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors"
                  style={{
                    background: reached ? "#3BBFAD" : "#FFFFFF",
                    color: reached ? "#FFFFFF" : "#9CA3AF",
                    border: reached
                      ? "1px solid #3BBFAD"
                      : "1px solid rgba(17,17,36,0.12)",
                  }}
                >
                  {isCompleted ? <Check size={13} strokeWidth={2.5} /> : n}
                </div>
                <span
                  className="text-[10.5px] font-medium uppercase tracking-[0.06em] whitespace-nowrap"
                  style={{
                    color: reached ? "#1F7D70" : "#9CA3AF",
                  }}
                >
                  {STEP_LABELS[n]}
                </span>
              </div>

              {/* Connector line */}
              {idx < 3 && (
                <div
                  className="mx-2 h-[1px] flex-1"
                  style={{
                    background: n < step ? "#3BBFAD" : "rgba(17,17,36,0.10)",
                    transition: "background 0.3s",
                    marginBottom: "22px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 1 — Select Etiqueta
  // ---------------------------------------------------------------------------

  function StepBackButton({ label }: { label: string }) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleBack}
        leftIcon={<ChevronLeft size={15} />}
      >
        {label}
      </Button>
    );
  }

  function Step1Content() {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <Tag size={15} className="text-teal-500" />
            Selecciona una etiqueta
          </p>
          {canEdit && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openCreateTagModal}
              leftIcon={<Plus size={15} />}
            >
              Agregar etiqueta
            </Button>
          )}
        </div>
        {etiquetas.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No hay etiquetas disponibles para esta marca.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {etiquetas.map((et) => {
              const isSelected = selectedEtiquetaId === et.id;
              const count = paqueteCountForEtiqueta(et.id);
              return (
                <button
                  type="button"
                  key={et.id}
                  onClick={() =>
                    setSelectedEtiquetaId(isSelected ? null : et.id)
                  }
                  className="cursor-pointer rounded-[12px] border bg-white p-3 text-left transition-all hover:border-neutral-300"
                  style={{
                    borderColor: isSelected
                      ? "#3BBFAD"
                      : "rgba(17,17,36,0.10)",
                    background: isSelected
                      ? "rgba(59,191,173,0.04)"
                      : "#FFFFFF",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: et.color }}
                    />
                    <span className="text-sm font-medium text-neutral-700 truncate">
                      {et.nombre}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {count} paquete{count !== 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 2 — View Filtered Paquetes
  // ---------------------------------------------------------------------------

  function Step2Content() {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-700">
            Paquetes con etiqueta:{" "}
            {selectedEtiqueta && (
              <span
                className="ml-1 px-2 py-0.5 rounded-full text-xs text-white"
                style={{ backgroundColor: selectedEtiqueta.color }}
              >
                {selectedEtiqueta.nombre}
              </span>
            )}
          </p>
          <StepBackButton label="Volver a etiquetas" />
        </div>
        {filteredPaquetes.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No hay paquetes con esta etiqueta.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredPaquetes.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3 rounded-[12px] border border-hairline bg-white"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-neutral-800 truncate">
                    {p.titulo}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {getDestinoForPaquete(p.id)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot variant={estadoDotVariant(p.estado)}>
                    {p.estado}
                  </StatusDot>
                  <span className="text-sm font-semibold text-neutral-700">
                    {formatCurrency(getPrecioDesde(p.id, p.precioVenta))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Select Paquetes with Checkboxes
  // ---------------------------------------------------------------------------

  function Step3Content() {
    const selected = selectedPaquetesList.length;
    const total = filteredPaquetes.length;

    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-neutral-700">
              Selecciona paquetes a notificar
            </p>
            <span className="text-xs text-neutral-400">
              {selected} de {total} seleccionado{selected !== 1 ? "s" : ""}
            </span>
          </div>
          <StepBackButton label="Volver a paquetes" />
        </div>

        {/* Select all row */}
        <div
          className="flex cursor-pointer items-center gap-3 px-4 py-3 rounded-[12px] border border-hairline bg-white mb-2"
          onClick={toggleAll}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          </div>
          <span className="text-sm font-medium text-neutral-600">
            Seleccionar todos
          </span>
        </div>

        {filteredPaquetes.length === 0 ? (
          <p className="text-sm text-neutral-400 py-3">
            No hay paquetes para seleccionar.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredPaquetes.map((p) => {
              const isSel = selectedPaqueteIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-[12px] border bg-white cursor-pointer transition-colors"
                  style={{
                    borderColor: isSel
                      ? "rgba(59,191,173,0.55)"
                      : "rgba(17,17,36,0.08)",
                    background: isSel
                      ? "rgba(59,191,173,0.04)"
                      : "#FFFFFF",
                  }}
                  onClick={() => togglePaquete(p.id)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => togglePaquete(p.id)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {p.titulo}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {getDestinoForPaquete(p.id)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-neutral-700 shrink-0">
                    {formatCurrency(getPrecioDesde(p.id, p.precioVenta))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 4 — Email Preview
  // ---------------------------------------------------------------------------

  function Step4Content() {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <Mail size={15} className="text-teal-500" />
            Vista previa del email
          </p>
          <StepBackButton label="Volver a selección" />
        </div>

        <div className="flex flex-col gap-4 mb-5">
          <Field>
            <FieldLabel>Asunto</FieldLabel>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Asunto del email"
            />
          </Field>
          <Field>
            <FieldLabel>Mensaje</FieldLabel>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={3}
              placeholder="Mensaje introductorio del email"
              className="w-full resize-y px-3 py-2 text-[13.5px] text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-brand-teal-400"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(17,17,36,0.10)",
                borderRadius: "8px",
                boxShadow: "inset 0 1px 0 rgba(17,17,36,0.02)",
              }}
            />
          </Field>
        </div>

        {/* Simulated email card */}
        <div className="rounded-[12px] overflow-hidden border border-hairline bg-white">
          {/* Email header bar */}
          <div
            className="h-2"
            style={{
              background:
                "linear-gradient(90deg, #3BBFAD 0%, #2A9E8E 100%)",
            }}
          />

          <div className="p-5">
            {/* Email heading */}
            <h3 className="text-base font-bold text-neutral-800 mb-1">
              {emailSubject}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">{emailBody}</p>

            {/* Package list */}
            <div className="space-y-3">
              {selectedPaquetesList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-[10px] bg-white border border-hairline"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-bold text-neutral-800 truncate">
                      {p.titulo}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {getDestinoForPaquete(p.id)}
                    </p>
                    <p className="text-sm font-semibold text-teal-600 mt-1">
                      {formatCurrency(getPrecioDesde(p.id, p.precioVenta))}
                    </p>
                  </div>
                  <span
                    className="inline-block px-3 py-1.5 rounded text-xs font-semibold text-white shrink-0"
                    style={{
                      background:
                        "linear-gradient(145deg, #45D4C0 0%, #2A9E8E 100%)",
                    }}
                  >
                    Ver paquete
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="text-[11px] text-neutral-400 mt-5 pt-4 border-t border-hairline">
              Este email sera enviado a los vendedores asociados a la marca
              activa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <div>
      <DataTablePageHeader
        title="Notificaciones"
        subtitle="Envio de notificaciones a vendedores"
      />

      <div className="max-w-2xl mx-auto rounded-[12px] border border-hairline bg-white">
        {/* Step indicator */}
        <StepIndicator />

        {/* Step content */}
        <div className="px-5 pb-5">
          <div className="min-h-[200px]">
            {step === 1 && <Step1Content />}
            {step === 2 && <Step2Content />}
            {step === 3 && <Step3Content />}
            {step === 4 && <Step4Content />}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-hairline">
            {/* Back button */}
            <Button
              variant="secondary"
              size="sm"
              disabled={step === 1}
              onClick={handleBack}
              leftIcon={<ChevronLeft size={15} />}
            >
              Atras
            </Button>

            {/* Forward button (Siguiente or Enviar) */}
            {step < 4 ? (
              <Button
                variant="primary"
                size="sm"
                disabled={isSiguienteDisabled()}
                onClick={handleNext}
                rightIcon={<ChevronRight size={15} />}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={isSending}
                loading={isSending}
                onClick={handleSend}
                leftIcon={!isSending ? <Send size={15} /> : undefined}
              >
                {isSending ? "Enviando..." : "Enviar Notificaciones"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal open={tagModalOpen} onOpenChange={setTagModalOpen} size="md">
        <ModalHeader
          title="Nueva etiqueta"
          description="Crea una etiqueta para agrupar paquetes y usarla en este envio."
          icon={<Tag className="h-5 w-5" strokeWidth={2.2} />}
        />
        <form onSubmit={handleCreateTag}>
          <ModalBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Nombre</FieldLabel>
                <Input
                  value={tagForm.nombre}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    setTagForm((form) => ({
                      ...form,
                      nombre,
                      slug: slugify(nombre),
                    }));
                  }}
                  placeholder="Ej: Caribe"
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input
                  value={tagForm.slug}
                  onChange={(e) =>
                    setTagForm((form) => ({ ...form, slug: e.target.value }))
                  }
                  placeholder="caribe"
                />
              </Field>
              <Field>
                <FieldLabel>Color</FieldLabel>
                <div className="flex h-9 items-center gap-2 rounded-[8px] border border-[rgba(17,17,36,0.10)] bg-white px-2">
                  <input
                    type="color"
                    value={tagForm.color}
                    onChange={(e) =>
                      setTagForm((form) => ({
                        ...form,
                        color: e.target.value,
                      }))
                    }
                    className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                    aria-label="Color de etiqueta"
                  />
                  <span className="font-mono text-[12px] text-neutral-500">
                    {tagForm.color}
                  </span>
                </div>
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTagModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreatingTag || !tagForm.nombre.trim()}
            >
              {isCreatingTag ? "Creando..." : "Crear etiqueta"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Notification History */}
      {historial.length > 0 && (
        <div className="max-w-2xl mx-auto mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Clock size={16} className="text-neutral-400" />
            <span className="text-sm font-semibold text-neutral-700">
              Historial de envios
            </span>
          </div>

          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead>Etiqueta</DataTableHead>
                <DataTableHead align="right">Paquetes</DataTableHead>
                <DataTableHead align="right">Enviado</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {historial.map((n) => {
                const et = n.etiqueta;
                const fecha = new Date(n.enviadoAt).toLocaleDateString(
                  "es-UY",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                return (
                  <DataTableRow key={n.id} interactive={false}>
                    <DataTableCell variant="primary">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: et?.color ?? "#9CA3AF",
                          }}
                        />
                        {et?.nombre ?? "Etiqueta eliminada"}
                      </span>
                    </DataTableCell>
                    <DataTableCell variant="mono" align="right">
                      {n.paqueteIds.length}
                    </DataTableCell>
                    <DataTableCell variant="muted" align="right">
                      {fecha}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </div>
      )}
    </div>
  );
}
