"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  ImageUploader,
  type ImageItem,
} from "@/components/ui/ImageUploader";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { SelectCascade } from "@/components/ui/form/SelectCascade";
import {
  InlineEditTable,
  type InlineEditColumn,
} from "@/components/ui/form/InlineEditTable";
import { PriceImpactModal } from "@/components/ui/PriceImpactModal";
import {
  useServiceState,
  useServiceActions,
  useServiceLoading,
} from "@/components/providers/ServiceProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import {
  usePaises,
  useRegimenes,
} from "@/components/providers/CatalogProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import type { PrecioAlojamiento } from "@/lib/types";

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
  const [categoria, setCategoria] = useState(
    String(alojamiento?.categoria ?? 3),
  );
  const [sitioWeb, setSitioWeb] = useState(alojamiento?.sitioWeb ?? "");

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
    toast(
      "success",
      "Alojamiento actualizado",
      "Los cambios fueron guardados correctamente.",
    );
  }

  // -- Price impact modal state --
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<
    (() => void) | null
  >(null);

  // ---------------------------------------------------------------------------
  // Card 2: Inline price table
  // ---------------------------------------------------------------------------

  const precios = serviceState.preciosAlojamiento.filter(
    (p) => p.alojamientoId === params.id,
  );

  async function handleSavePrecio(row: PrecioAlojamiento) {
    const doSave = () => {
      try {
        if (row.id) {
          updatePrecioAlojamiento(row);
          toast(
            "success",
            "Precio actualizado",
            "El periodo fue actualizado correctamente.",
          );
        } else {
          createPrecioAlojamiento({
            alojamientoId: alojamiento!.id,
            periodoDesde: row.periodoDesde ?? "",
            periodoHasta: row.periodoHasta ?? "",
            precioPorNoche: Number(row.precioPorNoche ?? 0),
            regimenId: row.regimenId ?? "",
          });
          toast(
            "success",
            "Periodo agregado",
            "El periodo de precio fue agregado correctamente.",
          );
        }
      } catch (err) {
        toast(
          "error",
          "Error al guardar",
          err instanceof Error ? err.message : "Intenta nuevamente",
        );
      }
    };

    if (affectedPackageCount > 0) {
      setPendingSaveAction(() => doSave);
      setImpactModalOpen(true);
    } else {
      doSave();
    }
  }

  function handleDeletePrecio(row: PrecioAlojamiento) {
    try {
      deletePrecioAlojamiento(row.id);
      toast(
        "success",
        "Periodo eliminado",
        "El periodo fue eliminado correctamente.",
      );
    } catch (err) {
      toast(
        "error",
        "Error al eliminar",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    }
  }

  const regimenOptions = useMemo(
    () => regimenes.map((r) => ({ value: r.id, label: r.nombre })),
    [regimenes],
  );

  const regimenMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of regimenes) m[r.id] = r.nombre;
    return m;
  }, [regimenes]);

  const precioColumns: InlineEditColumn<PrecioAlojamiento>[] = [
    {
      key: "periodoDesde",
      label: "Periodo Desde",
      width: "170px",
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
      width: "170px",
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
      key: "precioPorNoche",
      label: "USD / noche",
      align: "right",
      width: "150px",
      render: (r) => (
        <span className="font-mono text-[13px] font-semibold text-neutral-900">
          {formatCurrency(r.precioPorNoche)}
        </span>
      ),
      editor: (r, update) => (
        <Input
          type="number"
          value={String(r.precioPorNoche ?? 0)}
          onChange={(e) =>
            update("precioPorNoche", parseFloat(e.target.value) || 0)
          }
          className="text-right"
        />
      ),
    },
    {
      key: "regimenId",
      label: "Regimen",
      render: (r) => regimenMap[r.regimenId] ?? "—",
      editor: (r, update) => (
        <Select
          value={r.regimenId ?? ""}
          onValueChange={(v) => update("regimenId", v)}
          options={regimenOptions}
          placeholder="Seleccionar regimen..."
        />
      ),
    },
  ];

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
        <DataTablePageHeader
          title="Alojamiento no encontrado"
          subtitle="El alojamiento solicitado no existe o fue eliminado."
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
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isReadOnly = !canEdit;

  return (
    <>
      <DataTablePageHeader
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

      <FormSections>
        {/* ------------------------------------------------------------------ */}
        {/* Datos del hotel                                                    */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Datos del hotel"
          description="Nombre, categoria y ubicacion del hotel."
        >
          <FieldGroup columns={2}>
            <Field span={2}>
              <FieldLabel required>Nombre del hotel</FieldLabel>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del hotel"
                readOnly={isReadOnly}
              />
            </Field>

            <Field span={2}>
              <SelectCascade
                parentLabel="Pais"
                parentValue={paisId}
                onParentChange={setPaisId}
                parentOptions={paises.map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
                childLabel="Ciudad"
                childValue={ciudadId}
                onChildChange={setCiudadId}
                childOptions={(selectedPaisId) =>
                  paises
                    .find((p) => p.id === selectedPaisId)
                    ?.ciudades.map((c) => ({
                      value: c.id,
                      label: c.nombre,
                    })) ?? []
                }
                disabled={isReadOnly}
              />
            </Field>

            <Field>
              <FieldLabel>Categoria (estrellas)</FieldLabel>
              <Select
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
            </Field>

            <Field>
              <FieldLabel>Sitio web (opcional)</FieldLabel>
              <Input
                value={sitioWeb}
                onChange={(e) => setSitioWeb(e.target.value)}
                placeholder="https://..."
                type="url"
                readOnly={isReadOnly}
              />
            </Field>
          </FieldGroup>

          {canEdit && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveHotel}>Guardar Cambios</Button>
            </div>
          )}
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Precios por periodo                                                */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Precios por periodo"
          description="Tarifas por noche y regimen segun la temporada."
        >
          <InlineEditTable<PrecioAlojamiento>
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
                      precioPorNoche: 0,
                      regimenId: "",
                    }) as Partial<PrecioAlojamiento>
                : undefined
            }
            addLabel="Agregar periodo"
            emptyMessage="No hay periodos de precio registrados"
          />
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Fotos                                                              */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Fotos"
          description="Arrastra o sube las fotos del hotel."
        >
          <ImageUploader
            images={images}
            onAdd={canEdit ? handleAdd : undefined}
            onRemove={canEdit ? handleRemove : undefined}
            onReorder={canEdit ? handleReorder : undefined}
            maxImages={10}
          />

          {images.length === 0 && !canEdit && (
            <p className="mt-4 text-center text-sm text-neutral-400">
              No hay fotos para este alojamiento
            </p>
          )}
        </FormSection>
      </FormSections>

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
