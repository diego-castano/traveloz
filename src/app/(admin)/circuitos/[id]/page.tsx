"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GripVertical,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import {
  InlineEditTable,
  type InlineEditColumn,
} from "@/components/ui/form/InlineEditTable";
import {
  useServiceState,
  useServiceActions,
  useServiceLoading,
} from "@/components/providers/ServiceProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useProveedores } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/components/lib/cn";
import type { CircuitoDia, PrecioCircuito } from "@/lib/types";

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

  const loading = useServiceLoading();
  const allProveedores = useProveedores();
  const proveedoresCircuitos = useMemo(
    () =>
      allProveedores.filter(
        (p) => p.servicio === "CIRCUITOS" && !p.deletedAt,
      ),
    [allProveedores],
  );

  // -- Derive data --
  const circuito = serviceState.circuitos.find(
    (c) => c.id === id && !c.deletedAt,
  );

  const dias = useMemo(
    () =>
      [...serviceState.circuitoDias.filter((d) => d.circuitoId === id)].sort(
        (a, b) => a.orden - b.orden,
      ),
    [serviceState.circuitoDias, id],
  );

  const precios = serviceState.preciosCircuito.filter(
    (p) => p.circuitoId === id,
  );

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
    toast(
      "success",
      "Circuito actualizado",
      "Los datos del circuito fueron guardados.",
    );
  }

  // ---------------------------------------------------------------------------
  // Section 2 — Itinerary editor state (kept custom due to drag-and-drop)
  // ---------------------------------------------------------------------------

  const [editingDiaId, setEditingDiaId] = useState<string | null>(null);
  const [draftDia, setDraftDia] = useState<Partial<CircuitoDia>>({});
  const [addingDia, setAddingDia] = useState(false);
  const [newDia, setNewDia] = useState<
    Partial<Omit<CircuitoDia, "id" | "circuitoId">>
  >({});
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
  // Section 3 — Price table (through InlineEditTable)
  // ---------------------------------------------------------------------------

  async function handleSavePrecio(row: PrecioCircuito) {
    try {
      if (row.id) {
        updatePrecioCircuito(row);
        toast(
          "success",
          "Precio actualizado",
          "El periodo fue guardado correctamente.",
        );
      } else {
        createPrecioCircuito({
          circuitoId: id,
          periodoDesde: row.periodoDesde,
          periodoHasta: row.periodoHasta,
          precio: row.precio,
        });
        toast(
          "success",
          "Precio agregado",
          "El nuevo periodo fue creado correctamente.",
        );
      }
    } catch (err) {
      toast(
        "error",
        "Error al guardar",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    }
  }

  function handleDeletePrecio(row: PrecioCircuito) {
    try {
      deletePrecioCircuito(row.id);
      toast("success", "Precio eliminado", "El periodo fue eliminado.");
    } catch (err) {
      toast(
        "error",
        "Error al eliminar",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    }
  }

  const precioColumns: InlineEditColumn<PrecioCircuito>[] = [
    {
      key: "periodoDesde",
      label: "Periodo Desde",
      width: "180px",
      render: (r) => r.periodoDesde,
      editor: (r, update) => (
        <Input
          type="date"
          value={r.periodoDesde ?? ""}
          onChange={(e) => update("periodoDesde", e.target.value)}
        />
      ),
    },
    {
      key: "periodoHasta",
      label: "Periodo Hasta",
      width: "180px",
      render: (r) => r.periodoHasta,
      editor: (r, update) => (
        <Input
          type="date"
          value={r.periodoHasta ?? ""}
          onChange={(e) => update("periodoHasta", e.target.value)}
        />
      ),
    },
    {
      key: "precio",
      label: "Precio USD",
      align: "right",
      width: "160px",
      render: (r) => (
        <span className="font-mono text-[13px] font-semibold text-neutral-900">
          {formatCurrency(r.precio)}
        </span>
      ),
      editor: (r, update) => (
        <Input
          type="number"
          value={String(r.precio ?? 0)}
          onChange={(e) => update("precio", parseFloat(e.target.value) || 0)}
          className="text-right"
        />
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Guard: loading / not found
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="detail" />;

  if (!circuito) {
    return (
      <DataTablePageHeader
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
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <DataTablePageHeader
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

      <FormSections>
        {/* ------------------------------------------------------------------ */}
        {/* Datos del circuito                                                 */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Datos del circuito"
          description="Nombre, duracion y proveedor principal."
        >
          <FieldGroup columns={2}>
            <Field span={2}>
              <FieldLabel required>Nombre</FieldLabel>
              <Input
                value={headerForm.nombre}
                onChange={(e) =>
                  setHeaderForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="ej. Europa Clasica 10 dias"
                readOnly={!canEdit}
              />
            </Field>
            <Field>
              <FieldLabel>Noches</FieldLabel>
              <Input
                type="number"
                value={String(headerForm.noches)}
                onChange={(e) =>
                  setHeaderForm((f) => ({
                    ...f,
                    noches: Number(e.target.value),
                  }))
                }
                placeholder="7"
                readOnly={!canEdit}
              />
            </Field>
            <Field>
              <FieldLabel>Proveedor</FieldLabel>
              <Select
                value={headerForm.proveedorId}
                onValueChange={(v) =>
                  setHeaderForm((f) => ({ ...f, proveedorId: v }))
                }
                placeholder="Seleccionar proveedor..."
                options={proveedoresCircuitos.map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
                disabled={!canEdit}
              />
            </Field>
          </FieldGroup>

          {canEdit && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveHeader}>Guardar Cambios</Button>
            </div>
          )}
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Itinerario dia a dia                                               */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Itinerario dia a dia"
          description="Arrastra las filas para reordenar los dias del itinerario."
        >
          <div className="border-y border-hairline overflow-x-auto">
            <table className="w-full border-collapse">
              <thead
                style={{
                  borderBottom: "1px solid rgba(17,17,36,0.07)",
                  background: "rgba(17,17,36,0.02)",
                }}
              >
                <tr className="h-9">
                  {canEdit && (
                    <th className="w-8 px-2 py-2" aria-label="Reordenar" />
                  )}
                  <th className="w-16 px-4 py-2 text-left text-label font-medium text-neutral-500">
                    Dia
                  </th>
                  <th className="w-48 px-4 py-2 text-left text-label font-medium text-neutral-500">
                    Titulo
                  </th>
                  <th className="px-4 py-2 text-left text-label font-medium text-neutral-500">
                    Descripcion
                  </th>
                  <th className="w-[90px] px-4 py-2 text-right text-label font-medium text-neutral-500" />
                </tr>
              </thead>
              <tbody>
                {dias.length === 0 && !addingDia && (
                  <tr>
                    <td
                      colSpan={canEdit ? 5 : 4}
                      className="px-4 py-10 text-center text-[13px] text-neutral-400"
                    >
                      No hay dias en el itinerario
                    </td>
                  </tr>
                )}

                {dias.map((dia) =>
                  editingDiaId === dia.id ? (
                    <tr
                      key={dia.id}
                      className="h-row border-b border-hairline"
                      draggable={false}
                    >
                      {canEdit && (
                        <td className="px-2 py-2">
                          <GripVertical className="h-4 w-4 text-neutral-300" />
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal-100 text-xs font-bold text-brand-teal-700">
                          {dia.numeroDia}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={draftDia.titulo ?? ""}
                          onChange={(e) =>
                            setDraftDia((d) => ({
                              ...d,
                              titulo: e.target.value,
                            }))
                          }
                          placeholder="Titulo del dia"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <textarea
                          rows={2}
                          value={draftDia.descripcion ?? ""}
                          onChange={(e) =>
                            setDraftDia((d) => ({
                              ...d,
                              descripcion: e.target.value,
                            }))
                          }
                          placeholder="Descripcion del dia"
                          className="w-full resize-none rounded-[8px] border border-hairline bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#3BBFAD] focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={handleSaveDia}
                            aria-label="Guardar"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#2A9E8E] hover:bg-[rgba(59,191,173,0.12)]"
                          >
                            <Check className="h-[15px] w-[15px]" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditDia}
                            aria-label="Cancelar"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                          >
                            <X className="h-[15px] w-[15px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={dia.id}
                      className={cn(
                        "h-row border-b border-hairline transition-colors hover:bg-rail",
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
                        <td className="w-8 cursor-grab px-2 py-3">
                          <GripVertical className="h-4 w-4 text-neutral-300" />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal-100 text-xs font-bold text-brand-teal-700">
                          {dia.numeroDia}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-800">
                        {dia.titulo}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {dia.descripcion.length > 60
                          ? dia.descripcion.slice(0, 60) + "..."
                          : dia.descripcion}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditDia(dia)}
                                aria-label="Editar dia"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                              >
                                <Pencil className="h-[14px] w-[14px]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDia(dia.id)}
                                aria-label="Eliminar dia"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-brand-red-50 hover:text-[#CC2030]"
                              >
                                <Trash2 className="h-[14px] w-[14px]" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}

                {/* Add day row */}
                {addingDia && (
                  <tr
                    className="h-row border-b border-hairline"
                    style={{ background: "rgba(59,191,173,0.04)" }}
                  >
                    {canEdit && (
                      <td className="px-2 py-2">
                        <GripVertical className="h-4 w-4 text-neutral-200" />
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal-100 text-xs font-bold text-brand-teal-700">
                        {dias.length + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={newDia.titulo ?? ""}
                        onChange={(e) =>
                          setNewDia((d) => ({ ...d, titulo: e.target.value }))
                        }
                        placeholder="Titulo del dia"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <textarea
                        rows={2}
                        value={newDia.descripcion ?? ""}
                        onChange={(e) =>
                          setNewDia((d) => ({
                            ...d,
                            descripcion: e.target.value,
                          }))
                        }
                        placeholder="Descripcion del dia"
                        className="w-full resize-none rounded-[8px] border border-hairline bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#3BBFAD] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={handleSaveAddDia}
                          aria-label="Guardar nuevo dia"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#2A9E8E] hover:bg-[rgba(59,191,173,0.12)]"
                        >
                          <Check className="h-[15px] w-[15px]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelAddDia}
                          aria-label="Cancelar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                        >
                          <X className="h-[15px] w-[15px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {canEdit && !addingDia && (
              <button
                type="button"
                onClick={() => {
                  setAddingDia(true);
                  setNewDia({ titulo: "", descripcion: "" });
                }}
                className="flex w-full items-center justify-center gap-1.5 border-t border-hairline bg-transparent px-4 py-2.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:bg-rail hover:text-neutral-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Dia
              </button>
            )}
          </div>
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Precios por periodo                                                */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Precios por periodo"
          description="Tarifas totales del circuito segun el periodo de viaje."
        >
          <InlineEditTable<PrecioCircuito>
            columns={precioColumns}
            rows={precios}
            getRowId={(r) => r.id}
            onSave={handleSavePrecio}
            onDelete={canEdit ? handleDeletePrecio : undefined}
            onAdd={
              canEdit
                ? () =>
                    ({
                      periodoDesde: "",
                      periodoHasta: "",
                      precio: 0,
                    }) as Partial<PrecioCircuito>
                : undefined
            }
            addLabel="Agregar precio"
            emptyMessage="No hay periodos de precio definidos"
          />
        </FormSection>
      </FormSections>
    </>
  );
}
