"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { PillGroup } from "@/components/ui/form/PillGroup";
import { ItinerarioEditor } from "@/components/ui/form/ItinerarioEditor";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatStoredDate } from "@/lib/date";

// ---------------------------------------------------------------------------
// NuevoAereoPage
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

export default function NuevoAereoPage() {
  const router = useRouter();
  const { createAereo } = useServiceActions();
  const { activeBrandId } = useBrand();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // -- VENDEDOR guard: redirect if cannot edit --
  useEffect(() => {
    if (!canEdit) {
      router.push("/aereos");
    }
  }, [canEdit, router]);

  // -- Form state --
  const [ruta, setRuta] = useState("");
  const [destino, setDestino] = useState("");
  const [aerolinea, setAerolinea] = useState("");
  const [equipaje, setEquipaje] = useState(
    "Equipaje de mano + Equipaje en bodega",
  );
  const [precioAdulto, setPrecioAdulto] = useState("");
  const [periodoDesdeDate, setPeriodoDesdeDate] = useState<Date | undefined>(
    new Date(),
  );
  const [periodoHastaDate, setPeriodoHastaDate] = useState<Date | undefined>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  );
  const [itinerario, setItinerario] = useState("");
  const [itinerarioImagenes, setItinerarioImagenes] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // -- Create handler --
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
    if (!itinerario.trim()) {
      toast("warning", "Itinerario requerido", "Debes cargar el itinerario para poder crear el vuelo.");
      return;
    }

    setIsCreating(true);
    try {
      const precio = Number(precioAdulto);
      const precioInicial =
        Number.isFinite(precio) && precio > 0
          ? {
              periodoDesde:
                formatStoredDate(periodoDesdeDate) ?? formatStoredDate(new Date()) ?? "",
              periodoHasta:
                formatStoredDate(periodoHastaDate) ??
                formatStoredDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) ??
                "",
              precioAdulto: precio,
            }
          : undefined;

      await createAereo({
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
        "Aereo creado",
        `"${ruta.trim()}" fue creado correctamente.`,
      );
      router.push("/aereos");
    } catch (error) {
      console.error("Error creating aereo:", error);
      toast(
        "error",
        "No se pudo crear el aereo",
        "Revisá los datos e intentá nuevamente.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Don't render form if user cannot edit (redirect is in progress)
  if (!canEdit) {
    return null;
  }

  return (
    <>
      <DataTablePageHeader
        title="Nuevo Aereo"
        subtitle="Crear un nuevo vuelo"
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

      <form onSubmit={handleCreate}>
        <FormSections>
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
                  autoFocus
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
                <FieldLabel>Aerolinea</FieldLabel>
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
              <Field>
                <DatePicker
                  label="Periodo desde"
                  value={periodoDesdeDate}
                  onChange={setPeriodoDesdeDate}
                  placeholder="Seleccionar fecha..."
                />
              </Field>
              <Field>
                <DatePicker
                  label="Periodo hasta"
                  value={periodoHastaDate}
                  onChange={setPeriodoHastaDate}
                  placeholder="Seleccionar fecha..."
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
            description="Equipaje incluido con la tarifa aerea."
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
            description="Detalle opcional con horarios, escalas y observaciones. Podes pegar texto o arrastrar imagenes."
          >
            <FieldGroup>
              <Field>
                <FieldLabel required>Itinerario</FieldLabel>
                <ItinerarioEditor
                  text={itinerario}
                  onTextChange={setItinerario}
                  images={itinerarioImagenes}
                  onImagesChange={setItinerarioImagenes}
                  folder="itinerarios/aereos/new"
                  rows={5}
                />
                <FieldDescription>
                  Obligatorio. Sin itinerario el vuelo no se puede crear.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FormSection>
        </FormSections>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/aereos")}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Creando..." : "Crear Aereo"}
          </Button>
        </div>
      </form>
    </>
  );
}
