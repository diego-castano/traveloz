"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
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
  useCatalogActions,
} from "@/components/providers/CatalogProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useToast } from "@/components/ui/Toast";

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
  const { createCiudad } = useCatalogActions();
  const { toast } = useToast();

  // Crea una ciudad "in situ" bajo el país elegido y la deja seleccionada, sin
  // salir del alta del hotel. Devuelve el id para autoseleccionarla.
  async function handleCreateCiudad(nombre: string): Promise<string | void> {
    if (!paisId) return;
    try {
      const ciudad = await createCiudad({ paisId, nombre: nombre.trim() });
      toast("success", "Ciudad agregada", `"${nombre.trim()}" quedó disponible.`);
      return ciudad.id;
    } catch (err) {
      toast(
        "error",
        "No se pudo agregar la ciudad",
        err instanceof Error ? err.message : "Intentá nuevamente",
      );
    }
  }

  // VENDEDOR guard — redirect if no edit permission
  useEffect(() => {
    if (!canEdit) {
      router.replace("/backend/alojamientos");
    }
  }, [canEdit, router]);

  // Form state
  const [nombre, setNombre] = useState("");
  const [paisId, setPaisId] = useState("");
  const [ciudadId, setCiudadId] = useState("");
  const [categoria, setCategoria] = useState("3");
  const [sitioWeb, setSitioWeb] = useState("");
  const [precioPeriodoDesde, setPrecioPeriodoDesde] = useState<string>("");
  const [precioPeriodoHasta, setPrecioPeriodoHasta] = useState<string>("");
  const [precioPorNoche, setPrecioPorNoche] = useState("");
  const [regimenId, setRegimenId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const regimenOptions = regimenes.map((r) => ({ value: r.id, label: r.nombre }));

  const hasInitialTarifaData =
    Boolean(precioPeriodoDesde) ||
    Boolean(precioPeriodoHasta) ||
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
      toast("error", "País requerido", "Seleccioná un país");
      return;
    }
    if (!ciudadId) {
      toast("error", "Ciudad requerida", "Seleccione una ciudad");
      return;
    }

    const tarifaIngresada = hasInitialTarifaData;
    const precioValido = Number(precioPorNoche);
    const tarifaCompleta =
      Boolean(precioPeriodoDesde) &&
      Boolean(precioPeriodoHasta) &&
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
          periodoDesde: precioPeriodoDesde,
          periodoHasta: precioPeriodoHasta,
          precioPorNoche: precioValido,
          regimenId,
        });
      }

      toast(
        "success",
        "Alojamiento creado",
        `"${nombre}" fue creado correctamente`,
      );
      router.push("/backend/alojamientos");
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
            onClick={() => router.push("/backend/alojamientos")}
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
            description="Nombre, categoría y ubicación principal del alojamiento."
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
                  parentLabel="País"
                  parentValue={paisId}
                  onParentChange={setPaisId}
                  parentOptions={paises.map((p) => ({
                    value: p.id,
                    label: p.nombre,
                  }))}
                  childLabel="Ciudad"
                  childValue={ciudadId}
                  onChildChange={setCiudadId}
                  onChildCreate={handleCreateCiudad}
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
                <FieldLabel>Categoría</FieldLabel>
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
              <Field span={2}>
                <PeriodPicker
                  label="Periodo de la tarifa"
                  valueFrom={precioPeriodoDesde}
                  valueTo={precioPeriodoHasta}
                  onChange={(desde, hasta) => {
                    setPrecioPeriodoDesde(desde);
                    setPrecioPeriodoHasta(hasta);
                  }}
                  placeholder="Seleccionar periodo..."
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
                <SearchableSelect
                  value={regimenId}
                  onValueChange={setRegimenId}
                  options={regimenOptions}
                  placeholder="Seleccionar régimen..."
                  searchPlaceholder="Buscar régimen..."
                />
              </Field>
            </FieldGroup>
          </FormSection>
        </FormSections>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/backend/alojamientos")}
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
