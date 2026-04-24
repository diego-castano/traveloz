"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { FormSection, FormSections } from "@/components/ui/form/FormSection";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import {
  useProveedores,
  useCatalogLoading,
} from "@/components/providers/CatalogProvider";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// NuevoCircuitoPage
// ---------------------------------------------------------------------------

export default function NuevoCircuitoPage() {
  const router = useRouter();
  const { createCircuito } = useServiceActions();
  const { activeBrandId } = useBrand();
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const allProveedores = useProveedores();
  const catalogLoading = useCatalogLoading();
  const proveedoresCircuitos = useMemo(
    () =>
      allProveedores.filter(
        (p) => p.servicio === "CIRCUITOS" && !p.deletedAt,
      ),
    [allProveedores],
  );

  // -- VENDEDOR guard: redirect if cannot edit --
  useEffect(() => {
    if (!canEdit) {
      router.push("/circuitos");
    }
  }, [canEdit, router]);

  // -- Form state --
  const [nombre, setNombre] = useState("");
  const [noches, setNoches] = useState("7");
  const [proveedorId, setProveedorId] = useState("");
  const [itinerarioDraft, setItinerarioDraft] = useState<
    Array<{ titulo: string; descripcion: string }>
  >([{ titulo: "", descripcion: "" }]);

  const updateDiaDraft = (
    index: number,
    patch: Partial<{ titulo: string; descripcion: string }>,
  ) => {
    setItinerarioDraft((current) =>
      current.map((dia, currentIndex) =>
        currentIndex === index ? { ...dia, ...patch } : dia,
      ),
    );
  };

  const addDiaDraft = () => {
    setItinerarioDraft((current) => [
      ...current,
      { titulo: "", descripcion: "" },
    ]);
  };

  const removeDiaDraft = (index: number) => {
    setItinerarioDraft((current) =>
      current.length === 1
        ? [{ titulo: "", descripcion: "" }]
        : current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  // -- Create handler --
  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nombre.trim()) {
      toast("warning", "Nombre requerido", "Ingresa un nombre para el circuito.");
      return;
    }

    const newCircuito = await createCircuito({
      brandId: activeBrandId,
      nombre: nombre.trim(),
      noches: Number(noches),
      proveedorId: proveedorId,
      itinerarioInicial: itinerarioDraft
        .map((dia, index) => {
          const titulo = dia.titulo.trim();
          const descripcion = dia.descripcion.trim();
          if (!titulo && !descripcion) return null;
          return {
            titulo: titulo || `Día ${index + 1}`,
            descripcion: descripcion || null,
          };
        })
        .filter(
          (
            dia,
          ): dia is { titulo: string; descripcion: string | null } => dia !== null,
        ),
    });

    toast(
      "success",
      "Circuito creado",
      `"${nombre.trim()}" fue creado correctamente.`,
    );
    router.push(`/circuitos/${newCircuito.id}`);
  };

  // Don't render form if user cannot edit (redirect is in progress)
  if (!canEdit) {
    return null;
  }

  if (catalogLoading) return <PageSkeleton variant="detail" />;

  return (
    <>
      <DataTablePageHeader
        title="Nuevo Circuito"
        subtitle="Crear un nuevo circuito o itinerario"
        action={
          <Button
            variant="ghost"
            onClick={() => router.push("/circuitos")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a Circuitos
          </Button>
        }
      />

      <form onSubmit={handleCreate}>
        <FormSections>
          <FormSection
            title="Datos del circuito"
            description="Nombre, duracion en noches y proveedor principal."
          >
            <FieldGroup columns={2}>
              <Field span={2}>
                <FieldLabel required>Nombre del circuito</FieldLabel>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej. Europa Clasica 10 dias"
                  autoFocus
                />
              </Field>

              <Field>
                <FieldLabel>Noches</FieldLabel>
                <Input
                  type="number"
                  value={noches}
                  onChange={(e) => setNoches(e.target.value)}
                  placeholder="7"
                />
              </Field>

              <Field>
                <FieldLabel>Proveedor</FieldLabel>
                <Select
                  value={proveedorId}
                  onValueChange={setProveedorId}
                  placeholder="Seleccionar proveedor..."
                  options={proveedoresCircuitos.map((p) => ({
                    value: p.id,
                    label: p.nombre,
                  }))}
                />
              </Field>
            </FieldGroup>
          </FormSection>

          <FormSection
            title="Itinerario inicial"
            description="Cargá los días ahora para que el circuito ya quede visible con su recorrido desde el principio."
          >
            <div className="space-y-3">
              <div className="grid grid-cols-[64px_1fr_1.4fr_64px] gap-2 px-1 text-[10.5px] font-semibold uppercase tracking-widest text-neutral-400">
                <span>Día</span>
                <span>Título</span>
                <span>Descripción</span>
                <span />
              </div>

              <div className="space-y-2">
                {itinerarioDraft.map((dia, index) => (
                  <div
                    key={index}
                    className="grid items-start gap-2 rounded-[12px] border border-hairline bg-white p-3 md:grid-cols-[64px_1fr_1.4fr_64px]"
                  >
                    <div className="flex h-10 items-center justify-center">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal-100 text-sm font-semibold text-brand-teal-700">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <Input
                        value={dia.titulo}
                        onChange={(e) =>
                          updateDiaDraft(index, { titulo: e.target.value })
                        }
                        placeholder="Ej. Llegada a destino"
                      />
                    </div>
                    <div>
                      <textarea
                        value={dia.descripcion}
                        onChange={(e) =>
                          updateDiaDraft(index, {
                            descripcion: e.target.value,
                          })
                        }
                        placeholder="Descripción breve del día..."
                        rows={2}
                        className="w-full resize-none rounded-[8px] border border-hairline bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#3BBFAD] focus:outline-none"
                      />
                    </div>
                    <div className="flex h-10 items-center justify-end">
                      <Button
                        type="button"
                        variant="ghostDanger"
                        size="xs"
                        onClick={() => removeDiaDraft(index)}
                        aria-label={`Eliminar día ${index + 1}`}
                        disabled={itinerarioDraft.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={addDiaDraft}
              >
                Agregar día
              </Button>
            </div>
          </FormSection>
        </FormSections>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/circuitos")}
          >
            Cancelar
          </Button>
          <Button type="submit">Crear Circuito</Button>
        </div>
      </form>
    </>
  );
}
