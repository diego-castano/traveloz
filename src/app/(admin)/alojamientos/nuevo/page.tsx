"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { glassMaterials } from "@/components/lib/glass";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { usePaises, useProveedores, useCatalogLoading } from "@/components/providers/CatalogProvider";
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
  const { createAlojamiento } = useServiceActions();
  const paises = usePaises();
  const proveedores = useProveedores();
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

  // Cascading ciudades based on selected paisId
  const ciudadOptions = paises
    .find((p) => p.id === paisId)
    ?.ciudades.map((c) => ({ value: c.id, label: c.nombre })) ?? [];

  // Reset ciudad when pais changes
  useEffect(() => {
    setCiudadId("");
  }, [paisId]);

  // Save handler
  function handleSave() {
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
    createAlojamiento({
      brandId: activeBrandId,
      nombre: nombre.trim(),
      ciudadId,
      paisId,
      categoria: Number(categoria),
      sitioWeb: sitioWeb.trim() || null,
    });
    toast("success", "Alojamiento creado", `"${nombre}" fue creado correctamente`);
    router.push("/alojamientos");
  }

  if (!canEdit) return null;

  if (catalogLoading) return <PageSkeleton variant="detail" />;

  return (
    <>
      <PageHeader
        title="Nuevo Alojamiento"
        subtitle="Agregar hotel o alojamiento"
      />

      <div
        className="rounded-glass-lg p-6 max-w-2xl"
        style={glassMaterials.frosted}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Nombre del Hotel"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Hotel Intercontinental"
            />
          </div>

          {/* Pais */}
          <Select
            label="Pais"
            value={paisId}
            onValueChange={setPaisId}
            placeholder="Seleccionar pais..."
            options={paises.map((p) => ({ value: p.id, label: p.nombre }))}
          />

          {/* Ciudad (cascading) */}
          <Select
            label="Ciudad"
            value={ciudadId}
            onValueChange={setCiudadId}
            placeholder={paisId ? "Seleccionar ciudad..." : "Primero seleccione un pais"}
            options={ciudadOptions}
            disabled={!paisId || ciudadOptions.length === 0}
          />

          {/* Categoria */}
          <Select
            label="Categoria (estrellas)"
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

          {/* Sitio Web */}
          <Input
            label="Sitio Web (opcional)"
            value={sitioWeb}
            onChange={(e) => setSitioWeb(e.target.value)}
            placeholder="https://..."
            type="url"
          />

          {/* Action buttons */}
          <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => router.push("/alojamientos")}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Crear Alojamiento
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
