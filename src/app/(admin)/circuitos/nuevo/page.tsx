"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { useProveedores, useCatalogLoading } from "@/components/providers/CatalogProvider";
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
    () => allProveedores.filter((p) => p.servicio === "CIRCUITOS" && !p.deletedAt),
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

  // -- Create handler --
  const handleCreate = async () => {
    if (!nombre.trim()) {
      toast("warning", "Nombre requerido", "Ingresa un nombre para el circuito.");
      return;
    }

    const newCircuito = await createCircuito({
      brandId: activeBrandId,
      nombre: nombre.trim(),
      noches: Number(noches),
      proveedorId: proveedorId,
    });

    toast("success", "Circuito creado", `"${nombre.trim()}" fue creado correctamente.`);
    router.push(`/circuitos/${newCircuito.id}`);
  };

  // Don't render form if user cannot edit (redirect is in progress)
  if (!canEdit) {
    return null;
  }

  if (catalogLoading) return <PageSkeleton variant="detail" />;

  return (
    <div className="space-y-6">
      <PageHeader
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

      <Card className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {/* Nombre -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Nombre del circuito"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Europa Clasica 10 dias"
            />
          </div>

          {/* Noches */}
          <Input
            label="Noches"
            type="number"
            value={noches}
            onChange={(e) => setNoches(e.target.value)}
            placeholder="7"
          />

          {/* Proveedor */}
          <Select
            label="Proveedor"
            value={proveedorId}
            onValueChange={setProveedorId}
            placeholder="Seleccionar proveedor..."
            options={proveedoresCircuitos.map((p) => ({ value: p.id, label: p.nombre }))}
          />

          {/* Create button */}
          <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
            <Button onClick={handleCreate}>Crear Circuito</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
