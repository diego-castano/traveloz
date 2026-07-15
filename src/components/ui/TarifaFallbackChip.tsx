import { AlertTriangle } from "lucide-react";
import { cn } from "@/components/lib/cn";

// ---------------------------------------------------------------------------
// TarifaFallbackChip
//
// Aviso ámbar discreto para las superficies de admin que muestran el costo de
// un servicio asignado. Se muestra cuando el precio exhibido NO salió de un
// período de tarifas que cubra la fecha ancla del paquete, sino del fallback
// silencioso a "la primera tarifa cargada" (ver resolvePrecioEnPeriodo).
//
// No cambia el pricing: sólo señala que la tarifa mostrada está fuera de
// vigencia para que el operador revise los períodos. Mismo idioma ámbar que los
// avisos existentes del admin (amber-50 / amber-200 / amber-700).
// ---------------------------------------------------------------------------

const FALLBACK_TOOLTIP =
  "Ningún período de tarifas cubre la fecha del paquete; se usa la primera tarifa cargada. Revisá los períodos.";

export function TarifaFallbackChip({ className }: { className?: string }) {
  return (
    <span
      title={FALLBACK_TOOLTIP}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 whitespace-nowrap",
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      Tarifa fuera de vigencia
    </span>
  );
}
