"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Check, ChevronRight, ChevronLeft, Send, Tag, Mail, Clock } from "lucide-react";
import * as notificacionActions from "@/actions/notificacion.actions";
import { useBrand } from "@/components/providers/BrandProvider";
import { useEtiquetas } from "@/components/providers/CatalogProvider";
import { usePaquetes, usePackageState } from "@/components/providers/PackageProvider";
import { useAereos } from "@/components/providers/ServiceProvider";
import { useToast } from "@/components/ui/Toast";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { glassMaterials } from "@/components/lib/glass";

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<number, string> = {
  1: "Etiqueta",
  2: "Paquetes",
  3: "Seleccion",
  4: "Enviar",
};

// ---------------------------------------------------------------------------
// Estado -> Badge variant mapping
// ---------------------------------------------------------------------------

function estadoBadgeVariant(estado: string): "active" | "pending" | "draft" {
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
  const [selectedEtiquetaId, setSelectedEtiquetaId] = useState<string | null>(null);
  const [selectedPaqueteIds, setSelectedPaqueteIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  // --- Notification history ---
  const [historial, setHistorial] = useState<
    Awaited<ReturnType<typeof notificacionActions.getNotificaciones>>
  >([]);

  // --- Data hooks ---
  const etiquetas = useEtiquetas();
  const paquetes = usePaquetes();
  const state = usePackageState();
  const aereos = useAereos();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();

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

  // --- Navigation logic ---
  function isSiguienteDisabled(): boolean {
    if (step === 1) return !selectedEtiquetaId;
    if (step === 3) return selectedPaqueteIds.size === 0;
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
        brandId: activeBrandId,
        etiquetaId: selectedEtiquetaId,
        paqueteIds: Array.from(selectedPaqueteIds),
      });
      toast(
        "success",
        "Notificaciones enviadas",
        `${selectedPaqueteIds.size} paquetes notificados exitosamente`,
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

  // --- Selected paquetes list for preview ---
  const selectedPaquetesList = filteredPaquetes.filter((p) =>
    selectedPaqueteIds.has(p.id),
  );

  // ---------------------------------------------------------------------------
  // Step Indicator
  // ---------------------------------------------------------------------------

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center px-4 py-5 overflow-x-auto">
        {[1, 2, 3, 4].map((n) => {
          const isCompleted = n < step;
          const isActive = n === step;
          return (
            <div key={n} className="flex items-center">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors"
                  style={{
                    background: isCompleted || isActive ? "#3BBFAD" : "#E5E7EB",
                    color: isCompleted || isActive ? "#FFFFFF" : "#9CA3AF",
                  }}
                >
                  {isCompleted ? <Check size={16} /> : n}
                </div>
                <span
                  className="text-[10px] font-medium whitespace-nowrap"
                  style={{
                    color: isCompleted || isActive ? "#1F7D70" : "#9CA3AF",
                  }}
                >
                  {STEP_LABELS[n]}
                </span>
              </div>

              {/* Connector line (between circles, not after last) */}
              {n < 4 && (
                <div
                  className="w-10 sm:w-16 h-[2px] mb-5 mx-1"
                  style={{
                    background: n < step ? "#3BBFAD" : "#E5E7EB",
                    transition: "background 0.3s",
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

  function Step1Content() {
    return (
      <div>
        <p className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
          <Tag size={15} className="text-teal-500" />
          Selecciona una etiqueta
        </p>
        {etiquetas.length === 0 ? (
          <p className="text-sm text-neutral-400">No hay etiquetas disponibles para esta marca.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {etiquetas.map((et) => {
              const isSelected = selectedEtiquetaId === et.id;
              const count = paqueteCountForEtiqueta(et.id);
              return (
                <div
                  key={et.id}
                  onClick={() =>
                    setSelectedEtiquetaId(isSelected ? null : et.id)
                  }
                  className="cursor-pointer rounded-lg p-3 border-2 transition-all"
                  style={{
                    borderColor: isSelected ? "#3BBFAD" : "#E5E7EB",
                    background: isSelected
                      ? "rgba(59,191,173,0.06)"
                      : "rgba(255,255,255,0.5)",
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
                </div>
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
        <p className="text-sm font-semibold text-neutral-700 mb-3">
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
        {filteredPaquetes.length === 0 ? (
          <p className="text-sm text-neutral-400">No hay paquetes con esta etiqueta.</p>
        ) : (
          <div className="space-y-2">
            {filteredPaquetes.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={glassMaterials.frostedSubtle}
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
                  <Badge
                    variant={estadoBadgeVariant(p.estado)}
                    size="sm"
                  >
                    {p.estado}
                  </Badge>
                  <span className="text-sm font-semibold text-neutral-700">
                    {formatCurrency(p.precioVenta)}
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
    const selected = selectedPaqueteIds.size;
    const total = filteredPaquetes.length;

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-neutral-700">
            Selecciona paquetes a notificar
          </p>
          <span className="text-xs text-neutral-400">
            {selected} de {total} seleccionado{selected !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Select all row */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg mb-2 border-b border-neutral-100"
          style={glassMaterials.frostedSubtle}
        >
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
          />
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
            {filteredPaquetes.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer"
                style={{
                  ...glassMaterials.frostedSubtle,
                  outline: selectedPaqueteIds.has(p.id)
                    ? "1.5px solid rgba(59,191,173,0.4)"
                    : "none",
                }}
                onClick={() => togglePaquete(p.id)}
              >
                <Checkbox
                  checked={selectedPaqueteIds.has(p.id)}
                  onCheckedChange={() => togglePaquete(p.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">
                    {p.titulo}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {getDestinoForPaquete(p.id)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-700 shrink-0">
                  {formatCurrency(p.precioVenta)}
                </span>
              </div>
            ))}
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
        <p className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
          <Mail size={15} className="text-teal-500" />
          Vista previa del email
        </p>

        {/* Simulated email card */}
        <div
          className="rounded-xl overflow-hidden"
          style={glassMaterials.frostedSubtle}
        >
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
              Nuevos paquetes disponibles
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Descubrí las ultimas ofertas de tu marca favorita.
            </p>

            {/* Package list */}
            <div className="space-y-3">
              {selectedPaquetesList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/70 border border-neutral-100"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-bold text-neutral-800 truncate">
                      {p.titulo}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {getDestinoForPaquete(p.id)}
                    </p>
                    <p className="text-sm font-semibold text-teal-600 mt-1">
                      {formatCurrency(p.precioVenta)}
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
            <p className="text-[11px] text-neutral-400 mt-5 pt-4 border-t border-neutral-100">
              Este email sera enviado a los vendedores asociados a la marca activa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        subtitle="Envio de notificaciones a vendedores"
      />

      <Card variant="default" className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <StepIndicator />

        {/* Step content */}
        <CardContent className="pt-0 pb-5">
          <div className="min-h-[200px]">
            {step === 1 && <Step1Content />}
            {step === 2 && <Step2Content />}
            {step === 3 && <Step3Content />}
            {step === 4 && <Step4Content />}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-100">
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
        </CardContent>
      </Card>

      {/* Notification History */}
      {historial.length > 0 && (
        <Card variant="default" className="max-w-2xl mx-auto mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-neutral-400" />
              <span className="text-sm font-semibold text-neutral-700">
                Historial de envios
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2">
              {historial.map((n) => {
                const et = n.etiqueta;
                const fecha = new Date(n.enviadoAt).toLocaleDateString("es-UY", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={n.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={glassMaterials.frostedSubtle}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: et?.color ?? "#9CA3AF" }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-700 truncate">
                          {et?.nombre ?? "Etiqueta eliminada"}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {n.paqueteIds.length} paquete
                          {n.paqueteIds.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 shrink-0 ml-3">
                      {fecha}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
