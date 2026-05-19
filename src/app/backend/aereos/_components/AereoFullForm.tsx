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

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { PillGroup } from "@/components/ui/form/PillGroup";
import { ItinerarioEditor } from "@/components/ui/form/ItinerarioEditor";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useToast } from "@/components/ui/Toast";
import { formatStoredDate } from "@/lib/date";

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
  const [aerolinea, setAerolinea] = useState(defaults?.aerolinea ?? "");
  const [equipaje, setEquipaje] = useState(
    defaults?.equipaje ?? "Equipaje de mano + Equipaje en bodega",
  );
  const [precioAdulto, setPrecioAdulto] = useState("");
  const [periodoDesde, setPeriodoDesde] = useState<string>(
    formatStoredDate(new Date()) ?? "",
  );
  const [periodoHasta, setPeriodoHasta] = useState<string>(
    formatStoredDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) ?? "",
  );
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
    if (!precioAdulto.trim() || Number(precioAdulto) <= 0) {
      toast("warning", "Tarifa requerida", "La tarifa inicial es obligatoria.");
      return;
    }

    setIsCreating(true);
    try {
      const precio = Number(precioAdulto);
      const precioInicial =
        Number.isFinite(precio) && precio > 0
          ? {
              periodoDesde:
                periodoDesde || formatStoredDate(new Date()) || "",
              periodoHasta:
                periodoHasta ||
                formatStoredDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) ||
                "",
              precioAdulto: precio,
            }
          : undefined;

      const created = await createAereo({
        brandId: activeBrandId,
        ruta: ruta.trim(),
        destino: destino.trim(),
        aerolinea: aerolinea.trim(),
        equipaje,
        itinerario: itinerario.trim(),
        itinerarioImagenes,
        precioInicial,
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
              <Input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Madrid"
              />
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
          title="Tarifa inicial"
          description="Carga el primer precio desde el alta, sin tener que ir al segundo paso."
        >
          <FieldGroup columns={3}>
            <Field span={2}>
              <PeriodPicker
                label="Periodo de la tarifa"
                valueFrom={periodoDesde}
                valueTo={periodoHasta}
                onChange={(desde, hasta) => {
                  setPeriodoDesde(desde);
                  setPeriodoHasta(hasta);
                }}
                placeholder="Seleccionar periodo..."
              />
            </Field>
            <Field>
              <FieldLabel required>Precio adulto USD</FieldLabel>
              <Input
                type="number"
                min={0}
                value={precioAdulto}
                onChange={(e) => setPrecioAdulto(e.target.value)}
                placeholder="0"
              />
              <FieldDescription>
                Obligatorio. Es la tarifa inicial que activa el vuelo desde el alta.
              </FieldDescription>
            </Field>
          </FieldGroup>
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
