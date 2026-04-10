"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AutoSaveIndicator } from "@/components/ui/AutoSaveIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  Plane,
  Hotel,
  Bus,
  ShieldCheck,
  Map as MapIcon,
  Plus,
  Trash2,
  Star,
  DollarSign,
  TrendingUp,
  X,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  usePaqueteServices,
  usePackageActions,
  useOpcionesHoteleras,
} from "@/components/providers/PackageProvider";
import { useServiceState } from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import {
  calcularNetoFijos,
  calcularNetoAlojamientos,
  calcularVentaOpcion,
  formatCurrency,
} from "@/lib/utils";
import type { Paquete, OpcionHotelera } from "@/lib/types";
import { glassMaterials } from "@/components/lib/glass";
import { springs, stagger } from "@/components/lib/animations";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreciosTabProps {
  paquete: Paquete;
}

// ---------------------------------------------------------------------------
// Frosted accent style for option cards
// ---------------------------------------------------------------------------

const frostedAccent = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(24px) saturate(190%)",
  WebkitBackdropFilter: "blur(24px) saturate(190%)",
  border: "1px solid rgba(59,191,173,0.2)",
  boxShadow:
    "0 8px 32px rgba(26,26,46,0.06), 0 2px 6px rgba(26,26,46,0.04), inset 0 2px 0 rgba(255,255,255,0.4)",
} as const;

// ---------------------------------------------------------------------------
// Fixed cost config
// ---------------------------------------------------------------------------

const fixedCostConfig = [
  { key: "aereos" as const, label: "Aereos", icon: Plane },
  { key: "traslados" as const, label: "Traslados", icon: Bus },
  { key: "seguros" as const, label: "Seguros", icon: ShieldCheck },
  { key: "circuitos" as const, label: "Circuitos", icon: MapIcon },
] as const;

// ---------------------------------------------------------------------------
// Margin bar color helper
// ---------------------------------------------------------------------------

function getMarginColor(factor: number): string {
  const margin = 1 - factor;
  // 0% = red, 15% = amber, 30%+ = green
  if (margin < 0.1) return "#E74C5F";
  if (margin < 0.2) return "#F59E0B";
  return "#3BBFAD";
}

function getMarginGradient(factor: number): string {
  const margin = 1 - factor;
  if (margin < 0.1) return "linear-gradient(90deg, #E74C5F 0%, #E74C5F 100%)";
  if (margin < 0.2)
    return "linear-gradient(90deg, #F59E0B 0%, #E74C5F 100%)";
  return "linear-gradient(90deg, #3BBFAD 0%, #F59E0B 100%)";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreciosTab({ paquete }: PreciosTabProps) {
  const services = usePaqueteServices(paquete.id);
  const serviceState = useServiceState();
  const {
    updatePaquete,
    createOpcionHotelera,
    updateOpcionHotelera,
    deleteOpcionHotelera,
  } = usePackageActions();
  const { canSeePricing, canEdit } = useAuth();
  const { toast } = useToast();
  const opciones = useOpcionesHoteleras(paquete.id);

  // -- New option form state --
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSelectedAlojIds, setNewSelectedAlojIds] = useState<string[]>([]);

  // -- Edit hotel selection state (which option is being edited) --
  const [editingHotelsOpcionId, setEditingHotelsOpcionId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Resolve services for fixed cost calculation
  // -------------------------------------------------------------------------

  const { assignedAereos, assignedAlojamientos, assignedTraslados, assignedSeguros, assignedCircuitos } =
    useMemo(() => {
      const aer = services.aereos.map((pa) => {
        const aereo = serviceState.aereos.find((a) => a.id === pa.aereoId)!;
        const precioAereo = serviceState.preciosAereo.find(
          (p) => p.aereoId === pa.aereoId,
        );
        return { aereo, precioAereo };
      });

      const aloj = services.alojamientos.map((pa) => {
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

      const tras = services.traslados.map(
        (pt) => serviceState.traslados.find((t) => t.id === pt.trasladoId)!,
      );

      const seg = services.seguros.map((ps) => {
        const seguro = serviceState.seguros.find((s) => s.id === ps.seguroId)!;
        return { seguro, diasCobertura: ps.diasCobertura ?? undefined };
      });

      const circ = services.circuitos.map((pc) => {
        const circuito = serviceState.circuitos.find(
          (c) => c.id === pc.circuitoId,
        )!;
        const precioCircuito = serviceState.preciosCircuito.find(
          (p) => p.circuitoId === pc.circuitoId,
        );
        return { circuito, precioCircuito };
      });

      return {
        assignedAereos: aer,
        assignedAlojamientos: aloj,
        assignedTraslados: tras,
        assignedSeguros: seg,
        assignedCircuitos: circ,
      };
    }, [services, serviceState]);

  // -------------------------------------------------------------------------
  // Fixed cost breakdown
  // -------------------------------------------------------------------------

  const { netoFijos, fixedBreakdown } = useMemo(() => {
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
  }, [assignedAereos, assignedTraslados, assignedSeguros, assignedCircuitos, paquete.noches]);

  // -------------------------------------------------------------------------
  // Per-option pricing
  // -------------------------------------------------------------------------

  const opcionPricing = useMemo(() => {
    return opciones.map((opcion) => {
      const netoAloj = calcularNetoAlojamientos(
        opcion.alojamientoIds,
        assignedAlojamientos,
        paquete.noches,
      );
      const ventaCalc = calcularVentaOpcion(netoFijos, netoAloj, opcion.factor);
      const margin = Math.round((1 - opcion.factor) * 100);

      // Resolve hotel details
      const hotels = opcion.alojamientoIds.map((id) => {
        const found = assignedAlojamientos.find(
          (a) => a.alojamiento.id === id,
        );
        const aloj = found?.alojamiento ?? serviceState.alojamientos.find((a) => a.id === id);
        const precio = found?.precioAlojamiento ?? serviceState.preciosAlojamiento.find(
          (p) => p.alojamientoId === id,
        );
        const noches = found?.nochesEnEste ?? paquete.noches;
        return {
          id,
          nombre: aloj?.nombre ?? "Hotel desconocido",
          categoria: aloj?.categoria ?? 0,
          precioPorNoche: precio?.precioPorNoche ?? 0,
          noches,
          subtotal: (precio?.precioPorNoche ?? 0) * noches,
        };
      });

      return {
        opcion,
        netoAloj,
        ventaCalc,
        margin,
        hotels,
      };
    });
  }, [opciones, assignedAlojamientos, netoFijos, paquete.noches, serviceState.alojamientos, serviceState.preciosAlojamiento]);

  // -------------------------------------------------------------------------
  // Price range for header
  // -------------------------------------------------------------------------

  const priceRange = useMemo(() => {
    if (opcionPricing.length === 0) return null;
    const precios = opcionPricing.map((op) => op.opcion.precioVenta);
    return {
      min: Math.min(...precios),
      max: Math.max(...precios),
    };
  }, [opcionPricing]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleFactorChange = useCallback(
    (opcion: OpcionHotelera, newFactor: number) => {
      const clamped = Math.max(0.01, Math.min(1, newFactor));
      const netoAloj = calcularNetoAlojamientos(
        opcion.alojamientoIds,
        assignedAlojamientos,
        paquete.noches,
      );
      const newVenta = calcularVentaOpcion(netoFijos, netoAloj, clamped);
      updateOpcionHotelera({
        ...opcion,
        factor: clamped,
        precioVenta: newVenta,
      });
    },
    [assignedAlojamientos, netoFijos, paquete.noches, updateOpcionHotelera],
  );

  const handleNameChange = useCallback(
    (opcion: OpcionHotelera, newName: string) => {
      updateOpcionHotelera({ ...opcion, nombre: newName });
    },
    [updateOpcionHotelera],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteOpcionHotelera(id);
      toast("success", "Opcion eliminada");
    },
    [deleteOpcionHotelera, toast],
  );

  const handleAutoSavePrices = useCallback(() => {
    const firstOpcion = opcionPricing[0];
    if (firstOpcion) {
      updatePaquete({
        ...paquete,
        markup: firstOpcion.opcion.factor,
        precioVenta: firstOpcion.opcion.precioVenta,
        netoCalculado: netoFijos + firstOpcion.netoAloj,
      });
    }
  }, [opcionPricing, paquete, netoFijos, updatePaquete]);

  const { status: autoSaveStatus, markDirty: markPricesDirty, saveNow: saveNowPrices } = useAutoSave({
    onSave: handleAutoSavePrices,
    enabled: canEdit,
  });

  // Wrap factor change to also trigger auto-save
  const handleFactorChangeWithAutoSave = useCallback(
    (opcion: OpcionHotelera, newFactor: number) => {
      handleFactorChange(opcion, newFactor);
      markPricesDirty();
    },
    [handleFactorChange, markPricesDirty],
  );

  const handleAddOption = useCallback(() => {
    if (!newName.trim()) return;
    if (newSelectedAlojIds.length === 0) {
      toast("warning", "Selecciona al menos un alojamiento");
      return;
    }
    const netoAloj = calcularNetoAlojamientos(
      newSelectedAlojIds,
      assignedAlojamientos,
      paquete.noches,
    );
    const venta = calcularVentaOpcion(netoFijos, netoAloj, 0.8);
    createOpcionHotelera({
      paqueteId: paquete.id,
      nombre: newName.trim(),
      alojamientoIds: newSelectedAlojIds,
      factor: 0.8,
      precioVenta: venta,
      orden: opciones.length + 1,
    });
    setNewName("");
    setNewSelectedAlojIds([]);
    setShowNewForm(false);
    toast("success", "Opcion hotelera creada");
  }, [newName, newSelectedAlojIds, assignedAlojamientos, netoFijos, paquete, opciones.length, createOpcionHotelera, toast]);

  // Toggle a hotel in/out of an existing option and recalculate prices
  const handleToggleHotelInOption = useCallback(
    (opcion: OpcionHotelera, hotelId: string) => {
      const currentIds = opcion.alojamientoIds;
      const newIds = currentIds.includes(hotelId)
        ? currentIds.filter((id) => id !== hotelId)
        : [...currentIds, hotelId];
      if (newIds.length === 0) {
        toast("warning", "La opcion debe tener al menos un alojamiento");
        return;
      }
      const netoAloj = calcularNetoAlojamientos(newIds, assignedAlojamientos, paquete.noches);
      const newVenta = calcularVentaOpcion(netoFijos, netoAloj, opcion.factor);
      updateOpcionHotelera({
        ...opcion,
        alojamientoIds: newIds,
        precioVenta: newVenta,
      });
      markPricesDirty();
    },
    [assignedAlojamientos, netoFijos, paquete.noches, updateOpcionHotelera, markPricesDirty],
  );

  const handleSave = useCallback(() => {
    saveNowPrices();
    toast("success", "Precios actualizados");
  }, [saveNowPrices, toast]);

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
      {/* ── Header: Price Range ── */}
      {priceRange && (
        <motion.div variants={stagger.item.variants}>
          <Card className="p-6 relative">
            {canEdit && (
              <div className="absolute top-3 right-3 z-10">
                <AutoSaveIndicator status={autoSaveStatus} />
              </div>
            )}
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Rango de Precios
                </p>
                <p className="text-2xl font-bold font-mono text-neutral-800 tracking-tight">
                  {priceRange.min === priceRange.max ? (
                    formatCurrency(priceRange.min)
                  ) : (
                    <>
                      Desde{" "}
                      <span className="text-teal-600">
                        {formatCurrency(priceRange.min)}
                      </span>
                      {" — Hasta "}
                      <span className="text-teal-600">
                        {formatCurrency(priceRange.max)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-400 mt-1 ml-[52px]">
              {opciones.length} opcion{opciones.length !== 1 ? "es" : ""}{" "}
              hotelera{opciones.length !== 1 ? "s" : ""}
            </p>
          </Card>
        </motion.div>
      )}

      {/* ── Fixed Costs Card ── */}
      {canSeePricing.neto && (
        <motion.div variants={stagger.item.variants}>
          <div className="rounded-2xl p-5" style={glassMaterials.frostedSubtle}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-neutral-500" />
              <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
                Costos Fijos Compartidos
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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

            <div className="flex items-center justify-between pt-3 border-t border-neutral-200/40 px-1">
              <span className="text-sm font-medium text-neutral-600">
                Total Costos Fijos
              </span>
              <span className="text-lg font-mono font-bold text-neutral-800">
                {formatCurrency(netoFijos)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Hotel Options Section ── */}
      <motion.div variants={stagger.item.variants}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hotel className="h-4 w-4 text-neutral-500" />
            <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
              Opciones Hoteleras
            </h4>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {opcionPricing.map(({ opcion, netoAloj, ventaCalc, margin, hotels }) => (
            <motion.div
              key={opcion.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={springs.gentle}
              className="mb-4"
            >
              <div className="rounded-2xl p-5" style={frostedAccent}>
                {/* Option header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <input
                        type="text"
                        value={opcion.nombre}
                        onChange={(e) =>
                          handleNameChange(opcion, e.target.value)
                        }
                        className="text-base font-semibold text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-teal-500 focus:outline-none transition-colors px-0 py-0.5"
                      />
                    ) : (
                      <span className="text-base font-semibold text-neutral-800">
                        {opcion.nombre}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      variant="icon"
                      size="xs"
                      onClick={() => handleDelete(opcion.id)}
                      aria-label="Eliminar opcion"
                    >
                      <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500 transition-colors" />
                    </Button>
                  )}
                </div>

                {/* Hotels list */}
                <div className="space-y-2 mb-4">
                  {hotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/40"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: hotel.categoria }).map(
                            (_, i) => (
                              <Star
                                key={i}
                                className="h-3 w-3 fill-amber-400 text-amber-400"
                              />
                            ),
                          )}
                        </div>
                        <span className="text-sm text-neutral-700">
                          {hotel.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-neutral-500">
                          {formatCurrency(hotel.precioPorNoche)}/noche x{" "}
                          {hotel.noches}
                        </span>
                        {canEdit && opcion.alojamientoIds.length > 1 && (
                          <button
                            onClick={() => handleToggleHotelInOption(opcion, hotel.id)}
                            className="p-0.5 rounded hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                            title="Quitar de esta opcion"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Toggle hotel selector for this option */}
                  {canEdit && (
                    <>
                      {editingHotelsOpcionId === opcion.id ? (
                        <div className="mt-2 p-3 rounded-lg bg-white/50 border border-teal-200/50">
                          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                            Alojamientos disponibles
                          </p>
                          <div className="space-y-1.5">
                            {assignedAlojamientos.map((a) => {
                              const isSelected = opcion.alojamientoIds.includes(a.alojamiento.id);
                              return (
                                <button
                                  key={a.alojamiento.id}
                                  onClick={() => handleToggleHotelInOption(opcion, a.alojamiento.id)}
                                  className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-md text-sm transition-colors ${
                                    isSelected
                                      ? "bg-teal-50 border border-teal-200 text-teal-800"
                                      : "bg-white/60 border border-neutral-200 text-neutral-600 hover:border-teal-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isSelected ? (
                                      <Check className="h-3.5 w-3.5 text-teal-600" />
                                    ) : (
                                      <Plus className="h-3.5 w-3.5 text-neutral-400" />
                                    )}
                                    <span>{a.alojamiento.nombre}</span>
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: a.alojamiento.categoria ?? 0 }).map((_, i) => (
                                        <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-xs font-mono text-neutral-500">
                                    {formatCurrency(a.precioAlojamiento?.precioPorNoche ?? 0)}/noche
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setEditingHotelsOpcionId(null)}
                            >
                              Cerrar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingHotelsOpcionId(opcion.id)}
                          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium mt-1 px-1 transition-colors"
                        >
                          <Hotel className="h-3 w-3" />
                          Editar alojamientos
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Subtotal alojamiento */}
                {canSeePricing.neto && (
                  <div className="flex items-center justify-between px-3 py-1.5 text-sm mb-3">
                    <span className="text-neutral-500">
                      Subtotal Alojamiento
                    </span>
                    <span className="font-mono font-semibold text-neutral-700">
                      {formatCurrency(netoAloj)}
                    </span>
                  </div>
                )}

                {/* Factor + margin bar */}
                {canSeePricing.markup && (
                  <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/30 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500 uppercase">
                        Factor:
                      </span>
                      {canEdit ? (
                        <input
                          type="number"
                          min={0.01}
                          max={1}
                          step={0.01}
                          value={opcion.factor}
                          onChange={(e) =>
                            handleFactorChangeWithAutoSave(
                              opcion,
                              parseFloat(e.target.value) || 0.8,
                            )
                          }
                          className="w-16 text-sm font-mono font-bold text-neutral-800 bg-white/60 rounded-md border border-neutral-200 px-2 py-1 focus:border-teal-500 focus:outline-none transition-colors text-center"
                        />
                      ) : (
                        <span className="text-sm font-mono font-bold text-neutral-800">
                          {opcion.factor}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-medium text-neutral-500 uppercase">
                        Margen:
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-neutral-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: getMarginGradient(opcion.factor),
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(margin * 2.5, 100)}%`,
                          }}
                          transition={springs.gentle}
                        />
                      </div>
                      <span
                        className="text-sm font-mono font-bold min-w-[3ch] text-right"
                        style={{ color: getMarginColor(opcion.factor) }}
                      >
                        {margin}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Sale price */}
                <div className="flex items-center justify-between pt-3 border-t border-teal-100/50 px-1">
                  <span className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
                    Precio Venta
                  </span>
                  <span className="text-xl font-mono font-bold text-teal-700">
                    {formatCurrency(opcion.precioVenta)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add option form */}
        {canEdit && (
          <AnimatePresence>
            {showNewForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={springs.snappy}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-white/40 border border-dashed border-neutral-300 space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre de la opcion (ej: Opcion Economica)..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-sm bg-transparent border-b border-neutral-300 focus:border-teal-500 focus:outline-none transition-colors px-1 py-1"
                    autoFocus
                  />

                  {/* Hotel selection checkboxes */}
                  {assignedAlojamientos.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                        Seleccionar alojamientos para esta opcion
                      </p>
                      <div className="space-y-1.5">
                        {assignedAlojamientos.map((a) => {
                          const isChecked = newSelectedAlojIds.includes(a.alojamiento.id);
                          return (
                            <button
                              key={a.alojamiento.id}
                              type="button"
                              onClick={() =>
                                setNewSelectedAlojIds((prev) =>
                                  isChecked
                                    ? prev.filter((id) => id !== a.alojamiento.id)
                                    : [...prev, a.alojamiento.id],
                                )
                              }
                              className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-md text-sm transition-colors ${
                                isChecked
                                  ? "bg-teal-50 border border-teal-200 text-teal-800"
                                  : "bg-white/60 border border-neutral-200 text-neutral-600 hover:border-teal-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isChecked ? (
                                  <Check className="h-3.5 w-3.5 text-teal-600" />
                                ) : (
                                  <div className="h-3.5 w-3.5 rounded border border-neutral-300" />
                                )}
                                <span>{a.alojamiento.nombre}</span>
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: a.alojamiento.categoria ?? 0 }).map((_, i) => (
                                    <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs font-mono text-neutral-500">
                                {formatCurrency(a.precioAlojamiento?.precioPorNoche ?? 0)}/noche
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 italic">
                      No hay alojamientos asignados al paquete. Agrega alojamientos desde la tab Servicios.
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewForm(false);
                        setNewName("");
                        setNewSelectedAlojIds([]);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddOption}
                      disabled={!newName.trim() || newSelectedAlojIds.length === 0}
                    >
                      Crear Opcion
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <button
                  onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-neutral-200 text-neutral-400 hover:border-teal-400 hover:text-teal-600 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Agregar Opcion Hotelera
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Comparator ── */}
      {opcionPricing.length >= 2 && (
        <motion.div variants={stagger.item.variants}>
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-4">
              Comparador
            </h4>
            <div className="space-y-3">
              {opcionPricing.map(({ opcion }) => {
                const maxPrecio = Math.max(
                  ...opcionPricing.map((op) => op.opcion.precioVenta),
                );
                const pct =
                  maxPrecio > 0
                    ? (opcion.precioVenta / maxPrecio) * 100
                    : 0;
                return (
                  <div
                    key={opcion.id}
                    className="flex items-center gap-3"
                  >
                    <span className="text-sm text-neutral-600 min-w-[120px] truncate">
                      {opcion.nombre}
                    </span>
                    <div className="flex-1 h-6 rounded-lg bg-neutral-100 overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-lg bg-gradient-to-r from-teal-400 to-teal-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={springs.gentle}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold text-neutral-700 min-w-[80px] text-right">
                      {formatCurrency(opcion.precioVenta)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Save button ── */}
      {canEdit && (
        <motion.div variants={stagger.item.variants} className="flex justify-end">
          <Button variant="secondary" onClick={handleSave}>Guardar Precios</Button>
        </motion.div>
      )}
    </motion.div>
  );
}
