"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  CircleAlert,
  Filter,
  Globe2,
  Hotel,
  Layers3,
  Package,
  Percent,
  Plane,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DataTablePageHeader } from "@/components/ui/data/DataTableToolbar";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Tag } from "@/components/ui/Tag";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data/DataTable";
import {
  usePaquetes,
  usePackageState,
  useAllOpcionesHoteleras,
} from "@/components/providers/PackageProvider";
import {
  useServiceState,
  useAereos,
  useAlojamientos,
} from "@/components/providers/ServiceProvider";
import {
  usePaises,
  useRegiones,
  useEtiquetas,
  useTiposPaquete,
} from "@/components/providers/CatalogProvider";
import { usePackageLoading } from "@/components/providers/PackageProvider";
import { parseStoredDate } from "@/lib/date";
import {
  calcularNetoAlojamientosPorOpcion,
  calcularNetoFijos,
  calcularVentaOpcion,
  formatCurrency,
  resolvePrecioAereo,
  resolvePrecioAlojamiento,
  resolvePrecioCircuito,
} from "@/lib/utils";
import type {
  Etiqueta,
  Alojamiento,
  Ciudad,
  PaqueteEtiqueta,
  OpcionHotelera,
  Paquete,
  Pais,
  Region,
} from "@/lib/types";

type PaisWithCiudades = Pais & { ciudades: Ciudad[] };
type RegionWithPaises = Region & { paises: PaisWithCiudades[] };
type ProductFilter = "all" | "paquetes" | "aereos" | "alojamientos";
type ChannelFilter = "all" | "campaign" | "organic" | "sin-canal";

interface Geography {
  destinationLabel: string;
  countryName: string | null;
  regionName: string | null;
}

interface HotelContribution {
  id: string;
  nombre: string;
  revenue: number;
  cost: number;
  margin: number;
}

interface PackageRow {
  id: string;
  titulo: string;
  tipoPaqueteId?: string;
  reportDate: Date;
  geography: Geography;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  ticket: number;
  salesCount: number;
  airAssignments: number;
  hotelAssignments: number;
  airRevenue: number;
  airCost: number;
  hotelRevenue: number;
  hotelCost: number;
  hotelContributions: HotelContribution[];
  channel: "Campaña" | "Orgánico" | "Sin canal";
  status: Paquete["estado"];
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  accent: string;
  delta?: number | null;
  estimated?: boolean;
}

interface InsightItem {
  title: string;
  body: string;
  tone: "positive" | "warning" | "negative" | "neutral";
}

const KPI_ACCENTS = {
  emerald: "#17A673",
  teal: "#3BBFAD",
  blue: "#2563EB",
  amber: "#D97706",
  violet: "#7C3AED",
  red: "#E11D48",
} as const;

const CHANNEL_OPTIONS = [
  { value: "all", label: "Todos los canales" },
  { value: "campaign", label: "Campaña / promo" },
  { value: "organic", label: "Orgánico" },
  { value: "sin-canal", label: "Sin canal integrado" },
] as const;

const PRODUCT_OPTIONS = [
  { value: "all", label: "Todos los productos" },
  { value: "paquetes", label: "Paquetes" },
  { value: "aereos", label: "Aéreos" },
  { value: "alojamientos", label: "Alojamientos" },
] as const;

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function extractGeoTokens(value: string | null | undefined): string[] {
  const raw = value?.trim();
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/\s*(?:\+|\/|,|\sy\s|\se\s)\s*/i)
        .flatMap((part) =>
          part
            .split(/\s*(?:›|>|-|–|—)\s*/)
            .map((segment) => normalizeText(segment))
            .filter(Boolean),
        ),
    ),
  );
}

function getReportDate(paquete: Paquete): Date {
  return (
    parseStoredDate(paquete.validezDesde) ??
    parseStoredDate(paquete.createdAt) ??
    new Date()
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function comparePct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function buildCatalogMaps(paises: PaisWithCiudades[], regiones: RegionWithPaises[]) {
  const paisById = new Map<string, PaisWithCiudades>();
  const paisByNormalizedName = new Map<string, PaisWithCiudades>();
  const cityByNormalizedName = new Map<string, { ciudad: Ciudad; pais: PaisWithCiudades }>();
  const regionById = new Map<string, RegionWithPaises>();
  const regionByNormalizedName = new Map<string, RegionWithPaises>();

  for (const region of regiones) {
    regionById.set(region.id, region);
    regionByNormalizedName.set(normalizeText(region.nombre), region);
  }

  for (const pais of paises) {
    paisById.set(pais.id, pais);
    paisByNormalizedName.set(normalizeText(pais.nombre), pais);
    for (const ciudad of pais.ciudades) {
      cityByNormalizedName.set(normalizeText(ciudad.nombre), { ciudad, pais });
    }
  }

  return {
    paisById,
    paisByNormalizedName,
    cityByNormalizedName,
    regionById,
    regionByNormalizedName,
  };
}

function classifyChannel(tagNames: string[]): "Campaña" | "Orgánico" | "Sin canal" {
  if (tagNames.length === 0) return "Sin canal";

  const normalized = tagNames.map((name) => normalizeText(name));
  const promotionalPatterns = [
    "black week",
    "promo nordeste",
    "vacaciones julio",
  ];

  if (
    normalized.some((name) =>
      promotionalPatterns.some((pattern) => name.includes(pattern)),
    )
  ) {
    return "Campaña";
  }

  return "Orgánico";
}

function resolveGeographyFromDestino(
  destino: string | null | undefined,
  fallbackPaisId: string | null,
  maps: ReturnType<typeof buildCatalogMaps>,
): Geography {
  const tokens = extractGeoTokens(destino);
  let regionName: string | null = null;
  let countryName: string | null = null;

  for (const token of tokens) {
    const directRegion = maps.regionByNormalizedName.get(token);
    if (directRegion) {
      regionName = directRegion.nombre;
      break;
    }
  }

  for (const token of tokens) {
    const directPais = maps.paisByNormalizedName.get(token);
    if (directPais) {
      countryName = directPais.nombre;
      if (!regionName && directPais.regionId) {
        regionName = maps.regionById.get(directPais.regionId)?.nombre ?? null;
      }
      break;
    }

    const directCiudad = maps.cityByNormalizedName.get(token);
    if (directCiudad) {
      countryName = directCiudad.pais.nombre;
      if (!regionName && directCiudad.pais.regionId) {
        regionName = maps.regionById.get(directCiudad.pais.regionId)?.nombre ?? null;
      }
      break;
    }
  }

  if ((!countryName || !regionName) && fallbackPaisId) {
    const fallbackPais = maps.paisById.get(fallbackPaisId);
    if (fallbackPais) {
      countryName = countryName ?? fallbackPais.nombre;
      if (!regionName && fallbackPais.regionId) {
        regionName = maps.regionById.get(fallbackPais.regionId)?.nombre ?? null;
      }
    }
  }

  const destinationLabel =
    destino?.trim() ||
    countryName ||
    regionName ||
    "Sin destino";

  return { destinationLabel, countryName, regionName };
}

function dominantPaisIdForPackage(
  paqueteId: string,
  packageState: ReturnType<typeof usePackageState>,
  alojamientosById: Map<string, Alojamiento>,
): string | null {
  const counts = new Map<string, number>();

  for (const row of packageState.paqueteAlojamientos) {
    if (row.paqueteId !== paqueteId) continue;
    const hotel = alojamientosById.get(row.alojamientoId);
    if (!hotel?.paisId) continue;
    counts.set(hotel.paisId, (counts.get(hotel.paisId) ?? 0) + 1);
  }

  for (const option of packageState.opcionesHoteleras) {
    if (option.paqueteId !== paqueteId) continue;
    for (const hotelOption of packageState.opcionHoteles) {
      if (hotelOption.opcionHoteleraId !== option.id) continue;
      const hotel = alojamientosById.get(hotelOption.alojamientoId);
      if (!hotel?.paisId) continue;
      counts.set(hotel.paisId, (counts.get(hotel.paisId) ?? 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  counts.forEach((count, paisId) => {
    if (count > bestCount) {
      best = paisId;
      bestCount = count;
    }
  });
  return best;
}

function buildPackageRows(
  paquetes: Paquete[],
  opciones: OpcionHotelera[],
  packageState: ReturnType<typeof usePackageState>,
  serviceState: ReturnType<typeof useServiceState>,
  etiquetas: Etiqueta[],
  paises: PaisWithCiudades[],
  regiones: RegionWithPaises[],
): PackageRow[] {
  const maps = buildCatalogMaps(paises, regiones);
  const alojamientosById = new Map(serviceState.alojamientos.map((item) => [item.id, item]));
  const etiquetaById = new Map(etiquetas.map((item) => [item.id, item]));

  return paquetes.map((paquete) => {
    const fecha = paquete.validezDesde;
    const destinos = packageState.destinos.filter((item) => item.paqueteId === paquete.id);
    const tagNames = packageState.paqueteEtiquetas
      .filter((item) => item.paqueteId === paquete.id)
      .map((item) => etiquetaById.get(item.etiquetaId)?.nombre)
      .filter((item): item is string => Boolean(item));

    const assignedAereos = packageState.paqueteAereos
      .filter((item) => item.paqueteId === paquete.id)
      .map((item) => {
        const aereo = serviceState.aereos.find((candidate) => candidate.id === item.aereoId);
        if (!aereo) return null;
        return {
          aereo,
          net: resolvePrecioAereo(serviceState.preciosAereo, item.aereoId, fecha)?.precioAdulto ?? 0,
        };
      })
      .filter((item): item is { aereo: ReturnType<typeof useAereos>[number]; net: number } => item !== null);

    const assignedTraslados = packageState.paqueteTraslados
      .filter((item) => item.paqueteId === paquete.id)
      .map((item) => serviceState.traslados.find((candidate) => candidate.id === item.trasladoId))
      .filter((item): item is ReturnType<typeof useServiceState>["traslados"][number] => Boolean(item));

    const assignedSeguros = packageState.paqueteSeguros
      .filter((item) => item.paqueteId === paquete.id)
      .map((item) => {
        const seguro = serviceState.seguros.find((candidate) => candidate.id === item.seguroId);
        if (!seguro) return null;
        return { seguro, diasCobertura: item.diasCobertura ?? undefined };
      })
      .filter((item): item is { seguro: ReturnType<typeof useServiceState>["seguros"][number]; diasCobertura: number | undefined } => item !== null);

    const assignedCircuitos = packageState.paqueteCircuitos
      .filter((item) => item.paqueteId === paquete.id)
      .map((item) => {
        const circuito = serviceState.circuitos.find((candidate) => candidate.id === item.circuitoId);
        if (!circuito) return null;
        return {
          circuito,
          net: resolvePrecioCircuito(serviceState.preciosCircuito, item.circuitoId, fecha)?.precio ?? 0,
        };
      })
      .filter((item): item is { circuito: ReturnType<typeof useServiceState>["circuitos"][number]; net: number } => item !== null);

    const nochesTotales = destinos.reduce((sum, destino) => sum + (destino.noches || 0), 0);
    const netoFijos = calcularNetoFijos(
      assignedAereos,
      assignedTraslados,
      assignedSeguros,
      assignedCircuitos,
      nochesTotales,
    );

    const packageOpciones = opciones.filter((item) => item.paqueteId === paquete.id);
    const optionDetails = packageOpciones
      .map((option) => {
        const optionHoteles = packageState.opcionHoteles.filter(
          (row) => row.opcionHoteleraId === option.id,
        );

        const hotelContributions = optionHoteles
          .map((row) => {
            const hotel = alojamientosById.get(row.alojamientoId);
            const destino = destinos.find((item) => item.id === row.destinoId);
            if (!hotel || !destino) return null;
            const precio = resolvePrecioAlojamiento(
              serviceState.preciosAlojamiento,
              row.alojamientoId,
              fecha,
            );
            if (!precio) return null;
            const cost = precio.precioPorNoche * destino.noches;
            return {
              id: hotel.id,
              nombre: hotel.nombre,
              revenue: 0,
              cost,
              margin: 0,
            };
          })
          .filter((item): item is HotelContribution => item !== null);

        const netoAloj = calcularNetoAlojamientosPorOpcion(
          option.id,
          packageState.opcionHoteles,
          destinos,
          serviceState.preciosAlojamiento,
          fecha,
        );
        const totalNet = netoFijos + netoAloj;
        const salePrice = calcularVentaOpcion(netoFijos, netoAloj, option.factor);
        const margin = salePrice - totalNet;

        const hotelContributionsWithRevenue = hotelContributions.map((hotel) => {
          const revenue = totalNet > 0 ? salePrice * (hotel.cost / totalNet) : 0;
          return {
            ...hotel,
            revenue,
            margin: revenue - hotel.cost,
          };
        });

        return {
          salePrice,
          totalNet,
          margin,
          hotelContributions: hotelContributionsWithRevenue,
        };
      })
      .filter((item) => item.salePrice > 0 || item.totalNet > 0);

    const referenceOption =
      optionDetails.sort((a, b) => a.salePrice - b.salePrice)[0] ?? null;

    const revenue =
      referenceOption?.salePrice ??
      (paquete.precioVenta > 0 ? paquete.precioVenta : 0);
    const cost =
      referenceOption?.totalNet ??
      (paquete.netoCalculado > 0 ? paquete.netoCalculado : 0);
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

    const airCost = assignedAereos.reduce((sum, item) => sum + item.net, 0);
    const hotelCost = referenceOption?.hotelContributions.reduce((sum, item) => sum + item.cost, 0) ?? 0;
    const airRevenue = cost > 0 ? revenue * (airCost / cost) : 0;
    const hotelRevenue = referenceOption?.hotelContributions.reduce((sum, item) => sum + item.revenue, 0) ?? 0;

    const fallbackPaisId = dominantPaisIdForPackage(paquete.id, packageState, alojamientosById);
    const geography = resolveGeographyFromDestino(
      paquete.destino,
      fallbackPaisId,
      maps,
    );

    return {
      id: paquete.id,
      titulo: paquete.titulo,
      tipoPaqueteId: paquete.tipoPaqueteId,
      reportDate: getReportDate(paquete),
      geography,
      revenue,
      cost,
      margin,
      marginPct,
      ticket: revenue,
      salesCount: revenue > 0 ? 1 : 0,
      airAssignments: assignedAereos.length,
      hotelAssignments: referenceOption?.hotelContributions.length ?? 0,
      airRevenue,
      airCost,
      hotelRevenue,
      hotelCost,
      hotelContributions: referenceOption?.hotelContributions ?? [],
      channel: classifyChannel(tagNames),
      status: paquete.estado,
    };
  });
}

function KpiCard({
  icon,
  label,
  value,
  helper,
  accent,
  delta,
  estimated = false,
}: KpiCardProps) {
  const deltaPositive = (delta ?? 0) >= 0;

  return (
    <div className="rounded-[16px] border border-hairline bg-white p-5 shadow-[0_14px_30px_-24px_rgba(17,17,36,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-[12px]"
          style={{
            background: `linear-gradient(135deg, ${accent}1a, ${accent}08)`,
            color: accent,
          }}
        >
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {estimated && <Tag color="orange">Estimado</Tag>}
          {delta !== null && delta !== undefined && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                deltaPositive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {deltaPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatPercent(delta)}
            </span>
          )}
        </div>
      </div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>
      <p className="text-[30px] font-bold tracking-tight text-neutral-900">
        {value}
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-500">
        {helper}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-hairline bg-white p-5 shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-neutral-900">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function FiltersPanel({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  productFilter,
  onProductFilterChange,
  destinationFilter,
  onDestinationFilterChange,
  destinationOptions,
  channelFilter,
  onChannelFilterChange,
}: {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (value: Date | undefined) => void;
  onEndDateChange: (value: Date | undefined) => void;
  productFilter: ProductFilter;
  onProductFilterChange: (value: string) => void;
  destinationFilter: string;
  onDestinationFilterChange: (value: string) => void;
  destinationOptions: Array<{ value: string; label: string }>;
  channelFilter: ChannelFilter;
  onChannelFilterChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[18px] border border-hairline bg-white p-5 shadow-[0_16px_34px_-28px_rgba(17,17,36,0.28)]">
      <div className="mb-4 flex items-center gap-2">
        <CalendarRange className="h-4 w-4 text-neutral-500" />
        <h3 className="text-[15px] font-semibold text-neutral-900">Filtros dinámicos</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Desde"
          label="Rango de fechas"
        />
        <DatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="Hasta"
          label="Hasta"
        />
        <Select
          label="Tipo de producto"
          value={productFilter}
          onValueChange={onProductFilterChange}
          options={PRODUCT_OPTIONS as unknown as Array<{ value: string; label: string }>}
        />
        <Select
          label="Destino / país"
          value={destinationFilter}
          onValueChange={onDestinationFilterChange}
          options={destinationOptions}
        />
        <Select
          label="Canal de venta"
          value={channelFilter}
          onValueChange={onChannelFilterChange}
          options={CHANNEL_OPTIONS as unknown as Array<{ value: string; label: string }>}
        />
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const loading = usePackageLoading();
  const paquetes = usePaquetes();
  const packageState = usePackageState();
  const serviceState = useServiceState();
  const opciones = useAllOpcionesHoteleras();
  const etiquetas = useEtiquetas();
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const paises = usePaises();
  const regiones = useRegiones();
  const tiposPaquete = useTiposPaquete();

  const allRows = useMemo(
    () =>
      buildPackageRows(
        paquetes,
        opciones,
        packageState,
        serviceState,
        etiquetas,
        paises,
        regiones,
      ),
    [paquetes, opciones, packageState, serviceState, etiquetas, paises, regiones],
  );

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const filtersInitialized = useRef(false);

  useEffect(() => {
    if (filtersInitialized.current || allRows.length === 0) return;
    const orderedDates = [...allRows]
      .map((row) => row.reportDate)
      .sort((a, b) => a.getTime() - b.getTime());
    const maxDate = orderedDates[orderedDates.length - 1];
    const minDate = orderedDates[0];
    const proposedStart = shiftDays(maxDate, -180);
    setStartDate(proposedStart > minDate ? startOfDay(proposedStart) : startOfDay(minDate));
    setEndDate(endOfDay(maxDate));
    filtersInitialized.current = true;
  }, [allRows]);

  const destinationOptions = useMemo(() => {
    const values = new Set<string>(["all"]);
    const options = [{ value: "all", label: "Todos los destinos" }];
    for (const row of allRows) {
      const candidates = [
        row.geography.regionName,
        row.geography.countryName,
        row.geography.destinationLabel,
      ].filter(Boolean) as string[];
      for (const candidate of candidates) {
        const key = normalizeText(candidate);
        if (values.has(key)) continue;
        values.add(key);
        options.push({ value: key, label: candidate });
      }
    }
    return options;
  }, [allRows]);

  const rowsWithoutDateFilter = useMemo(() => {
    return allRows.filter((row) => {
      if (productFilter === "aereos" && row.airAssignments === 0) return false;
      if (productFilter === "alojamientos" && row.hotelAssignments === 0) return false;
      if (productFilter === "paquetes" && row.revenue <= 0) return false;

      if (destinationFilter !== "all") {
        const values = [
          row.geography.regionName,
          row.geography.countryName,
          row.geography.destinationLabel,
        ]
          .filter(Boolean)
          .map((item) => normalizeText(item as string));
        if (!values.includes(destinationFilter)) return false;
      }

      if (channelFilter === "campaign" && row.channel !== "Campaña") return false;
      if (channelFilter === "organic" && row.channel !== "Orgánico") return false;
      if (channelFilter === "sin-canal" && row.channel !== "Sin canal") return false;

      return true;
    });
  }, [allRows, productFilter, destinationFilter, channelFilter]);

  const filteredRows = useMemo(() => {
    return rowsWithoutDateFilter.filter((row) => {
      if (startDate && row.reportDate < startOfDay(startDate)) return false;
      if (endDate && row.reportDate > endOfDay(endDate)) return false;
      return true;
    });
  }, [rowsWithoutDateFilter, startDate, endDate]);

  const previousPeriodRows = useMemo(() => {
    if (!startDate || !endDate) return [];
    const currentStart = startOfDay(startDate);
    const currentEnd = endOfDay(endDate);
    const diffDays = Math.max(
      1,
      Math.round((currentEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );
    const previousEnd = endOfDay(shiftDays(currentStart, -1));
    const previousStart = startOfDay(shiftDays(currentStart, -diffDays));
    return rowsWithoutDateFilter.filter(
      (row) => row.reportDate >= previousStart && row.reportDate <= previousEnd,
    );
  }, [rowsWithoutDateFilter, startDate, endDate]);

  const totalRevenue = filteredRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCost = filteredRows.reduce((sum, row) => sum + row.cost, 0);
  const totalMargin = filteredRows.reduce((sum, row) => sum + row.margin, 0);
  const totalSales = filteredRows.reduce((sum, row) => sum + row.salesCount, 0);
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const estimatedMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const previousRevenue = previousPeriodRows.reduce((sum, row) => sum + row.revenue, 0);
  const previousMargin = previousPeriodRows.reduce((sum, row) => sum + row.margin, 0);
  const previousSales = previousPeriodRows.reduce((sum, row) => sum + row.salesCount, 0);
  const previousAvgTicket = previousSales > 0 ? previousRevenue / previousSales : 0;
  const growthPct = comparePct(totalRevenue, previousRevenue);

  const destinationStats = useMemo(() => {
    const map = new Map<string, { destination: string; sales: number; revenue: number; margin: number }>();
    for (const row of filteredRows) {
      const key = row.geography.countryName ?? row.geography.destinationLabel;
      const current = map.get(key) ?? { destination: key, sales: 0, revenue: 0, margin: 0 };
      current.sales += row.salesCount;
      current.revenue += row.revenue;
      current.margin += row.margin;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredRows]);

  const timeSeries = useMemo(() => {
    const map = new Map<string, { key: string; label: string; sales: number; revenue: number; margin: number }>();
    for (const row of filteredRows) {
      const key = monthKey(row.reportDate);
      const current = map.get(key) ?? {
        key,
        label: monthLabel(row.reportDate),
        sales: 0,
        revenue: 0,
        margin: 0,
      };
      current.sales += row.salesCount;
      current.revenue += row.revenue;
      current.margin += row.margin;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredRows]);

  const seasonality = useMemo(() => {
    const base = MONTH_LABELS.map((label, idx) => ({
      monthIndex: idx,
      label,
      sales: 0,
      revenue: 0,
    }));
    for (const row of filteredRows) {
      const monthIndex = row.reportDate.getMonth();
      base[monthIndex].sales += row.salesCount;
      base[monthIndex].revenue += row.revenue;
    }
    return base;
  }, [filteredRows]);

  const productComparison = useMemo(() => {
    const paqueteRevenue = filteredRows.reduce((sum, row) => sum + row.revenue, 0);
    const paqueteVolume = filteredRows.reduce((sum, row) => sum + row.salesCount, 0);
    const airRevenue = filteredRows.reduce((sum, row) => sum + row.airRevenue, 0);
    const airVolume = filteredRows.reduce((sum, row) => sum + row.airAssignments, 0);
    const hotelRevenue = filteredRows.reduce((sum, row) => sum + row.hotelRevenue, 0);
    const hotelVolume = filteredRows.reduce((sum, row) => sum + row.hotelAssignments, 0);

    return [
      {
        key: "paquetes",
        label: "Paquetes",
        revenue: paqueteRevenue,
        volume: paqueteVolume,
        avgTicket: paqueteVolume > 0 ? paqueteRevenue / paqueteVolume : 0,
        accent: "#3BBFAD",
      },
      {
        key: "aereos",
        label: "Aéreos",
        revenue: airRevenue,
        volume: airVolume,
        avgTicket: airVolume > 0 ? airRevenue / airVolume : 0,
        accent: "#7C3AED",
      },
      {
        key: "alojamientos",
        label: "Alojamientos",
        revenue: hotelRevenue,
        volume: hotelVolume,
        avgTicket: hotelVolume > 0 ? hotelRevenue / hotelVolume : 0,
        accent: "#D97706",
      },
    ];
  }, [filteredRows]);

  const hotelStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; nombre: string; volume: number; revenue: number; cost: number; margin: number }
    >();
    for (const row of filteredRows) {
      for (const hotel of row.hotelContributions) {
        const current = map.get(hotel.id) ?? {
          id: hotel.id,
          nombre: hotel.nombre,
          volume: 0,
          revenue: 0,
          cost: 0,
          margin: 0,
        };
        current.volume += 1;
        current.revenue += hotel.revenue;
        current.cost += hotel.cost;
        current.margin += hotel.margin;
        map.set(hotel.id, current);
      }
    }
    const values = Array.from(map.values())
      .map((item) => ({
        ...item,
        avgTicket: item.volume > 0 ? item.revenue / item.volume : 0,
        marginPct: item.revenue > 0 ? (item.margin / item.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const avgMarginPct =
      values.length > 0
        ? values.reduce((sum, item) => sum + item.marginPct, 0) / values.length
        : 0;

    const volumeThreshold =
      values.length > 0
        ? values[Math.min(values.length - 1, Math.floor(values.length / 3))]?.volume ?? 0
        : 0;

    return values.map((item) => ({
      ...item,
      lowProfitability: item.volume >= volumeThreshold && item.marginPct < avgMarginPct * 0.75,
    }));
  }, [filteredRows]);

  const topHotelRevenue = hotelStats.slice(0, 8);
  const topDestinationRevenue = destinationStats.slice(0, 8);
  const topDestinationVolume = [...destinationStats]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8);

  const insights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];
    const topDestination = destinationStats[0];
    const revenueShare =
      topDestination && totalRevenue > 0 ? (topDestination.revenue / totalRevenue) * 100 : 0;

    if (topDestination && revenueShare >= 40) {
      items.push({
        title: "Concentración comercial en un solo destino",
        body: `${topDestination.destination} explica ${revenueShare.toFixed(
          1,
        )}% de los ingresos estimados. Conviene defender ese destino, pero también diversificar para reducir dependencia.`,
        tone: "warning",
      });
    }

    if (growthPct !== null && growthPct < -8) {
      items.push({
        title: "Caída relevante vs período anterior",
        body: `Los ingresos estimados caen ${Math.abs(growthPct).toFixed(
          1,
        )}% frente al período comparable. Revisá destinos que perdieron tracción y campañas activas.`,
        tone: "negative",
      });
    }

    const strongestDestination = [...destinationStats]
      .filter((item) => item.sales >= 1)
      .sort((a, b) => (b.margin / Math.max(b.revenue, 1)) - (a.margin / Math.max(a.revenue, 1)))[0];
    if (strongestDestination) {
      items.push({
        title: "Destino con margen atractivo para potenciar",
        body: `${strongestDestination.destination} combina ingresos con buen margen estimado. Es un buen candidato para pauta, push comercial y producto destacado.`,
        tone: "positive",
      });
    }

    const weakHotel = hotelStats.find((item) => item.lowProfitability);
    if (weakHotel) {
      items.push({
        title: "Hotel con alto uso y baja rentabilidad",
        body: `${weakHotel.nombre} aparece mucho en la mezcla pero deja un margen estimado de ${weakHotel.marginPct.toFixed(
          1,
        )}%. Vale renegociar tarifa o mover demanda hacia alternativas mejores.`,
        tone: "warning",
      });
    }

    const zeroRevenuePackages = filteredRows.filter((row) => row.revenue <= 0).length;
    if (zeroRevenuePackages > 0) {
      items.push({
        title: "Productos sin pricing comercial cerrado",
        body: `${zeroRevenuePackages} paquetes no muestran ingreso estimado. Eso impacta análisis y también frena foco comercial.`,
        tone: "negative",
      });
    }

    items.push({
      title: "Gap de medición en funnel y canales",
      body: "Hoy no hay una fuente conectada de leads, costo por lead ni canal de venta. Para cerrar el loop comercial conviene integrar CRM, Meta y Google.",
      tone: "neutral",
    });

    return items.slice(0, 5);
  }, [destinationStats, growthPct, totalRevenue, hotelStats, filteredRows]);

  const productRevenueLeader = [...productComparison].sort((a, b) => b.revenue - a.revenue)[0];
  const productVolumeLeader = [...productComparison].sort((a, b) => b.volume - a.volume)[0];

  const funnelCards = [
    {
      title: "Leads generados",
      value: "—",
      helper: "Conectar CRM / formularios / WhatsApp para medir demanda.",
    },
    {
      title: "Conversion rate",
      value: "—",
      helper: "Requiere unir leads con ventas cerradas.",
    },
    {
      title: "Costo por lead",
      value: "—",
      helper: "Requiere inversión de campañas conectada.",
    },
    {
      title: "Canal de origen",
      value: "Sin dato",
      helper: "Meta, Google, orgánico y referidos aún no están integrados.",
    },
  ];

  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <div className="space-y-6">
      <DataTablePageHeader
        title="Reportes"
        subtitle="Dashboard ejecutivo para tomar decisiones comerciales, de producto y rentabilidad."
      />

      <div className="rounded-[18px] border border-sky-200 bg-sky-50 px-5 py-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-sky-600">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-sky-900">
              Dashboard orientado a decisión
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-sky-800">
              Esta vista prioriza ingresos, margen, mix de producto, destinos y hoteles.
              Donde hoy no existe una fuente real de ventas o marketing, la pantalla lo marca
              explícitamente y usa métricas operativas estimadas para no ocultar el gap de datos.
            </p>
          </div>
        </div>
      </div>

      <FiltersPanel
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        productFilter={productFilter}
        onProductFilterChange={(value) => setProductFilter(value as ProductFilter)}
        destinationFilter={destinationFilter}
        onDestinationFilterChange={setDestinationFilter}
        destinationOptions={destinationOptions}
        channelFilter={channelFilter}
        onChannelFilterChange={(value) => setChannelFilter(value as ChannelFilter)}
      />

      <div className="rounded-[16px] border border-hairline bg-white px-4 py-3 shadow-[0_12px_24px_-24px_rgba(17,17,36,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Vista en vivo
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              Cada filtro recalcula ingresos, tickets, margen y rankings al instante.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag color="teal">{formatCurrency(totalRevenue)} ingresos</Tag>
            <Tag color="blue">{formatNumber(totalSales)} tickets</Tag>
            <Tag color="violet">{formatPercent(estimatedMarginPct)} margen</Tag>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          label="Ingresos totales"
          value={formatCurrency(totalRevenue)}
          helper="Ingreso estimado del mix visible bajo los filtros aplicados."
          accent={KPI_ACCENTS.emerald}
          delta={growthPct}
          estimated
        />
        <KpiCard
          icon={<Target className="h-5 w-5" />}
          label="Ticket promedio"
          value={formatCurrency(avgTicket)}
          helper="Promedio por paquete con pricing visible."
          accent={KPI_ACCENTS.blue}
          delta={comparePct(avgTicket, previousAvgTicket)}
          estimated
        />
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          label="Tickets"
          value={formatNumber(totalSales)}
          helper="Tickets estimados dentro del rango y filtros visibles."
          accent={KPI_ACCENTS.teal}
          delta={comparePct(totalSales, previousSales)}
          estimated
        />
        <KpiCard
          icon={<Percent className="h-5 w-5" />}
          label="Margen estimado"
          value={formatPercent(estimatedMarginPct)}
          helper={`${formatCurrency(totalMargin)} de margen agregado sobre ${formatCurrency(totalCost)} de costo estimado.`}
          accent={KPI_ACCENTS.amber}
          delta={comparePct(totalMargin, previousMargin)}
          estimated
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Crecimiento vs período anterior"
          value={formatPercent(growthPct)}
          helper="Comparación automática contra el rango inmediatamente anterior."
          accent={KPI_ACCENTS.violet}
          delta={growthPct}
          estimated
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Análisis de ventas"
          subtitle="Volumen, ingresos y evolución temporal para detectar destinos fuertes y caídas."
          action={<Tag color="teal">Ventas estimadas</Tag>}
        >
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <div>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Ingresos por destino
              </p>
              {topDestinationRevenue.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-neutral-400">
                  Sin datos para el período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={topDestinationRevenue}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(17,17,36,0.06)" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                      tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="destination"
                      width={110}
                      tick={{ fill: "rgba(17,17,36,0.58)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: "rgba(255,255,255,0.98)",
                        border: "1px solid rgba(17,17,36,0.08)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                      {topDestinationRevenue.map((entry, idx) => (
                        <Cell
                          key={entry.destination}
                          fill={idx === 0 ? "rgba(59,191,173,0.9)" : "rgba(59,191,173,0.42)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Ventas por destino
              </p>
              {topDestinationVolume.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-neutral-400">
                  Sin datos para el período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={topDestinationVolume}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(17,17,36,0.06)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="destination"
                      width={110}
                      tick={{ fill: "rgba(17,17,36,0.58)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatNumber(value)}
                      contentStyle={{
                        background: "rgba(255,255,255,0.98)",
                        border: "1px solid rgba(17,17,36,0.08)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="sales" radius={[0, 6, 6, 0]}>
                      {topDestinationVolume.map((entry, idx) => (
                        <Cell
                          key={entry.destination}
                          fill={idx === 0 ? "rgba(37,99,235,0.9)" : "rgba(37,99,235,0.36)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Tendencia temporal
              </p>
              {timeSeries.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-neutral-400">
                  Sin evolución para graficar.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={timeSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3BBFAD" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3BBFAD" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(17,17,36,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                      tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: "rgba(255,255,255,0.98)",
                        border: "1px solid rgba(17,17,36,0.08)",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3BBFAD"
                      strokeWidth={2.4}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Estacionalidad
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={seasonality} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(17,17,36,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                    tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "rgba(255,255,255,0.98)",
                      border: "1px solid rgba(17,17,36,0.08)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="rgba(124,58,237,0.75)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Insights automáticos"
          subtitle="Señales priorizadas para decidir dónde invertir, qué empujar y qué corregir."
          action={<Tag color="violet">Accionable</Tag>}
        >
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const toneClasses = {
                positive: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
                warning: "border-amber-200 bg-amber-50/80 text-amber-900",
                negative: "border-rose-200 bg-rose-50/70 text-rose-900",
                neutral: "border-sky-200 bg-sky-50/70 text-sky-900",
              } as const;

              const toneIcons = {
                positive: <TrendingUp className="h-4 w-4" />,
                warning: <AlertTriangle className="h-4 w-4" />,
                negative: <TrendingDown className="h-4 w-4" />,
                neutral: <CircleAlert className="h-4 w-4" />,
              } as const;

              return (
                <div
                  key={`${insight.title}-${index}`}
                  className={`rounded-[14px] border px-4 py-3 ${toneClasses[insight.tone]}`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
                    {toneIcons[insight.tone]}
                    <span>{insight.title}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed opacity-90">
                    {insight.body}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Análisis de productos"
          subtitle="Comparativa entre paquetes, aéreos y alojamientos para identificar dónde está el volumen y dónde está el dinero."
          action={<Tag color="blue">Mix comercial</Tag>}
        >
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {productComparison.map((item) => (
              <div key={item.key} className="rounded-[14px] border border-hairline bg-neutral-50/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-neutral-800">{item.label}</p>
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ background: item.accent }}
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">Ingresos</p>
                    <p className="text-[20px] font-semibold text-neutral-900">
                      {formatCurrency(item.revenue)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px] text-neutral-500">
                    <span>Volumen</span>
                    <span className="font-mono text-neutral-800">{formatNumber(item.volume)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px] text-neutral-500">
                    <span>Ticket promedio</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(item.avgTicket)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[14px] border border-hairline bg-white">
            <DataTable>
              <DataTableHeader sticky={false}>
                <DataTableRow header>
                  <DataTableHead>Categoría</DataTableHead>
                  <DataTableHead align="right">Ingresos</DataTableHead>
                  <DataTableHead align="right">Volumen</DataTableHead>
                  <DataTableHead align="right">Ticket promedio</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {productComparison.map((item) => (
                  <DataTableRow key={item.key} interactive={false}>
                    <DataTableCell variant="primary">{item.label}</DataTableCell>
                    <DataTableCell variant="mono" align="right">
                      {formatCurrency(item.revenue)}
                    </DataTableCell>
                    <DataTableCell variant="mono" align="right">
                      {formatNumber(item.volume)}
                    </DataTableCell>
                    <DataTableCell variant="mono" align="right">
                      {formatCurrency(item.avgTicket)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-[14px] border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Más ingresos
              </p>
              <p className="mt-2 text-[18px] font-semibold text-emerald-950">
                {productRevenueLeader?.label ?? "—"}
              </p>
              <p className="mt-1 text-[12.5px] text-emerald-900/80">
                Lidera por valor económico estimado dentro del período filtrado.
              </p>
            </div>
            <div className="rounded-[14px] border border-sky-200 bg-sky-50/60 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                Más volumen
              </p>
              <p className="mt-2 text-[18px] font-semibold text-sky-950">
                {productVolumeLeader?.label ?? "—"}
              </p>
              <p className="mt-1 text-[12.5px] text-sky-900/80">
                Es la categoría con más movimientos y, por lo tanto, con más carga operativa.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Análisis de hoteles"
          subtitle="Hoteles líderes por ingresos, ticket y rentabilidad estimada."
          action={<Tag color="orange">Rentabilidad hotelera</Tag>}
        >
          {topHotelRevenue.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-neutral-400">
              Sin hoteles suficientes para analizar.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topHotelRevenue} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(17,17,36,0.06)" vertical={false} />
                  <XAxis
                    dataKey="nombre"
                    tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                    tick={{ fill: "rgba(17,17,36,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "rgba(255,255,255,0.98)",
                      border: "1px solid rgba(17,17,36,0.08)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="rgba(217,119,6,0.72)" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 rounded-[14px] border border-hairline bg-white">
                <DataTable>
                  <DataTableHeader sticky={false}>
                    <DataTableRow header>
                      <DataTableHead>Hotel</DataTableHead>
                      <DataTableHead align="right">Volumen</DataTableHead>
                      <DataTableHead align="right">Ingresos</DataTableHead>
                      <DataTableHead align="right">Ticket</DataTableHead>
                      <DataTableHead align="right">Margen</DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {hotelStats.slice(0, 8).map((hotel) => (
                      <DataTableRow key={hotel.id} interactive={false}>
                        <DataTableCell variant="primary">
                          <div className="flex items-center gap-2">
                            <span>{hotel.nombre}</span>
                            {hotel.lowProfitability && (
                              <Badge variant="draft" size="sm">
                                Baja rentabilidad
                              </Badge>
                            )}
                          </div>
                        </DataTableCell>
                        <DataTableCell variant="mono" align="right">
                          {formatNumber(hotel.volume)}
                        </DataTableCell>
                        <DataTableCell variant="mono" align="right">
                          {formatCurrency(hotel.revenue)}
                        </DataTableCell>
                        <DataTableCell variant="mono" align="right">
                          {formatCurrency(hotel.avgTicket)}
                        </DataTableCell>
                        <DataTableCell variant="mono" align="right">
                          {formatPercent(hotel.marginPct)}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Funnel de conversión"
        subtitle="Bloque preparado para performance comercial y marketing. Hoy la app no tiene fuente conectada de leads ni campañas."
        action={<Tag color="red">Conector pendiente</Tag>}
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {funnelCards.map((card) => (
            <div key={card.title} className="rounded-[14px] border border-hairline bg-neutral-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                {card.title}
              </p>
              <p className="mt-2 text-[24px] font-semibold text-neutral-900">{card.value}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-500">
                {card.helper}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[14px] border border-amber-200 bg-amber-50/70 px-4 py-3">
          <div className="flex items-start gap-3">
            <Filter className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-[13px] font-semibold text-amber-900">
                Acción recomendada
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900/80">
                Integrar CRM, formularios web, campañas de Meta/Google y origen de cierre.
                Sin eso no se puede medir conversión real, CPL ni retorno por canal.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-[16px] border border-hairline bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-neutral-500" />
            <p className="text-[13px] font-semibold text-neutral-900">Destinos monitoreados</p>
          </div>
          <p className="text-[24px] font-semibold text-neutral-900">{formatNumber(destinationStats.length)}</p>
          <p className="mt-1 text-[12.5px] text-neutral-500">
            Sin agrupar en “otros”, para mantener foco real en el portafolio.
          </p>
        </div>

        <div className="rounded-[16px] border border-hairline bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-neutral-500" />
            <p className="text-[13px] font-semibold text-neutral-900">Mix de producto</p>
          </div>
          <p className="text-[24px] font-semibold text-neutral-900">{formatNumber(productComparison.length)}</p>
          <p className="mt-1 text-[12.5px] text-neutral-500">
            Paquetes, aéreos y alojamientos comparados por valor y volumen.
          </p>
        </div>

        <div className="rounded-[16px] border border-hairline bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Hotel className="h-4 w-4 text-neutral-500" />
            <p className="text-[13px] font-semibold text-neutral-900">Hoteles con señal</p>
          </div>
          <p className="text-[24px] font-semibold text-neutral-900">{formatNumber(hotelStats.length)}</p>
          <p className="mt-1 text-[12.5px] text-neutral-500">
            Hoteles con contribución suficiente para lectura comercial.
          </p>
        </div>

        <div className="rounded-[16px] border border-hairline bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Plane className="h-4 w-4 text-neutral-500" />
            <p className="text-[13px] font-semibold text-neutral-900">Aéreos disponibles</p>
          </div>
          <p className="text-[24px] font-semibold text-neutral-900">{formatNumber(aereos.length)}</p>
          <p className="mt-1 text-[12.5px] text-neutral-500">
            Oferta aérea hoy cargada para construir y ajustar productos.
          </p>
        </div>
      </div>

      <div className="rounded-[18px] border border-hairline bg-white p-5">
        <h3 className="text-[15px] font-semibold text-neutral-900">Cómo leer este dashboard</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="rounded-[14px] border border-hairline bg-neutral-50/70 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Claridad visual
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-600">
              KPIs arriba para lectura rápida, destinos y tendencias al centro, y hoteles + funnel al final para pasar de síntoma a acción.
            </p>
          </div>
          <div className="rounded-[14px] border border-hairline bg-neutral-50/70 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Gráficos elegidos
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-600">
              Barras horizontales para rankings, área para evolución temporal, barras mensuales para estacionalidad y tabla para rentabilidad hotelera accionable.
            </p>
          </div>
          <div className="rounded-[14px] border border-hairline bg-neutral-50/70 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Decisión rápida
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-600">
              El objetivo no es auditar datos, sino decidir dónde poner inversión, qué destinos empujar, qué hoteles renegociar y qué integraciones faltan para profesionalizar el embudo.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-3 text-[12.5px] text-neutral-500">
        <span className="font-semibold text-neutral-700">Fuente actual:</span>{" "}
        paquetes, pricing, asignaciones de aéreos/alojamientos y catálogo geográfico.
        Las métricas de ingresos, ticket y margen están tratadas como estimaciones
        operativas hasta conectar ventas reales, leads y campañas.
      </div>
    </div>
  );
}
