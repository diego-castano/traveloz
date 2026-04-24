"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/form/Field";
import { SelectCascade } from "@/components/ui/form/SelectCascade";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import {
  usePaises,
  useRegimenes,
  useCatalogLoading,
} from "@/components/providers/CatalogProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useToast } from "@/components/ui/Toast";
import { formatStoredDate } from "@/lib/date";

// ---------------------------------------------------------------------------
// NuevoAlojamientoPage
// ---------------------------------------------------------------------------

export default function NuevoAlojamientoPage() {
  const router = useRouter();
  const { canEdit } = useAuth();
  const { activeBrandId } = useBrand();
  const { createAlojamiento, createPrecioAlojamiento } = useServiceActions();
  const paises = usePaises();
  const regimenes = useRegimenes();
  const catalogLoading = useCatalogLoading();
  const { toast } = useToast();

  // VENDEDOR guard — redirect if no edit permission
  useEffect(() => {
    if (!canEdit) {
      router.replace("/alojamientos");
    }
  }, [canEdit, router]);

  // Form state
  const [nombre, setNombre] = useState("");
  const [paisId, setPaisId] = useState("");
  const [ciudadId, setCiudadId] = useState("");
  const [categoria, setCategoria] = useState("3");
  const [sitioWeb, setSitioWeb] = useState("");
  const [precioPeriodoDesdeDate, setPrecioPeriodoDesdeDate] = useState<
    Date | undefined
  >(undefined);
  const [precioPeriodoHastaDate, setPrecioPeriodoHastaDate] = useState<
    Date | undefined
  >(undefined);
  const [precioPorNoche, setPrecioPorNoche] = useState("");
  const [regimenId, setRegimenId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const regimenOptions = regimenes.map((r) => ({ value: r.id, label: r.nombre }));

  const hasInitialTarifaData =
    Boolean(precioPeriodoDesdeDate) ||
    Boolean(precioPeriodoHastaDate) ||
    Boolean(precioPorNoche.trim()) ||
    Boolean(regimenId);

  // Save handler
  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (isSaving) return;
    if (!nombre.trim()) {
      toast("error", "Nombre requerido", "Ingrese el nombre del alojamiento");
      return;
    }
    if (!paisId) {
      toast("error", "Pais requerido", "Seleccione un pais");
      return;
    }
    if (!ciudadId) {
      toast("error", "Ciudad requerida", "Seleccione una ciudad");
      return;
    }

    const tarifaIngresada = hasInitialTarifaData;
    const precioValido = Number(precioPorNoche);
    const tarifaCompleta =
      Boolean(precioPeriodoDesdeDate) &&
      Boolean(precioPeriodoHastaDate) &&
      Number.isFinite(precioValido) &&
      precioValido > 0 &&
      Boolean(regimenId);

    if (tarifaIngresada && !tarifaCompleta) {
      toast(
        "warning",
        "Tarifa incompleta",
        "Si cargás una tarifa inicial, completá desde, hasta, precio y régimen.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const alojamiento = await createAlojamiento({
        brandId: activeBrandId,
        nombre: nombre.trim(),
        ciudadId,
        paisId,
        categoria: Number(categoria),
        sitioWeb: sitioWeb.trim() || null,
      });

      if (tarifaCompleta) {
        await createPrecioAlojamiento({
          alojamientoId: alojamiento.id,
          periodoDesde: formatStoredDate(precioPeriodoDesdeDate) ?? "",
          periodoHasta: formatStoredDate(precioPeriodoHastaDate) ?? "",
          precioPorNoche: precioValido,
          regimenId,
        });
      }

      toast(
        "success",
        "Alojamiento creado",
        `"${nombre}" fue creado correctamente`,
      );
      router.push("/alojamientos");
    } catch (error) {
      console.error("Error creating alojamiento:", error);
      toast(
        "error",
        "No se pudo crear el alojamiento",
        "Revisá los datos e intentá nuevamente.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!canEdit) return null;

  if (catalogLoading) return <PageSkeleton variant="detail" />;

  return (
    <>
      <DataTablePageHeader
        title="Nuevo Alojamiento"
        subtitle="Agregar hotel o alojamiento"
        action={
          <Button
            variant="ghost"
            onClick={() => router.push("/alojamientos")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver
          </Button>
        }
      />

      <form onSubmit={handleSave}>
        <FormSections>
          <FormSection
            title="Datos del hotel"
            description="Nombre, categoria y ubicacion principal del alojamiento."
          >
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Nombre del hotel</FieldLabel>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Hotel Intercontinental"
                  autoFocus
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
                />
              </Field>

              <Field>
                <FieldLabel>Categoria</FieldLabel>
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
                />
              </Field>

              <Field>
                <FieldLabel>Sitio web</FieldLabel>
                <Input
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection
            title="Tarifa inicial"
            description="Opcional, pero muy útil si ya conocés el precio por periodo al crear el alojamiento."
          >
            <FieldGroup columns={3}>
              <Field>
                <DatePicker
                  label="Periodo desde"
                  value={precioPeriodoDesdeDate}
                  onChange={setPrecioPeriodoDesdeDate}
                  placeholder="Seleccionar fecha..."
                />
              </Field>
              <Field>
                <DatePicker
                  label="Periodo hasta"
                  value={precioPeriodoHastaDate}
                  onChange={setPrecioPeriodoHastaDate}
                  placeholder="Seleccionar fecha..."
                />
              </Field>
              <Field>
                <FieldLabel>Precio por noche USD</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={precioPorNoche}
                  onChange={(e) => setPrecioPorNoche(e.target.value)}
                  placeholder="0"
                />
                <FieldDescription>
                  Si completás un período, este precio se crea junto con el
                  alojamiento.
                </FieldDescription>
              </Field>

              <Field span={2}>
                <FieldLabel>Régimen</FieldLabel>
                <Select
                  value={regimenId}
                  onValueChange={setRegimenId}
                  options={regimenOptions}
                  placeholder="Seleccionar régimen..."
                />
              </Field>
            </FieldGroup>
          </FormSection>
        </FormSections>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/alojamientos")}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Creando..." : "Crear Alojamiento"}
          </Button>
        </div>
      </form>
    </>
  );
}
