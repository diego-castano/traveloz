"use client";

// ---------------------------------------------------------------------------
// AereoFullForm — full new-aereo form, reused in two contexts:
//
//   1. /backend/aereos/nuevo — standalone page (router-driven).
//   2. ServiceSelectorModal "Crear nuevo aéreo" — embedded inside a nested
//      modal so the operator can create a flight without leaving the package
//      flow. After save, the parent assigns it to the package + refreshes the
//      catalog.
//
// Fields match the standalone page 1:1 (ruta, destino, aerolinea, equipaje,
// tarifa inicial + período, itinerario texto + imágenes) so the cliente
// (Lucha) gets the same UI in both places.
// ---------------------------------------------------------------------------

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { TextAutocomplete } from "@/components/ui/form/TextAutocomplete";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { PillGroup } from "@/components/ui/form/PillGroup";
import { ItinerarioEditor } from "@/components/ui/form/ItinerarioEditor";
import {
  InlineEditTable,
  type InlineEditColumn,
  type InlineEditTableHandle,
} from "@/components/ui/form/InlineEditTable";
import { useServiceActions, useAereos } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useToast } from "@/components/ui/Toast";
import { formatStoredDate, parseStoredDate } from "@/lib/date";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

function formatPeriodLabel(value?: string | null) {
  const date = parseStoredDate(value);
  return date ? format(date, "dd/MM/yyyy") : "—";
}

type PrecioDraft = {
  tempId: string;
  periodoDesde: string;
  periodoHasta: string;
  precioAdulto: number;
};

function makeEmptyPrecio(): PrecioDraft {
  const start = formatStoredDate(new Date()) ?? "";
  const end =
    formatStoredDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) ?? "";
  return {
    tempId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    periodoDesde: start,
    periodoHasta: end,
    precioAdulto: 0,
  };
}

export const equipajeOptions: {
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

export interface AereoFullFormDefaults {
  ruta?: string;
  destino?: string;
  aerolinea?: string;
  equipaje?: string;
}

export interface AereoCreated {
  id: string;
  ruta: string;
  destino: string;
}

export interface AereoFullFormProps {
  /** Pre-fill values when opening from a context that already knows the destino. */
  defaults?: AereoFullFormDefaults;
  /** Called after a successful create. Receives the new aereo summary. */
  onCreated: (aereo: AereoCreated) => void | Promise<void>;
  /** Called when the operator cancels (no aereo created). */
  onCancel: () => void;
  /** When embedded inside another modal, omit the form's own outer chrome. Default false. */
  embedded?: boolean;
  /** Submit button label override. Defaults to "Crear aéreo". */
  submitLabel?: string;
}

export function AereoFullForm({
  defaults,
  onCreated,
  onCancel,
  embedded = false,
  submitLabel = "Crear aéreo",
}: AereoFullFormProps) {
  const { createAereo } = useServiceActions();
  const { activeBrandId } = useBrand();
  const { toast } = useToast();

  const [ruta, setRuta] = useState(defaults?.ruta ?? "");
  const [destino, setDestino] = useState(defaults?.destino ?? "");

  // Destinos ya cargados en los aéreos (de la marca activa), para el desplegable.
  // La lista crece sola a medida que se van agregando aéreos con destinos nuevos.
  const aereos = useAereos();
  const destinoOptions = useMemo(() => {
    const porNombre = new Map<string, string>();
    for (const a of aereos) {
      const d = (a.destino ?? "").trim();
      if (!d) continue;
      const key = d.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (!porNombre.has(key)) porNombre.set(key, d);
    }
    return Array.from(porNombre.values()).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [aereos]);
  const [aerolinea, setAerolinea] = useState(defaults?.aerolinea ?? "");
  const [equipaje, setEquipaje] = useState(
    defaults?.equipaje ?? "Equipaje de mano + Equipaje en bodega",
  );
  const [precios, setPrecios] = useState<PrecioDraft[]>([]);
  // Mirror in a ref so handleCreate can read the post-commitPending value
  // synchronously (setState updates aren't visible to the running closure).
  const preciosRef = useRef<PrecioDraft[]>([]);
  preciosRef.current = precios;
  const preciosTableRef = useRef<InlineEditTableHandle>(null);

  const setPreciosBoth = (next: PrecioDraft[] | ((prev: PrecioDraft[]) => PrecioDraft[])) => {
    setPrecios((prev) => {
      const computed = typeof next === "function" ? (next as (p: PrecioDraft[]) => PrecioDraft[])(prev) : next;
      preciosRef.current = computed;
      return computed;
    });
  };

  const precioColumns: InlineEditColumn<PrecioDraft>[] = [
    {
      key: "periodo",
      label: "Período",
      width: "340px",
      render: (r) => (
        <span className="font-medium text-neutral-900">
          {formatPeriodLabel(r.periodoDesde)} – {formatPeriodLabel(r.periodoHasta)}
        </span>
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
          min={0}
          value={String(r.precioAdulto ?? 0)}
          onChange={(e) =>
            update("precioAdulto", parseFloat(e.target.value) || 0)
          }
          className="text-right"
        />
      ),
    },
  ];
  const [itinerario, setItinerario] = useState("");
  const [itinerarioImagenes, setItinerarioImagenes] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isCreating) return;
    if (!ruta.trim()) {
      toast("warning", "Ruta requerida", "Ingresa una ruta para el vuelo.");
      return;
    }

    // Flush any row the user was still editing in the precios table so its
    // draft value lands in `precios` before we validate.
    if (preciosTableRef.current?.hasPending()) {
      try {
        await preciosTableRef.current.commitPending();
      } catch {
        return; // commitPending shows its own validation toast
      }
    }

    // Read from the ref — setState updates from commitPending aren't visible
    // to this closure yet.
    const currentPrecios = preciosRef.current;

    if (currentPrecios.length === 0) {
      toast(
        "warning",
        "Falta una tarifa",
        "Agregá al menos una tarifa antes de crear el vuelo.",
      );
      return;
    }
    const invalid = currentPrecios.find(
      (p) =>
        !p.periodoDesde ||
        !p.periodoHasta ||
        !Number.isFinite(p.precioAdulto) ||
        p.precioAdulto <= 0,
    );
    if (invalid) {
      toast(
        "warning",
        "Tarifa incompleta",
        "Cada tarifa necesita período desde, hasta y precio mayor a cero.",
      );
      return;
    }

    setIsCreating(true);
    try {
      const created = await createAereo({
        brandId: activeBrandId,
        ruta: ruta.trim(),
        destino: destino.trim(),
        aerolinea: aerolinea.trim(),
        equipaje,
        itinerario: itinerario.trim(),
        itinerarioImagenes,
        precios: currentPrecios.map((p) => ({
          periodoDesde: p.periodoDesde,
          periodoHasta: p.periodoHasta,
          precioAdulto: p.precioAdulto,
        })),
      } as any);

      toast(
        "success",
        "Aéreo creado",
        `"${ruta.trim()}" fue creado correctamente.`,
      );
      // Pass the created id back so the parent can assign it.
      await onCreated({
        id: (created as { id: string })?.id ?? "",
        ruta: ruta.trim(),
        destino: destino.trim(),
      });
    } catch (error) {
      console.error("Error creating aereo:", error);
      toast(
        "error",
        "No se pudo crear el aéreo",
        "Revisá los datos e intentá nuevamente.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreate}>
      <FormSections>
        <FormSection
          title="Datos del vuelo"
          description="Ruta, destino y compañía aérea principal del vuelo."
        >
          <FieldGroup columns={2}>
            <Field span={2}>
              <FieldLabel required>Ruta</FieldLabel>
              <Input
                value={ruta}
                onChange={(e) => setRuta(e.target.value)}
                placeholder="EZE - MAD"
                autoFocus={!embedded}
              />
            </Field>
            <Field span={2}>
              <FieldLabel>Destino</FieldLabel>
              <TextAutocomplete
                value={destino}
                onChange={setDestino}
                options={destinoOptions}
                placeholder="Elegí un destino o escribí uno nuevo"
                leftIcon={<MapPin className="w-4 h-4" />}
              />
              <FieldDescription>
                Se completa con los destinos ya cargados. Si no está, escribilo y
                queda disponible para los próximos aéreos.
              </FieldDescription>
            </Field>
            <Field span={2}>
              <FieldLabel>Aerolínea</FieldLabel>
              <Input
                value={aerolinea}
                onChange={(e) => setAerolinea(e.target.value)}
                placeholder="Iberia"
              />
            </Field>
          </FieldGroup>
        </FormSection>

        <FormSection
          title="Precios por periodo"
          description="Tarifas netas por adulto según el período de viaje. Agregá todas las que necesites; cada una requiere desde, hasta y precio."
        >
          <InlineEditTable<PrecioDraft>
            ref={preciosTableRef}
            columns={precioColumns}
            rows={precios}
            getRowId={(r) => r.tempId}
            onSave={(row) => {
              setPreciosBoth((prev) => {
                const i = prev.findIndex((p) => p.tempId === row.tempId);
                if (i === -1) return [...prev, row];
                const cp = [...prev];
                cp[i] = row;
                return cp;
              });
            }}
            onDelete={(row) =>
              setPreciosBoth((prev) => prev.filter((p) => p.tempId !== row.tempId))
            }
            onAdd={() => makeEmptyPrecio()}
            addLabel="Agregar tarifa"
            emptyMessage="Sin tarifas. Agregá al menos una."
          />
        </FormSection>

        <FormSection
          title="Detalles del vuelo"
          description="Equipaje incluido con la tarifa aérea."
        >
          <FieldGroup>
            <Field>
              <FieldLabel required>Equipaje</FieldLabel>
              <PillGroup
                value={equipaje}
                onValueChange={setEquipaje}
                options={equipajeOptions}
                aria-label="Equipaje"
              />
              <FieldDescription>
                Elegí el tipo de equipaje incluido para que el usuario lo vea de forma clara.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FormSection>

        <FormSection
          title="Itinerario"
          description="Detalle opcional con horarios, escalas y observaciones. Podés pegar texto o arrastrar imágenes."
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Itinerario</FieldLabel>
              <ItinerarioEditor
                text={itinerario}
                onTextChange={setItinerario}
                images={itinerarioImagenes}
                onImagesChange={setItinerarioImagenes}
                folder="itinerarios/aereos/new"
                rows={5}
              />
              <FieldDescription>
                Opcional. Podés dejarlo vacío o agregar solo imágenes.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FormSection>
      </FormSections>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isCreating}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Creando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
