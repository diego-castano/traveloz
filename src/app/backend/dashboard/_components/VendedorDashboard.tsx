"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
  useCallback,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Globe2,
  Sparkles,
  Search,
  X,
  ChevronRight,
  Plane,
  Building2,
  Car,
  Calculator,
  ExternalLink,
  Image as ImageIcon,
  Users,
  MapPin,
  Clock,
  Ticket,
} from "lucide-react";
import {
  usePaquetes,
  usePackageState,
  useAllOpcionesHoteleras,
  useAllDestinos,
  useAllOpcionHoteles,
} from "@/components/providers/PackageProvider";
import {
  useAereos,
  useAlojamientos,
  useTraslados,
  useSeguros,
  useCircuitos,
  useServiceState,
} from "@/components/providers/ServiceProvider";
import {
  useTemporadas,
  usePaises,
  useRegiones,
} from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { proxyThumbUrl } from "@/components/lib/image-loader";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import {
  buildPaisResolver,
  countNuevosEstaSemana,
  currentTemporada,
  getGreeting,
  formatFecha,
} from "./metrics";
import {
  formatCurrency,
  resolvePrecioAereoConMeta,
  resolvePrecioAlojamientoConMeta,
  resolvePrecioCircuitoConMeta,
  calcularNetoFijos,
  calcularNetoAlojamientosPorOpcion,
  calcularVenta,
  calcularVentaOpcion,
  computeNochesTotales,
  fechaAnclaPaquete,
} from "@/lib/utils";
import { matchesSearch } from "@/lib/search";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { TarifaFallbackChip } from "@/components/ui/TarifaFallbackChip";
import type {
  Paquete,
  PaqueteFoto,
  Temporada,
  Aereo,
  Alojamiento,
  Traslado,
  Seguro,
  Circuito,
  PrecioAereo,
  PrecioAlojamiento,
  OpcionHotelera,
  OpcionHotel,
  PaqueteDestino,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Pricing breakdown — exposes per-service netos that the high-level
// `computePaquetePrecios` rolls up into `netoFijos`. Mirrors the calculation
// in `calcularNetoFijos` but keeps each component visible so the detail
// panel can render the full cost composition the vendor needs.
// ---------------------------------------------------------------------------

interface AeroLine {
  aereo: Aereo;
  precio: PrecioAereo | undefined;
  netoPorAdulto: number;
  /** true cuando el precio salió del fallback "primera tarifa" (fuera de vigencia). */
  tarifaFallback: boolean;
}

interface OpcionDetail {
  opcion: OpcionHotelera;
  hoteles: { alojamiento: Alojamiento; noches: number; precioPorNoche: number; neto: number; tarifaFallback: boolean }[];
  netoAloj: number;
  ventaPorAdulto: number;
}

interface PaqueteBreakdown {
  aereos: AeroLine[];
  alojamientoNeto: number; // sum across all OpcionHotelera (per pax, base case before factor)
  traslados: Traslado[];
  seguros: { seguro: Seguro; dias: number; neto: number }[];
  circuitos: { circuito: Circuito; neto: number; tarifaFallback: boolean }[];
  netoAero: number; // por adulto
  netoTraslado: number;
  netoSeguros: number;
  netoCircuitos: number;
  netoFijos: number; // aero + traslado + seguro + circuito (por adulto)
  opcionesDetail: OpcionDetail[];
  nochesTotales: number;
  destinos: PaqueteDestino[];
  /** Modalidad CIRCUITO sin opciones hoteleras: el precio sale del markup del paquete. */
  esCircuito: boolean;
  /** Venta por persona en modo circuito: calcularVenta(netoFijos, paquete.markup). 0 fuera de ese modo. */
  ventaCircuito: number;
}

// ---------------------------------------------------------------------------
// Stat card (compact pill)
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: typeof Package;
  label: string;
  value: number | string;
  color: string;
  delay?: number;
}

function StatCard({ icon: Icon, label, value, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[14px] border border-hairline bg-white p-4"
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: `${color}14`, color }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            {label}
          </p>
          <p className="mt-0.5 truncate font-display text-[18px] font-bold leading-tight text-neutral-900 lining-nums tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

interface DetailPanelProps {
  paquete: Paquete;
  breakdown: PaqueteBreakdown;
  selectedOpcionIdx: number;
  onSelectOpcion: (idx: number) => void;
  alojamientoById: Map<string, Alojamiento>;
  ciudadById: Map<string, { id: string; nombre: string; paisId: string }>;
}

function DetailPanel({
  paquete,
  breakdown,
  selectedOpcionIdx,
  onSelectOpcion,
  alojamientoById,
  ciudadById,
}: DetailPanelProps) {
  const safeIdx = Math.min(selectedOpcionIdx, Math.max(0, breakdown.opcionesDetail.length - 1));
  const opcionDetail = breakdown.opcionesDetail[safeIdx];

  // Todo se cotiza POR PERSONA en base doble: el neto es exactamente el que
  // usa el motor de precios del paquete (aereo + traslado + seguro + circuito,
  // vía breakdown.netoFijos, más el alojamiento de la opción). Resolución de
  // venta, espejo de computePaquetePrecios / tab Precios del admin:
  //   1. con opciones hoteleras → calcularVentaOpcion(netoFijos, netoAloj, factor)
  //   2. modalidad CIRCUITO sin opciones → calcularVenta(netoFijos, paquete.markup)
  //   3. fallback legacy → paquete.precioVenta
  const aeroTotal = breakdown.netoAero;
  const trasladosTotal = breakdown.netoTraslado;
  const segurosTotal = breakdown.netoSeguros;
  const circuitosTotal = breakdown.netoCircuitos;

  const alojTotal = opcionDetail ? opcionDetail.netoAloj : 0;
  const factor =
    opcionDetail?.opcion.factor ?? (breakdown.esCircuito ? paquete.markup : 1);

  const netoTotal = aeroTotal + alojTotal + trasladosTotal + segurosTotal + circuitosTotal;
  const ventaTotal = opcionDetail
    ? calcularVentaOpcion(breakdown.netoFijos, alojTotal, factor)
    : breakdown.esCircuito
      ? breakdown.ventaCircuito
      : paquete.precioVenta > 0
        ? paquete.precioVenta
        : netoTotal;
  const markupPct = factor > 0 && factor < 1 ? Math.round((1 - factor) * 100) : 0;

  return (
    <div className="grid gap-3 bg-gradient-to-b from-[#F6F4FF] to-[#FBFBFC] p-4 md:grid-cols-3 md:p-5">
      {/* ====================== Aéreo block ====================== */}
      <div className="rounded-[12px] border border-hairline bg-white p-4">
        <h4 className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
          <Plane size={12} strokeWidth={2} className="text-[#3BBFAD]" />
          Aéreo
          {breakdown.aereos.length > 1 && (
            <span className="ml-auto rounded-full bg-[#3BBFAD]/10 px-1.5 py-0.5 text-[9.5px] font-bold text-[#2BA08F]">
              {breakdown.aereos.length} vuelos
            </span>
          )}
        </h4>

        {breakdown.aereos.length === 0 ? (
          <p className="text-[12px] italic text-neutral-400">Sin vuelos asignados</p>
        ) : (
          <div className="space-y-3">
            {breakdown.aereos.map((line, i) => (
              <AereoBlock key={line.aereo.id} line={line} multiple={breakdown.aereos.length > 1} index={i} />
            ))}
            <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-neutral-200 pt-2 text-[12.5px]">
              <span className="font-semibold text-neutral-700">
                Neto aéreo · por persona
              </span>
              <span className="font-mono font-bold tabular-nums text-neutral-900">
                USD {fmt(aeroTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ====================== Alojamiento + traslado block ====================== */}
      <div className="rounded-[12px] border border-hairline bg-white p-4">
        <h4 className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
          <Building2 size={12} strokeWidth={2} className="text-[#3BBFAD]" />
          Alojamiento + Traslado
        </h4>

        {/* Opcion picker */}
        {breakdown.opcionesDetail.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {breakdown.opcionesDetail.map((od, idx) => (
              <button
                key={od.opcion.id}
                type="button"
                onClick={() => onSelectOpcion(idx)}
                className={`flex flex-1 min-w-[100px] flex-col gap-0.5 rounded-[8px] border px-2.5 py-1.5 text-left transition ${
                  idx === safeIdx
                    ? "border-[#8B5CF6] bg-[#F5F3FF] shadow-[0_0_0_2px_rgba(139,92,246,0.12)]"
                    : "border-hairline bg-white hover:border-[#8B5CF6]/60"
                }`}
              >
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    idx === safeIdx ? "text-[#8B5CF6]" : "text-neutral-400"
                  }`}
                >
                  {od.opcion.nombre || `Opción ${idx + 1}`}
                </span>
                <span className="truncate text-[11px] font-semibold text-neutral-800">
                  {od.hoteles[0]?.alojamiento.nombre ?? "—"}
                </span>
                <span className={`font-mono text-[11px] tabular-nums ${idx === safeIdx ? "font-bold text-[#8B5CF6]" : "text-neutral-500"}`}>
                  USD {fmt(od.netoAloj)}
                </span>
              </button>
            ))}
          </div>
        )}

        {opcionDetail ? (
          <div className="space-y-1.5 text-[12px]">
            {opcionDetail.hoteles.map((h) => {
              const ciudad = ciudadById.get(h.alojamiento.ciudadId);
              return (
                <div key={h.alojamiento.id} className="flex items-baseline justify-between gap-2 border-b border-dashed border-neutral-100 pb-1.5 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-neutral-800">
                      {h.alojamiento.nombre}
                      {h.alojamiento.categoria > 0 && (
                        <span className="ml-1 text-[10px] text-amber-500">
                          {"★".repeat(h.alojamiento.categoria)}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-neutral-400">
                      {ciudad?.nombre ? `${ciudad.nombre} · ` : ""}
                      {h.noches}n × USD {h.precioPorNoche}/n
                    </div>
                    {h.tarifaFallback && <TarifaFallbackChip className="mt-1" />}
                  </div>
                  <span className="flex-shrink-0 font-mono text-[12px] font-semibold tabular-nums text-neutral-900">
                    USD {fmt(h.neto)}
                  </span>
                </div>
              );
            })}
            <div className="flex items-baseline justify-between pt-1 text-[12px]">
              <span className="text-neutral-500">Neto alojamiento</span>
              <span className="font-mono font-bold tabular-nums text-neutral-900">USD {fmt(alojTotal)}</span>
            </div>
          </div>
        ) : (
          <p className="text-[12px] italic text-neutral-400">Sin opciones de alojamiento</p>
        )}

        {/* Traslados */}
        {breakdown.traslados.length > 0 && (
          <div className="mt-3 border-t border-hairline pt-3">
            <h5 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              <Car size={10} /> Traslados
            </h5>
            {breakdown.traslados.map((t) => (
              <TrasladoRow key={t.id} traslado={t} />
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-neutral-100 pt-1 text-[12px]">
              <span className="text-neutral-500">Neto traslado</span>
              <span className="font-mono font-bold tabular-nums text-neutral-900">
                USD {fmt(trasladosTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Seguros */}
        {breakdown.seguros.length > 0 && (
          <div className="mt-3 border-t border-hairline pt-3">
            <h5 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Seguros
            </h5>
            {breakdown.seguros.map((s) => (
              <div key={s.seguro.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                <span className="truncate text-neutral-600">
                  {s.seguro.plan} <span className="text-neutral-400">· {s.dias}d</span>
                </span>
                <span className="flex-shrink-0 font-mono font-semibold tabular-nums text-neutral-900">
                  USD {fmt(s.neto)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Circuitos */}
        {breakdown.circuitos.length > 0 && (
          <div className="mt-3 border-t border-hairline pt-3">
            <h5 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Circuitos
            </h5>
            {breakdown.circuitos.map((c) => (
              <div key={c.circuito.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-neutral-600">{c.circuito.nombre}</span>
                  {c.tarifaFallback && <TarifaFallbackChip />}
                </span>
                <span className="flex-shrink-0 font-mono font-semibold tabular-nums text-neutral-900">
                  USD {fmt(c.neto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================== Cotización block ====================== */}
      <div className="rounded-[12px] border border-[#DCD6FF] bg-gradient-to-br from-[#F1EEFF] to-[#E5F8F4] p-4">
        <h4 className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#8B5CF6]">
          <Calculator size={12} strokeWidth={2} />
          Cotización
        </h4>

        <div className="space-y-1.5 text-[12px]">
          <Line label="Subtotal aéreo" value={aeroTotal} />
          <Line label="Subtotal hotel" value={alojTotal} />
          {trasladosTotal > 0 && <Line label="Subtotal traslado" value={trasladosTotal} />}
          {segurosTotal > 0 && <Line label="Subtotal seguros" value={segurosTotal} />}
          {circuitosTotal > 0 && <Line label="Subtotal circuitos" value={circuitosTotal} />}
        </div>

        <div className="mt-3 border-t border-[#DCD6FF] pt-3">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-neutral-700">Neto total</span>
            <span className="font-mono font-bold tabular-nums text-neutral-900">USD {fmt(netoTotal)}</span>
          </div>
          {markupPct > 0 && (
            <div className="mt-0.5 flex items-baseline justify-between text-[11px] text-neutral-500">
              <span>Markup</span>
              <span className="font-mono tabular-nums">{markupPct}% · factor {factor.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-2 text-[9.5px] font-bold uppercase tracking-wider text-[#8B5CF6]/70">
            Precio por persona (base doble)
          </div>
          <div className="text-[26px] font-extrabold leading-tight tracking-tight text-[#8B5CF6] lining-nums tabular-nums">
            USD {fmt(ventaTotal)}
          </div>
          {opcionDetail?.opcion.nombre && (
            <div className="text-[11.5px] text-neutral-500">
              {opcionDetail.opcion.nombre}
            </div>
          )}
        </div>

        <Link
          href={`/backend/paquetes/${paquete.id}`}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-[9px] bg-[#8B5CF6] py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#7B4EE6]"
        >
          Ver paquete completo
          <ExternalLink size={12} strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-neutral-700">USD {fmt(value)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AereoBlock — full flight info: itinerario, escalas, código vuelo, duración,
// precio period y neto. This is the section the vendor needs to answer leads.
// ---------------------------------------------------------------------------

function AereoBlock({ line, multiple, index }: { line: AeroLine; multiple: boolean; index: number }) {
  const { aereo, precio, netoPorAdulto, tarifaFallback } = line;
  const [showItin, setShowItin] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const hasItinerario = Boolean(aereo.itinerario && aereo.itinerario.trim().length > 0);
  const imagenes = aereo.itinerarioImagenes ?? [];
  const hasImages = imagenes.length > 0;

  return (
    <div className={`${multiple ? "rounded-[10px] border border-hairline bg-[#FBFBFC] p-2.5" : ""}`}>
      {multiple && (
        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#2BA08F]">
          <Plane size={10} /> Vuelo {index + 1}
        </div>
      )}

      <div className="space-y-1 text-[12px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-neutral-500">Ruta</span>
          <span className="text-right font-semibold text-neutral-800">{aereo.ruta}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-neutral-500">Aerolínea</span>
          <span className="font-semibold text-neutral-800">{aereo.aerolinea || "—"}</span>
        </div>
        {aereo.escalas > 0 && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-neutral-500">Escalas</span>
            <span className="font-semibold text-neutral-800">{aereo.escalas}</span>
          </div>
        )}
        {(aereo.codigoVueloIda || aereo.codigoVueloVuelta) && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-neutral-500 flex items-center gap-1">
              <Ticket size={10} /> Códigos
            </span>
            <span className="font-mono text-[11.5px] font-semibold text-neutral-800">
              {aereo.codigoVueloIda || "—"}
              {aereo.codigoVueloVuelta ? ` · ${aereo.codigoVueloVuelta}` : ""}
            </span>
          </div>
        )}
        {(aereo.duracionIda || aereo.duracionVuelta) && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-neutral-500 flex items-center gap-1">
              <Clock size={10} /> Duración
            </span>
            <span className="font-semibold text-neutral-800">
              {aereo.duracionIda || "—"}
              {aereo.duracionVuelta ? ` · ${aereo.duracionVuelta}` : ""}
            </span>
          </div>
        )}
        {aereo.equipaje && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-neutral-500">Equipaje</span>
            <span className="text-right font-semibold text-neutral-800">{aereo.equipaje}</span>
          </div>
        )}

        {/* Precio */}
        <div className="mt-1.5 border-t border-dashed border-neutral-200 pt-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-neutral-500">Precio por persona</span>
            <span className="font-mono font-bold lining-nums tabular-nums text-neutral-900">
              USD {fmt(netoPorAdulto)}
            </span>
          </div>
          {precio && (
            <div className="mt-0.5 text-[10px] text-neutral-400">
              Periodo: {fmtFecha(precio.periodoDesde)} → {fmtFecha(precio.periodoHasta)}
            </div>
          )}
          {tarifaFallback && <TarifaFallbackChip className="mt-1" />}
        </div>

        {/* Itinerario expandible */}
        {(hasItinerario || hasImages) && (
          <button
            type="button"
            onClick={() => setShowItin((s) => !s)}
            className="mt-1.5 flex w-full items-center justify-between rounded-[6px] bg-[#3BBFAD]/8 px-2 py-1 text-[11px] font-semibold text-[#2BA08F] hover:bg-[#3BBFAD]/15"
          >
            <span className="flex items-center gap-1">
              <MapPin size={10} /> Ver itinerario
              {hasImages && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-neutral-400">
                  <ImageIcon size={9} /> {aereo.itinerarioImagenes?.length}
                </span>
              )}
            </span>
            <ChevronRight
              size={11}
              className={`transition-transform ${showItin ? "rotate-90" : ""}`}
            />
          </button>
        )}

        <AnimatePresence initial={false}>
          {showItin && (hasItinerario || hasImages) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 rounded-[6px] bg-white p-2 text-[11.5px] leading-snug text-neutral-700">
                {hasItinerario &&
                  (looksLikeHtml(aereo.itinerario) ? (
                    <div
                      className="[&_a]:text-[#2BA08F] [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(aereo.itinerario) }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">{aereo.itinerario}</pre>
                  ))}
                {hasImages && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {imagenes.map((url: string, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        className="block cursor-zoom-in"
                        aria-label={`Ampliar itinerario ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Itinerario ${i + 1}`}
                          loading="lazy"
                          className="h-auto w-full rounded-[4px] border border-hairline object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ImageLightbox
        images={imagenes}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrasladoRow — línea de traslado/paseo dentro del detalle del paquete. Si el
// traslado tiene `imagenes` (cargadas desde el admin de traslados), agrega un
// chip discreto con contador que despliega miniaturas y abre el mismo
// ImageLightbox reutilizado en el bloque de itinerario aéreo. Sin imágenes,
// el renglón queda idéntico al original (solo nombre · tipo · precio).
// ---------------------------------------------------------------------------

function TrasladoRow({ traslado }: { traslado: Traslado }) {
  const [showImages, setShowImages] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const imagenes = traslado.imagenes ?? [];
  const hasImages = imagenes.length > 0;

  return (
    <div className="text-[12px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 truncate text-neutral-600">
          <span className="truncate">
            {traslado.nombre} <span className="text-neutral-400">· {traslado.tipo}</span>
          </span>
          {hasImages && (
            <button
              type="button"
              onClick={(e) => {
                // stopPropagation: este renglón vive dentro del detalle ya
                // expandido del paquete, pero evitamos que el click se
                // propague por si algún ancestro futuro agrega un toggle.
                e.stopPropagation();
                setShowImages((s) => !s);
              }}
              className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full bg-[#3BBFAD]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#2BA08F] hover:bg-[#3BBFAD]/20"
              aria-label={`Ver ${imagenes.length} imagen(es) de ${traslado.nombre}`}
            >
              <ImageIcon size={9} /> {imagenes.length}
            </button>
          )}
        </span>
        <span className="flex-shrink-0 font-mono font-semibold tabular-nums text-neutral-900">
          USD {fmt(traslado.precio)}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {showImages && hasImages && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 grid grid-cols-4 gap-1 pb-0.5">
              {imagenes.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                  className="block cursor-zoom-in"
                  aria-label={`Ampliar imagen ${i + 1} de ${traslado.nombre}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxyThumbUrl(url, 160)}
                    alt={`${traslado.nombre} ${i + 1}`}
                    loading="lazy"
                    className="h-12 w-full rounded-[4px] border border-hairline object-cover"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageLightbox
        images={imagenes}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estado badge — compact pill rendered inline with the title. ACTIVO is the
// default state so we omit its badge to keep the row clean; everything else
// (borrador, en revisión, archivado) gets a coloured pill so the vendor
// knows what's live vs in-flight before they quote it.
// ---------------------------------------------------------------------------

function EstadoBadge({ estado }: { estado: Paquete["estado"] }) {
  if (estado === "ACTIVO") return null;
  const cfg = {
    BORRADOR: { label: "Borrador", bg: "#FEF3E5", fg: "#B45A0F" },
    EN_REVISION: { label: "En revisión", bg: "#F1EEFF", fg: "#6D40D4" },
    ARCHIVADO: { label: "Archivado", bg: "#F0F1F5", fg: "#5A5E7A" },
  } as const;
  const c = cfg[estado as keyof typeof cfg];
  if (!c) return null;
  return (
    <span
      className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
      style={{ background: c.bg, color: c.fg }}
    >
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Los operadores a veces pegan el itinerario como HTML (desde el editor
// enriquecido o un correo) y otras como texto plano. Misma heurística que usa
// la vista pública (looksLikeHtml en PackageDetailView).
const looksLikeHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

const fmt = (n: number) => Math.round(n).toLocaleString("es-UY");
const fmtFecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y.slice(2)}` : iso;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VendedorDashboard() {
  // El dashboard de paquetes lo comparten VENDEDOR y MARKETING. El único ajuste
  // por rol es el rótulo del panel (R3): MARKETING veía "Panel Vendedor", que
  // confundía. El resto de la vista (browse de paquetes) aplica igual a ambos.
  const { user } = useAuth();
  const panelLabel = user?.role === "MARKETING" ? "Panel Marketing" : "Panel Vendedor";
  const paquetes = usePaquetes();
  const packageState = usePackageState();
  const serviceState = useServiceState();
  const allOpciones = useAllOpcionesHoteleras();
  const allDestinos = useAllDestinos();
  const allOpcionHoteles = useAllOpcionHoteles();
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const traslados = useTraslados();
  const seguros = useSeguros();
  const circuitos = useCircuitos();
  const paises = usePaises();
  const regiones = useRegiones();
  const temporadas = useTemporadas();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedOpcion, setSelectedOpcion] = useState<Map<string, number>>(() => new Map());
  const [filterDestino, setFilterDestino] = useState<string>("");
  const [filterTemporada, setFilterTemporada] = useState<string>("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Vendors see every package in their brand so they can answer any lead —
  // including drafts and packages under review. Archived rows are still
  // surfaced so they can quote historical promos when asked. The row badge
  // surfaces the estado so it's never ambiguous which packages are live.
  const paquetesActivos = paquetes;

  // ---- Lookup maps (built once per data update) ----
  const aereoById = useMemo(() => {
    const m = new Map<string, Aereo>();
    for (const a of aereos) m.set(a.id, a);
    return m;
  }, [aereos]);

  const alojamientoById = useMemo(() => {
    const m = new Map<string, Alojamiento>();
    for (const a of alojamientos) m.set(a.id, a);
    return m;
  }, [alojamientos]);

  const trasladoById = useMemo(() => {
    const m = new Map<string, Traslado>();
    for (const t of traslados) m.set(t.id, t);
    return m;
  }, [traslados]);

  const seguroById = useMemo(() => {
    const m = new Map<string, Seguro>();
    for (const s of seguros) m.set(s.id, s);
    return m;
  }, [seguros]);

  const circuitoById = useMemo(() => {
    const m = new Map<string, Circuito>();
    for (const c of circuitos) m.set(c.id, c);
    return m;
  }, [circuitos]);

  const ciudadById = useMemo(() => {
    const m = new Map<string, { id: string; nombre: string; paisId: string }>();
    for (const p of paises) for (const c of p.ciudades) m.set(c.id, c);
    return m;
  }, [paises]);

  const temporadaById = useMemo(() => {
    const m = new Map<string, Temporada>();
    for (const t of temporadas) m.set(t.id, t);
    return m;
  }, [temporadas]);

  // Pre-bucket package state by paqueteId — avoids O(n²) scans per paquete during search.
  const destinosByPaquete = useMemo(() => {
    const m = new Map<string, PaqueteDestino[]>();
    for (const d of allDestinos) {
      const list = m.get(d.paqueteId);
      if (list) list.push(d);
      else m.set(d.paqueteId, [d]);
    }
    return m;
  }, [allDestinos]);

  const opcionesByPaquete = useMemo(() => {
    const m = new Map<string, OpcionHotelera[]>();
    for (const o of allOpciones) {
      const list = m.get(o.paqueteId);
      if (list) list.push(o);
      else m.set(o.paqueteId, [o]);
    }
    // Sort each by orden
    m.forEach((list) => list.sort((a, b) => a.orden - b.orden));
    return m;
  }, [allOpciones]);

  const opcionHotelesByOpcion = useMemo(() => {
    const m = new Map<string, OpcionHotel[]>();
    for (const oh of allOpcionHoteles) {
      const list = m.get(oh.opcionHoteleraId);
      if (list) list.push(oh);
      else m.set(oh.opcionHoteleraId, [oh]);
    }
    return m;
  }, [allOpcionHoteles]);

  const paqueteAereosByPaquete = useMemo(() => {
    const m = new Map<string, typeof packageState.paqueteAereos>();
    for (const pa of packageState.paqueteAereos) {
      const list = m.get(pa.paqueteId);
      if (list) list.push(pa);
      else m.set(pa.paqueteId, [pa]);
    }
    return m;
  }, [packageState.paqueteAereos]);

  const paqueteAlojamientosByPaquete = useMemo(() => {
    const m = new Map<string, typeof packageState.paqueteAlojamientos>();
    for (const pa of packageState.paqueteAlojamientos) {
      const list = m.get(pa.paqueteId);
      if (list) list.push(pa);
      else m.set(pa.paqueteId, [pa]);
    }
    return m;
  }, [packageState.paqueteAlojamientos]);

  const paqueteTrasladosByPaquete = useMemo(() => {
    const m = new Map<string, typeof packageState.paqueteTraslados>();
    for (const pt of packageState.paqueteTraslados) {
      const list = m.get(pt.paqueteId);
      if (list) list.push(pt);
      else m.set(pt.paqueteId, [pt]);
    }
    return m;
  }, [packageState.paqueteTraslados]);

  const paqueteSegurosByPaquete = useMemo(() => {
    const m = new Map<string, typeof packageState.paqueteSeguros>();
    for (const ps of packageState.paqueteSeguros) {
      const list = m.get(ps.paqueteId);
      if (list) list.push(ps);
      else m.set(ps.paqueteId, [ps]);
    }
    return m;
  }, [packageState.paqueteSeguros]);

  const paqueteCircuitosByPaquete = useMemo(() => {
    const m = new Map<string, typeof packageState.paqueteCircuitos>();
    for (const pc of packageState.paqueteCircuitos) {
      const list = m.get(pc.paqueteId);
      if (list) list.push(pc);
      else m.set(pc.paqueteId, [pc]);
    }
    return m;
  }, [packageState.paqueteCircuitos]);

  // ---- País resolver (for destino chip + filtering) ----
  const paisResolver = useMemo(
    () =>
      buildPaisResolver(
        packageState.paqueteAlojamientos,
        alojamientos,
        paises,
        regiones,
      ),
    [packageState.paqueteAlojamientos, alojamientos, paises, regiones],
  );

  // ---- First-photo lookup ----
  const fotoByPaquete = useMemo(() => {
    const m = new Map<string, PaqueteFoto>();
    const sorted = [...packageState.paqueteFotos].sort((a, b) => a.orden - b.orden);
    for (const f of sorted) if (!m.has(f.paqueteId)) m.set(f.paqueteId, f);
    return m;
  }, [packageState.paqueteFotos]);

  // ---- Per-paquete breakdown (memoized; only rebuilds when service/package data changes) ----
  // Computed lazily: just the metadata up here, the full detail is materialized when expanded.
  const breakdownCache = useRef<Map<string, PaqueteBreakdown>>(new Map());

  // Invalidate cache when underlying data changes (cheap: just clear the map).
  useEffect(() => {
    breakdownCache.current.clear();
  }, [
    packageState.paqueteAereos,
    packageState.paqueteAlojamientos,
    packageState.paqueteTraslados,
    packageState.paqueteSeguros,
    packageState.paqueteCircuitos,
    packageState.destinos,
    allOpciones,
    allOpcionHoteles,
    serviceState.preciosAereo,
    serviceState.preciosAlojamiento,
    serviceState.preciosCircuito,
  ]);

  const getBreakdown = useCallback(
    (paquete: Paquete): PaqueteBreakdown => {
      const cached = breakdownCache.current.get(paquete.id);
      if (cached) return cached;

      const fecha = fechaAnclaPaquete(paquete);
      const destinos = (destinosByPaquete.get(paquete.id) ?? []).slice().sort((a, b) => a.orden - b.orden);
      const nochesTotales = computeNochesTotales(destinos);

      const paAereos = paqueteAereosByPaquete.get(paquete.id) ?? [];
      const aereoLines: AeroLine[] = [];
      for (const pa of paAereos) {
        const aereo = aereoById.get(pa.aereoId);
        if (!aereo) continue;
        const { precio, fallback } = resolvePrecioAereoConMeta(serviceState.preciosAereo, pa.aereoId, fecha);
        aereoLines.push({ aereo, precio, netoPorAdulto: precio?.precioAdulto ?? 0, tarifaFallback: Boolean(precio) && fallback });
      }

      const paTraslados = paqueteTrasladosByPaquete.get(paquete.id) ?? [];
      const trasladosList: Traslado[] = [];
      for (const pt of paTraslados) {
        const t = trasladoById.get(pt.trasladoId);
        if (t) trasladosList.push(t);
      }

      const paCircuitos = paqueteCircuitosByPaquete.get(paquete.id) ?? [];
      const circuitosList: { circuito: Circuito; neto: number; tarifaFallback: boolean }[] = [];
      for (const pc of paCircuitos) {
        const c = circuitoById.get(pc.circuitoId);
        if (!c) continue;
        const { precio, fallback } = resolvePrecioCircuitoConMeta(serviceState.preciosCircuito, pc.circuitoId, fecha);
        circuitosList.push({ circuito: c, neto: precio?.precio ?? 0, tarifaFallback: Boolean(precio) && fallback });
      }

      const opciones = opcionesByPaquete.get(paquete.id) ?? [];

      // Modalidad CIRCUITO sin opciones hoteleras: espejo de la rama circuito
      // de computePaquetePrecios / PreciosTab. La duración de referencia para
      // los seguros sin diasCobertura es la del circuito asignado, con
      // fallback a paquete.noches y por último a nochesTotales.
      const esCircuito = paquete.modalidad === "CIRCUITO" && opciones.length === 0;
      const nochesRef = esCircuito
        ? circuitosList[0]?.circuito.noches ?? paquete.noches ?? nochesTotales
        : nochesTotales;

      const paSeguros = paqueteSegurosByPaquete.get(paquete.id) ?? [];
      const segurosList: { seguro: Seguro; dias: number; neto: number }[] = [];
      for (const ps of paSeguros) {
        const s = seguroById.get(ps.seguroId);
        if (!s) continue;
        const dias = ps.diasCobertura ?? nochesRef;
        segurosList.push({ seguro: s, dias, neto: s.costoPorDia * dias });
      }

      const netoAero = aereoLines.reduce((s, l) => s + l.netoPorAdulto, 0);
      const netoTraslado = trasladosList.reduce((s, t) => s + t.precio, 0);
      const netoSeguros = segurosList.reduce((s, x) => s + x.neto, 0);
      const netoCircuitos = circuitosList.reduce((s, x) => s + x.neto, 0);
      const netoFijos = calcularNetoFijos(
        aereoLines.map((l) => ({ aereo: l.aereo, precioAereo: l.precio })),
        trasladosList,
        segurosList.map((x) => ({ seguro: x.seguro, diasCobertura: x.dias })),
        circuitosList.map((x) => ({ circuito: x.circuito, precioCircuito: { id: "", circuitoId: x.circuito.id, periodoDesde: "", periodoHasta: "", precio: x.neto } })),
        nochesRef,
      );
      const ventaCircuito = esCircuito ? calcularVenta(netoFijos, paquete.markup) : 0;
      const opcionesDetail: OpcionDetail[] = opciones.map((opcion) => {
        const ohs = (opcionHotelesByOpcion.get(opcion.id) ?? []).slice().sort((a, b) => a.orden - b.orden);
        const hoteles: OpcionDetail["hoteles"] = [];
        for (const oh of ohs) {
          const alo = alojamientoById.get(oh.alojamientoId);
          if (!alo) continue;
          const destino = destinos.find((d) => d.id === oh.destinoId);
          const noches = destino?.noches ?? 0;
          const { precio, fallback } = resolvePrecioAlojamientoConMeta(serviceState.preciosAlojamiento, oh.alojamientoId, fecha);
          const pn = precio?.precioPorNoche ?? 0;
          hoteles.push({ alojamiento: alo, noches, precioPorNoche: pn, neto: pn * noches, tarifaFallback: Boolean(precio) && fallback });
        }
        const netoAloj = calcularNetoAlojamientosPorOpcion(
          opcion.id,
          allOpcionHoteles,
          destinos,
          serviceState.preciosAlojamiento,
          fecha,
        );
        const ventaPorAdulto = calcularVentaOpcion(netoFijos, netoAloj, opcion.factor);
        return { opcion, hoteles, netoAloj, ventaPorAdulto };
      });

      const breakdown: PaqueteBreakdown = {
        aereos: aereoLines,
        alojamientoNeto: opcionesDetail[0]?.netoAloj ?? 0,
        traslados: trasladosList,
        seguros: segurosList,
        circuitos: circuitosList,
        netoAero,
        netoTraslado,
        netoSeguros,
        netoCircuitos,
        netoFijos,
        opcionesDetail,
        nochesTotales,
        destinos,
        esCircuito,
        ventaCircuito,
      };
      breakdownCache.current.set(paquete.id, breakdown);
      return breakdown;
    },
    [
      destinosByPaquete,
      paqueteAereosByPaquete,
      paqueteAlojamientosByPaquete,
      paqueteTrasladosByPaquete,
      paqueteSegurosByPaquete,
      paqueteCircuitosByPaquete,
      aereoById,
      trasladoById,
      seguroById,
      circuitoById,
      alojamientoById,
      opcionesByPaquete,
      opcionHotelesByOpcion,
      allOpcionHoteles,
      serviceState.preciosAereo,
      serviceState.preciosAlojamiento,
      serviceState.preciosCircuito,
    ],
  );

  // ---- Filtering ----
  // Search keys: titulo, destino legible, hotel principal, aerolínea
  const indexedRows = useMemo(() => {
    return paquetesActivos.map((p) => {
      const destinoNombre = paisResolver.paisNombreFor(p.id) ?? p.destino ?? "";
      const regionNombre = paisResolver.regionNombreFor(p.id) ?? "";
      const opciones = opcionesByPaquete.get(p.id) ?? [];
      const aerolineas: string[] = [];
      for (const pa of paqueteAereosByPaquete.get(p.id) ?? []) {
        const a = aereoById.get(pa.aereoId);
        if (a?.aerolinea) aerolineas.push(a.aerolinea);
      }
      const hoteles: string[] = [];
      for (const op of opciones) {
        for (const oh of opcionHotelesByOpcion.get(op.id) ?? []) {
          const al = alojamientoById.get(oh.alojamientoId);
          if (al?.nombre) hoteles.push(al.nombre);
        }
      }
      const noches = computeNochesTotales(destinosByPaquete.get(p.id) ?? []);
      return {
        paquete: p,
        destinoNombre,
        regionNombre,
        noches,
        searchHaystack: [p.titulo, destinoNombre, regionNombre, ...aerolineas, ...hoteles],
      };
    });
  }, [
    paquetesActivos,
    paisResolver,
    opcionesByPaquete,
    paqueteAereosByPaquete,
    aereoById,
    opcionHotelesByOpcion,
    alojamientoById,
    destinosByPaquete,
  ]);

  // Deep link `?paquete={id}`: los emails de consulta de paquete traen un
  // acceso directo que abre el panel de ese paquete en este portal. Se aplica
  // una sola vez cuando los datos ya están cargados; si el id no existe, se
  // ignora en silencio.
  const searchParams = useSearchParams();
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    const target = searchParams.get("paquete");
    if (!target) {
      deepLinkAppliedRef.current = true;
      return;
    }
    if (indexedRows.length === 0) return;
    deepLinkAppliedRef.current = true;
    const idx = indexedRows.findIndex((r) => r.paquete.id === target);
    if (idx === -1) return;
    if (idx >= PAGE_SIZE) setPageSize(idx + 1);
    setOpenId(target);
    requestAnimationFrame(() => {
      document
        .getElementById(`vend-row-${target}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams, indexedRows]);

  const filteredRows = useMemo(() => {
    const term = deferredSearch.trim();
    let rows = indexedRows;
    if (filterDestino) {
      rows = rows.filter((r) => r.destinoNombre === filterDestino);
    }
    if (filterTemporada) {
      rows = rows.filter((r) => r.paquete.temporadaId === filterTemporada);
    }
    if (term) {
      rows = rows.filter((r) => matchesSearch(term, ...r.searchHaystack));
    }
    return rows;
  }, [indexedRows, deferredSearch, filterDestino, filterTemporada]);

  // Reset visible page size when search/filters narrow
  useEffect(() => {
    setPageSize(PAGE_SIZE);
  }, [deferredSearch, filterDestino, filterTemporada]);

  const visibleRows = useMemo(() => filteredRows.slice(0, pageSize), [filteredRows, pageSize]);

  // ---- Stats ----
  const destinoOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of indexedRows) {
      if (!r.destinoNombre) continue;
      counts.set(r.destinoNombre, (counts.get(r.destinoNombre) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, count]) => ({ nombre, count }));
  }, [indexedRows]);

  const destinosCount = destinoOptions.length;
  const nuevosEstaSemana = useMemo(() => countNuevosEstaSemana(paquetesActivos), [paquetesActivos]);
  const tempActual = useMemo(() => currentTemporada(temporadas), [temporadas]);

  // ---- Keyboard: "/" focuses search ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "Escape") {
        if (openId) setOpenId(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  // ---- Render ----
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-baseline justify-between gap-2"
      >
        <div>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-neutral-900">
            {getGreeting()}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-neutral-400">{formatFecha()}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1">
          <Sparkles size={12} className="text-[#3BBFAD]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {panelLabel}
          </span>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Package}
          label="Paquetes Disponibles"
          value={paquetesActivos.length}
          color="#3BBFAD"
        />
        <StatCard
          icon={Globe2}
          label="Destinos"
          value={destinosCount}
          color="#8B5CF6"
          delay={0.04}
        />
        <StatCard
          icon={Sparkles}
          label="Nuevos esta semana"
          value={nuevosEstaSemana}
          color="#E8913A"
          delay={0.08}
        />
        <StatCard
          icon={Calculator}
          label="Temporada actual"
          value={tempActual?.nombre.replace(/\s*\(.*\)/, "").trim() ?? "—"}
          color="#2B8AFF"
          delay={0.12}
        />
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-stretch gap-2 overflow-hidden rounded-[14px] border border-hairline bg-white shadow-[0_1px_2px_rgba(26,26,46,0.04),_0_8px_24px_rgba(139,92,246,0.05)] focus-within:border-[#8B5CF6]/60 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]">
          <div className="relative flex flex-1 items-center">
            <Search size={15} className="absolute left-4 text-neutral-400" strokeWidth={2} />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, destino, hotel o aerolínea…"
              className="h-12 w-full bg-transparent pl-11 pr-12 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                aria-label="Limpiar"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 hidden h-5 items-center rounded border px-1.5 font-mono text-[10.5px] text-neutral-400 sm:flex" style={{ borderColor: "rgba(17,17,36,0.08)" }}>
                /
              </kbd>
            )}
          </div>

          <div className="hidden w-px self-stretch bg-neutral-200 md:block" />

          <select
            value={filterDestino}
            onChange={(e) => setFilterDestino(e.target.value)}
            className="bg-transparent px-4 py-2 text-[13px] font-medium text-neutral-700 focus:outline-none md:w-[180px]"
          >
            <option value="">Todos los destinos</option>
            {destinoOptions.map((d) => (
              <option key={d.nombre} value={d.nombre}>
                {d.nombre} ({d.count})
              </option>
            ))}
          </select>

          <div className="hidden w-px self-stretch bg-neutral-200 md:block" />

          <select
            value={filterTemporada}
            onChange={(e) => setFilterTemporada(e.target.value)}
            className="bg-transparent px-4 py-2 text-[13px] font-medium text-neutral-700 focus:outline-none md:w-[180px]"
          >
            <option value="">Todas las temporadas</option>
            {temporadas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre.replace(/\s*\(.*\)/, "").trim()}
              </option>
            ))}
          </select>
        </div>

        {/* Nota de cotización — todo se muestra por persona en base doble */}
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-hairline bg-white px-3 py-2 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#8B5CF6]">
            <Users size={12} />
            Cotización por persona
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3BBFAD]" />
            Precios de venta por persona en base doble
          </span>
        </div>
      </div>

      {/* Results bar */}
      <div className="flex items-baseline justify-between text-[12.5px] text-neutral-500">
        <span>
          Mostrando <strong className="font-bold text-neutral-900">{visibleRows.length}</strong> de{" "}
          <strong className="font-bold text-neutral-900">{filteredRows.length}</strong> paquetes
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-hairline bg-white shadow-[0_1px_2px_rgba(26,26,46,0.04),_0_4px_12px_rgba(26,26,46,0.04)]">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Search size={36} strokeWidth={1.5} className="mb-3 text-neutral-300" />
            <p className="text-[13.5px] text-neutral-500">No encontramos paquetes con ese criterio.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterDestino("");
                setFilterTemporada("");
              }}
              className="mt-3 text-[12.5px] font-semibold text-[#8B5CF6] hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="bg-[#FBFBFC] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500" style={{ width: "44%" }}>
                  Paquete
                </th>
                <th className="bg-[#FBFBFC] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                  Destino
                </th>
                <th className="bg-[#FBFBFC] px-4 py-3 text-center text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                  Noches
                </th>
                <th className="bg-[#FBFBFC] px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                  Temporada
                </th>
                <th className="bg-[#FBFBFC] px-4 py-3 text-right text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                  Por persona
                </th>
                <th className="bg-[#FBFBFC] px-4 py-3" style={{ width: "44px" }} />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const p = row.paquete;
                const foto = fotoByPaquete.get(p.id);
                const temp = p.temporadaId ? temporadaById.get(p.temporadaId) : undefined;
                const isOpen = openId === p.id;

                // Lazily compute breakdown only when row is open (or already cached for price)
                const breakdown = getBreakdown(p);
                const opcionIdx = selectedOpcion.get(p.id) ?? 0;
                const safeIdx = Math.min(opcionIdx, Math.max(0, breakdown.opcionesDetail.length - 1));
                const opcion = breakdown.opcionesDetail[safeIdx];
                // Precio de venta POR PERSONA (base doble), espejo del motor
                // computePaquetePrecios: con opciones usa calcularVentaOpcion;
                // modalidad CIRCUITO sin opciones usa el markup del paquete;
                // fallback legacy es paquete.precioVenta (último recurso, el
                // neto fijo como piso).
                const totalVenta = opcion
                  ? calcularVentaOpcion(breakdown.netoFijos, opcion.netoAloj, opcion.opcion.factor)
                  : breakdown.esCircuito
                    ? breakdown.ventaCircuito
                    : p.precioVenta > 0
                      ? p.precioVenta
                      : breakdown.netoFijos;

                return (
                  <RowGroup
                    key={p.id}
                    paquete={p}
                    foto={foto}
                    destinoNombre={row.destinoNombre}
                    regionNombre={row.regionNombre}
                    noches={row.noches}
                    temporada={temp}
                    isOpen={isOpen}
                    onToggle={() => setOpenId((cur) => (cur === p.id ? null : p.id))}
                    totalVenta={totalVenta}
                    opcionNombre={opcion?.opcion.nombre}
                    breakdown={breakdown}
                    selectedOpcionIdx={safeIdx}
                    onSelectOpcion={(idx) =>
                      setSelectedOpcion((prev) => {
                        const next = new Map(prev);
                        next.set(p.id, idx);
                        return next;
                      })
                    }
                    alojamientoById={alojamientoById}
                    ciudadById={ciudadById}
                  />
                );
              })}
            </tbody>
          </table>
        )}

        {pageSize < filteredRows.length && (
          <div className="border-t border-hairline bg-[#FBFBFC] px-4 py-4 text-center">
            <button
              type="button"
              onClick={() => setPageSize((s) => s + PAGE_SIZE)}
              className="rounded-[9px] border border-hairline bg-white px-6 py-2 text-[12.5px] font-semibold text-neutral-700 transition hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
            >
              Cargar {Math.min(PAGE_SIZE, filteredRows.length - pageSize)} más
            </button>
            <p className="mt-1.5 text-[11px] text-neutral-400">
              {filteredRows.length - pageSize} paquetes restantes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row + detail combination — split out so each row only re-renders on its own
// state changes (selected opcion, open/close). Precios se muestran siempre por
// persona en base doble, así que no dependen de ningún selector de pasajeros.
// ---------------------------------------------------------------------------

interface RowGroupProps {
  paquete: Paquete;
  foto: PaqueteFoto | undefined;
  destinoNombre: string;
  regionNombre: string;
  noches: number;
  temporada: Temporada | undefined;
  isOpen: boolean;
  onToggle: () => void;
  totalVenta: number;
  opcionNombre: string | undefined;
  breakdown: PaqueteBreakdown;
  selectedOpcionIdx: number;
  onSelectOpcion: (idx: number) => void;
  alojamientoById: Map<string, Alojamiento>;
  ciudadById: Map<string, { id: string; nombre: string; paisId: string }>;
}

function RowGroup({
  paquete,
  foto,
  destinoNombre,
  regionNombre,
  noches,
  temporada,
  isOpen,
  onToggle,
  totalVenta,
  opcionNombre,
  breakdown,
  selectedOpcionIdx,
  onSelectOpcion,
  alojamientoById,
  ciudadById,
}: RowGroupProps) {
  return (
    <>
      <tr
        id={`vend-row-${paquete.id}`}
        className={`cursor-pointer border-t border-hairline transition ${
          isOpen ? "bg-[#F8F7FF]" : "hover:bg-[#FBFBFC]"
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#E8E5FF] to-[#DCFAF4]">
              {foto?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proxyThumbUrl(foto.url, 160)} alt={foto.alt ?? paquete.titulo} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Package size={20} className="text-neutral-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-neutral-900">{paquete.titulo}</span>
                <EstadoBadge estado={paquete.estado} />
              </div>
              {breakdown.opcionesDetail[0] && (
                <div className="truncate text-[11.5px] text-neutral-500">
                  {breakdown.opcionesDetail[0].hoteles[0]?.alojamiento.nombre ?? "—"}
                  {breakdown.aereos[0]?.aereo.aerolinea ? ` · ${breakdown.aereos[0].aereo.aerolinea}` : ""}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-[12.5px] text-neutral-600">
          {regionNombre && (
            <span className="block text-[10px] uppercase tracking-wider text-neutral-400">{regionNombre}</span>
          )}
          {destinoNombre || "—"}
        </td>
        <td className="px-4 py-3 text-center font-mono text-[12.5px] tabular-nums text-neutral-700">
          {noches > 0 ? `${noches}n` : "—"}
        </td>
        <td className="px-4 py-3">
          {temporada ? (
            <span className="rounded-full bg-[#F1EEFF] px-2 py-0.5 text-[10.5px] font-semibold text-[#8B5CF6]">
              {temporada.nombre.replace(/\s*\(.*\)/, "").trim()}
            </span>
          ) : (
            <span className="text-[11.5px] text-neutral-300">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="font-mono text-[14px] font-bold lining-nums tabular-nums text-neutral-900">
            USD {fmt(totalVenta)}
          </div>
          <div className="mt-0.5 text-[10.5px] text-neutral-400">
            por persona · base doble{opcionNombre ? ` · ${opcionNombre}` : ""}
          </div>
        </td>
        <td className="px-2 py-3 text-center">
          <ChevronRight
            size={16}
            className={`text-neutral-400 transition-transform ${isOpen ? "rotate-90 text-[#8B5CF6]" : ""}`}
          />
        </td>
      </tr>
      <AnimatePresence initial={false}>
        {isOpen && (
          <tr>
            <td colSpan={6} className="border-t-0 p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <DetailPanel
                  paquete={paquete}
                  breakdown={breakdown}
                  selectedOpcionIdx={selectedOpcionIdx}
                  onSelectOpcion={onSelectOpcion}
                  alojamientoById={alojamientoById}
                  ciudadById={ciudadById}
                />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
