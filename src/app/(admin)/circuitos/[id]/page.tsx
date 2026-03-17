"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, GripVertical, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  useServiceState,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { useProveedores } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/components/lib/cn";
import type { CircuitoDia, PrecioCircuito } from "@/lib/types";

// ---------------------------------------------------------------------------
// Inline input styling consistent with glass pattern
// ---------------------------------------------------------------------------

const inlineInputClassName =
  "w-full rounded-[6px] border border-neutral-150/50 bg-white/70 px-2 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm";

// ---------------------------------------------------------------------------
// CircuitoDetailPage
// ---------------------------------------------------------------------------

export default function CircuitoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // -- Service state & actions --
  const serviceState = useServiceState();
  const {
    updateCircuito,
    createCircuitoDia,
    updateCircuitoDia,
    deleteCircuitoDia,
    createPrecioCircuito,
    updatePrecioCircuito,
    deletePrecioCircuito,
  } = useServiceActions();

  const proveedores = useProveedores();

  // -- Derive data --
  const circuito = serviceState.circuitos.find((c) => c.id === id && !c.deletedAt);

  const dias = useMemo(
    () =>
      [...serviceState.circuitoDias.filter((d) => d.circuitoId === id)].sort(
        (a, b) => a.orden - b.orden,
      ),
    [serviceState.circuitoDias, id],
  );

  const precios = serviceState.preciosCircuito.filter((p) => p.circuitoId === id);

  // ---------------------------------------------------------------------------
  // Section 1 — Header form state
  // ---------------------------------------------------------------------------

  const [headerForm, setHeaderForm] = useState(() => ({
    nombre: circuito?.nombre ?? "",
    noches: circuito?.noches ?? 0,
    proveedorId: circuito?.proveedorId ?? "",
  }));

  function handleSaveHeader() {
    if (!circuito) return;
    updateCircuito({ ...circuito, ...headerForm });
    toast("success", "Circuito actualizado", "Los datos del circuito fueron guardados.");
  }

  // ---------------------------------------------------------------------------
  // Section 2 — Itinerary editor state
  // ---------------------------------------------------------------------------

  const [editingDiaId, setEditingDiaId] = useState<string | null>(null);
  const [draftDia, setDraftDia] = useState<Partial<CircuitoDia>>({});
  const [addingDia, setAddingDia] = useState(false);
  const [newDia, setNewDia] = useState<Partial<Omit<CircuitoDia, "id" | "circuitoId">>>({});
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Itinerary handlers

  function handleStartEditDia(dia: CircuitoDia) {
    setEditingDiaId(dia.id);
    setDraftDia({ titulo: dia.titulo, descripcion: dia.descripcion });
  }

  function handleCancelEditDia() {
    setEditingDiaId(null);
    setDraftDia({});
  }

  function handleSaveDia() {
    if (!editingDiaId) return;
    const existing = dias.find((d) => d.id === editingDiaId);
    if (!existing) return;
    updateCircuitoDia({ ...existing, ...draftDia });
    toast("success", "Dia actualizado", "El dia del itinerario fue guardado.");
    setEditingDiaId(null);
    setDraftDia({});
  }

  function handleDeleteDia(diaId: string) {
    deleteCircuitoDia(diaId);
    toast("success", "Dia eliminado", "El dia fue eliminado del itinerario.");
  }

  function handleSaveAddDia() {
    createCircuitoDia({
      circuitoId: id,
      numeroDia: dias.length + 1,
      titulo: newDia.titulo ?? "",
      descripcion: newDia.descripcion ?? "",
      orden: dias.length,
    });
    toast("success", "Dia agregado", "Se agrego un nuevo dia al itinerario.");
    setAddingDia(false);
    setNewDia({});
  }

  function handleCancelAddDia() {
    setAddingDia(false);
    setNewDia({});
  }

  // ---------------------------------------------------------------------------
  // HTML5 drag-and-drop handlers
  // ---------------------------------------------------------------------------

  function handleDragStart(e: React.DragEvent, diaId: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", diaId);
  }

  function reorderDias(
    diasList: CircuitoDia[],
    sourceId: string,
    targetId: string,
  ): CircuitoDia[] {
    const sorted = [...diasList].sort((a, b) => a.orden - b.orden);
    const sourceIndex = sorted.findIndex((d) => d.id === sourceId);
    const targetIndex = sorted.findIndex((d) => d.id === targetId);
    const [moved] = sorted.splice(sourceIndex, 1);
    sorted.splice(targetIndex, 0, moved);
    return sorted;
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId === targetId) return;
    const reordered = reorderDias(dias, sourceId, targetId);
    // CRITICAL: update BOTH orden AND numeroDia for all affected rows
    reordered.forEach((d, i) => {
      if (d.orden !== i || d.numeroDia !== i + 1) {
        updateCircuitoDia({ ...d, orden: i, numeroDia: i + 1 });
      }
    });
    setDragOverId(null);
  }

  // ---------------------------------------------------------------------------
  // Section 3 — Price table state (4-state inline edit)
  // ---------------------------------------------------------------------------

  const [editingPrecioId, setEditingPrecioId] = useState<string | null>(null);
  const [draftPrecio, setDraftPrecio] = useState<Partial<PrecioCircuito>>({});
  const [addingPrecio, setAddingPrecio] = useState(false);
  const [newPrecio, setNewPrecio] = useState<
    Partial<Omit<PrecioCircuito, "id" | "circuitoId">>
  >({});

  // Price handlers

  function handleEditPrecio(precio: PrecioCircuito) {
    setEditingPrecioId(precio.id);
    setDraftPrecio({ ...precio });
  }

  function handleCancelEditPrecio() {
    setEditingPrecioId(null);
    setDraftPrecio({});
  }

  function handleSavePrecio() {
    if (!editingPrecioId) return;
    updatePrecioCircuito(draftPrecio as PrecioCircuito);
    // Reset both states atomically to prevent desync
    setEditingPrecioId(null);
    setDraftPrecio({});
    toast("success", "Precio actualizado", "El periodo fue guardado correctamente.");
  }

  function handleDeletePrecio(precioId: string) {
    deletePrecioCircuito(precioId);
    toast("success", "Precio eliminado", "El periodo fue eliminado.");
  }

  function handleSaveAddPrecio() {
    createPrecioCircuito({
      circuitoId: id,
      periodoDesde: newPrecio.periodoDesde!,
      periodoHasta: newPrecio.periodoHasta!,
      precio: newPrecio.precio!,
    });
    toast("success", "Precio agregado", "El nuevo periodo fue creado correctamente.");
    setAddingPrecio(false);
    setNewPrecio({});
  }

  function handleCancelAddPrecio() {
    setAddingPrecio(false);
    setNewPrecio({});
  }

  // ---------------------------------------------------------------------------
  // Guard: circuito not found
  // ---------------------------------------------------------------------------

  if (!circuito) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Circuito no encontrado"
          subtitle="El circuito solicitado no existe o fue eliminado"
          action={
            <Button
              variant="ghost"
              onClick={() => router.push("/circuitos")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver a Circuitos
            </Button>
          }
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Circuito: ${circuito.nombre}`}
        subtitle="Detalle del circuito"
        action={
          <Button
            variant="ghost"
            onClick={() => router.push("/circuitos")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Circuitos
          </Button>
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Header form                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card className="p-0" static>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">
            Datos del Circuito
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre -- full width */}
            <div className="col-span-1 md:col-span-2">
              <Input
                label="Nombre"
                value={headerForm.nombre}
                onChange={(e) =>
                  setHeaderForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="ej. Europa Clasica 10 dias"
                readOnly={!canEdit}
              />
            </div>

            {/* Noches */}
            <Input
              label="Noches"
              type="number"
              value={String(headerForm.noches)}
              onChange={(e) =>
                setHeaderForm((f) => ({ ...f, noches: Number(e.target.value) }))
              }
              placeholder="7"
              readOnly={!canEdit}
            />

            {/* Proveedor */}
            <Select
              label="Proveedor"
              value={headerForm.proveedorId}
              onValueChange={(v) =>
                setHeaderForm((f) => ({ ...f, proveedorId: v }))
              }
              placeholder="Seleccionar proveedor..."
              options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
              disabled={!canEdit}
            />

            {/* Save button */}
            {canEdit && (
              <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
                <Button onClick={handleSaveHeader}>Guardar Cambios</Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — Day-by-day itinerary editor                            */}
      {/* ------------------------------------------------------------------ */}
      <Card className="p-0" static>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-800">
              Itinerario por Dia
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-150/50">
                  {canEdit && (
                    <th className="w-8 py-2 pr-2" aria-label="Reordenar" />
                  )}
                  <th className="text-left py-2 pr-3 text-[12px] font-medium text-neutral-500 w-16">
                    Dia
                  </th>
                  <th className="text-left py-2 pr-3 text-[12px] font-medium text-neutral-500 w-40">
                    Titulo
                  </th>
                  <th className="text-left py-2 pr-3 text-[12px] font-medium text-neutral-500">
                    Descripcion
                  </th>
                  {canEdit && (
                    <th className="text-right py-2 text-[12px] font-medium text-neutral-500">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {dias.map((dia) =>
                  editingDiaId === dia.id ? (
                    // Edit mode row
                    <tr
                      key={dia.id}
                      className="border-b border-neutral-100/50"
                      draggable={false}
                    >
                      {canEdit && (
                        <td className="px-2 py-3 w-8">
                          <GripVertical className="h-4 w-4 text-neutral-300" />
                        </td>
                      )}
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-teal-100 text-xs font-bold text-brand-teal-700">
                          {dia.numeroDia}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          className={inlineInputClassName}
                          value={draftDia.titulo ?? ""}
                          onChange={(e) =>
                            setDraftDia((d) => ({ ...d, titulo: e.target.value }))
                          }
                          placeholder="Titulo del dia"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <textarea
                          className={inlineInputClassName}
                          rows={2}
                          value={draftDia.descripcion ?? ""}
                          onChange={(e) =>
                            setDraftDia((d) => ({ ...d, descripcion: e.target.value }))
                          }
                          placeholder="Descripcion del dia"
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={handleSaveDia}
                            aria-label="Guardar"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={handleCancelEditDia}
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
                      key={dia.id}
                      className={cn(
                        "border-b border-neutral-100/50 transition-colors",
                        dragOverId === dia.id && "bg-brand-teal-50/40",
                      )}
                      draggable={canEdit}
                      onDragStart={(e) => canEdit && handleDragStart(e, dia.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(dia.id);
                      }}
                      onDrop={(e) => handleDrop(e, dia.id)}
                      onDragLeave={() => setDragOverId(null)}
                    >
                      {canEdit && (
                        <td className="px-2 py-3 w-8 cursor-grab">
                          <GripVertical className="h-4 w-4 text-neutral-300" />
                        </td>
                      )}
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-teal-100 text-xs font-bold text-brand-teal-700">
                          {dia.numeroDia}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-neutral-800 font-medium">
                        {dia.titulo}
                      </td>
                      <td className="py-3 pr-3 text-neutral-600">
                        {dia.descripcion.length > 60
                          ? dia.descripcion.slice(0, 60) + "..."
                          : dia.descripcion}
                      </td>
                      {canEdit && (
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={() => handleStartEditDia(dia)}
                              aria-label="Editar dia"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={() => handleDeleteDia(dia.id)}
                              aria-label="Eliminar dia"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}

                {/* Add day row */}
                {addingDia && (
                  <tr className="border-b border-neutral-100/50">
                    {canEdit && (
                      <td className="px-2 py-3 w-8">
                        <GripVertical className="h-4 w-4 text-neutral-200" />
                      </td>
                    )}
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-teal-100 text-xs font-bold text-brand-teal-700">
                        {dias.length + 1}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        className={inlineInputClassName}
                        value={newDia.titulo ?? ""}
                        onChange={(e) =>
                          setNewDia((d) => ({ ...d, titulo: e.target.value }))
                        }
                        placeholder="Titulo del dia"
                        autoFocus
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <textarea
                        className={inlineInputClassName}
                        rows={2}
                        value={newDia.descripcion ?? ""}
                        onChange={(e) =>
                          setNewDia((d) => ({ ...d, descripcion: e.target.value }))
                        }
                        placeholder="Descripcion del dia"
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={handleSaveAddDia}
                          aria-label="Guardar nuevo dia"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={handleCancelAddDia}
                          aria-label="Cancelar"
                        >
                          <X className="h-4 w-4 text-neutral-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {dias.length === 0 && !addingDia && (
                  <tr>
                    <td
                      colSpan={canEdit ? 5 : 4}
                      className="py-8 text-center text-sm text-neutral-400"
                    >
                      No hay dias en el itinerario
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Agregar Dia button */}
          {canEdit && !addingDia && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setAddingDia(true);
                  setNewDia({ titulo: "", descripcion: "" });
                }}
              >
                Agregar Dia
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — Price-per-period table                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card className="p-0" static>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-800">
              Precios por Periodo
            </h3>
            {canEdit && !addingPrecio && (
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setAddingPrecio(true);
                  setNewPrecio({});
                }}
              >
                Agregar Precio
              </Button>
            )}
          </div>

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
                    Precio (USD)
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
                  editingPrecioId === precio.id ? (
                    // Edit mode row
                    <tr
                      key={precio.id}
                      className="border-b border-neutral-100/50"
                    >
                      <td className="py-2 pr-3">
                        <input
                          type="date"
                          className={inlineInputClassName}
                          value={draftPrecio.periodoDesde ?? ""}
                          onChange={(e) =>
                            setDraftPrecio((d) => ({
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
                          value={draftPrecio.periodoHasta ?? ""}
                          onChange={(e) =>
                            setDraftPrecio((d) => ({
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
                          value={draftPrecio.precio ?? ""}
                          onChange={(e) =>
                            setDraftPrecio((d) => ({
                              ...d,
                              precio: Number(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={handleSavePrecio}
                            aria-label="Guardar"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={handleCancelEditPrecio}
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
                        {formatCurrency(precio.precio)}
                      </td>
                      {canEdit && (
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={() => handleEditPrecio(precio)}
                              aria-label="Editar precio"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={() => handleDeletePrecio(precio.id)}
                              aria-label="Eliminar precio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}

                {/* Add row */}
                {addingPrecio && (
                  <tr className="border-b border-neutral-100/50">
                    <td className="py-2 pr-3">
                      <input
                        type="date"
                        className={inlineInputClassName}
                        value={newPrecio.periodoDesde ?? ""}
                        onChange={(e) =>
                          setNewPrecio((r) => ({
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
                        value={newPrecio.periodoHasta ?? ""}
                        onChange={(e) =>
                          setNewPrecio((r) => ({
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
                        value={newPrecio.precio ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setNewPrecio((r) => ({
                            ...r,
                            precio: Number(e.target.value),
                          }))
                        }
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={handleSaveAddPrecio}
                          aria-label="Guardar nuevo precio"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={handleCancelAddPrecio}
                          aria-label="Cancelar"
                        >
                          <X className="h-4 w-4 text-neutral-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {precios.length === 0 && !addingPrecio && (
                  <tr>
                    <td
                      colSpan={canEdit ? 4 : 3}
                      className="py-8 text-center text-sm text-neutral-400"
                    >
                      No hay periodos de precio definidos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
