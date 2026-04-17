"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Package,
  Search,
  X,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { MultiSelectFilter } from "@/components/ui/data/MultiSelectFilter";
import { SegmentedControl } from "@/components/ui/data/SegmentedControl";
import { ViewToggle, type ViewMode } from "@/components/ui/data/ViewToggle";
import {
  ColumnVisibilityMenu,
  type ColumnDefinition,
} from "@/components/ui/data/ColumnVisibilityMenu";
import {
  usePaquetes,
  usePackageActions,
  usePackageState,
  useAllOpcionesHoteleras,
  useAllDestinos,
} from "@/components/providers/PackageProvider";
import {
  useTemporadas,
  useTiposPaquete,
  usePaises,
  useRegiones,
} from "@/components/providers/CatalogProvider";
import {
  useAlojamientos,
  useServiceState,
} from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { usePackageLoading } from "@/components/providers/PackageProvider";
import { formatCurrency, computePaquetePrecios } from "@/lib/utils";
import type { Paquete, PaqueteFoto, Pais } from "@/lib/types";
import { PaqueteGridCard } from "./_components/PaqueteGridCard";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const estadoBadge = {
  ACTIVO: { variant: "active" as const, label: "Activo", color: "#3BBFAD" },
  BORRADOR: { variant: "draft" as const, label: "Borrador", color: "#E8913A" },
  INACTIVO: {
    variant: "inactive" as const,
    label: "Inactivo",
    color: "#6B6F99",
  },
};

const ITEMS_PER_PAGE_TABLE = 12;
const ITEMS_PER_PAGE_GRID = 18;

type EstadoFilter = "all" | "ACTIVO" | "BORRADOR" | "INACTIVO";

type ColKey =
  | "destino"
  | "temporada"
  | "tipo"
  | "noches"
  | "estado"
  | "precio";

// ---------------------------------------------------------------------------
// Helper: resolve paquete → dominant país via linked alojamientos.
// Tiny local copy to avoid cross-route imports; dashboard has a similar one.
// ---------------------------------------------------------------------------

function usePaisResolver(
  paqueteAlojamientos: Array<{ paqueteId: string; alojamientoId: string }>,
  alojamientos: Array<{ id: string; paisId: string | null }>,
  paises: Pais[],
  regiones: Array<{ id: string; nombre: string }>,
) {
  return useMemo(() => {
    const aloById = new Map<string, { paisId: string | null }>();
    for (const a of alojamientos) aloById.set(a.id, a);
    const paisById = new Map<string, Pais>();
    for (const p of paises) paisById.set(p.id, p);
    const regionNameById = new Map<string, string>();
    for (const r of regiones) regionNameById.set(r.id, r.nombre);

    const cache = new Map<string, string | null>();

    function paisIdFor(paqueteId: string): string | null {
      if (cache.has(paqueteId)) return cache.get(paqueteId) ?? null;
      const counts = new Map<string, number>();
      for (const pa of paqueteAlojamientos) {
        if (pa.paqueteId !== paqueteId) continue;
        const alo = aloById.get(pa.alojamientoId);
        if (!alo?.paisId) continue;
        counts.set(alo.paisId, (counts.get(alo.paisId) ?? 0) + 1);
      }
      let best: string | null = null;
      let bestCount = 0;
      counts.forEach((count, pid) => {
        if (count > bestCount) {
          best = pid;
          bestCount = count;
        }
      });
      cache.set(paqueteId, best);
      return best;
    }

    function paisNombreFor(paqueteId: string): string | null {
      const pid = paisIdFor(paqueteId);
      return pid ? (paisById.get(pid)?.nombre ?? null) : null;
    }

    function regionNombreFor(paqueteId: string): string | null {
      const pid = paisIdFor(paqueteId);
      if (!pid) return null;
      const rid = paisById.get(pid)?.regionId;
      return rid ? (regionNameById.get(rid) ?? null) : null;
    }

    return { paisIdFor, paisNombreFor, regionNombreFor };
  }, [paqueteAlojamientos, alojamientos, paises, regiones]);
}

// ---------------------------------------------------------------------------
// Price formatting helper — produces { main, sub } for the fused column
// ---------------------------------------------------------------------------

function formatPaquetePrice(
  pricing: ReturnType<typeof computePaquetePrecios>,
  fallback: number,
): { main: string; isRange: boolean } {
  if (pricing.min === null) {
    return { main: formatCurrency(fallback), isRange: false };
  }
  if (pricing.max !== null && pricing.min !== pricing.max) {
    return {
      main: `${formatCurrency(pricing.min)} — ${formatCurrency(pricing.max)}`,
      isRange: true,
    };
  }
  return { main: formatCurrency(pricing.min), isRange: false };
}

// ---------------------------------------------------------------------------
// PaquetesPage
// ---------------------------------------------------------------------------

export default function PaquetesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const regionParam = searchParams.get("region");
  const { canEdit, canSeePricing } = useAuth();
  const { toast } = useToast();

  // Data hooks
  const paquetes = usePaquetes();
  const { clonePaquete, deletePaquete } = usePackageActions();
  const packageState = usePackageState();
  const serviceState = useServiceState();
  const temporadas = useTemporadas();
  const tiposPaquete = useTiposPaquete();
  const alojamientos = useAlojamientos();
  const paises = usePaises();
  const regiones = useRegiones();
  const allOpciones = useAllOpcionesHoteleras();
  const allDestinos = useAllDestinos();
  const loading = usePackageLoading();

  // Map paqueteId → total nights (sum of its destinos.noches)
  const nochesPorPaquete = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of allDestinos) {
      map.set(d.paqueteId, (map.get(d.paqueteId) ?? 0) + (d.noches || 0));
    }
    return map;
  }, [allDestinos]);

  const resolver = usePaisResolver(
    packageState.paqueteAlojamientos,
    alojamientos,
    paises,
    regiones,
  );

  // Map paisId → regionId for filtering (dashboard region pill navigates here)
  const regionIdByPais = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of paises) m.set(p.id, p.regionId ?? null);
    return m;
  }, [paises]);

  const activeRegion = useMemo(() => {
    if (!regionParam) return null;
    return regiones.find((r) => r.id === regionParam) ?? null;
  }, [regionParam, regiones]);

  // Per-paquete price derivation
  const preciosMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computePaquetePrecios>> = {};
    for (const paq of paquetes) {
      map[paq.id] = computePaquetePrecios(
        paq,
        allOpciones,
        packageState,
        serviceState,
      );
    }
    return map;
  }, [paquetes, allOpciones, packageState, serviceState]);

  // First-photo lookup per paquete (used by the grid view)
  const fotoByPaquete = useMemo(() => {
    const m = new Map<string, PaqueteFoto>();
    const sorted = [...packageState.paqueteFotos].sort(
      (a, b) => a.orden - b.orden,
    );
    for (const f of sorted) {
      if (!m.has(f.paqueteId)) m.set(f.paqueteId, f);
    }
    return m;
  }, [packageState.paqueteFotos]);

  // ---- Component state ----
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const [temporadaFilter, setTemporadaFilter] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [destinoFilter, setDestinoFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Paquete | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [visibleColumns, setVisibleColumns] = useState<Record<ColKey, boolean>>(
    {
      destino: true,
      temporada: true,
      tipo: false,
      noches: true,
      estado: true,
      precio: true,
    },
  );

  // ---- Catalog lookups (id → entity) ----
  const temporadaById = useMemo(() => {
    const m = new Map<string, (typeof temporadas)[number]>();
    for (const t of temporadas) m.set(t.id, t);
    return m;
  }, [temporadas]);

  const tipoById = useMemo(() => {
    const m = new Map<string, (typeof tiposPaquete)[number]>();
    for (const t of tiposPaquete) m.set(t.id, t);
    return m;
  }, [tiposPaquete]);

  // ---- Count helper for each filter option (shows next to each) ----
  const estadoCounts = useMemo(() => {
    const counts = { ACTIVO: 0, BORRADOR: 0, INACTIVO: 0 };
    for (const p of paquetes) {
      counts[p.estado as keyof typeof counts]++;
    }
    return counts;
  }, [paquetes]);

  const temporadaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of paquetes) {
      if (!p.temporadaId) continue;
      counts.set(p.temporadaId, (counts.get(p.temporadaId) ?? 0) + 1);
    }
    return counts;
  }, [paquetes]);

  const tipoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of paquetes) {
      if (!p.tipoPaqueteId) continue;
      counts.set(p.tipoPaqueteId, (counts.get(p.tipoPaqueteId) ?? 0) + 1);
    }
    return counts;
  }, [paquetes]);

  const destinoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of paquetes) {
      const nombre = resolver.paisNombreFor(p.id);
      if (!nombre) continue;
      counts.set(nombre, (counts.get(nombre) ?? 0) + 1);
    }
    return counts;
  }, [paquetes, resolver]);

  // ---- Options for each filter ----
  const temporadaOptions = useMemo(
    () =>
      temporadas.map((t) => ({
        value: t.id,
        label: t.nombre.replace(/\s*\(.*\)/, "").trim(),
        count: temporadaCounts.get(t.id) ?? 0,
      })),
    [temporadas, temporadaCounts],
  );

  const tipoOptions = useMemo(
    () =>
      tiposPaquete.map((t) => ({
        value: t.id,
        label: t.nombre,
        count: tipoCounts.get(t.id) ?? 0,
      })),
    [tiposPaquete, tipoCounts],
  );

  const destinoOptions = useMemo(
    () =>
      Array.from(destinoCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([nombre, count]) => ({
          value: nombre,
          label: nombre,
          count,
        })),
    [destinoCounts],
  );

  // ---------------------------------------------------------------------------
  // Filtered + paginated data
  // ---------------------------------------------------------------------------

  const filteredPaquetes = useMemo(() => {
    let result = paquetes;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q),
      );
    }

    // Estado (segmented — exclusive)
    if (estadoFilter !== "all") {
      result = result.filter((p) => p.estado === estadoFilter);
    }

    // Temporada (multi)
    if (temporadaFilter.length > 0) {
      result = result.filter((p) => temporadaFilter.includes(p.temporadaId));
    }

    // Tipo (multi)
    if (tipoFilter.length > 0) {
      result = result.filter((p) => tipoFilter.includes(p.tipoPaqueteId));
    }

    // Destino (multi — país nombre)
    if (destinoFilter.length > 0) {
      result = result.filter((p) => {
        const nombre = resolver.paisNombreFor(p.id);
        return nombre ? destinoFilter.includes(nombre) : false;
      });
    }

    // Region (from URL query ?region=<regionId>)
    if (regionParam) {
      result = result.filter((p) => {
        const paisId = resolver.paisIdFor(p.id);
        if (!paisId) return false;
        return regionIdByPais.get(paisId) === regionParam;
      });
    }

    return result;
  }, [
    paquetes,
    search,
    estadoFilter,
    temporadaFilter,
    tipoFilter,
    destinoFilter,
    resolver,
    regionParam,
    regionIdByPais,
  ]);

  // Reset page when filters or view change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    estadoFilter,
    temporadaFilter,
    tipoFilter,
    destinoFilter,
    regionParam,
    viewMode,
  ]);

  const itemsPerPage =
    viewMode === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPaquetes.length / itemsPerPage),
  );

  const paginatedPaquetes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPaquetes.slice(start, start + itemsPerPage);
  }, [filteredPaquetes, currentPage, itemsPerPage]);

  // ---------------------------------------------------------------------------
  // Filter state helpers
  // ---------------------------------------------------------------------------

  const activeFilterCount =
    (estadoFilter === "all" ? 0 : 1) +
    temporadaFilter.length +
    tipoFilter.length +
    destinoFilter.length +
    (regionParam ? 1 : 0);

  function clearAllFilters() {
    setSearch("");
    setEstadoFilter("all");
    setTemporadaFilter([]);
    setTipoFilter([]);
    setDestinoFilter([]);
    if (regionParam) router.replace("/paquetes");
  }

  function clearRegionFilter() {
    router.replace("/paquetes");
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleClone(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    clonePaquete(id);
    toast("success", "Paquete clonado", "Se creó una copia en estado Borrador");
  }

  function handleOpenDelete(e: React.MouseEvent, paquete: Paquete) {
    e.stopPropagation();
    setDeleteTarget(paquete);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deletePaquete(deleteTarget.id);
      toast(
        "success",
        "Paquete eliminado",
        `"${deleteTarget.titulo}" fue eliminado correctamente`,
      );
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Column definitions for visibility menu
  // ---------------------------------------------------------------------------

  const columnDefs: ColumnDefinition<ColKey>[] = [
    { key: "destino", label: "Destino" },
    { key: "temporada", label: "Temporada" },
    { key: "tipo", label: "Tipo" },
    { key: "noches", label: "Noches" },
    { key: "estado", label: "Estado" },
    {
      key: "precio",
      label: "Precio",
      locked: canSeePricing.venta === false ? undefined : true,
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <>
      <PageHeader
        title="Paquetes"
        subtitle={`${paquetes.length} paquetes en catálogo · ${filteredPaquetes.length} coinciden con los filtros`}
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/paquetes/nuevo")}
            >
              Nuevo Paquete
            </Button>
          ) : undefined
        }
      />

      {/* ===================== Filter Toolbar ===================== */}
      <div className="mb-5 flex flex-col gap-3">
        {/* Row 1: search + estado + view toggle + columns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search input */}
          <div
            className="relative flex h-8 min-w-[200px] flex-1 items-center rounded-[8px] border border-hairline bg-white focus-within:border-[#8B5CF6]/40 focus-within:ring-2 focus-within:ring-[#8B5CF6]/15 lg:max-w-[280px]"
          >
            <Search
              size={13}
              className="absolute left-2.5 text-neutral-400"
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o descripción..."
              className="h-full w-full bg-transparent pl-8 pr-7 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Limpiar búsqueda"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Estado segmented */}
          <SegmentedControl<EstadoFilter>
            value={estadoFilter}
            onChange={setEstadoFilter}
            aria-label="Filtrar por estado"
            options={[
              {
                value: "all",
                label: "Todos",
                count:
                  estadoCounts.ACTIVO +
                  estadoCounts.BORRADOR +
                  estadoCounts.INACTIVO,
              },
              {
                value: "ACTIVO",
                label: "Activos",
                count: estadoCounts.ACTIVO,
                color: "#3BBFAD",
              },
              {
                value: "BORRADOR",
                label: "Borrador",
                count: estadoCounts.BORRADOR,
                color: "#E8913A",
              },
              ...(estadoCounts.INACTIVO > 0
                ? [
                    {
                      value: "INACTIVO" as const,
                      label: "Inactivos",
                      count: estadoCounts.INACTIVO,
                      color: "#6B6F99",
                    },
                  ]
                : []),
            ]}
          />

          {/* Spacer pushes view toggle / columns to the right on wide screens */}
          <div className="ml-auto flex items-center gap-2.5">
            {viewMode === "table" && (
              <ColumnVisibilityMenu
                columns={columnDefs}
                visible={visibleColumns}
                onChange={(next) => setVisibleColumns(next as Record<ColKey, boolean>)}
              />
            )}
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Row 2: multi-select popovers */}
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="Temporada"
            options={temporadaOptions}
            selected={temporadaFilter}
            onChange={setTemporadaFilter}
          />
          <MultiSelectFilter
            label="Tipo"
            options={tipoOptions}
            selected={tipoFilter}
            onChange={setTipoFilter}
          />
          <MultiSelectFilter
            label="Destino"
            options={destinoOptions}
            selected={destinoFilter}
            onChange={setDestinoFilter}
          />

          {activeRegion && (
            <motion.button
              type="button"
              onClick={clearRegionFilter}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#8B5CF6]/30 bg-[#8B5CF6]/8 px-2.5 text-[12px] font-medium text-[#8B5CF6] hover:bg-[#8B5CF6]/15"
              aria-label={`Quitar filtro de región ${activeRegion.nombre}`}
            >
              <span>Región: {activeRegion.nombre}</span>
              <X size={12} strokeWidth={2.5} />
            </motion.button>
          )}

          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.button
                key="clear"
                type="button"
                onClick={clearAllFilters}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[12px] font-medium text-neutral-500 hover:text-neutral-900"
              >
                <X size={12} strokeWidth={2.5} />
                Limpiar filtros
                <span className="font-mono text-[10px] text-neutral-400 tabular-nums">
                  ({activeFilterCount})
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===================== Content (table or grid) ===================== */}
      {filteredPaquetes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-hairline bg-white py-20 text-neutral-400">
          <Package className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">No se encontraron paquetes</p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-3 text-xs font-medium text-[#8B5CF6] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* -------------------- GRID VIEW -------------------- */
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {paginatedPaquetes.map((paquete, i) => (
            <PaqueteGridCard
              key={paquete.id}
              paquete={paquete}
              foto={fotoByPaquete.get(paquete.id)}
              destino={
                resolver.paisNombreFor(paquete.id) ?? paquete.destino ?? "—"
              }
              regionNombre={resolver.regionNombreFor(paquete.id) ?? undefined}
              temporada={
                paquete.temporadaId
                  ? temporadaById.get(paquete.temporadaId)
                  : undefined
              }
              tipo={
                paquete.tipoPaqueteId
                  ? tipoById.get(paquete.tipoPaqueteId)
                  : undefined
              }
              pricing={preciosMap[paquete.id]}
              canSeePricing={canSeePricing}
              index={i}
              nochesTotales={nochesPorPaquete.get(paquete.id)}
            />
          ))}
        </motion.div>
      ) : (
        /* -------------------- TABLE VIEW -------------------- */
        <motion.div
          key="table"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paquete</TableHead>
                {visibleColumns.destino && <TableHead>Destino</TableHead>}
                {visibleColumns.temporada && <TableHead>Temporada</TableHead>}
                {visibleColumns.tipo && <TableHead>Tipo</TableHead>}
                {visibleColumns.noches && (
                  <TableHead className="text-right">Noches</TableHead>
                )}
                {visibleColumns.estado && <TableHead>Estado</TableHead>}
                {visibleColumns.precio &&
                  canSeePricing.venta !== false && (
                    <TableHead variant="price">Precio</TableHead>
                  )}
                {canEdit && (
                  <TableHead className="w-[1%] whitespace-nowrap">
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPaquetes.map((paquete) => {
                const pricing = preciosMap[paquete.id];
                const destinoNombre =
                  resolver.paisNombreFor(paquete.id) ?? paquete.destino ?? "—";
                const regionNombre = resolver.regionNombreFor(paquete.id);
                const temporada = paquete.temporadaId
                  ? temporadaById.get(paquete.temporadaId)
                  : undefined;
                const tipo = paquete.tipoPaqueteId
                  ? tipoById.get(paquete.tipoPaqueteId)
                  : undefined;
                const price = formatPaquetePrice(pricing, paquete.precioVenta);

                // Factor display for the price sub-line
                const factorSub = (() => {
                  if (!canSeePricing.markup || !pricing || pricing.opcionFactors.length === 0)
                    return null;
                  const fs = pricing.opcionFactors;
                  if (fs.length === 1) return fs[0].toFixed(2);
                  const min = Math.min(...fs);
                  const max = Math.max(...fs);
                  return min === max
                    ? min.toFixed(2)
                    : `${min.toFixed(2)}–${max.toFixed(2)}`;
                })();

                return (
                  <TableRow
                    key={paquete.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/paquetes/${paquete.id}`)}
                  >
                    {/* Título (with destino sublabel when that column is hidden) */}
                    <TableCell className="max-w-[280px]">
                      <div className="flex flex-col">
                        <span className="truncate font-medium text-neutral-900">
                          {paquete.titulo}
                        </span>
                        {!visibleColumns.destino && (
                          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-neutral-400">
                            <MapPin size={10} strokeWidth={2} />
                            {destinoNombre}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {visibleColumns.destino && (
                      <TableCell>
                        <div className="flex flex-col">
                          {regionNombre && (
                            <span className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">
                              {regionNombre}
                            </span>
                          )}
                          <span className="text-[12.5px] text-neutral-600">
                            {destinoNombre}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.temporada && (
                      <TableCell>
                        {temporada ? (
                          <span className="text-[12px] text-neutral-600">
                            {temporada.nombre.replace(/\s*\(.*\)/, "").trim()}
                          </span>
                        ) : (
                          <span className="text-[12px] text-neutral-300">—</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.tipo && (
                      <TableCell>
                        {tipo ? (
                          <span className="text-[12px] text-neutral-600">
                            {tipo.nombre}
                          </span>
                        ) : (
                          <span className="text-[12px] text-neutral-300">—</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.noches && (
                      <TableCell className="text-right font-mono text-[12px] tabular-nums text-neutral-600">
                        {(() => {
                          const n = nochesPorPaquete.get(paquete.id) ?? 0;
                          return n > 0 ? n : "—";
                        })()}
                      </TableCell>
                    )}

                    {visibleColumns.estado && (
                      <TableCell>
                        <Badge variant={estadoBadge[paquete.estado].variant}>
                          {estadoBadge[paquete.estado].label}
                        </Badge>
                      </TableCell>
                    )}

                    {visibleColumns.precio && canSeePricing.venta !== false && (
                      <TableCell variant="price">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-mono font-semibold tabular-nums text-neutral-900 ${
                              price.isRange ? "text-[12.5px]" : "text-[13.5px]"
                            }`}
                          >
                            {price.main}
                          </span>
                          {(canSeePricing.neto || factorSub) && (
                            <span className="mt-0.5 flex items-center gap-1 font-mono text-[10px] tabular-nums text-neutral-400">
                              {canSeePricing.neto && pricing && (
                                <>neto {formatCurrency(pricing.netoFijos)}</>
                              )}
                              {canSeePricing.neto && factorSub && <span>·</span>}
                              {factorSub && <>×{factorSub}</>}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/paquetes/${paquete.id}`);
                            }}
                            aria-label="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/paquetes/${paquete.id}?tab=datos`);
                            }}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleClone(e, paquete.id)}
                            aria-label="Clonar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, paquete)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Fade indicator for horizontal scroll on mobile */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent md:hidden" />
        </motion.div>
      )}

      {/* ===================== Pagination ===================== */}
      {filteredPaquetes.length > itemsPerPage && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ===================== Delete modal ===================== */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setIsShaking(false);
          }
        }}
        size="sm"
      >
        <ModalHeader title="Eliminar Paquete">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={
              isShaking
                ? { x: [...interactions.deleteShake.animate.x] }
                : {}
            }
            transition={
              isShaking ? interactions.deleteShake.transition : undefined
            }
          >
            <p className="text-neutral-700">
              ¿Está seguro que desea eliminar &ldquo;{deleteTarget?.titulo}
              &rdquo;?
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              Esta acción no se puede deshacer.
            </p>
          </motion.div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
