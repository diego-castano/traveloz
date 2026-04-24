"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { PillGroup } from "@/components/ui/form/PillGroup";
import { ItinerarioEditor } from "@/components/ui/form/ItinerarioEditor";
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
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import type { PrecioAereo } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const equipajeOptions: {
  value: string;
  label: string;
  description: string;
  tone: "neutral" | "sky" | "teal" | "amber" | "violet" | "rose";
}[] = [
  {
    value: "Articulo personal",
    label: "Personal",
    description: "Solo artículo personal",
    tone: "sky",
  },
  {
    value: "Articulo personal + Equipaje de mano",
    label: "+ Mano",
    description: "Artículo personal + carry-on",
    tone: "amber",
  },
  {
    value: "Equipaje de mano + Equipaje en bodega",
    label: "+ Bodega",
    description: "Carry-on + equipaje despachado",
    tone: "violet",
  },
];

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
  const {
    updateAereo,
    createPrecioAereo,
    updatePrecioAereo,
    deletePrecioAereo,
  } = useServiceActions();
  const packageState = usePackageState();
  const loading = useServiceLoading();

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
  const [itinerarioImagenes, setItinerarioImagenes] = useState<string[]>(
    aereo?.itinerarioImagenes ?? [],
  );

  // -- Price impact modal state --
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<
    (() => void) | null
  >(null);

  // ---------------------------------------------------------------------------
  // Guard: loading / not found
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="detail" />;

  if (!aereo) {
    return (
      <DataTablePageHeader
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
    if (!ruta.trim()) {
      toast("warning", "Ruta requerida", "La ruta no puede quedar vacía.");
      return;
    }
    if (!equipaje.trim()) {
      toast(
        "warning",
        "Equipaje requerido",
        "Selecciona una opción de equipaje antes de guardar.",
      );
      return;
    }
    if (!itinerario.trim()) {
      toast(
        "warning",
        "Itinerario requerido",
        "Debes completar el itinerario para guardar.",
      );
      return;
    }
    updateAereo({
      ...aereo,
      ruta,
      destino,
      aerolinea,
      equipaje,
      itinerario,
      itinerarioImagenes,
    });
    toast("success", "Vuelo actualizado", "Los datos del vuelo fueron guardados.");
  }

  // ---------------------------------------------------------------------------
  // Price row handlers wired through InlineEditTable
  // ---------------------------------------------------------------------------

  async function handleSavePrecio(row: PrecioAereo) {
    if (!row.periodoDesde?.trim() || !row.periodoHasta?.trim()) {
      toast(
        "warning",
        "Periodo requerido",
        "Debes completar desde y hasta antes de guardar el precio.",
      );
      return;
    }
    if (!Number.isFinite(Number(row.precioAdulto)) || Number(row.precioAdulto) <= 0) {
      toast(
        "warning",
        "Precio requerido",
        "El precio adulto debe ser mayor a cero.",
      );
      return;
    }

    const doSave = () => {
      try {
        if (row.id) {
          updatePrecioAereo(row);
          toast(
            "success",
            "Precio actualizado",
            "El periodo fue guardado correctamente.",
          );
        } else {
          createPrecioAereo({
            aereoId: aereo!.id,
            periodoDesde: row.periodoDesde ?? "",
            periodoHasta: row.periodoHasta ?? "",
            precioAdulto: Number(row.precioAdulto ?? 0),
          });
          toast(
            "success",
            "Periodo agregado",
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
    };

    if (affectedPackageCount > 0) {
      setPendingSaveAction(() => doSave);
      setImpactModalOpen(true);
    } else {
      doSave();
    }
  }

  function handleDeletePrecio(row: PrecioAereo) {
    try {
      deletePrecioAereo(row.id);
      toast("success", "Periodo eliminado", "El periodo fue eliminado.");
    } catch (err) {
      toast(
        "error",
        "Error al eliminar",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Columns for InlineEditTable<PrecioAereo>
  // ---------------------------------------------------------------------------

  const precioColumns: InlineEditColumn<PrecioAereo>[] = [
    {
      key: "periodoDesde",
      label: "Periodo Desde",
      width: "220px",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-neutral-900">{r.periodoDesde}</span>
          <span className="text-[11px] text-neutral-400">Fecha de inicio</span>
        </div>
      ),
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
      width: "220px",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-neutral-900">{r.periodoHasta}</span>
          <span className="text-[11px] text-neutral-400">Fecha de cierre</span>
        </div>
      ),
      editor: (r, update) => (
        <Input
          type="date"
          value={r.periodoHasta ?? ""}
          onChange={(e) => update("periodoHasta", e.target.value)}
        />
      ),
    },
    {
      key: "precioAdulto",
      label: "Neto Adulto USD",
      align: "right",
      width: "190px",
      render: (r) => (
        <span className="font-mono text-[13px] font-semibold text-neutral-900">
          {formatCurrency(r.precioAdulto)}
        </span>
      ),
      editor: (r, update) => (
        <Input
          type="number"
          value={String(r.precioAdulto ?? 0)}
          onChange={(e) =>
            update("precioAdulto", parseFloat(e.target.value) || 0)
          }
          className="text-right"
        />
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <DataTablePageHeader
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

      <FormSections>
        {/* ------------------------------------------------------------------ */}
        {/* Datos del vuelo                                                    */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Datos del vuelo"
          description="Ruta, destino y compania aerea principal del vuelo."
        >
        <FieldGroup columns={2}>
          <Field span={2}>
            <FieldLabel required>Ruta</FieldLabel>
              <Input
                value={ruta}
                onChange={(e) => setRuta(e.target.value)}
                placeholder="EZE - MAD"
                readOnly={!canEdit}
              />
            </Field>
            <Field span={2}>
              <FieldLabel>Destino</FieldLabel>
              <Input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Madrid"
                readOnly={!canEdit}
              />
            </Field>
            <Field span={2}>
              <FieldLabel>Aerolinea</FieldLabel>
              <Input
                value={aerolinea}
                onChange={(e) => setAerolinea(e.target.value)}
                placeholder="Iberia"
                readOnly={!canEdit}
              />
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Detalles del vuelo                                                 */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Detalles del vuelo"
          description="Equipaje incluido con la tarifa aerea. Este bloque es obligatorio para guardar cambios."
        >
          <FieldGroup>
            <Field>
              <FieldLabel required>Equipaje</FieldLabel>
              <PillGroup
                value={equipaje}
                onValueChange={setEquipaje}
                options={equipajeOptions}
                disabled={!canEdit}
                aria-label="Equipaje"
              />
              <FieldDescription>
                Elegí una sola opción. Si queda vacío, no se permite guardar.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Itinerario                                                         */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Itinerario"
          description="Notas libres con horarios, escalas y observaciones. Es obligatorio para poder guardar."
        >
          <FieldGroup>
            <Field>
              <FieldLabel required>Itinerario</FieldLabel>
              <ItinerarioEditor
                text={itinerario}
                onTextChange={setItinerario}
                images={itinerarioImagenes}
                onImagesChange={setItinerarioImagenes}
                readOnly={!canEdit}
                folder={`itinerarios/aereos/${aereo.id}`}
                rows={5}
              />
              <FieldDescription>
                Sin itinerario no se puede guardar el vuelo.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {canEdit && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveFlight}>Guardar Cambios</Button>
            </div>
          )}
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Precios por periodo                                                */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Precios por periodo"
          description="Tarifas netas por adulto segun el periodo de viaje. Desde, hasta y precio son obligatorios."
        >
          <InlineEditTable<PrecioAereo>
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
                      precioAdulto: 0,
                    }) as Partial<PrecioAereo>
                : undefined
            }
            addLabel="Agregar tarifa"
            emptyMessage="Sin periodos definidos"
          />
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
        serviceName={aereo.ruta}
        onConfirm={() => {
          pendingSaveAction?.();
          setPendingSaveAction(null);
        }}
      />
    </>
  );
}
