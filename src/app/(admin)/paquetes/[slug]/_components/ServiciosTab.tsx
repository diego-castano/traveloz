"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import {
  usePaqueteServices,
  usePackageActions,
} from "@/components/providers/PackageProvider";
import {
  useAereos,
  useAlojamientos,
  useTraslados,
  useSeguros,
  useCircuitos,
} from "@/components/providers/ServiceProvider";
import {
  usePaises,
  useProveedores,
} from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Plus,
  X,
  GripVertical,
  Plane,
  Hotel,
  Bus,
  Shield,
  MapIcon,
} from "lucide-react";
import type { Paquete } from "@/lib/types";
import ServiceSelectorModal from "./ServiceSelectorModal";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ServiciosTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Service type config
// ---------------------------------------------------------------------------

const SERVICE_TYPES = [
  { key: "aereos" as const, label: "Aereos", icon: Plane },
  { key: "alojamientos" as const, label: "Alojamientos", icon: Hotel },
  { key: "traslados" as const, label: "Traslados", icon: Bus },
  { key: "seguros" as const, label: "Seguros", icon: Shield },
  { key: "circuitos" as const, label: "Circuitos", icon: MapIcon },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ServiciosTab({ paquete }: ServiciosTabProps) {
  const services = usePaqueteServices(paquete.id);
  const {
    removeAereo,
    removeAlojamiento,
    removeTraslado,
    removeSeguro,
    removeCircuito,
    updatePaquete,
  } = usePackageActions();
  const { canEdit } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Lookup maps for service details
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const traslados = useTraslados();
  const seguros = useSeguros();
  const circuitos = useCircuitos();
  const paises = usePaises();
  const proveedores = useProveedores();

  // Build ciudades lookup map from paises (which include ciudades)
  const ciudadMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const pais of paises) {
      for (const ciudad of pais.ciudades) {
        map.set(ciudad.id, ciudad.nombre);
      }
    }
    return map;
  }, [paises]);

  // Build proveedor lookup map
  const proveedorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of proveedores) {
      map.set(p.id, p.nombre);
    }
    return map;
  }, [proveedores]);

  // Build lookup maps for each service entity
  const aereoMap = useMemo(() => new Map(aereos.map((a) => [a.id, a] as const)), [aereos]);
  const alojamientoMap = useMemo(() => new Map(alojamientos.map((a) => [a.id, a] as const)), [alojamientos]);
  const trasladoMap = useMemo(() => new Map(traslados.map((t) => [t.id, t] as const)), [traslados]);
  const seguroMap = useMemo(() => new Map(seguros.map((s) => [s.id, s] as const)), [seguros]);
  const circuitoMap = useMemo(() => new Map(circuitos.map((c) => [c.id, c] as const)), [circuitos]);

  // -- Remove handlers --
  const removeHandlers: Record<string, (id: string) => void> = {
    aereos: removeAereo,
    alojamientos: removeAlojamiento,
    traslados: removeTraslado,
    seguros: removeSeguro,
    circuitos: removeCircuito,
  };

  // -- Drag and drop state --
  const dragSourceRef = useRef<{ type: string; index: number } | null>(null);

  const handleDragStart = useCallback(
    (type: string, index: number) => {
      dragSourceRef.current = { type, index };
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (type: string, targetIndex: number) => {
      const source = dragSourceRef.current;
      if (!source || source.type !== type || source.index === targetIndex) {
        dragSourceRef.current = null;
        return;
      }

      // Get the current items array for this type
      const items = [...(services[type as keyof typeof services] as { id: string }[])];
      const [moved] = items.splice(source.index, 1);
      items.splice(targetIndex, 0, moved);

      // Update ordenServicios on the paquete
      const otherTypeIds = Object.entries(services)
        .filter(([key]) => key !== type && key !== "fotos" && key !== "etiquetas")
        .flatMap(([, arr]) => (arr as { id: string }[]).map((item) => item.id));

      const reorderedIds = items.map((item) => item.id);
      updatePaquete({
        ...paquete,
        ordenServicios: [...otherTypeIds, ...reorderedIds],
      });

      dragSourceRef.current = null;
    },
    [services, paquete, updatePaquete],
  );

  // -- Render helpers --
  const renderServiceDetails = (type: string, assignment: Record<string, unknown>) => {
    switch (type) {
      case "aereos": {
        const aereo = aereoMap.get(assignment.aereoId as string);
        if (!aereo) return <span className="text-neutral-400">Aereo no encontrado</span>;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">{aereo.ruta}</span>
            <span className="text-xs text-neutral-500">
              {aereo.destino} &middot; {aereo.aerolinea}
            </span>
          </div>
        );
      }
      case "alojamientos": {
        const aloj = alojamientoMap.get(assignment.alojamientoId as string);
        if (!aloj) return <span className="text-neutral-400">Alojamiento no encontrado</span>;
        const ciudadNombre = ciudadMap.get(aloj.ciudadId) ?? "";
        const stars = "\u2605".repeat(aloj.categoria);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">{aloj.nombre}</span>
            <span className="text-xs text-neutral-500">
              <span className="text-amber-500">{stars}</span>
              {ciudadNombre && <> &middot; {ciudadNombre}</>}
            </span>
          </div>
        );
      }
      case "traslados": {
        const traslado = trasladoMap.get(assignment.trasladoId as string);
        if (!traslado) return <span className="text-neutral-400">Traslado no encontrado</span>;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">{traslado.nombre}</span>
            <span className="text-xs text-neutral-500">{traslado.tipo}</span>
          </div>
        );
      }
      case "seguros": {
        const seguro = seguroMap.get(assignment.seguroId as string);
        if (!seguro) return <span className="text-neutral-400">Seguro no encontrado</span>;
        const provNombre = proveedorMap.get(seguro.proveedorId) ?? "";
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">{seguro.plan}</span>
            <span className="text-xs text-neutral-500">
              {provNombre && <>{provNombre} &middot; </>}
              {seguro.cobertura}
            </span>
          </div>
        );
      }
      case "circuitos": {
        const circuito = circuitoMap.get(assignment.circuitoId as string);
        if (!circuito) return <span className="text-neutral-400">Circuito no encontrado</span>;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-800">{circuito.nombre}</span>
            <span className="text-xs text-neutral-500">{circuito.noches} noches</span>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // -- Total count of all assigned services --
  const totalCount =
    services.aereos.length +
    services.alojamientos.length +
    services.traslados.length +
    services.seguros.length +
    services.circuitos.length;

  // -- Icon mapping --
  const iconForType = (key: string) => {
    const found = SERVICE_TYPES.find((st) => st.key === key);
    if (!found) return null;
    const Icon = found.icon;
    return <Icon className="h-4 w-4 text-brand-teal-500" />;
  };

  // -- Empty state --
  if (totalCount === 0) {
    return (
      <Card className="p-0" static>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex items-center gap-2 text-neutral-400">
            <Plane className="h-5 w-5" />
            <Hotel className="h-5 w-5" />
            <Bus className="h-5 w-5" />
          </div>
          <p className="text-neutral-500 text-sm">No hay servicios asignados</p>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setModalOpen(true)}
            >
              Agregar Servicio
            </Button>
          )}
        </div>
        <ServiceSelectorModal
          paqueteId={paquete.id}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-neutral-800">
            Servicios Asignados
          </h3>
          <AutoSaveIndicator status="saved" />
        </div>
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setModalOpen(true)}
          >
            Agregar Servicio
          </Button>
        )}
      </div>

      {/* Service groups */}
      {SERVICE_TYPES.map(({ key, label }) => {
        const items = services[key] as { id: string }[];
        if (items.length === 0) return null;

        return (
          <div key={key} className="space-y-2">
            {/* Section header */}
            <div className="flex items-center gap-2">
              {iconForType(key)}
              <span className="text-sm font-semibold text-neutral-700">{label}</span>
              <Badge variant="draft" size="sm">
                {items.length}
              </Badge>
            </div>

            {/* Items */}
            <Card className="p-0" static>
              <div className="divide-y divide-neutral-100/60">
                {items.map((assignment, index) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 px-4 py-3 group"
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(key, index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(key, index)}
                  >
                    {/* Drag handle */}
                    {canEdit && (
                      <GripVertical className="h-4 w-4 text-neutral-300 cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}

                    {/* Service details */}
                    <div className="flex-1 min-w-0">
                      {renderServiceDetails(key, assignment as unknown as Record<string, unknown>)}
                    </div>

                    {/* Remove button */}
                    {canEdit && (
                      <button
                        className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-glass-sm text-neutral-300 hover:text-brand-red-500 hover:bg-brand-red-50/50 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => removeHandlers[key](assignment.id)}
                        aria-label="Eliminar servicio"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      })}

      {/* Modal */}
      <ServiceSelectorModal
        paqueteId={paquete.id}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
