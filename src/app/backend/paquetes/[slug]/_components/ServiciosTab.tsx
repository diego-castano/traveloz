"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { cn } from "@/components/lib/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalClose,
} from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/data/EmptyState";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";
import { useUnsavedWarn } from "@/hooks/useUnsavedWarn";
import { MissingTravelWindowBanner } from "./MissingTravelWindowBanner";
import { ServiceCode } from "./ServiceCode";
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
  { key: "traslados" as const, label: "Traslados y paseos", icon: Bus },
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
    reorderAssignments,
  } = usePackageActions();
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  // Tracks the persistence status of reorder/remove actions so the indicator
  // tells the truth instead of always showing "saved".
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("saved");

  // Confirm-before-delete state — a single click on the X used to wipe the
  // assignment silently. Now it opens a modal that names the service.
  const [pendingRemoval, setPendingRemoval] = useState<{
    type: "aereos" | "traslados" | "seguros" | "circuitos";
    id: string;
    label: string;
  } | null>(null);

  // Block tab close / nav-away while a save is in flight so the operator
  // doesn't lose the reorder they just did.
  useUnsavedWarn(saveStatus);

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

  // -- Remove handlers — wrapped to track saving status. The UI opens a
  // confirmation modal first; this is the actual deletion code path.
  const removeHandlers: Record<
    "aereos" | "traslados" | "seguros" | "circuitos",
    (id: string) => Promise<void>
  > = {
    aereos: removeAereo,
    traslados: removeTraslado,
    seguros: removeSeguro,
    circuitos: removeCircuito,
  };

  const performRemove = useCallback(async () => {
    if (!pendingRemoval) return;
    const { type, id, label } = pendingRemoval;
    setSaveStatus("saving");
    try {
      await removeHandlers[type](id);
      setSaveStatus("saved");
      toast("success", "Servicio quitado", label);
    } catch (e) {
      setSaveStatus("error");
      toast("error", "Error al quitar", (e as Error).message);
    } finally {
      setPendingRemoval(null);
    }
  }, [pendingRemoval, removeHandlers, toast]);

  // Helper to build the human label shown in the confirm modal for each type.
  const labelForAssignment = useCallback(
    (
      type: "aereos" | "traslados" | "seguros" | "circuitos",
      assignment: Record<string, unknown>,
    ): string => {
      switch (type) {
        case "aereos": {
          const a = aereoMap.get(assignment.aereoId as string);
          return a ? `${a.ruta} (${a.destino})` : "Aéreo";
        }
        case "traslados": {
          const t = trasladoMap.get(assignment.trasladoId as string);
          return t ? t.nombre : "Traslado";
        }
        case "seguros": {
          const s = seguroMap.get(assignment.seguroId as string);
          return s ? s.plan : "Seguro";
        }
        case "circuitos": {
          const c = circuitoMap.get(assignment.circuitoId as string);
          return c ? c.nombre : "Circuito";
        }
      }
    },
    [aereoMap, trasladoMap, seguroMap, circuitoMap],
  );

  // -- Drag and drop state --
  // Track the currently dragged row + the hover target so the UI shows a
  // ghosted source and a teal drop-zone outline. Without this, the only
  // feedback was the browser's default ghost image, which made reorder feel
  // jittery on slow networks.
  const dragSourceRef = useRef<{ type: string; index: number } | null>(null);
  const [dragging, setDragging] = useState<{ type: string; index: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ type: string; index: number } | null>(null);

  const handleDragStart = useCallback(
    (type: string, index: number) => {
      dragSourceRef.current = { type, index };
      setDragging({ type, index });
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, type: string, index: number) => {
      e.preventDefault();
      const src = dragSourceRef.current;
      if (!src || src.type !== type || src.index === index) return;
      setDragOver({ type, index });
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(
    (type: string, targetIndex: number) => {
      const source = dragSourceRef.current;
      setDragging(null);
      setDragOver(null);
      if (!source || source.type !== type || source.index === targetIndex) {
        dragSourceRef.current = null;
        return;
      }
      // Only the four service-assignment buckets are reorderable here.
      if (
        type !== "aereos" &&
        type !== "traslados" &&
        type !== "seguros" &&
        type !== "circuitos"
      ) {
        dragSourceRef.current = null;
        return;
      }

      const items = [...(services[type as keyof typeof services] as { id: string }[])];
      const [moved] = items.splice(source.index, 1);
      items.splice(targetIndex, 0, moved);

      const orderedIds = items.map((item) => item.id);
      // Persist the new orden on each junction row in a single transaction.
      // The reducer also patches local state optimistically.
      setSaveStatus("saving");
      reorderAssignments(type as any, orderedIds)
        .then(() => setSaveStatus("saved"))
        .catch((e) => {
          setSaveStatus("error");
          toast("error", "No se pudo reordenar", (e as Error).message);
        });

      dragSourceRef.current = null;
    },
    [services, reorderAssignments, toast],
  );

  // -- Render helpers --
  const renderServiceDetails = (type: string, assignment: Record<string, unknown>) => {
    switch (type) {
      case "aereos": {
        const aereo = aereoMap.get(assignment.aereoId as string);
        if (!aereo) return <span className="text-neutral-400">Aereo no encontrado</span>;
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-neutral-800">
              <ServiceCode id={aereo.id} />
              {aereo.ruta}
            </span>
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
            <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-neutral-800">
              <ServiceCode id={traslado.id} />
              {traslado.nombre}
            </span>
            <span className="text-[12px] text-neutral-500">{traslado.tipo}</span>
          </div>
        );
      }
      case "seguros": {
        const seguro = seguroMap.get(assignment.seguroId as string);
        if (!seguro) return <span className="text-neutral-400">Seguro no encontrado</span>;
        const provNombre = proveedorMap.get(seguro.proveedorId ?? "") ?? "";
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-neutral-800">
              <ServiceCode id={seguro.id} />
              {seguro.plan}
            </span>
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
            <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-neutral-800">
              <ServiceCode id={circuito.id} />
              {circuito.nombre}
            </span>
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

  const hasTravelWindow = Boolean(paquete.viajeDesde && paquete.viajeHasta);

  // -- Empty state --
  if (totalCount === 0) {
    return (
      <>
        {!hasTravelWindow && (
          <MissingTravelWindowBanner paqueteSlug={paquete.id} />
        )}
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
      {!hasTravelWindow && (
        <MissingTravelWindowBanner paqueteSlug={paquete.id} />
      )}
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-semibold text-neutral-800">
            Servicios Asignados
          </h3>
          <AutoSaveIndicator status={saveStatus} />
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
                {items.map((assignment, index) => {
                  const isDragging =
                    dragging?.type === key && dragging.index === index;
                  const isDropTarget =
                    dragOver?.type === key && dragOver.index === index;
                  return (
                  <div
                    key={assignment.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 group transition-all",
                      isDragging && "opacity-40",
                      isDropTarget &&
                        "ring-2 ring-inset ring-[#3BBFAD]/60 bg-[#3BBFAD]/5",
                    )}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(key, index)}
                    onDragOver={(e) => handleDragOver(e, key, index)}
                    onDragEnd={handleDragEnd}
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

                    {/* Remove button — opens confirmation modal to prevent
                        accidental deletion (single click used to wipe silently). */}
                    {canEdit && (
                      <button
                        className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-neutral-400 hover:text-[#CC2030] hover:bg-brand-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          setPendingRemoval({
                            type: key,
                            id: assignment.id,
                            label: labelForAssignment(
                              key,
                              assignment as unknown as Record<string, unknown>,
                            ),
                          })
                        }
                        aria-label="Eliminar servicio"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  );
                })}
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

      {/* Confirm-remove dialog */}
      <Modal
        open={!!pendingRemoval}
        onOpenChange={(o) => !o && setPendingRemoval(null)}
        size="sm"
      >
        <ModalHeader
          title="¿Quitar este servicio?"
          description={
            pendingRemoval
              ? `Se eliminará del paquete: ${pendingRemoval.label}.`
              : undefined
          }
          icon={<X className="h-5 w-5" strokeWidth={2.4} />}
        />
        <ModalBody>
          <p className="text-sm text-neutral-600">
            El servicio queda intacto en su catálogo; solo se quita la
            asignación a este paquete. Podés volver a agregarlo cuando quieras.
          </p>
        </ModalBody>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </ModalClose>
          <Button
            variant="primary"
            onClick={performRemove}
            disabled={saveStatus === "saving"}
            loading={saveStatus === "saving"}
          >
            Quitar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
