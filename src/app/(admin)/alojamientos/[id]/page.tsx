"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ImageUploader,
  type ImageItem,
} from "@/components/ui/ImageUploader";
import { PageHeader } from "@/components/layout/PageHeader";
import { PriceImpactModal } from "@/components/ui/PriceImpactModal";
import {
  useServiceState,
  useServiceActions,
  useServiceLoading,
} from "@/components/providers/ServiceProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { usePaises, useRegimenes, useProveedores } from "@/components/providers/CatalogProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import type { PrecioAlojamiento, AlojamientoFoto } from "@/lib/types";

// ---------------------------------------------------------------------------
// AlojamientoDetailPage
// ---------------------------------------------------------------------------

export default function AlojamientoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // State and actions
  const serviceState = useServiceState();
  const {
    updateAlojamiento,
    createPrecioAlojamiento,
    updatePrecioAlojamiento,
    deletePrecioAlojamiento,
    createAlojamientoFoto,
    updateAlojamientoFoto,
    deleteAlojamientoFoto,
  } = useServiceActions();

  const paises = usePaises();
  const regimenes = useRegimenes();
  const proveedores = useProveedores();
  const packageState = usePackageState();
  const loading = useServiceLoading();

  // Look up alojamiento
  const alojamiento = serviceState.alojamientos.find(
    (a) => a.id === params.id && !a.deletedAt,
  );

  // -- Count affected packages --
  const affectedPackageCount = useMemo(() => {
    const paqueteIds = new Set(
      packageState.paqueteAlojamientos
        .filter((pa) => pa.alojamientoId === params.id)
        .map((pa) => pa.paqueteId),
    );
    return paqueteIds.size;
  }, [packageState.paqueteAlojamientos, params.id]);

  // ---------------------------------------------------------------------------
  // Card 1: Hotel form state
  // ---------------------------------------------------------------------------

  const [nombre, setNombre] = useState(alojamiento?.nombre ?? "");
  const [paisId, setPaisId] = useState(alojamiento?.paisId ?? "");
  const [ciudadId, setCiudadId] = useState(alojamiento?.ciudadId ?? "");
  const [categoria, setCategoria] = useState(String(alojamiento?.categoria ?? 3));
  const [sitioWeb, setSitioWeb] = useState(alojamiento?.sitioWeb ?? "");

  // Cascading ciudades
  const ciudadOptions = useMemo(
    () =>
      paises
        .find((p) => p.id === paisId)
        ?.ciudades.map((c) => ({ value: c.id, label: c.nombre })) ?? [],
    [paises, paisId],
  );

  // Reset ciudad when pais changes (only if paisId actually changed from user action)
  const [prevPaisId, setPrevPaisId] = useState(paisId);
  useEffect(() => {
    if (paisId !== prevPaisId) {
      setCiudadId("");
      setPrevPaisId(paisId);
    }
  }, [paisId, prevPaisId]);

  function handleSaveHotel() {
    if (!alojamiento) return;
    updateAlojamiento({
      ...alojamiento,
      nombre,
      paisId,
      ciudadId,
      categoria: Number(categoria),
      sitioWeb: sitioWeb.trim() || null,
    });
    toast("success", "Alojamiento actualizado", "Los cambios fueron guardados correctamente.");
  }

  // ---------------------------------------------------------------------------
  // Card 2: Inline price table
  // ---------------------------------------------------------------------------

  const precios = serviceState.preciosAlojamiento.filter(
    (p) => p.alojamientoId === params.id,
  );

  // 4-state inline edit pattern
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draftRow, setDraftRow] = useState<Partial<PrecioAlojamiento>>({});
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<Partial<PrecioAlojamiento>>({
    periodoDesde: "",
    periodoHasta: "",
    precioPorNoche: 0,
    regimenId: "",
  });

  // -- Price impact modal state --
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => void) | null>(null);

  function handleEditRow(precio: PrecioAlojamiento) {
    setEditingRowId(precio.id);
    setDraftRow({ ...precio });
  }

  function doSaveEdit() {
    if (!editingRowId) return;
    updatePrecioAlojamiento(draftRow as PrecioAlojamiento);
    // Critical: reset BOTH states to prevent edit state desync
    setEditingRowId(null);
    setDraftRow({});
    toast("success", "Precio actualizado", "El periodo fue actualizado correctamente.");
  }

  function handleSaveEdit() {
    if (affectedPackageCount > 0) {
      setPendingSaveAction(() => doSaveEdit);
      setImpactModalOpen(true);
    } else {
      doSaveEdit();
    }
  }

  function handleCancelEdit() {
    setEditingRowId(null);
    setDraftRow({});
  }

  function doSaveNewRow() {
    if (!alojamiento) return;
    createPrecioAlojamiento({
      alojamientoId: alojamiento.id,
      periodoDesde: newRow.periodoDesde ?? "",
      periodoHasta: newRow.periodoHasta ?? "",
      precioPorNoche: Number(newRow.precioPorNoche ?? 0),
      regimenId: newRow.regimenId ?? "",
    });
    setAddingRow(false);
    setNewRow({ periodoDesde: "", periodoHasta: "", precioPorNoche: 0, regimenId: "" });
    toast("success", "Periodo agregado", "El periodo de precio fue agregado correctamente.");
  }

  function handleSaveNewRow() {
    if (affectedPackageCount > 0) {
      setPendingSaveAction(() => doSaveNewRow);
      setImpactModalOpen(true);
    } else {
      doSaveNewRow();
    }
  }

  function handleCancelNewRow() {
    setAddingRow(false);
    setNewRow({ periodoDesde: "", periodoHasta: "", precioPorNoche: 0, regimenId: "" });
  }

  function handleDeleteRow(id: string) {
    deletePrecioAlojamiento(id);
    toast("success", "Periodo eliminado", "El periodo fue eliminado correctamente.");
  }

  // ---------------------------------------------------------------------------
  // Card 3: Photo grid
  // ---------------------------------------------------------------------------

  const fotos = serviceState.alojamientoFotos.filter(
    (f) => f.alojamientoId === params.id,
  );

  const images: ImageItem[] = fotos.map((f) => ({
    id: f.id,
    url: f.url,
    alt: f.alt,
  }));

  const handleAdd = useCallback(
    (urls: string[]) => {
      urls.forEach((url, i) => {
        createAlojamientoFoto({
          alojamientoId: params.id,
          url,
          alt: `Foto ${fotos.length + i + 1}`,
          orden: fotos.length + i,
        });
      });
    },
    [createAlojamientoFoto, params.id, fotos.length],
  );

  const handleRemove = useCallback(
    (id: string) => {
      deleteAlojamientoFoto(id);
    },
    [deleteAlojamientoFoto],
  );

  const handleReorder = useCallback(
    (reordered: ImageItem[]) => {
      reordered.forEach((img, newIndex) => {
        const originalFoto = fotos.find((f) => f.id === img.id);
        if (originalFoto && originalFoto.orden !== newIndex) {
          updateAlojamientoFoto({ ...originalFoto, orden: newIndex });
        }
      });
    },
    [fotos, updateAlojamientoFoto],
  );

  // ---------------------------------------------------------------------------
  // Loading / Not found state
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="detail" />;

  if (!alojamiento) {
    return (
      <>
        <PageHeader title="Alojamiento no encontrado" />
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <p className="text-sm mb-4">El alojamiento solicitado no existe o fue eliminado.</p>
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/alojamientos")}
          >
            Volver a Alojamientos
          </Button>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isReadOnly = !canEdit;

  return (
    <>
      <PageHeader
        title={alojamiento.nombre}
        subtitle="Detalle del alojamiento"
        action={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/alojamientos")}
          >
            Volver
          </Button>
        }
      />

      <div className="space-y-6">
        {/* ------------------------------------------------------------------ */}
        {/* Card 1 — Hotel data form                                           */}
        {/* ------------------------------------------------------------------ */}
        <Card className="p-0" static>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Datos del Hotel
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre -- full width */}
              <div className="col-span-1 md:col-span-2">
                <Input
                  label="Nombre del Hotel"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del hotel"
                  readOnly={isReadOnly}
                />
              </div>

              {/* Pais */}
              <Select
                label="Pais"
                value={paisId}
                onValueChange={setPaisId}
                placeholder="Seleccionar pais..."
                options={paises.map((p) => ({ value: p.id, label: p.nombre }))}
                disabled={isReadOnly}
              />

              {/* Ciudad (cascading) */}
              <Select
                label="Ciudad"
                value={ciudadId}
                onValueChange={setCiudadId}
                placeholder={paisId ? "Seleccionar ciudad..." : "Primero seleccione un pais"}
                options={ciudadOptions}
                disabled={isReadOnly || !paisId || ciudadOptions.length === 0}
              />

              {/* Categoria */}
              <Select
                label="Categoria (estrellas)"
                value={categoria}
                onValueChange={setCategoria}
                options={[
                  { value: "1", label: "1 estrella" },
                  { value: "2", label: "2 estrellas" },
                  { value: "3", label: "3 estrellas" },
                  { value: "4", label: "4 estrellas" },
                  { value: "5", label: "5 estrellas" },
                ]}
                disabled={isReadOnly}
              />

              {/* Sitio Web */}
              <Input
                label="Sitio Web (opcional)"
                value={sitioWeb}
                onChange={(e) => setSitioWeb(e.target.value)}
                placeholder="https://..."
                type="url"
                readOnly={isReadOnly}
              />

              {/* Save button */}
              {canEdit && (
                <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
                  <Button onClick={handleSaveHotel}>Guardar Cambios</Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Card 2 — Inline price-per-period table                             */}
        {/* ------------------------------------------------------------------ */}
        <Card className="p-0" static>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800">
                Precios por Periodo
              </h3>
              {canEdit && !addingRow && (
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setAddingRow(true)}
                >
                  Agregar periodo
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200/60">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      Periodo Desde
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      Periodo Hasta
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      USD / noche / persona
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      Regimen
                    </th>
                    {canEdit && (
                      <th className="text-left py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {precios.map((precio) =>
                    editingRowId === precio.id ? (
                      // -- Edit mode row --
                      <tr key={precio.id} className="py-2">
                        <td className="py-2 pr-3">
                          <input
                            type="date"
                            value={draftRow.periodoDesde ?? ""}
                            onChange={(e) =>
                              setDraftRow((d) => ({ ...d, periodoDesde: e.target.value }))
                            }
                            className="w-full rounded border border-neutral-200 bg-white/80 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-brand-teal-500"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="date"
                            value={draftRow.periodoHasta ?? ""}
                            onChange={(e) =>
                              setDraftRow((d) => ({ ...d, periodoHasta: e.target.value }))
                            }
                            className="w-full rounded border border-neutral-200 bg-white/80 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-brand-teal-500"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            value={draftRow.precioPorNoche ?? 0}
                            onChange={(e) =>
                              setDraftRow((d) => ({
                                ...d,
                                precioPorNoche: Number(e.target.value),
                              }))
                            }
                            className="w-32 rounded border border-neutral-200 bg-white/80 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-brand-teal-500"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={draftRow.regimenId ?? ""}
                            onValueChange={(v) =>
                              setDraftRow((d) => ({ ...d, regimenId: v }))
                            }
                            options={regimenes.map((r) => ({
                              value: r.id,
                              label: r.nombre,
                            }))}
                            placeholder="Seleccionar regimen..."
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <Button size="xs" onClick={handleSaveEdit}>
                              Guardar
                            </Button>
                            <Button size="xs" variant="ghost" onClick={handleCancelEdit}>
                              Cancelar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // -- View mode row --
                      <tr key={precio.id} className="py-2">
                        <td className="py-3 pr-4 text-neutral-700">
                          {precio.periodoDesde}
                        </td>
                        <td className="py-3 pr-4 text-neutral-700">
                          {precio.periodoHasta}
                        </td>
                        <td className="py-3 pr-4 text-neutral-700">
                          USD {precio.precioPorNoche}
                        </td>
                        <td className="py-3 pr-4 text-neutral-700">
                          {regimenes.find((r) => r.id === precio.regimenId)?.nombre ?? "--"}
                        </td>
                        {canEdit && (
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="icon"
                                size="xs"
                                onClick={() => handleEditRow(precio)}
                                aria-label="Editar periodo"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="icon"
                                size="xs"
                                onClick={() => handleDeleteRow(precio.id)}
                                aria-label="Eliminar periodo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ),
                  )}

                  {/* Add row */}
                  {addingRow && (
                    <tr>
                      <td className="py-2 pr-3">
                        <input
                          type="date"
                          value={newRow.periodoDesde ?? ""}
                          onChange={(e) =>
                            setNewRow((r) => ({ ...r, periodoDesde: e.target.value }))
                          }
                          className="w-full rounded border border-neutral-200 bg-white/80 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-brand-teal-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="date"
                          value={newRow.periodoHasta ?? ""}
                          onChange={(e) =>
                            setNewRow((r) => ({ ...r, periodoHasta: e.target.value }))
                          }
                          className="w-full rounded border border-neutral-200 bg-white/80 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-brand-teal-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          value={newRow.precioPorNoche ?? 0}
                          onChange={(e) =>
                            setNewRow((r) => ({
                              ...r,
                              precioPorNoche: Number(e.target.value),
                            }))
                          }
                          className="w-32 rounded border border-neutral-200 bg-white/80 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:border-brand-teal-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Select
                          value={newRow.regimenId ?? ""}
                          onValueChange={(v) =>
                            setNewRow((r) => ({ ...r, regimenId: v }))
                          }
                          options={regimenes.map((r) => ({
                            value: r.id,
                            label: r.nombre,
                          }))}
                          placeholder="Seleccionar regimen..."
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <Button size="xs" onClick={handleSaveNewRow}>
                            Guardar
                          </Button>
                          <Button size="xs" variant="ghost" onClick={handleCancelNewRow}>
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Empty state */}
                  {precios.length === 0 && !addingRow && (
                    <tr>
                      <td
                        colSpan={canEdit ? 5 : 4}
                        className="py-8 text-center text-sm text-neutral-400"
                      >
                        No hay periodos de precio registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Card 3 — Photo grid                                                */}
        {/* ------------------------------------------------------------------ */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">
            Fotos del Hotel
          </h3>

          <ImageUploader
            images={images}
            onAdd={canEdit ? handleAdd : undefined}
            onRemove={canEdit ? handleRemove : undefined}
            onReorder={canEdit ? handleReorder : undefined}
            maxImages={10}
          />

          {images.length === 0 && !canEdit && (
            <p className="text-sm text-neutral-400 text-center mt-4">
              No hay fotos para este alojamiento
            </p>
          )}
        </Card>
      </div>

      {/* Price impact confirmation modal */}
      <PriceImpactModal
        open={impactModalOpen}
        onOpenChange={(open) => {
          setImpactModalOpen(open);
          if (!open) setPendingSaveAction(null);
        }}
        affectedCount={affectedPackageCount}
        serviceName={alojamiento.nombre}
        onConfirm={() => {
          pendingSaveAction?.();
          setPendingSaveAction(null);
        }}
      />
    </>
  );
}
