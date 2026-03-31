"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePackageActions } from "@/components/providers/PackageProvider";
import { useTemporadas, useTiposPaquete } from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// Textarea glass styling (consistent with Input glass pattern)
// ---------------------------------------------------------------------------

const textareaClassName =
  "w-full rounded-clay border border-neutral-150/50 bg-white/70 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NuevoPaquetePage() {
  const router = useRouter();
  const { createPaquete } = usePackageActions();
  const temporadas = useTemporadas();
  const tiposPaquete = useTiposPaquete();
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
  const handleCreate = () => {
    if (!titulo.trim()) {
      toast("warning", "Titulo requerido", "Ingresa un nombre para el paquete.");
      return;
    }

    const now = new Date().toISOString();
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const newPaquete = createPaquete({
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
      markup: 30,
      precioVenta: 0,
      moneda: "USD",
      validezDesde: now,
      validezHasta: oneYearLater,
      ordenServicios: [],
    });

    toast("success", "Paquete creado", `"${newPaquete.titulo}" fue creado en estado Borrador.`);
    router.push(`/paquetes/${newPaquete.id}?tab=datos`);
  };

  // Don't render form if user cannot edit (redirect is in progress)
  if (!canEdit) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
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

      <Card className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {/* Row 1: Titulo -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nombre del paquete"
            />
          </div>

          {/* Row 2: Noches + Salidas */}
          <Input
            label="Noches"
            type="number"
            value={noches}
            onChange={(e) => setNoches(Number(e.target.value))}
            placeholder="7"
          />
          <Input
            label="Salidas"
            value={salidas}
            onChange={(e) => setSalidas(e.target.value)}
            placeholder="Consultar"
          />

          {/* Row 3: Temporada + Tipo de Paquete */}
          <Select
            label="Temporada"
            value={temporadaId}
            onValueChange={setTemporadaId}
            options={temporadas.map((t) => ({ value: t.id, label: t.nombre }))}
            placeholder="Seleccionar temporada..."
          />
          <Select
            label="Tipo de Paquete"
            value={tipoPaqueteId}
            onValueChange={setTipoPaqueteId}
            options={tiposPaquete.map((t) => ({ value: t.id, label: t.nombre }))}
            placeholder="Seleccionar tipo..."
          />

          {/* Row 4: Descripcion -- full width textarea */}
          <div className="col-span-1 md:col-span-2 flex flex-col">
            <label
              htmlFor="descripcion-nuevo"
              className="mb-1.5 text-[12.5px] font-medium"
              style={{ color: "#2D2F4D" }}
            >
              Descripcion
            </label>
            <textarea
              id="descripcion-nuevo"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripcion detallada del paquete..."
              rows={3}
              className={textareaClassName}
              style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>

          {/* Row 5: Texto Visual -- full width textarea */}
          <div className="col-span-1 md:col-span-2 flex flex-col">
            <label
              htmlFor="texto-visual-nuevo"
              className="mb-1.5 text-[12.5px] font-medium"
              style={{ color: "#2D2F4D" }}
            >
              Texto Visual
            </label>
            <textarea
              id="texto-visual-nuevo"
              value={textoVisual}
              onChange={(e) => setTextoVisual(e.target.value)}
              placeholder="Texto destacado para la ficha visual..."
              rows={2}
              className={textareaClassName}
              style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            />
          </div>

          {/* Create button */}
          <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
            <Button onClick={handleCreate}>Crear Paquete</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
