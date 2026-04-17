"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { PillGroup } from "@/components/ui/form/PillGroup";
import { ItinerarioEditor } from "@/components/ui/form/ItinerarioEditor";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// NuevoAereoPage
// ---------------------------------------------------------------------------

const equipajeOptions = [
  { value: "Articulo personal", label: "Personal" },
  {
    value: "Articulo personal + Equipaje de mano",
    label: "+ Mano",
  },
  {
    value: "Equipaje de mano + Equipaje en bodega",
    label: "+ Bodega",
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
  const [itinerario, setItinerario] = useState("");
  const [itinerarioImagenes, setItinerarioImagenes] = useState<string[]>([]);

  // -- Create handler --
  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ruta.trim()) {
      toast("warning", "Ruta requerida", "Ingresa una ruta para el vuelo.");
      return;
    }

    createAereo({
      brandId: activeBrandId,
      ruta: ruta.trim(),
      destino: destino.trim(),
      aerolinea: aerolinea.trim(),
      equipaje,
      itinerario: itinerario.trim(),
      itinerarioImagenes,
    } as any);

    toast("success", "Aereo creado", `"${ruta.trim()}" fue creado correctamente.`);
    router.push("/aereos");
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
            title="Detalles del vuelo"
            description="Equipaje incluido con la tarifa aerea."
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Equipaje</FieldLabel>
                <PillGroup
                  value={equipaje}
                  onValueChange={setEquipaje}
                  options={equipajeOptions}
                  aria-label="Equipaje"
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection
            title="Itinerario"
            description="Detalle opcional con horarios, escalas y observaciones. Podes pegar texto o arrastrar imagenes."
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Itinerario (opcional)</FieldLabel>
                <ItinerarioEditor
                  text={itinerario}
                  onTextChange={setItinerario}
                  images={itinerarioImagenes}
                  onImagesChange={setItinerarioImagenes}
                  folder="itinerarios/aereos/new"
                  rows={4}
                />
              </Field>
            </FieldGroup>
          </FormSection>
        </FormSections>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/aereos")}
          >
            Cancelar
          </Button>
          <Button type="submit">Crear Aereo</Button>
        </div>
      </form>
    </>
  );
}
