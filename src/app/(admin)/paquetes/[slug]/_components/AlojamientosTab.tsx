"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Hotel,
  Plus,
  Trash2,
  X,
  Star,
  MapPin,
  Plane,
  Bus,
  ShieldCheck,
  Map as MapIcon,
  AlertTriangle,
  Check,
  Search,
  Pencil,
  Loader2,
  ArrowUp,
  ArrowDown,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import {
  usePaqueteServices,
  usePackageActions,
  useOpcionesHoteleras,
  useDestinos,
  useOpcionHoteles,
} from "@/components/providers/PackageProvider";
import {
  useAlojamientos,
  useServiceState,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import {
  calcularNetoFijos,
  calcularVentaOpcion,
  calcularNetoAlojamientosPorOpcion,
  computeNochesTotales,
  resolvePrecioAlojamiento,
  resolvePrecioAereo,
  resolvePrecioCircuito,
  formatCurrency,
} from "@/lib/utils";
import type {
  Paquete,
  Alojamiento,
  OpcionHotelera,
  PaqueteDestino,
  OpcionHotel,
  PrecioAlojamiento,
} from "@/lib/types";
import { glassMaterials } from "@/components/lib/glass";
import { springs, stagger } from "@/components/lib/animations";

// ---------------------------------------------------------------------------
// Props & helpers
// ---------------------------------------------------------------------------

interface AlojamientosTabProps {
  paquete: Paquete;
}

const frostedAccent = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(24px) saturate(190%)",
  WebkitBackdropFilter: "blur(24px) saturate(190%)",
  border: "1px solid rgba(59,191,173,0.2)",
  boxShadow:
    "0 8px 32px rgba(26,26,46,0.06), 0 2px 6px rgba(26,26,46,0.04), inset 0 2px 0 rgba(255,255,255,0.4)",
} as const;

const fixedCostConfig = [
  { key: "aereos" as const, label: "Aereos", icon: Plane },
  { key: "traslados" as const, label: "Traslados", icon: Bus },
  { key: "seguros" as const, label: "Seguros", icon: ShieldCheck },
  { key: "circuitos" as const, label: "Circuitos", icon: MapIcon },
] as const;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AlojamientosTab({ paquete }: AlojamientosTabProps) {
  const services = usePaqueteServices(paquete.id);
  const serviceState = useServiceState();
  const allAlojamientos = useAlojamientos();
  const opciones = useOpcionesHoteleras(paquete.id);
  const destinos = useDestinos(paquete.id);

  const {
    assignAlojamiento,
    removeAlojamiento,
    createOpcionHotelera,
    updateOpcionHotelera,
    deleteOpcionHotelera,
    createDestino,
    updateDestino,
    deleteDestino,
    reorderDestinos,
    upsertOpcionHotelPrincipal,
    deleteOpcionHotel,
  } = usePackageActions();
  const {
    updateAlojamiento,
    createPrecioAlojamiento,
    updatePrecioAlojamiento,
  } = useServiceActions();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [quickEditHotelId, setQuickEditHotelId] = useState<string | null>(null);

  const nochesTotales = useMemo(
    () => computeNochesTotales(destinos),
    [destinos],
  );

  // -------------------------------------------------------------------------
  // Pool (hoteles asignados al paquete, sin noches)
  // -------------------------------------------------------------------------

  const pool = useMemo(() => {
    return services.alojamientos
      .map((pa) => {
        const alojamiento = serviceState.alojamientos.find(
          (a) => a.id === pa.alojamientoId,
        );
        if (!alojamiento) return null;
        const precio = resolvePrecioAlojamiento(
          serviceState.preciosAlojamiento,
          pa.alojamientoId,
          paquete.validezDesde,
        );
        return {
          pa,
          alojamiento,
          precio,
          ciudadId: alojamiento.ciudad?.id ?? null,
          ciudadNombre: alojamiento.ciudad?.nombre ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [
    services.alojamientos,
    serviceState.alojamientos,
    serviceState.preciosAlojamiento,
    paquete.validezDesde,
  ]);

  const availableHotels = useMemo(() => {
    const assignedIds = new Set(pool.map((p) => p.alojamiento.id));
    return allAlojamientos.filter((a) => !assignedIds.has(a.id));
  }, [allAlojamientos, pool]);

  // -------------------------------------------------------------------------
  // Costos fijos (read-only — vienen de Servicios)
  // -------------------------------------------------------------------------

  const { netoFijos, fixedBreakdown } = useMemo(() => {
    const fecha = paquete.validezDesde;

    const assignedAereos = services.aereos
      .map((pa) => {
        const aereo = serviceState.aereos.find((a) => a.id === pa.aereoId);
        if (!aereo) return null;
        return {
          aereo,
          precioAereo: resolvePrecioAereo(
            serviceState.preciosAereo,
            pa.aereoId,
            fecha,
          ),
        };
      })
      .filter(
        (
          x,
        ): x is {
          aereo: NonNullable<typeof x>["aereo"];
          precioAereo: NonNullable<typeof x>["precioAereo"];
        } => x !== null,
      );

    const assignedTraslados = services.traslados
      .map((pt) => serviceState.traslados.find((t) => t.id === pt.trasladoId))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    const assignedSeguros = services.seguros
      .map((ps) => {
        const seguro = serviceState.seguros.find((s) => s.id === ps.seguroId);
        if (!seguro) return null;
        return { seguro, diasCobertura: ps.diasCobertura ?? undefined };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const assignedCircuitos = services.circuitos
      .map((pc) => {
        const circuito = serviceState.circuitos.find(
          (c) => c.id === pc.circuitoId,
        );
        if (!circuito) return null;
        return {
          circuito,
          precioCircuito: resolvePrecioCircuito(
            serviceState.preciosCircuito,
            pc.circuitoId,
            fecha,
          ),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const aereosTotal = assignedAereos.reduce(
      (sum, a) => sum + (a.precioAereo?.precioAdulto ?? 0),
      0,
    );
    const trasladosTotal = assignedTraslados.reduce(
      (sum, t) => sum + t.precio,
      0,
    );
    const segurosTotal = assignedSeguros.reduce((sum, s) => {
      const dias = s.diasCobertura ?? nochesTotales;
      return sum + s.seguro.costoPorDia * dias;
    }, 0);
    const circuitosTotal = assignedCircuitos.reduce(
      (sum, c) => sum + (c.precioCircuito?.precio ?? 0),
      0,
    );

    const total = calcularNetoFijos(
      assignedAereos,
      assignedTraslados,
      assignedSeguros,
      assignedCircuitos,
      nochesTotales,
    );

    return {
      netoFijos: total,
      fixedBreakdown: {
        aereos: aereosTotal,
        traslados: trasladosTotal,
        seguros: segurosTotal,
        circuitos: circuitosTotal,
      },
    };
  }, [services, serviceState, nochesTotales, paquete.validezDesde]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleAddHotelToPool = useCallback(
    (aloj: Alojamiento) => {
      const nextOrden = pool.length;
      assignAlojamiento({
        paqueteId: paquete.id,
        alojamientoId: aloj.id,
        textoDisplay: null,
        orden: nextOrden,
      });
      toast("success", "Hotel agregado al paquete", aloj.nombre);
      setPickerOpen(false);
    },
    [assignAlojamiento, paquete.id, pool.length, toast],
  );

  const handleRemoveHotelFromPool = useCallback(
    (paqueteAlojId: string) => {
      removeAlojamiento(paqueteAlojId);
      toast("success", "Hotel quitado del pool");
    },
    [removeAlojamiento, toast],
  );

  // -- Destinos --

  const handleAddDestino = useCallback(
    async (ciudadId: string, noches: number) => {
      await createDestino({
        paqueteId: paquete.id,
        ciudadId,
        noches,
        orden: destinos.length,
      });
    },
    [createDestino, paquete.id, destinos.length],
  );

  const handleUpdateDestino = useCallback(
    async (destino: PaqueteDestino, patch: Partial<PaqueteDestino>) => {
      await updateDestino({ ...destino, ...patch });
    },
    [updateDestino],
  );

  const handleDeleteDestino = useCallback(
    async (id: string) => {
      await deleteDestino(id);
      toast("success", "Destino eliminado");
    },
    [deleteDestino, toast],
  );

  const handleMoveDestino = useCallback(
    async (destinoId: string, direction: "up" | "down") => {
      const idx = destinos.findIndex((d) => d.id === destinoId);
      if (idx < 0) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= destinos.length) return;
      const reordered = [...destinos];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(newIdx, 0, moved);
      await reorderDestinos(
        paquete.id,
        reordered.map((d) => d.id),
      );
    },
    [destinos, reorderDestinos, paquete.id],
  );

  // -- Opciones --

  const handleCreateOpcion = useCallback(() => {
    const nextOrden = opciones.length + 1;
    const defaultName = `Opcion ${nextOrden}`;
    createOpcionHotelera({
      paqueteId: paquete.id,
      nombre: defaultName,
      factor: 0.9,
      precioVenta: 0,
      orden: nextOrden,
    });
    toast(
      "success",
      "Opcion hotelera creada",
      `Asigná un hotel en cada destino de ${defaultName}`,
    );
  }, [createOpcionHotelera, opciones.length, paquete.id, toast]);

  const handleUpdateOpcionName = useCallback(
    (opcion: OpcionHotelera, newName: string) => {
      updateOpcionHotelera({ ...opcion, nombre: newName });
    },
    [updateOpcionHotelera],
  );

  const handleDeleteOpcion = useCallback(
    (id: string) => {
      deleteOpcionHotelera(id);
      toast("success", "Opcion eliminada");
    },
    [deleteOpcionHotelera, toast],
  );

  const handleUpdateOpcionFactor = useCallback(
    (opcion: OpcionHotelera, rawFactor: number) => {
      const factor = Math.max(0.01, Math.min(1, Number(rawFactor.toFixed(3))));
      const netoAloj = calcularNetoAlojamientosPorOpcion(
        opcion.id,
        [], // computed in OpcionCard; this call is just to persist the factor + venta.
        destinos,
        serviceState.preciosAlojamiento,
        paquete.validezDesde,
      );
      const precioVenta = calcularVentaOpcion(netoFijos, netoAloj, factor);
      updateOpcionHotelera({ ...opcion, factor, precioVenta });
    },
    [
      destinos,
      netoFijos,
      serviceState.preciosAlojamiento,
      paquete.validezDesde,
      updateOpcionHotelera,
    ],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <motion.div
      className="space-y-6"
      variants={stagger.container.variants}
      initial="hidden"
      animate="show"
    >
      {/* ── 1. Itinerario (destinos + noches) ── */}
      <motion.div variants={stagger.item.variants}>
        <ItinerarioEditor
          destinos={destinos}
          canEdit={canEdit}
          onAdd={handleAddDestino}
          onUpdate={handleUpdateDestino}
          onDelete={handleDeleteDestino}
          onMove={handleMoveDestino}
          nochesTotales={nochesTotales}
        />
      </motion.div>

      {/* ── 2. Pool de hoteles del paquete ── */}
      <motion.div variants={stagger.item.variants}>
        <div className="rounded-2xl p-5" style={glassMaterials.frostedSubtle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hotel className="h-4 w-4 text-neutral-500" />
              <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
                Pool de Hoteles
              </h4>
              <span className="text-xs text-neutral-400">
                ({pool.length})
              </span>
            </div>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setPickerOpen(true)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Agregar hotel
              </Button>
            )}
          </div>

          {pool.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Hotel className="h-10 w-10 text-neutral-300 mb-2" />
              <p className="text-sm text-neutral-500">
                Aun no hay hoteles en el pool.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pool.map((entry) => (
                <div
                  key={entry.pa.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/60 border border-white/40"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {Array.from({
                        length: entry.alojamiento.categoria ?? 0,
                      }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-800 truncate">
                        {entry.alojamiento.nombre}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {entry.ciudadNombre ?? "Sin ciudad asignada"}
                        </span>
                        {entry.precio && (
                          <span className="font-mono">
                            · {formatCurrency(entry.precio.precioPorNoche)}
                            /noche
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setQuickEditHotelId(entry.alojamiento.id)}
                        className="p-1 rounded hover:bg-teal-50 text-neutral-300 hover:text-teal-600 transition-colors"
                        title="Edición rápida"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveHotelFromPool(entry.pa.id)}
                        className="p-1 rounded hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                        title="Quitar del pool del paquete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 3. Costos fijos ── */}
      <motion.div variants={stagger.item.variants}>
        <div className="rounded-2xl p-5" style={glassMaterials.frostedSubtle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-gradient-to-br from-teal-400 to-violet-500" />
              <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
                Costos Fijos Compartidos
              </h4>
            </div>
            <span className="text-xs text-neutral-400 italic">
              Gestionados desde Servicios
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {fixedCostConfig.map(({ key, label, icon: Icon }) => {
              const value = fixedBreakdown[key];
              return (
                <motion.div
                  key={key}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/50 border border-white/30"
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={springs.micro}
                >
                  <Icon className="h-5 w-5 text-neutral-400 mb-1.5" />
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                    {label}
                  </span>
                  <span className="text-base font-mono font-bold text-neutral-700 mt-0.5">
                    {formatCurrency(value)}
                  </span>
                </motion.div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/40 px-1">
            <span className="text-sm font-medium text-neutral-600">
              Total Costos Fijos
            </span>
            <span className="text-lg font-mono font-bold text-neutral-800">
              {formatCurrency(netoFijos)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── 4. Opciones hoteleras ── */}
      <motion.div variants={stagger.item.variants}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hotel className="h-4 w-4 text-neutral-500" />
            <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
              Opciones Hoteleras
            </h4>
            <span className="text-xs text-neutral-400">
              ({opciones.length})
            </span>
          </div>
          {canEdit && destinos.length > 0 && (
            <Button
              size="sm"
              onClick={handleCreateOpcion}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Agregar opcion
            </Button>
          )}
        </div>

        {destinos.length === 0 ? (
          <div className="rounded-xl p-6 text-center text-sm text-neutral-400 border border-dashed border-neutral-200">
            Primero agregá al menos un destino al itinerario.
          </div>
        ) : opciones.length === 0 ? (
          <div className="rounded-xl p-6 text-center text-sm text-neutral-400 border border-dashed border-neutral-200">
            Aun no hay opciones hoteleras. Crea la primera para empezar.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {opciones.map((opcion) => (
              <OpcionCard
                key={opcion.id}
                opcion={opcion}
                destinos={destinos}
                pool={pool}
                preciosAlojamiento={serviceState.preciosAlojamiento}
                netoFijos={netoFijos}
                canEdit={canEdit}
                onUpdateName={handleUpdateOpcionName}
                onDelete={handleDeleteOpcion}
                onUpdateFactor={handleUpdateOpcionFactor}
                onUpsertHotel={upsertOpcionHotelPrincipal}
                onDeleteHotel={deleteOpcionHotel}
                onOpenCatalogPicker={() => setPickerOpen(true)}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Modal: Agregar hotel al pool ── */}
      <HotelPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        hotels={availableHotels}
        onPick={handleAddHotelToPool}
      />

      {/* ── Modal: Edicion rapida ── */}
      <QuickEditHotelModal
        open={quickEditHotelId !== null}
        onOpenChange={(open) => {
          if (!open) setQuickEditHotelId(null);
        }}
        hotelId={quickEditHotelId}
        hotels={allAlojamientos}
        preciosAlojamiento={serviceState.preciosAlojamiento}
        validezDesde={paquete.validezDesde}
        onUpdateHotel={updateAlojamiento}
        onCreatePrecio={createPrecioAlojamiento}
        onUpdatePrecio={updatePrecioAlojamiento}
        onSaved={(nombre) => {
          toast("success", "Hotel actualizado", nombre);
          setQuickEditHotelId(null);
        }}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ItinerarioEditor — destinos con noches, reordenables con flechas
// ---------------------------------------------------------------------------

interface ItinerarioEditorProps {
  destinos: PaqueteDestino[];
  canEdit: boolean;
  nochesTotales: number;
  onAdd: (ciudadId: string, noches: number) => Promise<void>;
  onUpdate: (
    destino: PaqueteDestino,
    patch: Partial<PaqueteDestino>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
}

function ItinerarioEditor({
  destinos,
  canEdit,
  nochesTotales,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
}: ItinerarioEditorProps) {
  return (
    <div className="rounded-2xl p-5" style={glassMaterials.frostedSubtle}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-neutral-500" />
          <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
            Itinerario del Paquete
          </h4>
          <span className="text-xs text-neutral-400">
            ({destinos.length} destino{destinos.length === 1 ? "" : "s"})
          </span>
        </div>
        <span className="text-sm font-mono font-bold text-neutral-800">
          {nochesTotales}n
        </span>
      </div>

      {destinos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Route className="h-10 w-10 text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-500">
            Este paquete todavía no tiene destinos.
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">
            Agregá el primero para poder armar opciones hoteleras.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {destinos.map((destino, idx) => (
            <DestinoRow
              key={destino.id}
              destino={destino}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === destinos.length - 1}
              canEdit={canEdit}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <div className="mt-3">
          <AddDestinoRow onAdd={onAdd} existingCiudadIds={destinos.map((d) => d.ciudadId)} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DestinoRow — single row in the itinerary
// ---------------------------------------------------------------------------

function DestinoRow({
  destino,
  index,
  isFirst,
  isLast,
  canEdit,
  onUpdate,
  onDelete,
  onMove,
}: {
  destino: PaqueteDestino;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  onUpdate: (
    destino: PaqueteDestino,
    patch: Partial<PaqueteDestino>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
}) {
  const serviceState = useServiceState();
  const ciudad = useMemo(() => {
    for (const aloj of serviceState.alojamientos) {
      if (aloj.ciudad?.id === destino.ciudadId) return aloj.ciudad;
    }
    return null;
  }, [serviceState.alojamientos, destino.ciudadId]);

  const [noches, setNoches] = useState<string>(String(destino.noches));
  useEffect(() => {
    setNoches(String(destino.noches));
  }, [destino.noches]);

  const commitNoches = () => {
    const parsed = parseInt(noches, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 365) {
      setNoches(String(destino.noches));
      return;
    }
    if (parsed !== destino.noches) {
      onUpdate(destino, { noches: parsed });
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white/70 rounded-lg border border-neutral-200/70 px-2.5 py-2">
      {/* Order controls */}
      {canEdit ? (
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={() => onMove(destino.id, "up")}
            disabled={isFirst}
            className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            title="Mover arriba"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => onMove(destino.id, "down")}
            disabled={isLast}
            className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            title="Mover abajo"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {/* Index badge */}
      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-teal-50 border border-teal-200 text-xs font-mono font-semibold text-teal-700 flex-shrink-0">
        {index + 1}
      </span>

      {/* City name */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <MapPin className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
        <span className="text-sm font-medium text-neutral-800 truncate">
          {ciudad?.nombre ?? "(ciudad no encontrada)"}
        </span>
      </div>

      {/* Nights input */}
      {canEdit ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            min={0}
            max={365}
            value={noches}
            onChange={(e) => setNoches(e.target.value)}
            onBlur={commitNoches}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-14 text-sm font-mono font-semibold text-neutral-800 bg-white rounded-md border border-neutral-200 px-2 py-1 focus:border-teal-500 focus:outline-none text-center"
          />
          <span className="text-xs text-neutral-500">noches</span>
        </div>
      ) : (
        <span className="text-sm font-mono font-semibold text-neutral-800 flex-shrink-0">
          {destino.noches}n
        </span>
      )}

      {/* Delete */}
      {canEdit && (
        <button
          onClick={() => onDelete(destino.id)}
          className="p-1 rounded hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors flex-shrink-0"
          title="Eliminar destino"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddDestinoRow — form to append a new destino
// ---------------------------------------------------------------------------

function AddDestinoRow({
  onAdd,
  existingCiudadIds,
}: {
  onAdd: (ciudadId: string, noches: number) => Promise<void>;
  existingCiudadIds: string[];
}) {
  const serviceState = useServiceState();
  // Build a de-duplicated list of ciudades from the catalog that aren't
  // already destinos in this paquete.
  const ciudades = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; nombre: string; paisNombre: string }
    >();
    for (const aloj of serviceState.alojamientos) {
      if (!aloj.ciudad?.id) continue;
      if (byId.has(aloj.ciudad.id)) continue;
      byId.set(aloj.ciudad.id, {
        id: aloj.ciudad.id,
        nombre: aloj.ciudad.nombre,
        paisNombre: (aloj as any).pais?.nombre ?? "",
      });
    }
    return Array.from(byId.values())
      .filter((c) => !existingCiudadIds.includes(c.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [serviceState.alojamientos, existingCiudadIds]);

  const [ciudadId, setCiudadId] = useState<string>("");
  const [noches, setNoches] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!ciudadId) return;
    const n = parseInt(noches, 10);
    if (Number.isNaN(n) || n < 0 || n > 365) return;
    setSaving(true);
    try {
      await onAdd(ciudadId, n);
      setCiudadId("");
      setNoches("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white/40 rounded-lg border border-dashed border-neutral-300 px-2.5 py-2">
      <Plus className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
      <select
        value={ciudadId}
        onChange={(e) => setCiudadId(e.target.value)}
        className="flex-1 text-sm bg-white/80 rounded-md border border-neutral-200 px-2 py-1 focus:border-teal-500 focus:outline-none"
      >
        <option value="">— Elegir ciudad —</option>
        {ciudades.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.paisNombre ? ` · ${c.paisNombre}` : ""}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        max={365}
        value={noches}
        onChange={(e) => setNoches(e.target.value)}
        placeholder="n"
        className="w-14 text-sm font-mono font-semibold text-neutral-800 bg-white rounded-md border border-neutral-200 px-2 py-1 focus:border-teal-500 focus:outline-none text-center"
      />
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={!ciudadId || !noches || saving}
        leftIcon={
          saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )
        }
      >
        Agregar
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OpcionCard — one row per destino with single-step hotel selector
// ---------------------------------------------------------------------------

interface PoolEntry {
  pa: { id: string };
  alojamiento: Alojamiento;
  precio: { precioPorNoche: number } | undefined;
  ciudadId: string | null;
  ciudadNombre: string | null;
}

interface OpcionCardProps {
  opcion: OpcionHotelera;
  destinos: PaqueteDestino[];
  pool: PoolEntry[];
  preciosAlojamiento: PrecioAlojamiento[];
  netoFijos: number;
  canEdit: boolean;
  onUpdateName: (opcion: OpcionHotelera, newName: string) => void;
  onDelete: (id: string) => void;
  onUpdateFactor: (opcion: OpcionHotelera, newFactor: number) => void;
  onUpsertHotel: (
    opcionHoteleraId: string,
    destinoId: string,
    alojamientoId: string,
  ) => Promise<OpcionHotel>;
  onDeleteHotel: (id: string) => Promise<void>;
  onOpenCatalogPicker: () => void;
}

function OpcionCard({
  opcion,
  destinos,
  pool,
  preciosAlojamiento,
  netoFijos,
  canEdit,
  onUpdateName,
  onDelete,
  onUpdateFactor,
  onUpsertHotel,
  onDeleteHotel,
  onOpenCatalogPicker,
}: OpcionCardProps) {
  const opcionHoteles = useOpcionHoteles(opcion.id);

  // Lookup: destinoId → OpcionHotel row (null if no hotel assigned yet)
  const hotelPorDestino = useMemo(() => {
    const map = new Map<string, OpcionHotel>();
    for (const oh of opcionHoteles) {
      map.set(oh.destinoId, oh);
    }
    return map;
  }, [opcionHoteles]);

  // Neto alojamientos: sum of (precioPorNoche × destino.noches) for each destino
  // that has a hotel assigned.
  const netoAloj = useMemo(() => {
    let total = 0;
    for (const destino of destinos) {
      const oh = hotelPorDestino.get(destino.id);
      if (!oh) continue;
      const entry = pool.find((p) => p.alojamiento.id === oh.alojamientoId);
      // If not in pool, fall back to looking up the price directly.
      const precio =
        entry?.precio ??
        preciosAlojamiento.find((p) => p.alojamientoId === oh.alojamientoId);
      if (!precio) continue;
      total += precio.precioPorNoche * destino.noches;
    }
    return total;
  }, [destinos, hotelPorDestino, pool, preciosAlojamiento]);

  const destinosSinHotel = destinos.filter((d) => !hotelPorDestino.has(d.id));
  const netoTotal = netoFijos + netoAloj;
  const precioVenta = calcularVentaOpcion(netoFijos, netoAloj, opcion.factor);
  const margenValor = precioVenta - netoTotal;
  const margenPct = netoTotal > 0 ? (margenValor / precioVenta) * 100 : 0;

  // Factor draft (commit on blur)
  const [factorDraft, setFactorDraft] = useState<string>(
    opcion.factor.toString(),
  );
  useEffect(() => {
    setFactorDraft(opcion.factor.toString());
  }, [opcion.factor]);

  const commitFactor = () => {
    const parsed = parseFloat(factorDraft);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setFactorDraft(opcion.factor.toString());
      return;
    }
    const clamped = Math.max(0.01, Math.min(1, parsed));
    if (clamped !== opcion.factor) {
      onUpdateFactor(opcion, clamped);
    }
    setFactorDraft(clamped.toString());
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={springs.gentle}
      className="mb-4"
    >
      <div className="rounded-2xl p-5" style={frostedAccent}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {canEdit ? (
              <input
                type="text"
                value={opcion.nombre}
                onChange={(e) => onUpdateName(opcion, e.target.value)}
                className="text-base font-semibold text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-teal-500 focus:outline-none transition-colors px-0 py-0.5"
              />
            ) : (
              <span className="text-base font-semibold text-neutral-800">
                {opcion.nombre}
              </span>
            )}
            {destinos.length > 1 && (
              <span className="text-[10px] uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 font-semibold">
                Multi-destino · {destinos.length} ciudades
              </span>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => onDelete(opcion.id)}
              className="p-1 rounded hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
              title="Eliminar opcion"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* One slot per destino */}
        <div className="space-y-3">
          {destinos.map((destino) => (
            <DestinoSlot
              key={destino.id}
              destino={destino}
              opcionId={opcion.id}
              hotelAsignado={hotelPorDestino.get(destino.id) ?? null}
              pool={pool}
              preciosAlojamiento={preciosAlojamiento}
              canEdit={canEdit}
              onUpsertHotel={onUpsertHotel}
              onDeleteHotel={onDeleteHotel}
              onOpenCatalogPicker={onOpenCatalogPicker}
            />
          ))}
        </div>

        {/* Validation warnings */}
        {destinosSinHotel.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">
              Falta hotel en{" "}
              {destinosSinHotel.length === 1 ? "el destino" : "los destinos"}:{" "}
              {destinosSinHotel.length}
            </span>
          </div>
        )}

        {/* Pricing */}
        <div className="mt-4 pt-3 border-t border-teal-200/40">
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <span>Neto Alojamientos</span>
              <span className="font-mono">{formatCurrency(netoAloj)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>+ Costos Fijos</span>
              <span className="font-mono">{formatCurrency(netoFijos)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-neutral-800 font-semibold">
              <span>= Neto Total</span>
              <span className="font-mono">{formatCurrency(netoTotal)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-semibold">
                Factor
              </label>
              {canEdit ? (
                <motion.input
                  key={`factor-${opcion.factor}`}
                  initial={{ boxShadow: "0 0 0 3px rgba(20,184,166,0.4)" }}
                  animate={{ boxShadow: "0 0 0 0px rgba(20,184,166,0)" }}
                  transition={{ duration: 0.45 }}
                  type="number"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={factorDraft}
                  onChange={(e) => setFactorDraft(e.target.value)}
                  onBlur={commitFactor}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-24 text-base font-mono font-bold text-neutral-800 bg-white rounded-lg border-2 border-teal-300 px-2 py-1.5 focus:border-teal-500 focus:outline-none text-center shadow-sm"
                />
              ) : (
                <span className="text-base font-mono font-bold text-neutral-800">
                  {opcion.factor.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] uppercase tracking-wide text-neutral-500 font-semibold">
                  Precio Venta
                </span>
                <motion.span
                  key={`venta-${precioVenta}`}
                  initial={{ scale: 1.08, color: "#0D9488" }}
                  animate={{ scale: 1, color: "#1F2937" }}
                  transition={{ duration: 0.3 }}
                  className="text-xl font-mono font-bold"
                >
                  {formatCurrency(precioVenta)}
                </motion.span>
              </div>
              {netoTotal > 0 && (
                <span className="text-[11px] text-neutral-500 font-mono">
                  Margen {margenPct.toFixed(1)}% ·{" "}
                  {formatCurrency(margenValor)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// DestinoSlot — single-click hotel picker for a destino inside an opcion
// ---------------------------------------------------------------------------

function DestinoSlot({
  destino,
  opcionId,
  hotelAsignado,
  pool,
  preciosAlojamiento,
  canEdit,
  onUpsertHotel,
  onDeleteHotel,
  onOpenCatalogPicker,
}: {
  destino: PaqueteDestino;
  opcionId: string;
  hotelAsignado: OpcionHotel | null;
  pool: PoolEntry[];
  preciosAlojamiento: PrecioAlojamiento[];
  canEdit: boolean;
  onUpsertHotel: (
    opcionHoteleraId: string,
    destinoId: string,
    alojamientoId: string,
  ) => Promise<OpcionHotel>;
  onDeleteHotel: (id: string) => Promise<void>;
  onOpenCatalogPicker: () => void;
}) {
  const serviceState = useServiceState();
  const ciudadNombre = useMemo(() => {
    for (const aloj of serviceState.alojamientos) {
      if (aloj.ciudad?.id === destino.ciudadId) return aloj.ciudad.nombre;
    }
    return "(ciudad)";
  }, [serviceState.alojamientos, destino.ciudadId]);

  // Hoteles del pool filtrados por la ciudad del destino.
  const hotelesDisponibles = useMemo(
    () => pool.filter((p) => p.ciudadId === destino.ciudadId),
    [pool, destino.ciudadId],
  );

  const hotelAsignadoEntry = useMemo(() => {
    if (!hotelAsignado) return null;
    return (
      pool.find((p) => p.alojamiento.id === hotelAsignado.alojamientoId) ??
      null
    );
  }, [hotelAsignado, pool]);

  const precioAsignado = useMemo(() => {
    if (!hotelAsignado) return null;
    return (
      hotelAsignadoEntry?.precio ??
      preciosAlojamiento.find(
        (p) => p.alojamientoId === hotelAsignado.alojamientoId,
      ) ??
      null
    );
  }, [hotelAsignado, hotelAsignadoEntry, preciosAlojamiento]);

  const subtotal = precioAsignado
    ? precioAsignado.precioPorNoche * destino.noches
    : 0;

  const handleSelectChange = (alojamientoId: string) => {
    if (alojamientoId === "") {
      if (hotelAsignado) onDeleteHotel(hotelAsignado.id);
      return;
    }
    onUpsertHotel(opcionId, destino.id, alojamientoId);
  };

  return (
    <div className="rounded-xl p-3 bg-white/50 border border-teal-200/50">
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin className="h-3.5 w-3.5 text-teal-600" />
        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
          {ciudadNombre}
        </span>
        <span className="text-[10px] text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full px-1.5 py-0.5 font-mono">
          {destino.noches}n
        </span>
      </div>

      {hotelesDisponibles.length === 0 ? (
        <div className="flex items-center justify-between gap-2 text-xs text-neutral-400 italic px-2 py-1">
          <span>Sin hoteles en el pool para esta ciudad.</span>
          {canEdit && (
            <button
              onClick={onOpenCatalogPicker}
              className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors whitespace-nowrap not-italic"
            >
              <Plus className="h-3 w-3" />
              Traer del catálogo
            </button>
          )}
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-2">
          <select
            value={hotelAsignado?.alojamientoId ?? ""}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="flex-1 text-sm bg-white/80 rounded-md border border-neutral-200 px-2 py-1.5 focus:border-teal-500 focus:outline-none transition-colors"
          >
            <option value="">— Elegir hotel —</option>
            {hotelesDisponibles.map((h) => (
              <option key={h.alojamiento.id} value={h.alojamiento.id}>
                {"★".repeat(h.alojamiento.categoria ?? 0)}{" "}
                {h.alojamiento.nombre}
                {h.precio
                  ? ` · ${formatCurrency(h.precio.precioPorNoche)}/n`
                  : ""}
              </option>
            ))}
          </select>
          {hotelAsignado && precioAsignado && (
            <span className="text-xs font-mono text-neutral-700 whitespace-nowrap flex-shrink-0">
              {formatCurrency(precioAsignado.precioPorNoche)}/n ×{" "}
              {destino.noches}n ={" "}
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </span>
          )}
        </div>
      ) : (
        <div className="text-sm text-neutral-700 px-2 py-1">
          {hotelAsignadoEntry
            ? hotelAsignadoEntry.alojamiento.nombre
            : "— sin hotel asignado —"}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HotelPickerModal — Select2-style combobox for the pool
// ---------------------------------------------------------------------------

interface HotelPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotels: Alojamiento[];
  onPick: (hotel: Alojamiento) => void;
}

function HotelPickerModal({
  open,
  onOpenChange,
  hotels,
  onPick,
}: HotelPickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter((h) => {
      const haystack = [h.nombre, h.ciudad?.nombre ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [hotels, search]);

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [filtered.length, activeIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) onPick(target);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm">
      <ModalHeader
        title="Agregar hotel"
        description="Buscá por nombre o ciudad."
      />
      <ModalBody>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí para buscar…"
              className="pl-9"
            />
            {filtered.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400 font-mono">
                {filtered.length}
              </span>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto -mx-1 px-1 rounded-lg">
            {filtered.length === 0 ? (
              <div className="text-sm text-neutral-400 text-center py-8 italic">
                {search.trim() ? "Sin resultados." : "No hay hoteles disponibles."}
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filtered.map((h, i) => {
                  const active = i === activeIndex;
                  return (
                    <li key={h.id}>
                      <button
                        onClick={() => onPick(h)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`w-full flex items-center gap-3 py-2 px-2.5 text-left transition-colors ${
                          active ? "bg-teal-50/80" : "hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center gap-0.5 flex-shrink-0 w-[52px]">
                          {h.categoria && h.categoria > 0 ? (
                            <>
                              <span className="text-[11px] font-mono font-semibold text-amber-600">
                                {h.categoria}
                              </span>
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            </>
                          ) : (
                            <span className="text-[11px] text-neutral-300">
                              —
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-neutral-800 truncate">
                            {h.nombre}
                          </div>
                          {h.ciudad?.nombre && (
                            <div className="text-[11px] text-neutral-500 truncate">
                              {h.ciudad.nombre}
                            </div>
                          )}
                        </div>
                        <Plus
                          className={`h-4 w-4 flex-shrink-0 transition-colors ${
                            active ? "text-teal-600" : "text-neutral-300"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 text-center pt-1">
            ↑/↓ para navegar · Enter para agregar · Esc para cerrar
          </p>
        </div>
      </ModalBody>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// QuickEditHotelModal — inline editor for hotel basics + nightly price
// ---------------------------------------------------------------------------

interface QuickEditHotelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotelId: string | null;
  hotels: Alojamiento[];
  preciosAlojamiento: Array<{
    id: string;
    alojamientoId: string;
    periodoDesde: string;
    periodoHasta: string;
    precioPorNoche: number;
    regimenId: string;
  }>;
  validezDesde: string;
  onUpdateHotel: (hotel: Alojamiento) => Promise<void> | void;
  onCreatePrecio: (data: {
    alojamientoId: string;
    periodoDesde: string;
    periodoHasta: string;
    precioPorNoche: number;
    regimenId: string;
  }) => Promise<unknown> | unknown;
  onUpdatePrecio: (precio: {
    id: string;
    alojamientoId: string;
    periodoDesde: string;
    periodoHasta: string;
    precioPorNoche: number;
    regimenId: string;
  }) => Promise<void> | void;
  onSaved: (nombre: string) => void;
}

function QuickEditHotelModal({
  open,
  onOpenChange,
  hotelId,
  hotels,
  preciosAlojamiento,
  validezDesde,
  onUpdateHotel,
  onCreatePrecio,
  onUpdatePrecio,
  onSaved,
}: QuickEditHotelModalProps) {
  const hotel = useMemo(
    () => hotels.find((h) => h.id === hotelId) ?? null,
    [hotels, hotelId],
  );

  const precioActivo = useMemo(() => {
    if (!hotelId) return null;
    const all = preciosAlojamiento.filter((p) => p.alojamientoId === hotelId);
    const match = all.find(
      (p) => validezDesde >= p.periodoDesde && validezDesde <= p.periodoHasta,
    );
    if (match) return match;
    const sorted = [...all].sort((a, b) =>
      b.periodoDesde.localeCompare(a.periodoDesde),
    );
    return sorted[0] ?? null;
  }, [hotelId, preciosAlojamiento, validezDesde]);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<number>(0);
  const [sitioWeb, setSitioWeb] = useState("");
  const [precio, setPrecio] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hotel) return;
    setNombre(hotel.nombre ?? "");
    setCategoria(hotel.categoria ?? 0);
    setSitioWeb(hotel.sitioWeb ?? "");
    setPrecio(precioActivo ? String(precioActivo.precioPorNoche) : "");
  }, [hotel, precioActivo]);

  if (!hotel) return null;

  const handleSave = async () => {
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) return;
    const parsedPrecio = precio === "" ? null : Number(precio);
    if (
      parsedPrecio !== null &&
      (Number.isNaN(parsedPrecio) || parsedPrecio < 0)
    ) {
      return;
    }
    setSaving(true);
    try {
      await onUpdateHotel({
        ...hotel,
        nombre: trimmedNombre,
        categoria,
        sitioWeb: sitioWeb.trim() || null,
      });

      if (parsedPrecio !== null) {
        if (precioActivo) {
          if (precioActivo.precioPorNoche !== parsedPrecio) {
            await onUpdatePrecio({
              ...precioActivo,
              precioPorNoche: parsedPrecio,
            });
          }
        } else {
          const year = new Date(
            validezDesde || new Date().toISOString(),
          ).getFullYear();
          await onCreatePrecio({
            alojamientoId: hotel.id,
            periodoDesde: `${year}-01-01`,
            periodoHasta: `${year}-12-31`,
            precioPorNoche: parsedPrecio,
            regimenId: "",
          });
        }
      }

      onSaved(trimmedNombre);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm">
      <ModalHeader
        title="Edición rápida del hotel"
        description="Cambios menores sin abandonar el paquete."
      />
      <ModalBody>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Nombre
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del hotel"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Categoría
            </label>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCategoria(n)}
                  className={`flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-lg border text-xs font-medium transition-colors ${
                    categoria === n
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "bg-white/70 border-neutral-200 text-neutral-500 hover:border-amber-200"
                  }`}
                >
                  {n === 0 ? (
                    "—"
                  ) : (
                    <span className="flex items-center">
                      {Array.from({ length: n }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Sitio web
            </label>
            <Input
              value={sitioWeb}
              onChange={(e) => setSitioWeb(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Precio por noche (USD)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              {precioActivo
                ? `Actualiza el precio del periodo ${precioActivo.periodoDesde} → ${precioActivo.periodoHasta}.`
                : "No hay precio cargado — se creará uno anual."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !nombre.trim()}
              leftIcon={
                saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )
              }
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
