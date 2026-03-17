"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { PriceImpactModal } from "@/components/ui/PriceImpactModal";
import {
  useServiceState,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import type { PrecioAereo } from "@/lib/types";

// ---------------------------------------------------------------------------
// Inline input styling consistent with glass pattern
// ---------------------------------------------------------------------------

const inlineInputClassName =
  "w-full rounded-[6px] border border-neutral-150/50 bg-white/70 px-2 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm";

// ---------------------------------------------------------------------------
// AereoDetailPage
// ---------------------------------------------------------------------------

export default function AereoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // -- Service state --
  const serviceState = useServiceState();
  const { updateAereo, createPrecioAereo, updatePrecioAereo, deletePrecioAereo } =
    useServiceActions();
  const packageState = usePackageState();

  // -- Find aereo --
  const aereo = serviceState.aereos.find((a) => a.id === id && !a.deletedAt);

  // -- Count affected packages --
  const affectedPackageCount = useMemo(() => {
    const paqueteIds = new Set(
      packageState.paqueteAereos
        .filter((pa) => pa.aereoId === id)
        .map((pa) => pa.paqueteId),
    );
    return paqueteIds.size;
  }, [packageState.paqueteAereos, id]);

  // -- Flight form state (initialized from aereo) --
  const [ruta, setRuta] = useState(aereo?.ruta ?? "");
  const [destino, setDestino] = useState(aereo?.destino ?? "");
  const [aerolinea, setAerolinea] = useState(aereo?.aerolinea ?? "");
  const [equipaje, setEquipaje] = useState(aereo?.equipaje ?? "");
  const [itinerario, setItinerario] = useState(aereo?.itinerario ?? "");

  // -- Price table inline edit state --
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draftRow, setDraftRow] = useState<Partial<PrecioAereo>>({});
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<Partial<Omit<PrecioAereo, "id" | "aereoId">>>({});

  // -- Price impact modal state --
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => void) | null>(null);

  // ---------------------------------------------------------------------------
  // Guard: aereo not found
  // ---------------------------------------------------------------------------

  if (!aereo) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aereo no encontrado"
          subtitle="El vuelo solicitado no existe o fue eliminado"
          action={
            <Button
              variant="ghost"
              onClick={() => router.push("/aereos")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver a Aereos
            </Button>
          }
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Prices for this aereo
  // ---------------------------------------------------------------------------

  const precios = serviceState.preciosAereo.filter(
    (p) => p.aereoId === aereo.id,
  );

  // ---------------------------------------------------------------------------
  // Flight form handlers
  // ---------------------------------------------------------------------------

  function handleSaveFlight() {
    if (!aereo) return;
    updateAereo({
      ...aereo,
      ruta,
      destino,
      aerolinea,
      equipaje,
      itinerario,
    });
    toast("success", "Vuelo actualizado", "Los datos del vuelo fueron guardados.");
  }

  // ---------------------------------------------------------------------------
  // Price row handlers
  // ---------------------------------------------------------------------------

  function handleEditRow(precio: PrecioAereo) {
    setEditingRowId(precio.id);
    setDraftRow({ ...precio });
  }

  function handleCancelEdit() {
    setEditingRowId(null);
    setDraftRow({});
  }

  function doSaveEdit() {
    if (!editingRowId) return;
    updatePrecioAereo(draftRow as PrecioAereo);
    setEditingRowId(null);
    setDraftRow({});
    toast("success", "Precio actualizado", "El periodo fue guardado correctamente.");
  }

  function handleSaveEdit() {
    if (affectedPackageCount > 0) {
      setPendingSaveAction(() => doSaveEdit);
      setImpactModalOpen(true);
    } else {
      doSaveEdit();
    }
  }

  function handleDeleteRow(id: string) {
    deletePrecioAereo(id);
    toast("success", "Periodo eliminado", "El periodo fue eliminado.");
  }

  function handleStartAdd() {
    setAddingRow(true);
    setNewRow({});
  }

  function handleCancelAdd() {
    setAddingRow(false);
    setNewRow({});
  }

  function doSaveAdd() {
    if (!aereo) return;
    createPrecioAereo({
      aereoId: aereo.id,
      periodoDesde: newRow.periodoDesde ?? "",
      periodoHasta: newRow.periodoHasta ?? "",
      precioAdulto: Number(newRow.precioAdulto ?? 0),
      precioMenor: Number(newRow.precioMenor ?? 0),
    });
    setAddingRow(false);
    setNewRow({});
    toast("success", "Periodo agregado", "El nuevo periodo fue creado correctamente.");
  }

  function handleSaveAdd() {
    if (affectedPackageCount > 0) {
      setPendingSaveAction(() => doSaveAdd);
      setImpactModalOpen(true);
    } else {
      doSaveAdd();
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        title={aereo.ruta}
        subtitle={`${aereo.destino} · ${aereo.aerolinea}`}
        action={
          <Button
            variant="ghost"
            onClick={() => router.push("/aereos")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a Aereos
          </Button>
        }
      />

      {/* Card 1 -- Flight data form */}
      <Card className="p-0" static>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {/* Ruta -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Ruta"
              value={ruta}
              onChange={(e) => setRuta(e.target.value)}
              placeholder="EZE - MAD"
              readOnly={!canEdit}
            />
          </div>

          {/* Destino -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Destino"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Madrid"
              readOnly={!canEdit}
            />
          </div>

          {/* Aerolinea + Equipaje */}
          <Input
            label="Aerolinea"
            value={aerolinea}
            onChange={(e) => setAerolinea(e.target.value)}
            placeholder="Iberia"
            readOnly={!canEdit}
          />
          <Input
            label="Equipaje"
            value={equipaje}
            onChange={(e) => setEquipaje(e.target.value)}
            placeholder="23kg bodega"
            readOnly={!canEdit}
          />

          {/* Itinerario -- full width textarea */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Itinerario
            </label>
            <textarea
              value={itinerario}
              onChange={(e) => setItinerario(e.target.value)}
              placeholder="Detalle de vuelos, horarios y escalas..."
              readOnly={!canEdit}
              rows={3}
              className="w-full rounded-[8px] border border-neutral-150/50 bg-white/70 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm resize-none"
            />
          </div>

          {/* Save button -- only for editors */}
          {canEdit && (
            <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
              <Button onClick={handleSaveFlight}>Guardar Cambios</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Card 2 -- Inline price-per-period table */}
      <Card className="p-0" static>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-neutral-800">
              Precios por Periodo
            </h2>
          </div>

          {precios.length === 0 && !addingRow ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
              <p className="text-sm mb-4">Sin periodos definidos</p>
              {canEdit && (
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={handleStartAdd}
                >
                  Agregar periodo
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-150/50">
                      <th className="text-left py-2 pr-3 text-[12px] font-medium text-neutral-500">
                        Periodo Desde
                      </th>
                      <th className="text-left py-2 pr-3 text-[12px] font-medium text-neutral-500">
                        Periodo Hasta
                      </th>
                      <th className="text-right py-2 pr-3 text-[12px] font-medium text-neutral-500">
                        Neto Adulto / persona (USD)
                      </th>
                      <th className="text-right py-2 pr-3 text-[12px] font-medium text-neutral-500">
                        Neto Menor / persona (USD)
                      </th>
                      {canEdit && (
                        <th className="text-right py-2 text-[12px] font-medium text-neutral-500">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {precios.map((precio) =>
                      editingRowId === precio.id ? (
                        // Edit mode row
                        <tr
                          key={precio.id}
                          className="border-b border-neutral-100/50"
                        >
                          <td className="py-2 pr-3">
                            <input
                              type="date"
                              className={inlineInputClassName}
                              value={draftRow.periodoDesde ?? ""}
                              onChange={(e) =>
                                setDraftRow((d) => ({
                                  ...d,
                                  periodoDesde: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="date"
                              className={inlineInputClassName}
                              value={draftRow.periodoHasta ?? ""}
                              onChange={(e) =>
                                setDraftRow((d) => ({
                                  ...d,
                                  periodoHasta: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              className={inlineInputClassName + " text-right"}
                              value={draftRow.precioAdulto ?? ""}
                              onChange={(e) =>
                                setDraftRow((d) => ({
                                  ...d,
                                  precioAdulto: Number(e.target.value),
                                }))
                              }
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              className={inlineInputClassName + " text-right"}
                              value={draftRow.precioMenor ?? ""}
                              onChange={(e) =>
                                setDraftRow((d) => ({
                                  ...d,
                                  precioMenor: Number(e.target.value),
                                }))
                              }
                            />
                          </td>
                          <td className="py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="icon"
                                size="xs"
                                onClick={handleSaveEdit}
                                aria-label="Guardar"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="icon"
                                size="xs"
                                onClick={handleCancelEdit}
                                aria-label="Cancelar"
                              >
                                <X className="h-4 w-4 text-neutral-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        // View mode row
                        <tr
                          key={precio.id}
                          className="border-b border-neutral-100/50"
                        >
                          <td className="py-2.5 pr-3 text-neutral-700">
                            {precio.periodoDesde}
                          </td>
                          <td className="py-2.5 pr-3 text-neutral-700">
                            {precio.periodoHasta}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-medium text-neutral-800">
                            {formatCurrency(precio.precioAdulto)}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-medium text-neutral-800">
                            {formatCurrency(precio.precioMenor)}
                          </td>
                          {canEdit && (
                            <td className="py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="icon"
                                  size="xs"
                                  onClick={() => handleEditRow(precio)}
                                  aria-label="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="icon"
                                  size="xs"
                                  onClick={() => handleDeleteRow(precio.id)}
                                  aria-label="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ),
                    )}

                    {/* Add row in edit mode */}
                    {addingRow && (
                      <tr className="border-b border-neutral-100/50">
                        <td className="py-2 pr-3">
                          <input
                            type="date"
                            className={inlineInputClassName}
                            value={newRow.periodoDesde ?? ""}
                            onChange={(e) =>
                              setNewRow((r) => ({
                                ...r,
                                periodoDesde: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="date"
                            className={inlineInputClassName}
                            value={newRow.periodoHasta ?? ""}
                            onChange={(e) =>
                              setNewRow((r) => ({
                                ...r,
                                periodoHasta: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            className={inlineInputClassName + " text-right"}
                            value={newRow.precioAdulto ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              setNewRow((r) => ({
                                ...r,
                                precioAdulto: Number(e.target.value),
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            className={inlineInputClassName + " text-right"}
                            value={newRow.precioMenor ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              setNewRow((r) => ({
                                ...r,
                                precioMenor: Number(e.target.value),
                              }))
                            }
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={handleSaveAdd}
                              aria-label="Guardar nuevo periodo"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={handleCancelAdd}
                              aria-label="Cancelar"
                            >
                              <X className="h-4 w-4 text-neutral-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add periodo button */}
              {canEdit && !addingRow && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleStartAdd}
                  >
                    Agregar periodo
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Price impact confirmation modal */}
      <PriceImpactModal
        open={impactModalOpen}
        onOpenChange={(open) => {
          setImpactModalOpen(open);
          if (!open) setPendingSaveAction(null);
        }}
        affectedCount={affectedPackageCount}
        serviceName={aereo.ruta}
        onConfirm={() => {
          pendingSaveAction?.();
          setPendingSaveAction(null);
        }}
      />
    </div>
  );
}
