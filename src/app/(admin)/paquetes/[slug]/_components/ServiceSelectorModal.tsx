"use client";

import { useMemo, useState } from "react";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { Plus, Plane, Hotel, Bus, Shield, MapIcon, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

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

  // -- Search match helper --
  const sq = searchQuery.toLowerCase().trim();

  // Available (unassigned) services, filtered by search query
  const availableAereos = useMemo(
    () =>
      aereos
        .filter((a) => !assignedAereoIds.has(a.id))
        .filter(
          (a) =>
            !sq ||
            a.ruta.toLowerCase().includes(sq) ||
            a.destino.toLowerCase().includes(sq) ||
            (a.aerolinea ?? "").toLowerCase().includes(sq),
        ),
    [aereos, assignedAereoIds, sq],
  );
  const availableAlojamientos = useMemo(
    () => alojamientos.filter((a) => !assignedAlojamientoIds.has(a.id)),
    [alojamientos, assignedAlojamientoIds],
  );
  const availableTraslados = useMemo(
    () =>
      traslados
        .filter((t) => !assignedTrasladoIds.has(t.id))
        .filter(
          (t) =>
            !sq ||
            t.nombre.toLowerCase().includes(sq) ||
            t.tipo.toLowerCase().includes(sq),
        ),
    [traslados, assignedTrasladoIds, sq],
  );
  const availableSeguros = useMemo(
    () =>
      seguros
        .filter((s) => !assignedSeguroIds.has(s.id))
        .filter((s) => {
          if (!sq) return true;
          const provNombre = proveedorMap.get(s.proveedorId) ?? "";
          return (
            s.plan.toLowerCase().includes(sq) ||
            (s.cobertura ?? "").toLowerCase().includes(sq) ||
            provNombre.toLowerCase().includes(sq)
          );
        }),
    [seguros, assignedSeguroIds, sq, proveedorMap],
  );
  const availableCircuitos = useMemo(
    () =>
      circuitos
        .filter((c) => !assignedCircuitoIds.has(c.id))
        .filter((c) => !sq || c.nombre.toLowerCase().includes(sq)),
    [circuitos, assignedCircuitoIds, sq],
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
    <div className="flex items-center justify-center py-8 text-neutral-400 text-sm">
      {sq
        ? `No se encontraron ${tipo} para "${searchQuery}"`
        : `Todos los ${tipo} estan asignados`}
    </div>
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg">
      <ModalHeader
        title="Agregar Servicio"
        description="Elegi un servicio existente para asignarlo al paquete"
        icon={<Plus className="h-5 w-5" strokeWidth={2.4} />}
      >
        {null}
      </ModalHeader>
      <ModalBody>
        <Tabs defaultValue="aereos" layoutId="serviceSelectorTabs" onValueChange={() => setSearchQuery("")}>
          <TabsList>
            <TabsTrigger value="aereos">
              <span className="flex items-center gap-1.5">
                <Plane className="h-3.5 w-3.5" />
                Aereos
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
            <div className="px-1 pt-1 pb-3">
              <Input
                placeholder="Buscar aereos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                size="sm"
              />
            </div>
            {availableAereos.length === 0 ? (
              emptyMessage("aereos")
            ) : (
              <div className="rounded-[12px] border border-hairline bg-white overflow-hidden">
                <div className="divide-y divide-hairline">
                  {availableAereos.map((aereo) => (
                    <div
                      key={aereo.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-800">
                          {aereo.ruta}
                        </span>
                        <span className="text-xs text-neutral-500">
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
              </div>
            )}
          </TabsContent>

          {/* Alojamientos tab fue removido — los hoteles se gestionan desde el
              tab Alojamientos del detalle de paquete (AlojamientosTab.tsx). */}

          {/* Traslados Tab */}
          <TabsContent value="traslados">
            <div className="px-1 pt-1 pb-3">
              <Input
                placeholder="Buscar traslados..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                size="sm"
              />
            </div>
            {availableTraslados.length === 0 ? (
              emptyMessage("traslados")
            ) : (
              <div className="rounded-[12px] border border-hairline bg-white overflow-hidden">
                <div className="divide-y divide-hairline">
                  {availableTraslados.map((traslado) => (
                    <div
                      key={traslado.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-800">
                          {traslado.nombre}
                        </span>
                        <span className="text-xs text-neutral-500">
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
              </div>
            )}
          </TabsContent>

          {/* Seguros Tab */}
          <TabsContent value="seguros">
            <div className="px-1 pt-1 pb-3">
              <Input
                placeholder="Buscar seguros..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                size="sm"
              />
            </div>
            {availableSeguros.length === 0 ? (
              emptyMessage("seguros")
            ) : (
              <div className="rounded-[12px] border border-hairline bg-white overflow-hidden">
                <div className="divide-y divide-hairline">
                  {availableSeguros.map((seguro) => {
                    const provNombre = proveedorMap.get(seguro.proveedorId) ?? "";
                    return (
                      <div
                        key={seguro.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-neutral-800">
                            {seguro.plan}
                          </span>
                          <span className="text-xs text-neutral-500">
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
              </div>
            )}
          </TabsContent>

          {/* Circuitos Tab */}
          <TabsContent value="circuitos">
            <div className="px-1 pt-1 pb-3">
              <Input
                placeholder="Buscar circuitos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                size="sm"
              />
            </div>
            {availableCircuitos.length === 0 ? (
              emptyMessage("circuitos")
            ) : (
              <div className="rounded-[12px] border border-hairline bg-white overflow-hidden">
                <div className="divide-y divide-hairline">
                  {availableCircuitos.map((circuito) => (
                    <div
                      key={circuito.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-neutral-800">
                          {circuito.nombre}
                        </span>
                        <span className="text-xs text-neutral-500">
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ModalBody>
    </Modal>
  );
}
