"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  Pencil,
  Loader2,
  ArrowUp,
  ArrowDown,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PeriodPicker } from "@/components/ui/form/PeriodPicker";
import { MissingTravelWindowBanner } from "./MissingTravelWindowBanner";
import {
  usePaqueteServices,
  usePackageActions,
  useOpcionesHoteleras,
  useDestinos,
  useOpcionHoteles,
  useAllOpcionHoteles,
  useNochesTotales,
} from "@/components/providers/PackageProvider";
import {
  useAlojamientos,
  useServiceState,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import {
  usePaises,
  useRegiones,
} from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import {
  calcularNetoFijos,
  calcularVentaOpcion,
  calcularNetoAlojamientosPorOpcion,
  resolvePrecioAlojamiento,
  resolvePrecioAereo,
  resolvePrecioCircuito,
  formatCurrency,
  deriveDestinoFromDestinos,
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
import { QuickCreateHotelModal } from "./QuickCreateHotelModal";
// El combobox de ciudades y el cálculo de "recomendadas" según el breadcrumb
// del paquete viven en su propio módulo: los comparte el bloque de ciudades de
// los circuitos en la pestaña Datos (ver CircuitoCiudadesField).
import {
  CiudadPicker,
  resolveDestinoFilterScope,
  type DestinoFilterScope,
} from "./CiudadPicker";

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
  const allOpcionHoteles = useAllOpcionHoteles();
  const paises = usePaises();
  const regiones = useRegiones();

  // Date the price resolvers anchor on: prefer the actual travel start over
  // the listing-window start, falling back when older paquetes haven't been
  // backfilled with viajeDesde yet.
  const fechaPrecio = paquete.viajeDesde ?? paquete.validezDesde;

  // Hotel-coverage per destino: how many opciones hoteleras have a hotel
  // assigned for each destino. Surfaced as a small badge on each DestinoRow
  // so the operator can spot a missing hotel without expanding each opción.
  const hotelCoverageByDestino = useMemo(() => {
    const opcionIds = new Set(opciones.map((o) => o.id));
    const perDestino = new Map<string, Set<string>>();
    for (const oh of allOpcionHoteles) {
      if (!opcionIds.has(oh.opcionHoteleraId)) continue;
      const set = perDestino.get(oh.destinoId) ?? new Set<string>();
      set.add(oh.opcionHoteleraId);
      perDestino.set(oh.destinoId, set);
    }
    const counts = new Map<string, number>();
    perDestino.forEach((opcs, destinoId) => counts.set(destinoId, opcs.size));
    return counts;
  }, [opciones, allOpcionHoteles]);

  const {
    createOpcionHotelera,
    updateOpcionHotelera,
    deleteOpcionHotelera,
    createDestino,
    updateDestino,
    deleteDestino,
    reorderDestinos,
    upsertOpcionHotelPrincipal,
    deleteOpcionHotel,
    updatePaquete,
  } = usePackageActions();
  const {
    updateAlojamiento,
    createPrecioAlojamiento,
    updatePrecioAlojamiento,
  } = useServiceActions();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  const [quickEditHotelId, setQuickEditHotelId] = useState<string | null>(null);

  const nochesTotales = useNochesTotales(paquete.id);

  const destinoFilter = useMemo(
    () => resolveDestinoFilterScope(paquete.destino, paises, regiones),
    [paquete.destino, paises, regiones],
  );

  // -------------------------------------------------------------------------
  // Catálogo de hoteles por ciudad del paquete
  //
  // Diseño antiguo: existía un "Pool" — el operador agregaba hoteles al pool
  // del paquete (PaqueteAlojamiento), y dentro de cada OpcionHotelera podía
  // elegir un hotel del pool por destino. Era un paso intermedio innecesario.
  //
  // Diseño actual (refactor a pedido del cliente): el selector de hoteles
  // dentro de cada destino lee directamente del catálogo global, filtrado por
  // la ciudad del destino. Sin paso intermedio de "agregar al pool".
  // PaqueteAlojamiento sigue existiendo en schema por compatibilidad histórica
  // pero ya no se popula desde este flujo.
  // -------------------------------------------------------------------------

  const pool = useMemo(() => {
    const destinosCiudades = new Set(destinos.map((d) => d.ciudadId));
    if (destinosCiudades.size === 0) return [];
    return allAlojamientos
      .filter((a) => a.ciudad?.id && destinosCiudades.has(a.ciudad.id))
      .map((a) => {
        const precio = resolvePrecioAlojamiento(
          serviceState.preciosAlojamiento,
          a.id,
          fechaPrecio,
        );
        return {
          // synthetic id — there's no PaqueteAlojamiento row backing this
          // entry under the new model. Kept so OpcionCard/DestinoSlot can
          // keep the existing PoolEntry shape without further plumbing.
          pa: { id: `cat-${a.id}` },
          alojamiento: a,
          precio,
          ciudadId: a.ciudad?.id ?? null,
          ciudadNombre: a.ciudad?.nombre ?? null,
        };
      });
  }, [
    allAlojamientos,
    destinos,
    serviceState.preciosAlojamiento,
    fechaPrecio,
  ]);

  // -------------------------------------------------------------------------
  // Costos fijos (read-only — vienen de Servicios)
  // -------------------------------------------------------------------------

  const { netoFijos, fixedBreakdown } = useMemo(() => {
    const fecha = fechaPrecio;

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
  }, [services, serviceState, nochesTotales, fechaPrecio]);

  // -------------------------------------------------------------------------
  // Auto-derive destino from itinerary when the paquete.destino field is empty
  //
  // The destino string drives listings, search, and the public site URL. Operators
  // used to type it by hand; with the itinerary editor the city + country are
  // already known, so derive it the first time an itinerary exists. We never
  // overwrite a non-empty destino — operators can still customize it manually.
  // Guarded by a ref to avoid retrying on every render.
  //
  // En modalidad CIRCUITO no derivamos nada: ahí el campo Destino guarda el
  // breadcrumb "Región › País" (es la pista que usa el sitio para resolver la
  // región del paquete) y las ciudades que se cargan en Datos son otra cosa.
  // Pisarlo con "Estambul + Capadocia" rompería esa resolución.
  // -------------------------------------------------------------------------
  const autoDestinoTried = useRef(false);
  const allCiudades = useMemo(
    () => paises.flatMap((p) => p.ciudades),
    [paises],
  );

  useEffect(() => {
    if (autoDestinoTried.current) return;
    if (paquete.modalidad === "CIRCUITO") return;
    if (paquete.destino?.trim()) return;
    if (destinos.length === 0) return;
    if (allCiudades.length === 0) return;

    const derived = deriveDestinoFromDestinos(destinos, allCiudades, paises);
    if (!derived || derived === paquete.destino) return;

    autoDestinoTried.current = true;
    void updatePaquete({ ...paquete, destino: derived });
  }, [destinos, allCiudades, paises, paquete, updatePaquete]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

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

  // Id de la opción recién creada → dispara un highlight de entrada una sola vez.
  const [justCreatedOpcionId, setJustCreatedOpcionId] = useState<string | null>(
    null,
  );

  const handleCreateOpcion = useCallback(async () => {
    const nextOrden = opciones.length + 1;
    const defaultName = `Opcion ${nextOrden}`;
    const created = await createOpcionHotelera({
      paqueteId: paquete.id,
      nombre: defaultName,
      factor: 0.9,
      precioVenta: 0,
      orden: nextOrden,
    });
    if (created?.id) {
      setJustCreatedOpcionId(created.id);
      window.setTimeout(
        () =>
          setJustCreatedOpcionId((cur) => (cur === created.id ? null : cur)),
        1800,
      );
    }
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

  const handleUpdateOpcionTextoDisplay = useCallback(
    (opcion: OpcionHotelera, value: string) => {
      const trimmed = value.trim();
      updateOpcionHotelera({
        ...opcion,
        textoDisplay: trimmed.length > 0 ? trimmed : null,
      });
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
        fechaPrecio,
      );
      const precioVenta = calcularVentaOpcion(netoFijos, netoAloj, factor);
      updateOpcionHotelera({ ...opcion, factor, precioVenta });
    },
    [
      destinos,
      netoFijos,
      serviceState.preciosAlojamiento,
      fechaPrecio,
      updateOpcionHotelera,
    ],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const hasTravelWindow = Boolean(paquete.viajeDesde && paquete.viajeHasta);

  // Modalidad CIRCUITO: el alojamiento (y comidas/paseos) va incluido en el
  // circuito, así que no se cargan destinos ni opciones hoteleras acá. Mostramos
  // un estado deshabilitado que remite al módulo Circuitos. El resto de la UI
  // queda condicionada (no se borra) para no romper la modalidad CLASICO.
  if (paquete.modalidad === "CIRCUITO") {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
          <Route className="h-5 w-5 text-teal-600" />
        </div>
        <h4 className="text-sm font-semibold text-neutral-700">
          Este paquete es un circuito
        </h4>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-neutral-500">
          El alojamiento está incluido en el circuito. Gestioná el itinerario
          día por día desde el módulo{" "}
          <a
            href="/backend/circuitos"
            className="font-medium text-teal-600 hover:underline"
          >
            Circuitos
          </a>
          .
        </p>
        {/* Esta tarjeta era un callejón sin salida: el operador entraba a
            buscar dónde cargar las ciudades y se iba con las manos vacías.
            Ahora remite al bloque nuevo de la pestaña Datos. */}
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-neutral-500">
          Las ciudades de este circuito se cargan en la pestaña{" "}
          <a
            href={`/backend/paquetes/${paquete.id}?tab=datos`}
            className="font-medium text-teal-600 hover:underline"
          >
            Datos
          </a>
          , debajo del campo Destino.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={stagger.container.variants}
      initial="hidden"
      animate="show"
    >
      {!hasTravelWindow && (
        <motion.div variants={stagger.item.variants}>
          <MissingTravelWindowBanner paqueteSlug={paquete.id} />
        </motion.div>
      )}
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
          destinoFilter={destinoFilter}
          hotelCoverageByDestino={hotelCoverageByDestino}
          totalOpciones={opciones.length}
        />
      </motion.div>

      {/* ── 2. Costos fijos ── */}
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
                onUpdateTextoDisplay={handleUpdateOpcionTextoDisplay}
                onDelete={handleDeleteOpcion}
                onAddOpcion={handleCreateOpcion}
                isNew={opcion.id === justCreatedOpcionId}
                onUpdateFactor={handleUpdateOpcionFactor}
                onUpsertHotel={upsertOpcionHotelPrincipal}
                onDeleteHotel={deleteOpcionHotel}
                onQuickEditHotel={setQuickEditHotelId}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Modal: Edicion rapida ── */}
      <QuickEditHotelModal
        open={quickEditHotelId !== null}
        onOpenChange={(open) => {
          if (!open) setQuickEditHotelId(null);
        }}
        hotelId={quickEditHotelId}
        hotels={allAlojamientos}
        preciosAlojamiento={serviceState.preciosAlojamiento}
        validezDesde={fechaPrecio}
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
  destinoFilter: DestinoFilterScope | null;
  /** Map destinoId → count of opciones hoteleras that have a hotel for it.
   *  Used to render a coverage badge on each row so the operator can spot
   *  destinos that nobody's loaded a hotel for at a glance. */
  hotelCoverageByDestino: Map<string, number>;
  /** Total opciones hoteleras count — denominator for the coverage badge. */
  totalOpciones: number;
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
  destinoFilter,
  hotelCoverageByDestino,
  totalOpciones,
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
            {nochesTotales > 0
              ? `Ya arrancaste con ${nochesTotales} noches iniciales desde Nuevo paquete. Agregá el primer destino para distribuirlas.`
              : "Agregá el primero para poder armar opciones hoteleras."}
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
              hotelCount={hotelCoverageByDestino.get(destino.id) ?? 0}
              totalOpciones={totalOpciones}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <div className="mt-3">
          <AddDestinoRow
            onAdd={onAdd}
            existingCiudadIds={destinos.map((d) => d.ciudadId)}
            destinoFilter={destinoFilter}
          />
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
  hotelCount,
  totalOpciones,
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
  /** Number of opciones hoteleras that have a hotel for this destino. */
  hotelCount: number;
  /** Total opciones — denominator. When 0 we hide the badge entirely
   *  (no opciones means hotel coverage is meaningless). */
  totalOpciones: number;
}) {
  const paises = usePaises();
  const ciudad = useMemo(() => {
    for (const pais of paises) {
      const found = pais.ciudades.find((ciudadItem) => ciudadItem.id === destino.ciudadId);
      if (found) return found;
    }
    return null;
  }, [paises, destino.ciudadId]);

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

      {/* City name + hotel-coverage badge */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <MapPin className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
        <span className="text-sm font-medium text-neutral-800 truncate">
          {ciudad?.nombre ?? "(ciudad no encontrada)"}
        </span>
        {totalOpciones > 0 && (
          <span
            className={`text-[10px] font-mono font-semibold rounded-full px-1.5 py-0.5 border flex-shrink-0 ${
              hotelCount === 0
                ? "bg-red-50 border-red-200 text-red-600"
                : hotelCount < totalOpciones
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
            title={
              hotelCount === 0
                ? `Ninguna opción hotelera tiene hotel cargado para este destino.`
                : hotelCount < totalOpciones
                ? `${hotelCount} de ${totalOpciones} opciones tienen hotel para este destino.`
                : `Todas las opciones (${totalOpciones}) tienen hotel para este destino.`
            }
          >
            {hotelCount}/{totalOpciones} hoteles
          </span>
        )}
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
//   Uses a Select2-style combobox grouped by Region > País; supports creating
//   a brand-new Ciudad in-place for any País without leaving the tab.
// ---------------------------------------------------------------------------

function AddDestinoRow({
  onAdd,
  existingCiudadIds,
  destinoFilter,
}: {
  onAdd: (ciudadId: string, noches: number) => Promise<void>;
  existingCiudadIds: string[];
  destinoFilter: DestinoFilterScope | null;
}) {
  const { toast } = useToast();
  const [ciudadId, setCiudadId] = useState<string>("");
  const [ciudadLabel, setCiudadLabel] = useState<string>("");
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
      setCiudadLabel("");
      setNoches("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white/40 rounded-lg border border-dashed border-neutral-300 px-2.5 py-2">
      <Plus className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
      <div className="flex-1">
        <CiudadPicker
          selectedId={ciudadId}
          selectedLabel={ciudadLabel}
          excludeCiudadIds={existingCiudadIds}
          destinoFilter={destinoFilter}
          onSelect={(id, label) => {
            setCiudadId(id);
            setCiudadLabel(label);
          }}
          onCreated={(ciudad, paisNombre) => {
            setCiudadId(ciudad.id);
            setCiudadLabel(`${ciudad.nombre} · ${paisNombre}`);
            toast(
              "success",
              "Ciudad creada",
              `${ciudad.nombre} agregada a ${paisNombre}`,
            );
          }}
        />
      </div>
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
  onUpdateTextoDisplay: (opcion: OpcionHotelera, value: string) => void;
  onDelete: (id: string) => void;
  /** Crea una nueva opción hotelera (mismo handler que "Agregar opción"). */
  onAddOpcion: () => void;
  /** True para la opción recién creada → highlight de entrada una sola vez. */
  isNew?: boolean;
  onUpdateFactor: (opcion: OpcionHotelera, newFactor: number) => void;
  onUpsertHotel: (
    opcionHoteleraId: string,
    destinoId: string,
    alojamientoId: string,
  ) => Promise<OpcionHotel>;
  onDeleteHotel: (id: string) => Promise<void>;
  /** Open the quick-edit hotel modal for a specific hotel from a destino slot. */
  onQuickEditHotel: (hotelId: string) => void;
}

const OpcionCard = forwardRef<HTMLDivElement, OpcionCardProps>(function OpcionCard({
  opcion,
  destinos,
  pool,
  preciosAlojamiento,
  netoFijos,
  canEdit,
  onUpdateName,
  onUpdateTextoDisplay,
  onDelete,
  onAddOpcion,
  isNew,
  onUpdateFactor,
  onUpsertHotel,
  onDeleteHotel,
  onQuickEditHotel,
}, ref) {
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
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={springs.gentle}
      className="mb-4"
    >
      <div className="relative rounded-2xl p-5" style={frostedAccent}>
        {/* Highlight de entrada para la opción recién creada */}
        {isNew && (
          <motion.span
            aria-hidden
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-teal-400/70"
          />
        )}
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
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
            {canEdit ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                  Etiqueta pública · opcional
                </p>
                <input
                  type="text"
                  value={opcion.textoDisplay ?? ""}
                  placeholder='Ej: "Setiembre y Octubre" — aparece junto al calendario en la web'
                  title="Se muestra junto al calendario en la card pública de esta opción. Si queda vacío, la web usa las salidas generales del paquete."
                  onChange={(e) =>
                    onUpdateTextoDisplay(opcion, e.target.value)
                  }
                  className="text-[12px] text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-teal-400 focus:outline-none transition-colors px-0 py-0.5 w-full max-w-[420px]"
                />
              </div>
            ) : opcion.textoDisplay ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                  Etiqueta pública · opcional
                </p>
                <p className="text-[12px] text-neutral-500">
                  {opcion.textoDisplay}
                </p>
              </div>
            ) : null}
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onDelete(opcion.id)}
                className="p-1 rounded hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                title="Eliminar opcion"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <motion.button
                type="button"
                onClick={onAddOpcion}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                className="p-1 rounded text-teal-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                title="Agregar otra opción"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>
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
              onQuickEditHotel={onQuickEditHotel}
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
                Markup
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
});

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
  onQuickEditHotel,
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
  onQuickEditHotel: (hotelId: string) => void;
}) {
  const paises = usePaises();
  // Track open state for the inline "+ Nuevo hotel" modal. Lives at this
  // level so each destino slot has its own independent modal instance — they
  // wouldn't be visible at the same time anyway, but keeping them scoped per
  // slot avoids a shared "which destino opened this?" prop on the parent.
  const [createHotelOpen, setCreateHotelOpen] = useState(false);
  const { ciudadNombre, paisNombre } = useMemo(() => {
    for (const pais of paises) {
      const found = pais.ciudades.find((ciudadItem) => ciudadItem.id === destino.ciudadId);
      if (found) return { ciudadNombre: found.nombre, paisNombre: pais.nombre };
    }
    return { ciudadNombre: "(ciudad)", paisNombre: "(país)" };
  }, [paises, destino.ciudadId]);

  // Catálogo completo de hoteles cuya ciudad === ciudad del destino.
  // El "pool" del paquete fue eliminado: ahora el selector lee del catálogo
  // global directamente. Si la ciudad no tiene hoteles, el operador puede
  // crear uno inline via QuickCreateHotelModal (sin salir del paquete).
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
          <span>Sin hoteles en el catálogo para {ciudadNombre}.</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => setCreateHotelOpen(true)}
              className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors whitespace-nowrap not-italic"
            >
              <Plus className="h-3 w-3" />
              Nuevo hotel
            </button>
          )}
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={hotelAsignado?.alojamientoId ?? ""}
              onValueChange={handleSelectChange}
              placeholder="— Elegir hotel —"
              searchPlaceholder="Buscar hotel..."
              options={hotelesDisponibles.map((h) => ({
                value: h.alojamiento.id,
                label: `${"★".repeat(h.alojamiento.categoria ?? 0)} ${h.alojamiento.nombre}${h.precio ? ` · ${formatCurrency(h.precio.precioPorNoche)}/n` : ""}`,
              }))}
            />
          </div>
          {/* Always-visible "+ new hotel" button so the operator can grow
              the catalog from the same row that's missing the choice. */}
          <button
            type="button"
            onClick={() => setCreateHotelOpen(true)}
            className="p-1.5 rounded-md text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-colors flex-shrink-0"
            title={`Crear un hotel nuevo en ${ciudadNombre}`}
            aria-label="Nuevo hotel"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {hotelAsignado && (
            <button
              type="button"
              onClick={() => onQuickEditHotel(hotelAsignado.alojamientoId)}
              className="p-1.5 rounded-md text-neutral-400 hover:text-teal-600 hover:bg-teal-50 transition-colors flex-shrink-0"
              title="Edición rápida del hotel"
              aria-label="Edición rápida del hotel"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
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

      <QuickCreateHotelModal
        open={createHotelOpen}
        onOpenChange={setCreateHotelOpen}
        ciudadId={destino.ciudadId}
        ciudadNombre={ciudadNombre}
        paisNombre={paisNombre}
        onAssign={async (newAlojamientoId) => {
          await onUpsertHotel(opcionId, destino.id, newAlojamientoId);
        }}
      />
    </div>
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
    regimenId: string | null;
  }>;
  validezDesde: string;
  onUpdateHotel: (hotel: Alojamiento) => Promise<void> | void;
  onCreatePrecio: (data: {
    alojamientoId: string;
    periodoDesde: string;
    periodoHasta: string;
    precioPorNoche: number;
    regimenId: string | null;
  }) => Promise<unknown> | unknown;
  onUpdatePrecio: (precio: {
    id: string;
    alojamientoId: string;
    periodoDesde: string;
    periodoHasta: string;
    precioPorNoche: number;
    regimenId: string | null;
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
  // Period for *new* prices — defaults to the paquete validez or today,
  // but the operator can change it before saving so we don't silently create
  // annual prices that collapse temporada alta/baja into one bucket.
  const today = new Date().toISOString().slice(0, 10);
  const [nuevoPeriodoDesde, setNuevoPeriodoDesde] = useState<string>("");
  const [nuevoPeriodoHasta, setNuevoPeriodoHasta] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!hotel) return;
    setNombre(hotel.nombre ?? "");
    setCategoria(hotel.categoria ?? 0);
    setSitioWeb(hotel.sitioWeb ?? "");
    setPrecio(precioActivo ? String(precioActivo.precioPorNoche) : "");
    // Seed the period inputs only for new-price flow; if a precioActivo
    // already exists we update its period in place (no inputs shown).
    if (!precioActivo) {
      const baseDesde = validezDesde || today;
      // Default ventana: 30 días desde la validez. El operador la ajusta.
      const baseHasta = new Date(baseDesde);
      baseHasta.setDate(baseHasta.getDate() + 30);
      setNuevoPeriodoDesde(baseDesde);
      setNuevoPeriodoHasta(baseHasta.toISOString().slice(0, 10));
    }
  }, [hotel, precioActivo, validezDesde, today]);

  if (!hotel) return null;

  const handleSave = async () => {
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      toast("warning", "Nombre requerido", "El hotel necesita un nombre.");
      return;
    }
    const parsedPrecio = precio === "" ? null : Number(precio);
    if (
      parsedPrecio !== null &&
      (Number.isNaN(parsedPrecio) || parsedPrecio < 0)
    ) {
      toast("warning", "Precio invalido", "El precio por noche debe ser un numero positivo.");
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
              // Coerce empty-string regimenId to null so Prisma doesn't try to
              // satisfy the FK against a non-existent Regimen row.
              regimenId: precioActivo.regimenId || null,
              precioPorNoche: parsedPrecio,
            });
          }
        } else {
          // Use the period the operator picked — defaults to a 30-day window
          // from validezDesde, but they can adjust before saving. Avoids the
          // legacy `${year}-01-01 → ${year}-12-31` that collapsed seasons.
          if (!nuevoPeriodoDesde || !nuevoPeriodoHasta) {
            toast(
              "warning",
              "Periodo requerido",
              "Elegí desde/hasta para el nuevo precio.",
            );
            setSaving(false);
            return;
          }
          if (nuevoPeriodoDesde > nuevoPeriodoHasta) {
            toast(
              "warning",
              "Periodo inválido",
              "El 'desde' debe ser anterior al 'hasta'.",
            );
            setSaving(false);
            return;
          }
          await onCreatePrecio({
            alojamientoId: hotel.id,
            periodoDesde: nuevoPeriodoDesde,
            periodoHasta: nuevoPeriodoHasta,
            precioPorNoche: parsedPrecio,
            regimenId: null,
          });
        }
      }

      onSaved(trimmedNombre);
    } catch (err) {
      toast(
        "error",
        "No se pudo guardar",
        err instanceof Error ? err.message : "Intentá nuevamente.",
      );
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving && nombre.trim()) void handleSave();
        }}
      >
      <ModalBody>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Nombre
            </label>
            <Input
              autoFocus
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
                : "Sin precio cargado — elegí el período de validez del nuevo precio."}
            </p>
          </div>

          {!precioActivo && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                Período del precio nuevo
              </label>
              <PeriodPicker
                valueFrom={nuevoPeriodoDesde}
                valueTo={nuevoPeriodoHasta}
                onChange={(d, h) => {
                  setNuevoPeriodoDesde(d);
                  setNuevoPeriodoHasta(h);
                }}
                placeholder="Seleccionar período..."
              />
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-1.5">
                Si manejás temporada alta/baja, creá un precio por cada
                ventana en vez de un único precio anual.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
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
      </form>
    </Modal>
  );
}
