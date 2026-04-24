"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Toggle } from "@/components/ui/Toggle";
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
import { formatStoredDate } from "@/lib/date";
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
  const [noches, setNoches] = useState("7");
  const [salidas, setSalidas] = useState("Consultar");
  const [temporadaId, setTemporadaId] = useState(temporadas[0]?.id ?? "");
  const [tipoPaqueteId, setTipoPaqueteId] = useState(tiposPaquete[0]?.id ?? "");
  const [validezDesdeDate, setValidezDesdeDate] = useState<Date | undefined>(
    new Date(),
  );
  const [validezHastaDate, setValidezHastaDate] = useState<Date | undefined>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  );
  const [activarPorDefecto, setActivarPorDefecto] = useState(false);
  const [destacado, setDestacado] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!temporadaId && temporadas[0]?.id) {
      setTemporadaId(temporadas[0].id);
    }
  }, [temporadas, temporadaId]);

  useEffect(() => {
    if (!tipoPaqueteId && tiposPaquete[0]?.id) {
      setTipoPaqueteId(tiposPaquete[0].id);
    }
  }, [tiposPaquete, tipoPaqueteId]);

  // -- Create handler --
  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isCreating) return;
    if (!titulo.trim()) {
      toast("warning", "Titulo requerido", "Ingresa un nombre para el paquete.");
      return;
    }

    setIsCreating(true);
    try {
      const now = formatStoredDate(new Date());
      const oneYearLater = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      );
      const oneYearLaterFormatted = formatStoredDate(oneYearLater);

      const newPaquete = await createPaquete({
        brandId: activeBrandId,
        titulo: titulo.trim(),
        destino: "",
        descripcion: descripcion.trim(),
        textoVisual: textoVisual.trim() || null,
        noches: Math.max(0, Number(noches) || 0),
        salidas: salidas.trim() || "Consultar",
        temporadaId: temporadaId || undefined,
        tipoPaqueteId: tipoPaqueteId || undefined,
        estado: activarPorDefecto ? "ACTIVO" : "BORRADOR",
        destacado,
        netoCalculado: 0,
        markup: 0.8,
        precioVenta: 0,
        moneda: "USD",
        validezDesde: formatStoredDate(validezDesdeDate) ?? now ?? "",
        validezHasta: formatStoredDate(validezHastaDate) ?? oneYearLaterFormatted ?? "",
        ordenServicios: [],
      });

      toast(
        "success",
        "Paquete creado",
        `"${newPaquete.titulo}" fue creado en estado Borrador.`,
      );
      router.push(`/paquetes/${newPaquete.id}?tab=datos`);
    } catch (error) {
      console.error("Error creating paquete:", error);
      toast(
        "error",
        "No se pudo crear el paquete",
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
            title="Duracion y vigencia"
            description="Noches iniciales, periodo comercial y estados de publicación."
          >
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel>Noches iniciales</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={noches}
                  onChange={(e) => setNoches(e.target.value)}
                  placeholder="7"
                />
              </Field>

              <Field>
                <DatePicker
                  label="Válido desde"
                  value={validezDesdeDate}
                  onChange={setValidezDesdeDate}
                  placeholder="Seleccionar fecha..."
                />
              </Field>

              <Field>
                <DatePicker
                  label="Válido hasta"
                  value={validezHastaDate}
                  onChange={setValidezHastaDate}
                  placeholder="Seleccionar fecha..."
                />
              </Field>

              <Field>
                <FieldLabel>Activar por defecto</FieldLabel>
                <div className="flex items-center justify-between gap-3 rounded-[8px] border border-hairline bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-neutral-800">
                      Crear el paquete como activo
                    </p>
                    <p className="text-[11.5px] text-neutral-400">
                      Si está encendido, el paquete queda publicado al guardarlo.
                    </p>
                  </div>
                  <Toggle
                    checked={activarPorDefecto}
                    onCheckedChange={setActivarPorDefecto}
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel>Destacado</FieldLabel>
                <div className="flex items-center justify-between gap-3 rounded-[8px] border border-hairline bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-neutral-800">
                      Mostrar en frontend como destacado
                    </p>
                    <p className="text-[11.5px] text-neutral-400">
                      Se usará para resaltar el paquete en el sitio público.
                    </p>
                  </div>
                  <Toggle checked={destacado} onCheckedChange={setDestacado} />
                </div>
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
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Creando..." : "Crear Paquete"}
          </Button>
        </div>
      </form>
    </>
  );
}
