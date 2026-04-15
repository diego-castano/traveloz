"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import {
  usePaqueteServices,
  usePackageActions,
  useOpcionesHoteleras,
} from "@/components/providers/PackageProvider";
import {
  useAlojamientos,
  useServiceState,
} from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import {
  calcularNetoFijos,
  calcularVentaOpcion,
  resolvePrecioAlojamiento,
  resolvePrecioAereo,
  resolvePrecioCircuito,
  formatCurrency,
} from "@/lib/utils";
import type { Paquete, Alojamiento, OpcionHotelera } from "@/lib/types";
import { glassMaterials } from "@/components/lib/glass";
import { springs, stagger } from "@/components/lib/animations";

// ---------------------------------------------------------------------------
// Props & helpers
// ---------------------------------------------------------------------------

interface AlojamientosTabProps {
  paquete: Paquete;
}

const NO_CITY_KEY = "__sin_ciudad__";

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
  const {
    assignAlojamiento,
    removeAlojamiento,
    updateAlojamientoAssignment,
    createOpcionHotelera,
    updateOpcionHotelera,
    deleteOpcionHotelera,
  } = usePackageActions();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCiudadFilter, setPickerCiudadFilter] = useState<string | null>(
    null,
  );
  const [pickerSearch, setPickerSearch] = useState("");

  // -------------------------------------------------------------------------
  // Pool resolution (hotels currently assigned to the paquete)
  // -------------------------------------------------------------------------

  const pool = useMemo(() => {
    // Pass 1: resolve each hotel + ciudad
    const raw = services.alojamientos
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

    // Detect multi-destino from the resolved pool
    const distinctCities = new Set(
      raw.map((r) => r.ciudadId ?? NO_CITY_KEY),
    );
    const isMulti = distinctCities.size >= 2;

    // Pass 2: compute nochesEnEste default — in multi-destino, avoid falling
    // back to full paquete.noches (would inflate the total via double count).
    return raw.map((r) => ({
      ...r,
      nochesEnEste:
        r.pa.nochesEnEste ?? (isMulti ? 0 : paquete.noches),
    }));
  }, [
    services.alojamientos,
    serviceState.alojamientos,
    serviceState.preciosAlojamiento,
    paquete.validezDesde,
    paquete.noches,
  ]);

  // -------------------------------------------------------------------------
  // City groups derived from the pool (single source of truth for destinos)
  // -------------------------------------------------------------------------

  const ciudadGroups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; nombre: string; hotels: typeof pool }
    >();
    for (const entry of pool) {
      const key = entry.ciudadId ?? NO_CITY_KEY;
      const nombre = entry.ciudadNombre ?? "Sin ciudad asignada";
      if (!map.has(key)) {
        map.set(key, { key, nombre, hotels: [] });
      }
      map.get(key)!.hotels.push(entry);
    }
    return Array.from(map.values());
  }, [pool]);

  const isMultiDestino = ciudadGroups.length >= 2;

  // -------------------------------------------------------------------------
  // Fixed costs summary (read-only — managed in Servicios tab)
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
      .filter((x): x is { aereo: NonNullable<typeof x>["aereo"]; precioAereo: NonNullable<typeof x>["precioAereo"] } => x !== null);

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
      const dias = s.diasCobertura ?? paquete.noches;
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
      paquete.noches,
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
  }, [services, serviceState, paquete.noches, paquete.validezDesde]);

  // -------------------------------------------------------------------------
  // Hotel picker modal — available hotels (not yet in pool)
  // -------------------------------------------------------------------------

  const availableHotels = useMemo(() => {
    const assignedIds = new Set(pool.map((p) => p.alojamiento.id));
    return allAlojamientos.filter((a) => !assignedIds.has(a.id));
  }, [allAlojamientos, pool]);

  const availableCities = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of availableHotels) {
      if (a.ciudad?.id && a.ciudad?.nombre) {
        map.set(a.ciudad.id, a.ciudad.nombre);
      }
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [availableHotels]);

  const filteredPickerHotels = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return availableHotels.filter((a) => {
      if (pickerCiudadFilter && a.ciudad?.id !== pickerCiudadFilter) {
        return false;
      }
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.ciudad?.nombre ?? "").toLowerCase().includes(q)
      );
    });
  }, [availableHotels, pickerCiudadFilter, pickerSearch]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleOpenPicker = useCallback((ciudadId?: string | null) => {
    setPickerCiudadFilter(ciudadId ?? null);
    setPickerSearch("");
    setPickerOpen(true);
  }, []);

  const handleAddHotelToPool = useCallback(
    (aloj: Alojamiento) => {
      const nextOrden = pool.length;
      assignAlojamiento({
        paqueteId: paquete.id,
        alojamientoId: aloj.id,
        nochesEnEste: null,
        textoDisplay: null,
        orden: nextOrden,
      });
      toast("success", "Hotel agregado al paquete", aloj.nombre);
      setPickerOpen(false);
    },
    [assignAlojamiento, paquete.id, pool.length, toast],
  );

  const handleRemoveHotelFromPool = useCallback(
    (paqueteAlojId: string, alojamientoId: string) => {
      // Cascade: remove this hotel from any opcion that references it
      for (const op of opciones) {
        if (op.alojamientoIds.includes(alojamientoId)) {
          const newIds = op.alojamientoIds.filter((id) => id !== alojamientoId);
          updateOpcionHotelera({ ...op, alojamientoIds: newIds });
        }
      }
      removeAlojamiento(paqueteAlojId);
      toast("success", "Hotel removido del paquete");
    },
    [opciones, removeAlojamiento, updateOpcionHotelera, toast],
  );

  const handleUpdateNoches = useCallback(
    (paqueteAlojId: string, newNoches: number) => {
      const clamped = Math.max(0, Math.min(365, Math.round(newNoches) || 0));
      const existing = services.alojamientos.find((pa) => pa.id === paqueteAlojId);
      if (!existing) return;
      updateAlojamientoAssignment({ ...existing, nochesEnEste: clamped });
    },
    [services.alojamientos, updateAlojamientoAssignment],
  );

  const handleCreateOpcion = useCallback(() => {
    const nextOrden = opciones.length + 1;
    const defaultName = `Opcion ${nextOrden}`;
    createOpcionHotelera({
      paqueteId: paquete.id,
      nombre: defaultName,
      alojamientoIds: [],
      factor: 0.9,
      precioVenta: 0,
      orden: nextOrden,
    });
    toast("success", "Opcion hotelera creada", `Configura los hoteles en ${defaultName}`);
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

  // Compute net alojamientos for an opcion from current pool entries
  const computeNetoAlojForOpcion = useCallback(
    (opcion: OpcionHotelera) => {
      let total = 0;
      for (const id of opcion.alojamientoIds) {
        const entry = pool.find((p) => p.alojamiento.id === id);
        if (!entry || !entry.precio) continue;
        total += entry.precio.precioPorNoche * entry.nochesEnEste;
      }
      return total;
    },
    [pool],
  );

  const handleUpdateOpcionFactor = useCallback(
    (opcion: OpcionHotelera, rawFactor: number) => {
      const factor = Math.max(0.01, Math.min(1, Number(rawFactor.toFixed(3))));
      const netoAloj = computeNetoAlojForOpcion(opcion);
      const precioVenta = calcularVentaOpcion(netoFijos, netoAloj, factor);
      updateOpcionHotelera({ ...opcion, factor, precioVenta });
    },
    [computeNetoAlojForOpcion, netoFijos, updateOpcionHotelera],
  );

  // Replace or remove the hotel assigned to a specific city inside an opcion.
  // Keeps other cities' selections intact.
  const handleSelectHotelForCity = useCallback(
    (
      opcion: OpcionHotelera,
      ciudadKey: string,
      newHotelId: string | null,
    ) => {
      const otherCityIds = opcion.alojamientoIds.filter((id) => {
        const entry = pool.find((p) => p.alojamiento.id === id);
        const key = entry?.ciudadId ?? NO_CITY_KEY;
        return key !== ciudadKey;
      });
      const newIds = newHotelId ? [...otherCityIds, newHotelId] : otherCityIds;
      updateOpcionHotelera({ ...opcion, alojamientoIds: newIds });
    },
    [pool, updateOpcionHotelera],
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
      {/* ── 1. Pool de hoteles del paquete ── */}
      <motion.div variants={stagger.item.variants}>
        <div className="rounded-2xl p-5" style={glassMaterials.frostedSubtle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hotel className="h-4 w-4 text-neutral-500" />
              <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
                Pool de Hoteles
              </h4>
              <span className="text-xs text-neutral-400">
                ({pool.length} hotel{pool.length === 1 ? "" : "es"})
              </span>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => handleOpenPicker(null)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
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
              <p className="text-xs text-neutral-400 mt-0.5">
                Agrega al menos un hotel para poder crear opciones.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-neutral-400 mb-2 italic">
                Catalogo del paquete — las noches se asignan dentro de cada opcion.
              </p>
              <div className="space-y-2">
                {pool.map((entry) => (
                  <div
                    key={entry.pa.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/60 border border-white/40"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {Array.from({ length: entry.alojamiento.categoria ?? 0 }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="h-3 w-3 fill-amber-400 text-amber-400"
                            />
                          ),
                        )}
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
                              · {formatCurrency(entry.precio.precioPorNoche)}/noche
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() =>
                          handleRemoveHotelFromPool(
                            entry.pa.id,
                            entry.alojamiento.id,
                          )
                        }
                        className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                        title="Quitar del pool del paquete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── 2. Costos fijos compartidos (read-only) ── */}
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

      {/* ── 3. Opciones hoteleras ── */}
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
          {canEdit && pool.length > 0 && (
            <Button size="sm" onClick={handleCreateOpcion} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Agregar opcion
            </Button>
          )}
        </div>

        {pool.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center text-sm text-neutral-400 border border-dashed border-neutral-200"
          >
            Primero agrega hoteles al pool para poder crear opciones.
          </div>
        ) : opciones.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center text-sm text-neutral-400 border border-dashed border-neutral-200"
          >
            Aun no hay opciones hoteleras. Crea la primera para empezar.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {opciones.map((opcion) => (
              <OpcionCard
                key={opcion.id}
                opcion={opcion}
                pool={pool}
                ciudadGroups={ciudadGroups}
                isMultiDestino={isMultiDestino}
                netoFijos={netoFijos}
                paqueteNoches={paquete.noches}
                canEdit={canEdit}
                onUpdateName={handleUpdateOpcionName}
                onDelete={handleDeleteOpcion}
                onSelectHotelForCity={handleSelectHotelForCity}
                onAddHotelForCity={handleOpenPicker}
                onUpdateFactor={handleUpdateOpcionFactor}
                onUpdateNochesForHotel={handleUpdateNoches}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Hotel Picker Modal ── */}
      <HotelPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        hotels={filteredPickerHotels}
        citiesFilter={availableCities}
        activeCityFilter={pickerCiudadFilter}
        onCityFilterChange={setPickerCiudadFilter}
        search={pickerSearch}
        onSearchChange={setPickerSearch}
        onPick={handleAddHotelToPool}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// OpcionCard — single hotel option with per-city slots or flat list
// ---------------------------------------------------------------------------

interface PoolEntry {
  pa: { id: string };
  alojamiento: Alojamiento;
  precio: { precioPorNoche: number } | undefined;
  nochesEnEste: number;
  ciudadId: string | null;
  ciudadNombre: string | null;
}

interface OpcionCardProps {
  opcion: OpcionHotelera;
  pool: PoolEntry[];
  ciudadGroups: Array<{ key: string; nombre: string; hotels: PoolEntry[] }>;
  isMultiDestino: boolean;
  netoFijos: number;
  paqueteNoches: number;
  canEdit: boolean;
  onUpdateName: (opcion: OpcionHotelera, newName: string) => void;
  onDelete: (id: string) => void;
  onSelectHotelForCity: (
    opcion: OpcionHotelera,
    ciudadKey: string,
    newHotelId: string | null,
  ) => void;
  onAddHotelForCity: (ciudadId: string | null) => void;
  onUpdateFactor: (opcion: OpcionHotelera, newFactor: number) => void;
  onUpdateNochesForHotel: (paqueteAlojId: string, noches: number) => void;
}

function OpcionCard({
  opcion,
  pool,
  ciudadGroups,
  isMultiDestino,
  netoFijos,
  paqueteNoches,
  canEdit,
  onUpdateName,
  onDelete,
  onSelectHotelForCity,
  onAddHotelForCity,
  onUpdateFactor,
  onUpdateNochesForHotel,
}: OpcionCardProps) {
  // For each ciudad group, find the currently selected hotel id (if any)
  const selectedByCity = useMemo(() => {
    const map = new Map<string, PoolEntry | null>();
    for (const group of ciudadGroups) {
      const selectedId = opcion.alojamientoIds.find((id) =>
        group.hotels.some((h) => h.alojamiento.id === id),
      );
      const selected = selectedId
        ? group.hotels.find((h) => h.alojamiento.id === selectedId) ?? null
        : null;
      map.set(group.key, selected);
    }
    return map;
  }, [ciudadGroups, opcion.alojamientoIds]);

  const missingCities = ciudadGroups.filter(
    (g) => !selectedByCity.get(g.key),
  );

  // -- Selected entries for this opcion (pool items matched to alojamientoIds) --
  const selectedEntries = useMemo(() => {
    const result: PoolEntry[] = [];
    for (const id of opcion.alojamientoIds) {
      const entry = pool.find((p) => p.alojamiento.id === id);
      if (entry) result.push(entry);
    }
    return result;
  }, [opcion.alojamientoIds, pool]);

  // -- Live pricing for this opcion --
  const netoAloj = useMemo(() => {
    let total = 0;
    for (const entry of selectedEntries) {
      if (!entry.precio) continue;
      total += entry.precio.precioPorNoche * entry.nochesEnEste;
    }
    return total;
  }, [selectedEntries]);

  // -- Nights breakdown for this opcion (one line per selected city) --
  const nochesBreakdown = useMemo(() => {
    return selectedEntries.map((entry) => ({
      key: entry.ciudadId ?? "__sin_ciudad__",
      nombre: entry.ciudadNombre ?? "Sin ciudad",
      noches: entry.nochesEnEste,
    }));
  }, [selectedEntries]);

  const totalNochesOpcion = nochesBreakdown.reduce(
    (sum, b) => sum + b.noches,
    0,
  );
  const nochesOpcionMatch = totalNochesOpcion === paqueteNoches;

  const netoTotal = netoFijos + netoAloj;
  const precioVenta = calcularVentaOpcion(netoFijos, netoAloj, opcion.factor);
  const margenValor = precioVenta - netoTotal;
  const margenPct = netoTotal > 0 ? (margenValor / precioVenta) * 100 : 0;

  // Local input state so the user can type "0.8" / "0.85" without snap-commit
  const [factorDraft, setFactorDraft] = useState<string>(
    opcion.factor.toString(),
  );
  // Sync when opcion.factor changes externally
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
            {isMultiDestino && (
              <span className="text-[10px] uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 font-semibold">
                Multi-destino · {ciudadGroups.length} ciudades
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

        {/* Slots per city (or single flat slot for destino único) */}
        <div className="space-y-3">
          {ciudadGroups.map((group) => {
            const selected = selectedByCity.get(group.key);
            return (
              <CitySlot
                key={group.key}
                group={group}
                selected={selected ?? null}
                isMulti={isMultiDestino}
                canEdit={canEdit}
                onChange={(newId) =>
                  onSelectHotelForCity(opcion, group.key, newId)
                }
                onAddHotel={() => onAddHotelForCity(group.key === "__sin_ciudad__" ? null : group.key)}
                onUpdateNoches={(noches) => {
                  if (selected) onUpdateNochesForHotel(selected.pa.id, noches);
                }}
              />
            );
          })}
        </div>

        {/* Validation warnings */}
        {missingCities.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">
              Falta hotel en:{" "}
              {missingCities.map((c) => c.nombre).join(", ")}
            </span>
          </div>
        )}

        {/* Noches summary for this opcion */}
        {totalNochesOpcion > 0 && (
          <div
            className={`mt-3 flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
              nochesOpcionMatch
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-amber-50 text-amber-700 border border-amber-200/60"
            }`}
          >
            <span className="font-medium">
              {nochesBreakdown.length > 1 ? (
                <>
                  {nochesBreakdown
                    .map((b) => `${b.nombre} ${b.noches}n`)
                    .join(" + ")}
                  {" = "}
                  {totalNochesOpcion}n
                </>
              ) : (
                <>Total: {totalNochesOpcion}n</>
              )}
            </span>
            <span className="font-mono font-semibold">
              {nochesOpcionMatch ? (
                <>✓ Paquete {paqueteNoches}n</>
              ) : (
                <>⚠ Paquete {paqueteNoches}n</>
              )}
            </span>
          </div>
        )}

        {/* Pricing summary */}
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
                  Venta
                </span>
                <motion.span
                  key={precioVenta}
                  initial={{ scale: 1.18, color: "#0d9488" }}
                  animate={{ scale: 1, color: "#0f766e" }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  className="font-mono text-xl font-bold tabular-nums"
                >
                  {formatCurrency(precioVenta)}
                </motion.span>
              </div>
              {netoTotal > 0 && (
                <motion.span
                  key={`margen-${margenValor}`}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-[11px] text-neutral-500 font-mono"
                >
                  Margen {margenPct.toFixed(1)}% · {formatCurrency(margenValor)}
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CitySlot — dropdown selector for a single city's hotel within an option
// ---------------------------------------------------------------------------

interface CitySlotProps {
  group: { key: string; nombre: string; hotels: PoolEntry[] };
  selected: PoolEntry | null;
  isMulti: boolean;
  canEdit: boolean;
  onChange: (newHotelId: string | null) => void;
  onAddHotel: () => void;
  onUpdateNoches: (noches: number) => void;
}

function CitySlot({
  group,
  selected,
  isMulti,
  canEdit,
  onChange,
  onAddHotel,
  onUpdateNoches,
}: CitySlotProps) {
  return (
    <div
      className={`rounded-xl p-3 ${
        isMulti
          ? "bg-white/50 border border-teal-200/50"
          : "bg-white/40 border border-white/40"
      }`}
    >
      {isMulti && (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="h-3.5 w-3.5 text-teal-600" />
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
            {group.nombre}
          </span>
        </div>
      )}

      {group.hotels.length === 0 ? (
        <div className="text-xs text-neutral-400 italic px-2 py-1">
          No hay hoteles en el pool para esta ciudad.
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-2">
          <select
            value={selected?.alojamiento.id ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="flex-1 text-sm bg-white/80 rounded-md border border-neutral-200 px-2 py-1.5 focus:border-teal-500 focus:outline-none transition-colors"
          >
            <option value="">— Elegir hotel —</option>
            {group.hotels.map((h) => (
              <option key={h.alojamiento.id} value={h.alojamiento.id}>
                {"★".repeat(h.alojamiento.categoria ?? 0)} {h.alojamiento.nombre}
                {h.precio
                  ? ` · ${formatCurrency(h.precio.precioPorNoche)}/n × ${h.nochesEnEste}`
                  : ""}
              </option>
            ))}
          </select>
          {selected && (
            <button
              onClick={() => onChange(null)}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border border-red-200 text-red-600 bg-red-50/60 hover:bg-red-100 hover:border-red-300 transition-colors whitespace-nowrap flex-shrink-0"
              title="Quitar este hotel de la opcion (el hotel sigue en el pool del paquete)"
            >
              <X className="h-3 w-3" />
              Quitar
            </button>
          )}
          <button
            onClick={onAddHotel}
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors whitespace-nowrap"
            title="Agregar otro hotel a esta ciudad"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </div>
      ) : (
        <div className="text-sm text-neutral-700 px-2 py-1">
          {selected ? selected.alojamiento.nombre : "— sin elegir —"}
        </div>
      )}

      {selected && (
        <div className="mt-2 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500 font-mono">
              {selected.precio ? `${formatCurrency(selected.precio.precioPorNoche)}/n` : "Sin precio"}
            </span>
            <span className="text-neutral-300">×</span>
            {canEdit ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={selected.nochesEnEste}
                  onChange={(e) => onUpdateNoches(Number(e.target.value))}
                  className="w-12 text-sm font-mono font-semibold text-neutral-800 bg-white rounded-md border border-neutral-200 px-1.5 py-0.5 focus:border-teal-500 focus:outline-none text-center"
                />
                <span className="text-[11px] text-neutral-500">noches</span>
              </div>
            ) : (
              <span className="text-sm font-mono font-semibold text-neutral-800">
                {selected.nochesEnEste} noches
              </span>
            )}
          </div>
          <span className="font-mono text-sm font-bold text-neutral-800">
            {selected.precio
              ? `= ${formatCurrency(selected.precio.precioPorNoche * selected.nochesEnEste)}`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HotelPickerModal — modal to add a hotel to the paquete pool from catalog
// ---------------------------------------------------------------------------

interface HotelPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotels: Alojamiento[];
  citiesFilter: Array<{ id: string; nombre: string }>;
  activeCityFilter: string | null;
  onCityFilterChange: (id: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onPick: (hotel: Alojamiento) => void;
}

function HotelPickerModal({
  open,
  onOpenChange,
  hotels,
  citiesFilter,
  activeCityFilter,
  onCityFilterChange,
  search,
  onSearchChange,
  onPick,
}: HotelPickerModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="md">
      <ModalHeader
        title="Agregar hotel al paquete"
        description="Selecciona un hotel del catalogo para agregarlo al pool."
      />
      <ModalBody>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nombre o ciudad..."
              className="pl-9"
            />
          </div>

          {citiesFilter.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onCityFilterChange(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeCityFilter === null
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-teal-300"
                }`}
              >
                Todas
              </button>
              {citiesFilter.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCityFilterChange(c.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activeCityFilter === c.id
                      ? "bg-teal-500 text-white border-teal-500"
                      : "bg-white border-neutral-200 text-neutral-600 hover:border-teal-300"
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-[360px] overflow-y-auto space-y-1.5 -mx-1 px-1">
            {hotels.length === 0 ? (
              <div className="text-sm text-neutral-400 text-center py-8 italic">
                No hay hoteles disponibles con esos filtros.
              </div>
            ) : (
              hotels.map((h) => (
                <button
                  key={h.id}
                  onClick={() => onPick(h)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-neutral-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {Array.from({ length: h.categoria ?? 0 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-800 truncate">
                        {h.nombre}
                      </div>
                      {h.ciudad?.nombre && (
                        <div className="text-xs text-neutral-500">
                          {h.ciudad.nombre}
                        </div>
                      )}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-teal-500 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
