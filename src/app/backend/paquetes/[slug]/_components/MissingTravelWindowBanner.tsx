"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * MissingTravelWindowBanner — shown above the Servicios / Alojamientos lists
 * when the paquete has no viajeDesde / viajeHasta yet. Without those dates the
 * price resolver can't filter or evaluate services against the trip window,
 * so the operator would be selecting blind. The banner sends them to the
 * Datos tab where the period picker lives.
 */
export function MissingTravelWindowBanner({
  paqueteSlug,
}: {
  paqueteSlug: string;
}) {
  const router = useRouter();
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-[12px] border px-4 py-3"
      style={{
        background: "rgba(232,168,56,0.06)",
        borderColor: "rgba(232,168,56,0.30)",
      }}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-amber-800">
          Falta el período del viaje
        </p>
        <p className="mt-0.5 text-[12px] text-amber-700">
          Configurá las fechas en las que el cliente viaja antes de elegir
          servicios. Sin ese dato el sistema no puede filtrar qué tarifas
          aplican y vas a ver servicios con costo cero.
        </p>
      </div>
      <Button
        variant="ghost"
        size="xs"
        rightIcon={<ArrowRight className="h-3 w-3" />}
        onClick={() =>
          router.push(`/backend/paquetes/${paqueteSlug}?tab=datos`)
        }
      >
        Ir a Datos
      </Button>
    </div>
  );
}
