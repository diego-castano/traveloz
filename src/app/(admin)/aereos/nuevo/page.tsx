"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// NuevoAereoPage
// ---------------------------------------------------------------------------

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
  const [equipaje, setEquipaje] = useState("");
  const [itinerario, setItinerario] = useState("");

  // -- Create handler --
  const handleCreate = () => {
    if (!ruta.trim()) {
      toast("warning", "Ruta requerida", "Ingresa una ruta para el vuelo.");
      return;
    }

    createAereo({
      brandId: activeBrandId,
      ruta: ruta.trim(),
      destino: destino.trim(),
      aerolinea: aerolinea.trim(),
      equipaje: equipaje.trim(),
      itinerario: itinerario.trim(),
    });

    toast("success", "Aereo creado", `"${ruta.trim()}" fue creado correctamente.`);
    router.push("/aereos");
  };

  // Don't render form if user cannot edit (redirect is in progress)
  if (!canEdit) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
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

      <Card className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {/* Row 1: Ruta -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Ruta"
              value={ruta}
              onChange={(e) => setRuta(e.target.value)}
              placeholder="EZE - MAD"
            />
          </div>

          {/* Row 2: Destino -- full width */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Destino"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Madrid"
            />
          </div>

          {/* Row 3: Aerolinea + Equipaje */}
          <Input
            label="Aerolinea"
            value={aerolinea}
            onChange={(e) => setAerolinea(e.target.value)}
            placeholder="Iberia"
          />
          <Input
            label="Equipaje"
            value={equipaje}
            onChange={(e) => setEquipaje(e.target.value)}
            placeholder="23kg bodega"
          />

          {/* Itinerario -- full width textarea */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Itinerario (opcional)
            </label>
            <textarea
              value={itinerario}
              onChange={(e) => setItinerario(e.target.value)}
              placeholder="Detalle de vuelos, horarios y escalas..."
              rows={3}
              className="w-full rounded-[8px] border border-neutral-150/50 bg-white/70 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm resize-none"
            />
          </div>

          {/* Create button */}
          <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
            <Button onClick={handleCreate}>Crear Aereo</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
