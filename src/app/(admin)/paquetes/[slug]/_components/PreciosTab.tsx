"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import {
  usePaqueteServices,
  usePackageActions,
} from "@/components/providers/PackageProvider";
import { useServiceState } from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { calcularNeto, calcularVenta, formatCurrency } from "@/lib/utils";
import type { Paquete } from "@/lib/types";
import { Plane, Hotel, Bus, Shield, Map as MapIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreciosTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Service type breakdown config
// ---------------------------------------------------------------------------

const breakdownConfig = [
  { key: "aereos" as const, label: "Aereos", icon: Plane },
  { key: "alojamientos" as const, label: "Alojamientos", icon: Hotel },
  { key: "traslados" as const, label: "Traslados", icon: Bus },
  { key: "seguros" as const, label: "Seguros", icon: Shield },
  { key: "circuitos" as const, label: "Circuitos", icon: MapIcon },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreciosTab({ paquete }: PreciosTabProps) {
  const services = usePaqueteServices(paquete.id);
  const serviceState = useServiceState();
  const { updatePaquete } = usePackageActions();
  const { canSeePricing, canEdit } = useAuth();
  const { toast } = useToast();

  // -- Local markup state --
  const [localMarkup, setLocalMarkup] = useState(paquete.markup);

  // -------------------------------------------------------------------------
  // Live neto calculation via useMemo
  // Recompute from current service assignments (NOT from paquete.netoCalculado
  // which may be stale).
  // -------------------------------------------------------------------------

  const { liveNeto, breakdown } = useMemo(() => {
    // Resolve assigned aereos with their first matching precio
    const assignedAereos = services.aereos.map((pa) => {
      const aereo = serviceState.aereos.find((a) => a.id === pa.aereoId)!;
      const precioAereo = serviceState.preciosAereo.find(
        (p) => p.aereoId === pa.aereoId,
      );
      return { aereo, precioAereo };
    });

    // Resolve assigned alojamientos with their first matching precio
    const assignedAlojamientos = services.alojamientos.map((pa) => {
      const alojamiento = serviceState.alojamientos.find(
        (a) => a.id === pa.alojamientoId,
      )!;
      const precioAlojamiento = serviceState.preciosAlojamiento.find(
        (p) => p.alojamientoId === pa.alojamientoId,
      );
      return {
        alojamiento,
        precioAlojamiento,
        nochesEnEste: pa.nochesEnEste ?? undefined,
      };
    });

    // Resolve assigned traslados
    const assignedTraslados = services.traslados.map(
      (pt) => serviceState.traslados.find((t) => t.id === pt.trasladoId)!,
    );

    // Resolve assigned seguros
    const assignedSeguros = services.seguros.map((ps) => {
      const seguro = serviceState.seguros.find((s) => s.id === ps.seguroId)!;
      return { seguro, diasCobertura: ps.diasCobertura ?? undefined };
    });

    // Resolve assigned circuitos with their first matching precio
    const assignedCircuitos = services.circuitos.map((pc) => {
      const circuito = serviceState.circuitos.find(
        (c) => c.id === pc.circuitoId,
      )!;
      const precioCircuito = serviceState.preciosCircuito.find(
        (p) => p.circuitoId === pc.circuitoId,
      );
      return { circuito, precioCircuito };
    });

    // Calculate neto
    const neto = calcularNeto(
      paquete,
      assignedAereos,
      assignedAlojamientos,
      assignedTraslados,
      assignedSeguros,
      assignedCircuitos,
    );

    // Calculate per-type breakdown totals
    const aereosTotal = assignedAereos.reduce(
      (sum, a) => sum + (a.precioAereo?.precioAdulto ?? 0),
      0,
    );

    const alojamientosTotal = assignedAlojamientos.reduce((sum, a) => {
      const noches = a.nochesEnEste ?? paquete.noches;
      return sum + (a.precioAlojamiento?.precioPorNoche ?? 0) * noches;
    }, 0);

    const trasladosTotal = assignedTraslados.reduce(
      (sum, t) => sum + t.precio,
      0,
    );

    const segurosTotal = assignedSeguros.reduce((sum, s) => {
      const dias = s.diasCobertura ?? paquete.noches;
      return sum + s.seguro.costoPorDia * dias;
    }, 0);

    const circuitosTotal = assignedCircuitos.reduce(
      (sum, c) => sum + (c.precioCircuito?.precio ?? 0),
      0,
    );

    return {
      liveNeto: neto,
      breakdown: {
        aereos: aereosTotal,
        alojamientos: alojamientosTotal,
        traslados: trasladosTotal,
        seguros: segurosTotal,
        circuitos: circuitosTotal,
      },
    };
  }, [services, serviceState, paquete]);

  // -- Computed venta --
  const computedVenta = calcularVenta(liveNeto, localMarkup);

  // -- Save handler --
  const handleSave = () => {
    updatePaquete({
      ...paquete,
      markup: localMarkup,
      netoCalculado: liveNeto,
      precioVenta: computedVenta,
    });
    toast("success", "Precios actualizados");
  };

  return (
    <Card className="p-6">
      {/* Section title */}
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">
        Resumen de Precios
      </h3>

      {/* PriceDisplay */}
      <PriceDisplay
        neto={canSeePricing.neto ? liveNeto : 0}
        markup={canSeePricing.markup ? localMarkup : 0}
        venta={computedVenta}
        onMarkupChange={canSeePricing.markup ? setLocalMarkup : undefined}
        editable={canSeePricing.markup && canEdit}
        size="lg"
      />

      {/* Cost breakdown per service type */}
      {canSeePricing.neto && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">
            Desglose de Costos
          </h4>
          <ul className="space-y-2">
            {breakdownConfig.map(({ key, label, icon: Icon }) => {
              const value = breakdown[key];
              if (value === 0) return null;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between py-1.5 px-3 rounded-clay bg-white/40"
                >
                  <span className="flex items-center gap-2 text-sm text-neutral-600">
                    <Icon className="h-4 w-4 text-neutral-400" />
                    {label}
                  </span>
                  <span className="text-sm font-mono font-semibold text-neutral-700">
                    {formatCurrency(value)}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Total neto row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200/50 px-3">
            <span className="text-sm font-medium text-neutral-700">
              Total Neto
            </span>
            <span className="text-base font-mono font-bold text-neutral-800">
              {formatCurrency(liveNeto)}
            </span>
          </div>
        </div>
      )}

      {/* Save button */}
      {canEdit && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>Guardar Precios</Button>
        </div>
      )}
    </Card>
  );
}
