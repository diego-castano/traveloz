"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { usePackageActions } from "@/components/providers/PackageProvider";
import {
  useTemporadas,
  useTiposPaquete,
  useCatalogLoading,
} from "@/components/providers/CatalogProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// NuevoPaquetePage
// ---------------------------------------------------------------------------

export default function NuevoPaquetePage() {
  const router = useRouter();
  const { createPaquete } = usePackageActions();
  const temporadas = useTemporadas();
  const tiposPaquete = useTiposPaquete();
  const catalogLoading = useCatalogLoading();
  const { activeBrandId } = useBrand();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // -- VENDEDOR guard: redirect if cannot edit --
  useEffect(() => {
    if (!canEdit) {
      router.push("/paquetes");
    }
  }, [canEdit, router]);

  // -- Form state with default values --
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [textoVisual, setTextoVisual] = useState("");
  const [noches, setNoches] = useState(7);
  const [salidas, setSalidas] = useState("Consultar");
  const [temporadaId, setTemporadaId] = useState(temporadas[0]?.id ?? "");
  const [tipoPaqueteId, setTipoPaqueteId] = useState(tiposPaquete[0]?.id ?? "");

  // -- Create handler --
  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!titulo.trim()) {
      toast("warning", "Titulo requerido", "Ingresa un nombre para el paquete.");
      return;
    }

    const now = new Date().toISOString();
    const oneYearLater = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const newPaquete = await createPaquete({
      brandId: activeBrandId,
      titulo: titulo.trim(),
      destino: "",
      descripcion,
      textoVisual: textoVisual || null,
      noches,
      salidas,
      temporadaId,
      tipoPaqueteId,
      estado: "BORRADOR",
      destacado: false,
      netoCalculado: 0,
      markup: 0.8,
      precioVenta: 0,
      moneda: "USD",
      validezDesde: now,
      validezHasta: oneYearLater,
      ordenServicios: [],
    });

    toast(
      "success",
      "Paquete creado",
      `"${newPaquete.titulo}" fue creado en estado Borrador.`,
    );
    router.push(`/paquetes/${newPaquete.id}?tab=datos`);
  };

  // Don't render form if user cannot edit (redirect is in progress)
  if (!canEdit) {
    return null;
  }

  if (catalogLoading) return <PageSkeleton variant="detail" />;

  return (
    <>
      <DataTablePageHeader
        title="Nuevo Paquete"
        subtitle="Crear un nuevo paquete de viaje"
        action={
          <Button
            variant="ghost"
            onClick={() => router.push("/paquetes")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a Paquetes
          </Button>
        }
      />

      <form onSubmit={handleCreate}>
        <FormSections>
          <FormSection
            title="Identificacion"
            description="Nombre del paquete y clasificacion inicial."
          >
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Titulo</FieldLabel>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Nombre del paquete"
                  autoFocus
                />
              </Field>

              <Field>
                <FieldLabel>Noches</FieldLabel>
                <Input
                  type="number"
                  value={String(noches)}
                  onChange={(e) => setNoches(Number(e.target.value))}
                  placeholder="7"
                />
              </Field>
              <Field>
                <FieldLabel>Salidas</FieldLabel>
                <Input
                  value={salidas}
                  onChange={(e) => setSalidas(e.target.value)}
                  placeholder="Consultar"
                />
              </Field>

              <Field>
                <FieldLabel>Temporada</FieldLabel>
                <Select
                  value={temporadaId}
                  onValueChange={setTemporadaId}
                  options={temporadas.map((t) => ({
                    value: t.id,
                    label: t.nombre,
                  }))}
                  placeholder="Seleccionar temporada..."
                />
              </Field>
              <Field>
                <FieldLabel>Tipo de paquete</FieldLabel>
                <Select
                  value={tipoPaqueteId}
                  onValueChange={setTipoPaqueteId}
                  options={tiposPaquete.map((t) => ({
                    value: t.id,
                    label: t.nombre,
                  }))}
                  placeholder="Seleccionar tipo..."
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection
            title="Descripcion"
            description="Texto narrativo y texto visual para la ficha."
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Descripcion</FieldLabel>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripcion detallada del paquete..."
                  rows={3}
                  className="w-full resize-none rounded-[8px] border border-hairline bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#3BBFAD] focus:outline-none"
                />
              </Field>
              <Field>
                <FieldLabel>Texto visual</FieldLabel>
                <textarea
                  value={textoVisual}
                  onChange={(e) => setTextoVisual(e.target.value)}
                  placeholder="Texto destacado para la ficha visual..."
                  rows={2}
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
            onClick={() => router.push("/paquetes")}
          >
            Cancelar
          </Button>
          <Button type="submit">Crear Paquete</Button>
        </div>
      </form>
    </>
  );
}
