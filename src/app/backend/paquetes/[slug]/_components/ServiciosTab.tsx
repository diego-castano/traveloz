"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import { EmptyState } from "@/components/ui/data/EmptyState";
import {
  usePaqueteServices,
  usePackageActions,
} from "@/components/providers/PackageProvider";
import {
  useAereos,
  useTraslados,
  useSeguros,
  useCircuitos,
} from "@/components/providers/ServiceProvider";
import { useProveedores } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Plus,
  X,
  GripVertical,
  Plane,
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

// Alojamientos se gestiona en su propio tab (AlojamientosTab). Este tab solo
// lista los servicios "fijos" compartidos por todas las opciones hoteleras.
const SERVICE_TYPES = [
  { key: "aereos" as const, label: "Aereos", icon: Plane },
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
    removeTraslado,
    removeSeguro,
    removeCircuito,
    updatePaquete,
  } = usePackageActions();
  const { canEdit } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Lookup maps for service details
  const aereos = useAereos();
  const traslados = useTraslados();
  const seguros = useSeguros();
  const circuitos = useCircuitos();
  const proveedores = useProveedores();

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
  const trasladoMap = useMemo(() => new Map(traslados.map((t) => [t.id, t] as const)), [traslados]);
  const seguroMap = useMemo(() => new Map(seguros.map((s) => [s.id, s] as const)), [seguros]);
  const circuitoMap = useMemo(() => new Map(circuitos.map((c) => [c.id, c] as const)), [circuitos]);

  // -- Remove handlers --
  const removeHandlers: Record<string, (id: string) => void> = {
    aereos: removeAereo,
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
            <span className="text-[13.5px] font-medium text-neutral-800">{aereo.ruta}</span>
            <span className="text-[12px] text-neutral-500">
              {aereo.destino} &middot; {aereo.aerolinea}
            </span>
          </div>
        );
      }
      case "traslados": {
        const traslado = trasladoMap.get(assignment.trasladoId as string);
        if (!traslado) return <span className="text-neutral-400">Traslado no encontrado</span>;
        return (
          <div className="flex flex-col">
            <span className="text-[13.5px] font-medium text-neutral-800">{traslado.nombre}</span>
            <span className="text-[12px] text-neutral-500">{traslado.tipo}</span>
          </div>
        );
      }
      case "seguros": {
        const seguro = seguroMap.get(assignment.seguroId as string);
        if (!seguro) return <span className="text-neutral-400">Seguro no encontrado</span>;
        const provNombre = proveedorMap.get(seguro.proveedorId) ?? "";
        return (
          <div className="flex flex-col">
            <span className="text-[13.5px] font-medium text-neutral-800">{seguro.plan}</span>
            <span className="text-[12px] text-neutral-500">
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
            <span className="text-[13.5px] font-medium text-neutral-800">{circuito.nombre}</span>
            <span className="text-[12px] text-neutral-500">{circuito.noches} noches</span>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // -- Total count of all assigned services (excluye alojamientos, gestionados en su propio tab) --
  const totalCount =
    services.aereos.length +
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
      <>
        <EmptyState
          icon={Plane}
          title="No hay servicios asignados"
          description="Agrega aereos, traslados, seguros o circuitos. Los alojamientos se gestionan en su propio tab."
          action={
            canEdit ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setModalOpen(true)}
              >
                Agregar Servicio
              </Button>
            ) : undefined
          }
        />
        <ServiceSelectorModal
          paqueteId={paquete.id}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-semibold text-neutral-800">
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
              <span className="text-[13px] font-semibold text-neutral-700">{label}</span>
              <Badge variant="draft" size="sm">
                {items.length}
              </Badge>
            </div>

            {/* Items */}
            <div className="rounded-[12px] border border-hairline bg-white">
              <div className="divide-y divide-hairline">
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
                      <button
                        type="button"
                        aria-label="Reordenar"
                        className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    )}

                    {/* Service details */}
                    <div className="flex-1 min-w-0">
                      {renderServiceDetails(key, assignment as unknown as Record<string, unknown>)}
                    </div>

                    {/* Remove button */}
                    {canEdit && (
                      <button
                        className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-400 hover:text-[#CC2030] hover:bg-brand-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => removeHandlers[key](assignment.id)}
                        aria-label="Eliminar servicio"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
