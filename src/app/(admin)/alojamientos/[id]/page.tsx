"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DatePicker } from "@/components/ui/DatePicker";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
import {
  ImageUploader,
  type ImageItem,
} from "@/components/ui/ImageUploader";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { SelectCascade } from "@/components/ui/form/SelectCascade";
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
import {
  usePaises,
  useRegimenes,
} from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { formatStoredDate, parseStoredDate } from "@/lib/date";
import type { PrecioAlojamiento } from "@/lib/types";

function formatPeriodLabel(value?: string | null) {
  const date = parseStoredDate(value);
  return date ? format(date, "dd/MM/yyyy") : "—";
}

function isCurrentPeriod(periodoDesde?: string | null, periodoHasta?: string | null) {
  const today = formatStoredDate(new Date()) ?? "";
  return Boolean(
    periodoDesde &&
      periodoHasta &&
      periodoDesde <= today &&
      today <= periodoHasta,
  );
}

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
  const loading = useServiceLoading();

  // Look up alojamiento
  const alojamiento = serviceState.alojamientos.find(
    (a) => a.id === params.id && !a.deletedAt,
  );

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

  // ---------------------------------------------------------------------------
  // Card 2: Inline price table
  // ---------------------------------------------------------------------------

  const precios = serviceState.preciosAlojamiento.filter(
    (p) => p.alojamientoId === params.id,
  );

  async function handleSavePrecio(row: PrecioAlojamiento) {
    if (!row.periodoDesde?.trim() || !row.periodoHasta?.trim()) {
      toast(
        "warning",
        "Periodo requerido",
        "Debes completar desde y hasta antes de guardar el precio.",
      );
      return;
    }
    if (!Number.isFinite(Number(row.precioPorNoche)) || Number(row.precioPorNoche) <= 0) {
      toast(
        "warning",
        "Precio requerido",
        "El precio por noche debe ser mayor a cero.",
      );
      return;
    }

    const normalizedRegimenId = row.regimenId?.trim() || "";
    const normalizedRow = {
      ...row,
      regimenId: normalizedRegimenId,
    };

    const doSave = () => {
      try {
        if (normalizedRow.id) {
          updatePrecioAlojamiento(normalizedRow);
          toast(
            "success",
            "Precio actualizado",
            "El periodo fue actualizado correctamente.",
          );
        } else {
          createPrecioAlojamiento({
            alojamientoId: alojamiento!.id,
            periodoDesde: normalizedRow.periodoDesde ?? "",
            periodoHasta: normalizedRow.periodoHasta ?? "",
            precioPorNoche: Number(normalizedRow.precioPorNoche ?? 0),
            regimenId: normalizedRegimenId,
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

    doSave();
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
      label: "Período",
      width: "340px",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-900">
              {formatPeriodLabel(r.periodoDesde)} – {formatPeriodLabel(r.periodoHasta)}
            </span>
            {isCurrentPeriod(r.periodoDesde, r.periodoHasta) && (
              <Badge variant="active" size="sm">
                Vigente
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-neutral-400">Vigencia del precio</span>
        </div>
      ),
      editor: (r, update) => (
        <PeriodPicker
          valueFrom={r.periodoDesde}
          valueTo={r.periodoHasta}
          onChange={(desde, hasta) => {
            update("periodoDesde", desde);
            update("periodoHasta", hasta);
          }}
          placeholder="Seleccionar período..."
        />
      ),
    },
    {
      key: "precioPorNoche",
      label: "USD / noche",
      align: "right",
      width: "180px",
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
      width: "210px",
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
          <FieldDescription>
            Los periodos no pueden quedar vacíos. Si editás un valor, se guarda
            con el selector de fecha y el precio por noche.
          </FieldDescription>
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
            addLabel="Agregar tarifa"
            emptyMessage="No hay periodos de precio registrados"
            className="min-w-[980px]"
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
            folder={`alojamientos/${alojamiento.id}`}
          />

          {images.length === 0 && !canEdit && (
            <p className="mt-4 text-center text-sm text-neutral-400">
              No hay fotos para este alojamiento
            </p>
          )}
        </FormSection>
      </FormSections>

    </>
  );
}
