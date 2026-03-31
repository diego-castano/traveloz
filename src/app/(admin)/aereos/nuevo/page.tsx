"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plane } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { glassMaterials } from "@/components/lib/glass";
import { PageHeader } from "@/components/layout/PageHeader";
import { useServiceActions } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// NuevoAereoPage
// ---------------------------------------------------------------------------

const equipajeOptions = [
  { value: 'Articulo personal', label: 'Articulo personal' },
  { value: 'Articulo personal + Equipaje de mano', label: 'Articulo personal + Equipaje de mano' },
  { value: 'Equipaje de mano + Equipaje en bodega', label: 'Equipaje de mano + Equipaje en bodega' },
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
  const [equipaje, setEquipaje] = useState("Equipaje de mano + Equipaje en bodega");
  const [itinerario, setItinerario] = useState("");
  const [escalas, setEscalas] = useState(0);
  const [codigoVueloIda, setCodigoVueloIda] = useState("");
  const [codigoVueloVuelta, setCodigoVueloVuelta] = useState("");
  const [duracionIda, setDuracionIda] = useState("");
  const [duracionVuelta, setDuracionVuelta] = useState("");

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

          {/* Row 3: Aerolinea */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Aerolinea"
              value={aerolinea}
              onChange={(e) => setAerolinea(e.target.value)}
              placeholder="Iberia"
            />
          </div>

          {/* Detalles de Vuelo -- flight ticket visual */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-[13px] font-semibold text-neutral-700 mb-2">Detalles de Vuelo</h3>
            <div className="rounded-[12px] p-4" style={glassMaterials.frostedSubtle}>
              {/* Flight path visualization */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-mono font-bold text-neutral-800">
                    {ruta.split(' - ')[0] || 'ORG'}
                  </div>
                  <div className="text-xs text-neutral-400">Origen</div>
                </div>
                <div className="flex-1 relative flex items-center">
                  <div className="w-full border-t-2 border-dashed border-neutral-200" />
                  {escalas > 0 && Array.from({ length: escalas }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2.5 h-2.5 rounded-full bg-[#3BBFAD] border-2 border-white"
                      style={{
                        left: `${((i + 1) / (escalas + 1)) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        top: '0',
                      }}
                    />
                  ))}
                  <Plane className="absolute right-0 -top-2.5 w-5 h-5 text-[#3BBFAD]" />
                </div>
                <div className="text-center">
                  <div className="text-lg font-mono font-bold text-neutral-800">
                    {ruta.split(' - ')[1] || 'DST'}
                  </div>
                  <div className="text-xs text-neutral-400">Destino</div>
                </div>
              </div>

              {/* Flight details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input
                  label="Codigo Ida"
                  value={codigoVueloIda}
                  onChange={(e) => setCodigoVueloIda(e.target.value)}
                  placeholder="AA 1234"
                />
                <Input
                  label="Duracion Ida"
                  value={duracionIda}
                  onChange={(e) => setDuracionIda(e.target.value)}
                  placeholder="3h 30m"
                />
                <Input
                  label="Codigo Vuelta"
                  value={codigoVueloVuelta}
                  onChange={(e) => setCodigoVueloVuelta(e.target.value)}
                  placeholder="AA 1235"
                />
                <Input
                  label="Duracion Vuelta"
                  value={duracionVuelta}
                  onChange={(e) => setDuracionVuelta(e.target.value)}
                  placeholder="3h 30m"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  label="Escalas"
                  type="number"
                  value={String(escalas)}
                  onChange={(e) => setEscalas(Number(e.target.value))}
                  placeholder="0"
                />
                <Select
                  label="Equipaje"
                  value={equipaje}
                  onValueChange={setEquipaje}
                  options={equipajeOptions}
                />
              </div>
            </div>
          </div>

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
