"use client";

import { useMemo } from "react";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import { useToast } from "@/components/ui/Toast";
import { Plus, Plane, Hotel, Bus, Shield, MapIcon } from "lucide-react";
import type {
  Aereo,
  Alojamiento,
  Traslado,
  Seguro,
  Circuito,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ServiceSelectorModalProps {
  paqueteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ServiceSelectorModal({
  paqueteId,
  open,
  onOpenChange,
}: ServiceSelectorModalProps) {
  const services = usePaqueteServices(paqueteId);
  const {
    assignAereo,
    assignAlojamiento,
    assignTraslado,
    assignSeguro,
    assignCircuito,
  } = usePackageActions();
  const { toast } = useToast();

  // All available services
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const traslados = useTraslados();
  const seguros = useSeguros();
  const circuitos = useCircuitos();
  const paises = usePaises();
  const proveedores = useProveedores();

  // Build ciudades lookup map from paises
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

  // Assigned IDs for filtering
  const assignedAereoIds = useMemo(
    () => new Set(services.aereos.map((a) => a.aereoId)),
    [services.aereos],
  );
  const assignedAlojamientoIds = useMemo(
    () => new Set(services.alojamientos.map((a) => a.alojamientoId)),
    [services.alojamientos],
  );
  const assignedTrasladoIds = useMemo(
    () => new Set(services.traslados.map((t) => t.trasladoId)),
    [services.traslados],
  );
  const assignedSeguroIds = useMemo(
    () => new Set(services.seguros.map((s) => s.seguroId)),
    [services.seguros],
  );
  const assignedCircuitoIds = useMemo(
    () => new Set(services.circuitos.map((c) => c.circuitoId)),
    [services.circuitos],
  );

  // Available (unassigned) services
  const availableAereos = useMemo(
    () => aereos.filter((a) => !assignedAereoIds.has(a.id)),
    [aereos, assignedAereoIds],
  );
  const availableAlojamientos = useMemo(
    () => alojamientos.filter((a) => !assignedAlojamientoIds.has(a.id)),
    [alojamientos, assignedAlojamientoIds],
  );
  const availableTraslados = useMemo(
    () => traslados.filter((t) => !assignedTrasladoIds.has(t.id)),
    [traslados, assignedTrasladoIds],
  );
  const availableSeguros = useMemo(
    () => seguros.filter((s) => !assignedSeguroIds.has(s.id)),
    [seguros, assignedSeguroIds],
  );
  const availableCircuitos = useMemo(
    () => circuitos.filter((c) => !assignedCircuitoIds.has(c.id)),
    [circuitos, assignedCircuitoIds],
  );

  // -- Assign handlers --
  const handleAssignAereo = (aereo: Aereo) => {
    const nextOrden = services.aereos.length;
    assignAereo({
      paqueteId,
      aereoId: aereo.id,
      textoDisplay: null,
      orden: nextOrden,
    });
    toast("success", "Aereo agregado", `${aereo.ruta} asignado al paquete.`);
  };

  const handleAssignAlojamiento = (aloj: Alojamiento) => {
    const nextOrden = services.alojamientos.length;
    assignAlojamiento({
      paqueteId,
      alojamientoId: aloj.id,
      nochesEnEste: null,
      textoDisplay: null,
      orden: nextOrden,
    });
    toast("success", "Alojamiento agregado", `${aloj.nombre} asignado al paquete.`);
  };

  const handleAssignTraslado = (traslado: Traslado) => {
    const nextOrden = services.traslados.length;
    assignTraslado({
      paqueteId,
      trasladoId: traslado.id,
      textoDisplay: null,
      orden: nextOrden,
    });
    toast("success", "Traslado agregado", `${traslado.nombre} asignado al paquete.`);
  };

  const handleAssignSeguro = (seguro: Seguro) => {
    const nextOrden = services.seguros.length;
    assignSeguro({
      paqueteId,
      seguroId: seguro.id,
      diasCobertura: null,
      textoDisplay: null,
      orden: nextOrden,
    });
    toast("success", "Seguro agregado", `${seguro.plan} asignado al paquete.`);
  };

  const handleAssignCircuito = (circuito: Circuito) => {
    const nextOrden = services.circuitos.length;
    assignCircuito({
      paqueteId,
      circuitoId: circuito.id,
      textoDisplay: null,
      orden: nextOrden,
    });
    toast("success", "Circuito agregado", `${circuito.nombre} asignado al paquete.`);
  };

  // -- Empty state per tab --
  const emptyMessage = (tipo: string) => (
    <div className="flex items-center justify-center py-8 text-white/40 text-sm">
      Todos los {tipo} estan asignados
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg">
      <ModalHeader title="Agregar Servicio">{null}</ModalHeader>
      <ModalBody>
        <Tabs defaultValue="aereos" layoutId="serviceSelectorTabs" variant="dark">
          <TabsList>
            <TabsTrigger value="aereos">
              <span className="flex items-center gap-1.5">
                <Plane className="h-3.5 w-3.5" />
                Aereos
              </span>
            </TabsTrigger>
            <TabsTrigger value="alojamientos">
              <span className="flex items-center gap-1.5">
                <Hotel className="h-3.5 w-3.5" />
                Alojamientos
              </span>
            </TabsTrigger>
            <TabsTrigger value="traslados">
              <span className="flex items-center gap-1.5">
                <Bus className="h-3.5 w-3.5" />
                Traslados
              </span>
            </TabsTrigger>
            <TabsTrigger value="seguros">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Seguros
              </span>
            </TabsTrigger>
            <TabsTrigger value="circuitos">
              <span className="flex items-center gap-1.5">
                <MapIcon className="h-3.5 w-3.5" />
                Circuitos
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Aereos Tab */}
          <TabsContent value="aereos">
            {availableAereos.length === 0 ? (
              emptyMessage("aereos")
            ) : (
              <Card className="p-0" static style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="divide-y divide-white/15">
                  {availableAereos.map((aereo) => (
                    <div
                      key={aereo.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {aereo.ruta}
                        </span>
                        <span className="text-xs text-white/50">
                          {aereo.destino} &middot; {aereo.aerolinea}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => handleAssignAereo(aereo)}
                      >
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Alojamientos Tab */}
          <TabsContent value="alojamientos">
            {availableAlojamientos.length === 0 ? (
              emptyMessage("alojamientos")
            ) : (
              <Card className="p-0" static style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="divide-y divide-white/15">
                  {availableAlojamientos.map((aloj) => {
                    const ciudadNombre = ciudadMap.get(aloj.ciudadId) ?? "";
                    const stars = "\u2605".repeat(aloj.categoria);
                    return (
                      <div
                        key={aloj.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {aloj.nombre}
                          </span>
                          <span className="text-xs text-white/50">
                            <span className="text-amber-500">{stars}</span>
                            {ciudadNombre && <> &middot; {ciudadNombre}</>}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon={<Plus className="h-3 w-3" />}
                          onClick={() => handleAssignAlojamiento(aloj)}
                        >
                          Agregar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Traslados Tab */}
          <TabsContent value="traslados">
            {availableTraslados.length === 0 ? (
              emptyMessage("traslados")
            ) : (
              <Card className="p-0" static style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="divide-y divide-white/15">
                  {availableTraslados.map((traslado) => (
                    <div
                      key={traslado.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {traslado.nombre}
                        </span>
                        <span className="text-xs text-white/50">
                          {traslado.tipo} &middot; USD {traslado.precio}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => handleAssignTraslado(traslado)}
                      >
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Seguros Tab */}
          <TabsContent value="seguros">
            {availableSeguros.length === 0 ? (
              emptyMessage("seguros")
            ) : (
              <Card className="p-0" static style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="divide-y divide-white/15">
                  {availableSeguros.map((seguro) => {
                    const provNombre = proveedorMap.get(seguro.proveedorId) ?? "";
                    return (
                      <div
                        key={seguro.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {seguro.plan}
                          </span>
                          <span className="text-xs text-white/50">
                            {provNombre && <>{provNombre} &middot; </>}
                            {seguro.cobertura} &middot; USD {seguro.costoPorDia}/dia
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon={<Plus className="h-3 w-3" />}
                          onClick={() => handleAssignSeguro(seguro)}
                        >
                          Agregar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Circuitos Tab */}
          <TabsContent value="circuitos">
            {availableCircuitos.length === 0 ? (
              emptyMessage("circuitos")
            ) : (
              <Card className="p-0" static style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="divide-y divide-white/15">
                  {availableCircuitos.map((circuito) => (
                    <div
                      key={circuito.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {circuito.nombre}
                        </span>
                        <span className="text-xs text-white/50">
                          {circuito.noches} noches
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => handleAssignCircuito(circuito)}
                      >
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </ModalBody>
    </Modal>
  );
}
