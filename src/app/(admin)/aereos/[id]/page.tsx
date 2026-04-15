"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plane } from "lucide-react";
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

const equipajeOptions = [
  { value: "Articulo personal", label: "Articulo personal" },
  {
    value: "Articulo personal + Equipaje de mano",
    label: "Articulo personal + Equipaje de mano",
  },
  {
    value: "Equipaje de mano + Equipaje en bodega",
    label: "Equipaje de mano + Equipaje en bodega",
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
  const [escalas, setEscalas] = useState(aereo?.escalas ?? 0);
  const [codigoVueloIda, setCodigoVueloIda] = useState(
    aereo?.codigoVueloIda ?? "",
  );
  const [codigoVueloVuelta, setCodigoVueloVuelta] = useState(
    aereo?.codigoVueloVuelta ?? "",
  );
  const [duracionIda, setDuracionIda] = useState(aereo?.duracionIda ?? "");
  const [duracionVuelta, setDuracionVuelta] = useState(
    aereo?.duracionVuelta ?? "",
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
    updateAereo({
      ...aereo,
      ruta,
      destino,
      aerolinea,
      equipaje,
      itinerario,
      escalas,
      codigoVueloIda,
      codigoVueloVuelta,
      duracionIda,
      duracionVuelta,
    });
    toast("success", "Vuelo actualizado", "Los datos del vuelo fueron guardados.");
  }

  // ---------------------------------------------------------------------------
  // Price row handlers wired through InlineEditTable
  // ---------------------------------------------------------------------------

  async function handleSavePrecio(row: PrecioAereo) {
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
      key: "precioAdulto",
      label: "Neto Adulto USD",
      align: "right",
      width: "180px",
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
          description="Codigos, duracion y escalas del itinerario completo."
        >
          <div className="rounded-[12px] border border-hairline bg-white p-4">
            {/* Flight path visualization */}
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-neutral-800">
                  {ruta.split(" - ")[0] || "ORG"}
                </div>
                <div className="text-xs text-neutral-400">Origen</div>
              </div>
              <div className="relative flex flex-1 items-center">
                <div className="w-full border-t-2 border-dashed border-neutral-200" />
                {escalas > 0 &&
                  Array.from({ length: escalas }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute h-2.5 w-2.5 rounded-full border-2 border-white bg-[#3BBFAD]"
                      style={{
                        left: `${((i + 1) / (escalas + 1)) * 100}%`,
                        transform: "translate(-50%, -50%)",
                        top: "0",
                      }}
                    />
                  ))}
                <Plane className="absolute right-0 -top-2.5 h-5 w-5 text-[#3BBFAD]" />
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-neutral-800">
                  {ruta.split(" - ")[1] || "DST"}
                </div>
                <div className="text-xs text-neutral-400">Destino</div>
              </div>
            </div>

            <FieldGroup columns={2}>
              <Field>
                <FieldLabel>Codigo Ida</FieldLabel>
                <Input
                  value={codigoVueloIda}
                  onChange={(e) => setCodigoVueloIda(e.target.value)}
                  placeholder="AA 1234"
                  readOnly={!canEdit}
                />
              </Field>
              <Field>
                <FieldLabel>Duracion Ida</FieldLabel>
                <Input
                  value={duracionIda}
                  onChange={(e) => setDuracionIda(e.target.value)}
                  placeholder="3h 30m"
                  readOnly={!canEdit}
                />
              </Field>
              <Field>
                <FieldLabel>Codigo Vuelta</FieldLabel>
                <Input
                  value={codigoVueloVuelta}
                  onChange={(e) => setCodigoVueloVuelta(e.target.value)}
                  placeholder="AA 1235"
                  readOnly={!canEdit}
                />
              </Field>
              <Field>
                <FieldLabel>Duracion Vuelta</FieldLabel>
                <Input
                  value={duracionVuelta}
                  onChange={(e) => setDuracionVuelta(e.target.value)}
                  placeholder="3h 30m"
                  readOnly={!canEdit}
                />
              </Field>
              <Field>
                <FieldLabel>Escalas</FieldLabel>
                <Input
                  type="number"
                  value={String(escalas)}
                  onChange={(e) => setEscalas(Number(e.target.value))}
                  placeholder="0"
                  readOnly={!canEdit}
                />
              </Field>
              <Field>
                <FieldLabel>Equipaje</FieldLabel>
                <Select
                  value={equipaje}
                  onValueChange={setEquipaje}
                  options={equipajeOptions}
                  disabled={!canEdit}
                />
              </Field>
            </FieldGroup>
          </div>
        </FormSection>

        {/* ------------------------------------------------------------------ */}
        {/* Itinerario                                                         */}
        {/* ------------------------------------------------------------------ */}
        <FormSection
          title="Itinerario"
          description="Notas libres con horarios, escalas y observaciones."
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Itinerario</FieldLabel>
              <textarea
                value={itinerario}
                onChange={(e) => setItinerario(e.target.value)}
                placeholder="Detalle de vuelos, horarios y escalas..."
                readOnly={!canEdit}
                rows={3}
                className="w-full resize-none rounded-[8px] border border-hairline bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#3BBFAD] focus:outline-none"
              />
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
          description="Tarifas netas por adulto segun el periodo de viaje."
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
            addLabel="Agregar periodo"
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
