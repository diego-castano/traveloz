"use client";

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plane,
  Hotel,
  Bus,
  ShieldCheck,
  Map as MapIcon,
  Star,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
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
  resolvePrecioAereo,
  resolvePrecioAlojamiento,
  resolvePrecioCircuito,
} from "@/lib/utils";
import type { Paquete, OpcionHotelera } from "@/lib/types";
import { glassMaterials } from "@/components/lib/glass";
import { springs, stagger } from "@/components/lib/animations";

// ---------------------------------------------------------------------------
// Props & helpers
// ---------------------------------------------------------------------------

interface PreciosTabProps {
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

function getMarginColor(factor: number): string {
  const margin = 1 - factor;
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
// Main component — read-only pricing view + factor/venta editing.
// Hotel composition of each opcion is managed in the Alojamientos tab.
// ---------------------------------------------------------------------------

export default function PreciosTab({ paquete }: PreciosTabProps) {
  const services = usePaqueteServices(paquete.id);
  const serviceState = useServiceState();
  const { updateOpcionHotelera } = usePackageActions();
  const { canSeePricing, canEdit } = useAuth();
  const { toast } = useToast();
  const opciones = useOpcionesHoteleras(paquete.id);

  // -------------------------------------------------------------------------
  // Resolve assigned services with period-aware pricing
  // -------------------------------------------------------------------------

  const { assignedAereos, assignedAlojamientos, assignedTraslados, assignedSeguros, assignedCircuitos } =
    useMemo(() => {
      const fecha = paquete.validezDesde;

      const aer = services.aereos
        .map((pa) => {
          const aereo = serviceState.aereos.find((a) => a.id === pa.aereoId);
          if (!aereo) return null;
          return {
            aereo,
            precioAereo: resolvePrecioAereo(serviceState.preciosAereo, pa.aereoId, fecha),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const aloj = services.alojamientos
        .map((pa) => {
          const alojamiento = serviceState.alojamientos.find((a) => a.id === pa.alojamientoId);
          if (!alojamiento) return null;
          return {
            alojamiento,
            precioAlojamiento: resolvePrecioAlojamiento(
              serviceState.preciosAlojamiento,
              pa.alojamientoId,
              fecha,
            ),
            nochesEnEste: pa.nochesEnEste ?? undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const tras = services.traslados
        .map((pt) => serviceState.traslados.find((t) => t.id === pt.trasladoId))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));

      const seg = services.seguros
        .map((ps) => {
          const seguro = serviceState.seguros.find((s) => s.id === ps.seguroId);
          if (!seguro) return null;
          return { seguro, diasCobertura: ps.diasCobertura ?? undefined };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const circ = services.circuitos
        .map((pc) => {
          const circuito = serviceState.circuitos.find((c) => c.id === pc.circuitoId);
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

      return {
        assignedAereos: aer,
        assignedAlojamientos: aloj,
        assignedTraslados: tras,
        assignedSeguros: seg,
        assignedCircuitos: circ,
      };
    }, [services, serviceState, paquete.validezDesde]);

  // -------------------------------------------------------------------------
  // Fixed cost breakdown
  // -------------------------------------------------------------------------

  const { netoFijos, fixedBreakdown } = useMemo(() => {
    const aereosTotal = assignedAereos.reduce(
      (sum, a) => sum + (a.precioAereo?.precioAdulto ?? 0),
      0,
    );
    const trasladosTotal = assignedTraslados.reduce((sum, t) => sum + t.precio, 0);
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
  // Per-option pricing (live recompute from current service prices)
  // -------------------------------------------------------------------------

  const opcionPricing = useMemo(() => {
    return opciones.map((opcion) => {
      const netoAloj = calcularNetoAlojamientos(
        opcion.alojamientoIds,
        assignedAlojamientos,
        paquete.noches,
      );
      const netoTotal = netoFijos + netoAloj;
      const ventaCalc = calcularVentaOpcion(netoFijos, netoAloj, opcion.factor);
      const margin = Math.round((1 - opcion.factor) * 100);

      const hotels = opcion.alojamientoIds.map((id) => {
        const found = assignedAlojamientos.find((a) => a.alojamiento.id === id);
        const aloj =
          found?.alojamiento ??
          serviceState.alojamientos.find((a) => a.id === id);
        const precio =
          found?.precioAlojamiento ??
          resolvePrecioAlojamiento(serviceState.preciosAlojamiento, id, paquete.validezDesde);
        const noches = found?.nochesEnEste ?? paquete.noches;
        return {
          id,
          nombre: aloj?.nombre ?? "Hotel desconocido",
          categoria: aloj?.categoria ?? 0,
          ciudad: aloj?.ciudad?.nombre ?? null,
          precioPorNoche: precio?.precioPorNoche ?? 0,
          noches,
          subtotal: (precio?.precioPorNoche ?? 0) * noches,
        };
      });

      return { opcion, netoAloj, netoTotal, ventaCalc, margin, hotels };
    });
  }, [opciones, assignedAlojamientos, netoFijos, paquete.noches, serviceState.alojamientos, serviceState.preciosAlojamiento, paquete.validezDesde]);

  // -------------------------------------------------------------------------
  // Price range for header
  // -------------------------------------------------------------------------

  const priceRange = useMemo(() => {
    if (opcionPricing.length === 0) return null;
    const precios = opcionPricing.map((op) => op.ventaCalc);
    return { min: Math.min(...precios), max: Math.max(...precios) };
  }, [opcionPricing]);

  // -------------------------------------------------------------------------
  // Handlers: factor and venta editing (strategic pricing)
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
      updateOpcionHotelera({ ...opcion, factor: clamped, precioVenta: newVenta });
    },
    [assignedAlojamientos, netoFijos, paquete.noches, updateOpcionHotelera],
  );

  // Edit precio venta directly — back-calculates factor inversely so the user
  // can set a round sale price and the system figures out the matching factor.
  const handleVentaChange = useCallback(
    (opcion: OpcionHotelera, newVenta: number) => {
      const netoAloj = calcularNetoAlojamientos(
        opcion.alojamientoIds,
        assignedAlojamientos,
        paquete.noches,
      );
      const netoTotal = netoFijos + netoAloj;
      if (newVenta <= 0 || netoTotal <= 0) {
        toast("warning", "Precio invalido", "Revisa los netos antes de cambiar el precio");
        return;
      }
      const newFactor = Math.max(0.01, Math.min(1, Number((netoTotal / newVenta).toFixed(3))));
      updateOpcionHotelera({ ...opcion, factor: newFactor, precioVenta: Math.round(newVenta) });
    },
    [assignedAlojamientos, netoFijos, paquete.noches, updateOpcionHotelera, toast],
  );

  const handleNameChange = useCallback(
    (opcion: OpcionHotelera, newName: string) => {
      updateOpcionHotelera({ ...opcion, nombre: newName });
    },
    [updateOpcionHotelera],
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
      {/* ── Price range header ── */}
      {priceRange && (
        <motion.div variants={stagger.item.variants}>
          <Card className="p-6">
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
                      <span className="text-teal-600">{formatCurrency(priceRange.min)}</span>
                      {" — Hasta "}
                      <span className="text-teal-600">{formatCurrency(priceRange.max)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-400 mt-1 ml-[52px]">
              {opciones.length} opcion{opciones.length !== 1 ? "es" : ""} hotelera
              {opciones.length !== 1 ? "s" : ""}
            </p>
          </Card>
        </motion.div>
      )}

      {/* ── Fixed Costs Card (read-only) ── */}
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
              <span className="text-sm font-medium text-neutral-600">Total Costos Fijos</span>
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
          <p className="text-xs text-neutral-400 italic">
            Las combinaciones se gestionan en Alojamientos
          </p>
        </div>

        {opcionPricing.length === 0 ? (
          <div className="rounded-xl p-6 text-center text-sm text-neutral-400 border border-dashed border-neutral-200">
            Aun no hay opciones hoteleras. Crealas desde el tab Alojamientos.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {opcionPricing.map(({ opcion, netoAloj, netoTotal, ventaCalc, margin, hotels }) => (
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
                    {canEdit ? (
                      <input
                        type="text"
                        value={opcion.nombre}
                        onChange={(e) => handleNameChange(opcion, e.target.value)}
                        className="text-base font-semibold text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-teal-500 focus:outline-none transition-colors px-0 py-0.5"
                      />
                    ) : (
                      <span className="text-base font-semibold text-neutral-800">
                        {opcion.nombre}
                      </span>
                    )}
                  </div>

                  {/* Hotels list — READ-ONLY display (edit in Alojamientos tab) */}
                  {hotels.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2 mb-3">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium">
                        Esta opcion no tiene hoteles asignados. Configuralos en el tab Alojamientos.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {hotels.map((hotel) => (
                        <div
                          key={hotel.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {Array.from({ length: hotel.categoria }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <span className="text-sm text-neutral-700 truncate">
                              {hotel.nombre}
                            </span>
                            {hotel.ciudad && (
                              <span className="text-xs text-neutral-400">
                                · {hotel.ciudad}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-mono text-neutral-500 flex-shrink-0">
                            {formatCurrency(hotel.precioPorNoche)}/n × {hotel.noches}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Breakdown & totals */}
                  {canSeePricing.neto && (
                    <div className="space-y-1.5 px-3 py-2 mb-3 text-sm bg-white/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Neto alojamiento</span>
                        <span className="font-mono text-neutral-700">{formatCurrency(netoAloj)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">+ Costos fijos</span>
                        <span className="font-mono text-neutral-700">{formatCurrency(netoFijos)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-200/40">
                        <span className="text-neutral-600 font-medium">Neto total</span>
                        <span className="font-mono font-semibold text-neutral-800">
                          {formatCurrency(netoTotal)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Factor + margin bar (editable) */}
                  {canSeePricing.markup && (
                    <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/30 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-500 uppercase">Factor:</span>
                        {canEdit ? (
                          <input
                            type="number"
                            min={0.01}
                            max={1}
                            step={0.01}
                            value={opcion.factor}
                            onChange={(e) =>
                              handleFactorChange(opcion, parseFloat(e.target.value) || 0.8)
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
                        <span className="text-xs font-medium text-neutral-500 uppercase">Margen:</span>
                        <div className="flex-1 h-3 rounded-full bg-neutral-100 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: getMarginGradient(opcion.factor) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(margin * 2.5, 100)}%` }}
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

                  {/* Precio Venta (editable with inverse calc) */}
                  <div className="flex items-center justify-between pt-3 border-t border-teal-100/50 px-1">
                    <span className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">
                      Precio Venta
                    </span>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-mono font-bold text-teal-700">$</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={ventaCalc}
                          onChange={(e) =>
                            handleVentaChange(opcion, parseFloat(e.target.value) || 0)
                          }
                          className="w-28 text-xl font-mono font-bold text-teal-700 bg-transparent border-b-2 border-teal-200 hover:border-teal-400 focus:border-teal-500 focus:outline-none text-right px-1"
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-mono font-bold text-teal-700">
                        {formatCurrency(ventaCalc)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
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
              {opcionPricing.map(({ opcion, ventaCalc }) => {
                const maxPrecio = Math.max(...opcionPricing.map((op) => op.ventaCalc));
                const pct = maxPrecio > 0 ? (ventaCalc / maxPrecio) * 100 : 0;
                return (
                  <div key={opcion.id} className="flex items-center gap-3">
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
                      {formatCurrency(ventaCalc)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
