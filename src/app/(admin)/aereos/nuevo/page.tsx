"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plane } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// NuevoAereoPage
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
  const [escalas, setEscalas] = useState(0);
  const [codigoVueloIda, setCodigoVueloIda] = useState("");
  const [codigoVueloVuelta, setCodigoVueloVuelta] = useState("");
  const [duracionIda, setDuracionIda] = useState("");
  const [duracionVuelta, setDuracionVuelta] = useState("");

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
      escalas,
      codigoVueloIda: codigoVueloIda.trim(),
      codigoVueloVuelta: codigoVueloVuelta.trim(),
      duracionIda: duracionIda.trim(),
      duracionVuelta: duracionVuelta.trim(),
    });

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
            description="Codigos, duracion y escalas del itinerario."
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
                  />
                </Field>
                <Field>
                  <FieldLabel>Duracion Ida</FieldLabel>
                  <Input
                    value={duracionIda}
                    onChange={(e) => setDuracionIda(e.target.value)}
                    placeholder="3h 30m"
                  />
                </Field>
                <Field>
                  <FieldLabel>Codigo Vuelta</FieldLabel>
                  <Input
                    value={codigoVueloVuelta}
                    onChange={(e) => setCodigoVueloVuelta(e.target.value)}
                    placeholder="AA 1235"
                  />
                </Field>
                <Field>
                  <FieldLabel>Duracion Vuelta</FieldLabel>
                  <Input
                    value={duracionVuelta}
                    onChange={(e) => setDuracionVuelta(e.target.value)}
                    placeholder="3h 30m"
                  />
                </Field>
                <Field>
                  <FieldLabel>Escalas</FieldLabel>
                  <Input
                    type="number"
                    value={String(escalas)}
                    onChange={(e) => setEscalas(Number(e.target.value))}
                    placeholder="0"
                  />
                </Field>
                <Field>
                  <FieldLabel>Equipaje</FieldLabel>
                  <Select
                    value={equipaje}
                    onValueChange={setEquipaje}
                    options={equipajeOptions}
                  />
                </Field>
              </FieldGroup>
            </div>
          </FormSection>

          <FormSection
            title="Itinerario"
            description="Detalle opcional con horarios, escalas y observaciones."
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Itinerario (opcional)</FieldLabel>
                <textarea
                  value={itinerario}
                  onChange={(e) => setItinerario(e.target.value)}
                  placeholder="Detalle de vuelos, horarios y escalas..."
                  rows={3}
                  className="w-full resize-none rounded-[8px] border border-hairline bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#3BBFAD] focus:outline-none"
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
