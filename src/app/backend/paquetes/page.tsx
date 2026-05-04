"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { motion } from "motion/react";
import { Tooltip } from "radix-ui";
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
import { ViewToggle } from "@/components/ui/data/ViewToggle";
import {
  ColumnVisibilityMenu,
  type ColumnDefinition,
} from "@/components/ui/data/ColumnVisibilityMenu";
import {
  ActiveFilterChips,
  type ActiveFilterChip,
} from "@/components/ui/data/ActiveFilterChips";
import { ActionTooltip } from "@/components/ui/ActionTooltip";
import { SortableHead } from "@/components/ui/data/SortableHead";
import { useTableSort } from "@/components/ui/data/useTableSort";
import { DensityToggle } from "@/components/ui/data/Density";
import { BulkActionBar } from "@/components/ui/data/BulkActionBar";
import { Checkbox } from "@/components/ui/Checkbox";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { ColumnDef } from "@tanstack/react-table";
import { usePaquetesQueryState } from "./searchParams";
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
import {
  CardGridSkeleton,
  DataTableSkeleton,
  PageSkeleton,
} from "@/components/ui/Skeletons";
import {
  usePackageLoading,
  usePackageProgress,
} from "@/components/providers/PackageProvider";
import { formatCurrency, computePaquetePrecios } from "@/lib/utils";
import { matchesSearch } from "@/lib/search";
import type { Paquete, PaqueteFoto, Pais } from "@/lib/types";
import { PaqueteGridCard } from "./_components/PaqueteGridCard";
import {
  bulkPublish as serverBulkPublish,
  bulkUnpublish as serverBulkUnpublish,
  bulkArchive as serverBulkArchive,
} from "@/actions/package-lifecycle.actions";
import { Send as SendIcon, Archive as ArchiveIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Lifecycle badges. INACTIVO is preserved for legacy rows that haven't been
// migrated yet; new code/UX uses the four-state model BORRADOR / EN_REVISION /
// ACTIVO / ARCHIVADO. Each entry maps to a Badge variant + color used in the
// segmented control and chip rendering.
const estadoBadge = {
  BORRADOR: { variant: "draft" as const, label: "Borrador", color: "#E8913A" },
  EN_REVISION: { variant: "review" as const, label: "En revisión", color: "#8B5CF6" },
  ACTIVO: { variant: "active" as const, label: "Publicado", color: "#3BBFAD" },
  ARCHIVADO: { variant: "archived" as const, label: "Archivado", color: "#5A5E7A" },
  INACTIVO: { variant: "inactive" as const, label: "Inactivo", color: "#6B6F99" },
} as const;

const ITEMS_PER_PAGE_TABLE = 12;
const ITEMS_PER_PAGE_GRID = 18;

type EstadoFilter =
  | "all"
  | "ACTIVO"
  | "BORRADOR"
  | "EN_REVISION"
  | "ARCHIVADO"
  | "INACTIVO";

type ColKey =
  | "id"
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
// Price formatting helper — keeps only the final sale price visible in the table.
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
      main: `Desde ${formatCurrency(pricing.min)}`,
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
  const [filters, setFilters] = usePaquetesQueryState();
  const {
    q: search,
    estado: estadoFilter,
    temporada: temporadaFilter,
    tipo: tipoFilter,
    destino: destinoFilter,
    region: regionParamRaw,
    view: viewMode,
    page: pageIndex,
  } = filters;
  const regionParam = regionParamRaw || null;
  const currentPage = pageIndex + 1;
  const setSearch = (v: string) => setFilters({ q: v, page: 0 });
  const setEstadoFilter = (v: EstadoFilter) =>
    setFilters({ estado: v, page: 0 });
  const setTemporadaFilter = (v: string[]) =>
    setFilters({ temporada: v, page: 0 });
  const setTipoFilter = (v: string[]) => setFilters({ tipo: v, page: 0 });
  const setDestinoFilter = (v: string[]) => setFilters({ destino: v, page: 0 });
  const setViewMode = (v: "table" | "grid") => setFilters({ view: v, page: 0 });
  const setCurrentPage = (next: number) => setFilters({ page: next - 1 });

  const { canEdit, canSeePricing } = useAuth();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const { hydratingPaquetes, totalPaquetes, loadedPaquetes } =
    usePackageProgress();

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

  // ---- Component state (URL-derived filters live above; only ephemeral UI here) ----
  const [deleteTarget, setDeleteTarget] = useState<Paquete | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [visibleColumns, setVisibleColumns] = useLocalStorageState<
    Record<ColKey, boolean>
  >("traveloz.paquetes.cols.v1", {
    id: true,
    destino: true,
    temporada: true,
    tipo: false,
    noches: true,
    estado: true,
    precio: true,
  });

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
    const counts = {
      ACTIVO: 0,
      BORRADOR: 0,
      EN_REVISION: 0,
      ARCHIVADO: 0,
      INACTIVO: 0,
    };
    for (const p of paquetes) {
      const key = p.estado as keyof typeof counts;
      if (key in counts) counts[key]++;
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
      result = result.filter((p) =>
        matchesSearch(search, p.titulo, p.descripcion, p.destino),
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

  // Filters reset the page index inline through their setters, so no
  // separate useEffect is needed here anymore.

  const itemsPerPage =
    viewMode === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE;
  const hasSearchOrFilters =
    Boolean(search.trim()) ||
    estadoFilter !== "all" ||
    temporadaFilter.length > 0 ||
    tipoFilter.length > 0 ||
    destinoFilter.length > 0 ||
    Boolean(regionParam);
  const visibleTotalPaquetes = hasSearchOrFilters
    ? filteredPaquetes.length
    : hydratingPaquetes
      ? Math.max(totalPaquetes, filteredPaquetes.length)
      : filteredPaquetes.length;
  const totalPages = Math.max(
    1,
    Math.ceil(visibleTotalPaquetes / itemsPerPage),
  );
  const isPendingPage =
    !hasSearchOrFilters &&
    hydratingPaquetes &&
    currentPage > 1 &&
    filteredPaquetes.length < currentPage * itemsPerPage;
  const showPendingSearch =
    hasSearchOrFilters && hydratingPaquetes && filteredPaquetes.length === 0;

  // Sortable columns for the table view (grid view ignores sort).
  const sortColumns = useMemo<ColumnDef<Paquete>[]>(
    () => [
      { id: "id", accessorFn: (row) => row.id },
      { id: "titulo", accessorKey: "titulo" },
      {
        id: "destino",
        accessorFn: (row) =>
          resolver.paisNombreFor(row.id) ?? row.destino ?? "",
      },
      {
        id: "temporada",
        accessorFn: (row) =>
          row.temporadaId
            ? (temporadaById.get(row.temporadaId)?.nombre ?? "")
            : "",
      },
      {
        id: "tipo",
        accessorFn: (row) =>
          row.tipoPaqueteId
            ? (tipoById.get(row.tipoPaqueteId)?.nombre ?? "")
            : "",
      },
      {
        id: "noches",
        accessorFn: (row) => nochesPorPaquete.get(row.id) ?? 0,
      },
      { id: "estado", accessorKey: "estado" },
      {
        id: "precio",
        accessorFn: (row) => preciosMap[row.id]?.min ?? row.precioVenta ?? 0,
      },
    ],
    [resolver, temporadaById, tipoById, nochesPorPaquete, preciosMap],
  );

  const sort = useTableSort(filteredPaquetes, sortColumns);
  const sortedPaquetes = sort.rows;

  const paginatedPaquetes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPaquetes.slice(start, start + itemsPerPage);
  }, [sortedPaquetes, currentPage, itemsPerPage]);

  // ---------------------------------------------------------------------------
  // Filter state helpers
  // ---------------------------------------------------------------------------

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (estadoFilter === "all" ? 0 : 1) +
    temporadaFilter.length +
    tipoFilter.length +
    destinoFilter.length +
    (regionParam ? 1 : 0);
  const packageSubtitle = hydratingPaquetes
    ? `${loadedPaquetes} de ${Math.max(totalPaquetes, loadedPaquetes)} paquetes cargados${
        hasSearchOrFilters
          ? ` · ${filteredPaquetes.length} visibles con los filtros actuales`
          : ""
      }`
    : `${paquetes.length} paquetes en catálogo${
        hasSearchOrFilters
          ? ` · ${filteredPaquetes.length} coinciden con los filtros`
          : ""
      }`;
  const hydrationMessage = hydratingPaquetes
    ? hasSearchOrFilters
      ? "La búsqueda todavía está completando el catálogo. Algunos resultados pueden aparecer en unos segundos."
      : `Mostrando la primera tanda mientras se cargan ${Math.max(
          totalPaquetes - loadedPaquetes,
          0,
        )} paquetes restantes en segundo plano.`
    : null;

  function clearAllFilters() {
    setFilters({
      q: "",
      estado: "all",
      temporada: [],
      tipo: [],
      destino: [],
      region: "",
      page: 0,
    });
  }

  function clearRegionFilter() {
    setFilters({ region: "", page: 0 });
  }

  useEffect(() => {
    if (currentPage > totalPages) {
      setFilters({ page: Math.max(0, totalPages - 1) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  // Build the active-chip array (one chip per active filter atom)
  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (search.trim()) {
      chips.push({
        key: "q",
        dimension: "Búsqueda",
        value: search,
        onRemove: () => setSearch(""),
      });
    }
    if (estadoFilter !== "all") {
      chips.push({
        key: `estado:${estadoFilter}`,
        dimension: "Estado",
        value: estadoBadge[estadoFilter as keyof typeof estadoBadge].label,
        color: estadoBadge[estadoFilter as keyof typeof estadoBadge].color,
        onRemove: () => setEstadoFilter("all"),
      });
    }
    for (const id of temporadaFilter) {
      const t = temporadaById.get(id);
      if (!t) continue;
      chips.push({
        key: `temporada:${id}`,
        dimension: "Temporada",
        value: t.nombre.replace(/\s*\(.*\)/, "").trim(),
        onRemove: () =>
          setTemporadaFilter(temporadaFilter.filter((x) => x !== id)),
      });
    }
    for (const id of tipoFilter) {
      const t = tipoById.get(id);
      if (!t) continue;
      chips.push({
        key: `tipo:${id}`,
        dimension: "Tipo",
        value: t.nombre,
        onRemove: () => setTipoFilter(tipoFilter.filter((x) => x !== id)),
      });
    }
    for (const nombre of destinoFilter) {
      chips.push({
        key: `destino:${nombre}`,
        dimension: "Destino",
        value: nombre,
        onRemove: () =>
          setDestinoFilter(destinoFilter.filter((x) => x !== nombre)),
      });
    }
    if (activeRegion) {
      chips.push({
        key: `region:${activeRegion.id}`,
        dimension: "Región",
        value: activeRegion.nombre,
        onRemove: clearRegionFilter,
      });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    estadoFilter,
    temporadaFilter,
    tipoFilter,
    destinoFilter,
    activeRegion,
    temporadaById,
    tipoById,
  ]);

  // Keyboard shortcuts:
  //   "/"  → focus search input
  //   "n"  → new paquete (when canEdit)
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === "n" && canEdit) {
        e.preventDefault();
        router.push("/backend/paquetes/nuevo");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canEdit, router]);

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
    const titulo = deleteTarget.titulo;
    const id = deleteTarget.id;
    deletePaquete(id);
    setDeleteTarget(null);
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast("success", "Paquete eliminado", `"${titulo}" fue eliminado correctamente`);
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    for (const id of ids) deletePaquete(id);
    setSelected(new Set());
    setBulkDeleteOpen(false);
    toast(
      "success",
      "Paquetes eliminados",
      `${ids.length} paquete${ids.length === 1 ? "" : "s"} eliminado${
        ids.length === 1 ? "" : "s"
      } correctamente`,
    );
  }

  function handleBulkClone() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    for (const id of ids) clonePaquete(id);
    setSelected(new Set());
    toast(
      "success",
      "Paquetes clonados",
      `${ids.length} copia${ids.length === 1 ? "" : "s"} creada${
        ids.length === 1 ? "" : "s"
      } en estado Borrador`,
    );
  }

  // ---------------------------------------------------------------------------
  // Lifecycle bulk actions — server-side transitions enforce the matrix in
  // package-lifecycle.actions.ts (e.g. ARCHIVADO can't be re-published in one
  // step). The toast surfaces partial-success counts when some rows are
  // rejected by the transition guard.
  // ---------------------------------------------------------------------------

  function reportBulkResult(
    label: string,
    res: { updated: number; skipped: number; reasons?: string[] },
  ) {
    if (res.updated > 0 && res.skipped === 0) {
      toast("success", label, `${res.updated} paquete(s) actualizado(s).`);
    } else if (res.updated > 0 && res.skipped > 0) {
      toast(
        "info",
        label,
        `${res.updated} actualizado(s), ${res.skipped} omitido(s) por transición no permitida.`,
      );
    } else {
      toast(
        "error",
        "Sin cambios",
        res.reasons?.[0] ?? "Ninguna fila admitía la transición solicitada.",
      );
    }
  }

  async function handleBulkPublish() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const res = await serverBulkPublish(ids);
      setSelected(new Set());
      reportBulkResult("Paquetes publicados", res);
    } catch (err) {
      toast("error", "No se pudo publicar", err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function handleBulkUnpublish() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const res = await serverBulkUnpublish(ids);
      setSelected(new Set());
      reportBulkResult("Paquetes movidos a revisión", res);
    } catch (err) {
      toast("error", "No se pudo despublicar", err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function handleBulkArchive() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const res = await serverBulkArchive(ids);
      setSelected(new Set());
      reportBulkResult("Paquetes archivados", res);
    } catch (err) {
      toast("error", "No se pudo archivar", err instanceof Error ? err.message : "Error desconocido");
    }
  }

  function toggleRowSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelected(allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const p of paginatedPaquetes) next.delete(p.id);
      } else {
        for (const p of paginatedPaquetes) next.add(p.id);
      }
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Column definitions for visibility menu
  // ---------------------------------------------------------------------------

  const columnDefs: ColumnDefinition<ColKey>[] = [
    { key: "id", label: "ID", locked: true },
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

  // Cold mount (no paquetes in state yet) → full page skeleton.
  // Otherwise we paint the chrome (header, filter toolbar, sticky bar) and
  // let the table area handle its own skeleton via `showPendingSearch`. This
  // makes navigation feel instant when the provider already has stale data.
  if (loading && paquetes.length === 0) return <PageSkeleton variant="table" />;

  return (
    <>
      <Tooltip.Provider delayDuration={250}>
        <PageHeader
          title="Paquetes"
          subtitle={packageSubtitle}
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/backend/paquetes/nuevo")}
              >
                Nuevo Paquete
              </Button>
            ) : undefined
          }
        />

        {/* ===================== Filter Toolbar ===================== */}
        <div className="sticky top-[54px] z-[15] -mx-4 mb-5 flex flex-col gap-3 px-4 py-3 backdrop-blur-md md:-mx-7 md:px-7"
          style={{
            background: "rgba(250,250,252,0.78)",
            borderBottom: "1px solid rgba(17,17,36,0.05)",
          }}
        >
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
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o descripción..."
              className="h-full w-full bg-transparent pl-8 pr-12 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Limpiar búsqueda"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            ) : (
              <kbd
                aria-hidden
                className="pointer-events-none absolute right-2 hidden h-4 items-center rounded border px-1 font-mono text-[10px] text-neutral-400 sm:flex"
                style={{ borderColor: "rgba(17,17,36,0.08)" }}
              >
                /
              </kbd>
            )}
          </div>

          {/* Estado segmented */}
          <SegmentedControl<EstadoFilter>
            value={estadoFilter}
            onChange={setEstadoFilter}
            aria-label="Filtrar por estado del ciclo de vida"
            options={[
              {
                value: "all",
                label: "Todos",
                count:
                  estadoCounts.ACTIVO +
                  estadoCounts.BORRADOR +
                  estadoCounts.EN_REVISION +
                  estadoCounts.ARCHIVADO +
                  estadoCounts.INACTIVO,
              },
              {
                value: "BORRADOR",
                label: "Borrador",
                count: estadoCounts.BORRADOR,
                color: "#E8913A",
              },
              {
                value: "EN_REVISION",
                label: "En revisión",
                count: estadoCounts.EN_REVISION,
                color: "#8B5CF6",
              },
              {
                value: "ACTIVO",
                label: "Publicados",
                count: estadoCounts.ACTIVO,
                color: "#3BBFAD",
              },
              ...(estadoCounts.ARCHIVADO > 0
                ? [
                    {
                      value: "ARCHIVADO" as const,
                      label: "Archivados",
                      count: estadoCounts.ARCHIVADO,
                      color: "#5A5E7A",
                    },
                  ]
                : []),
              ...(estadoCounts.INACTIVO > 0
                ? [
                    {
                      value: "INACTIVO" as const,
                      label: "Inactivos (legado)",
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
              <>
                <ColumnVisibilityMenu
                  columns={columnDefs}
                  visible={visibleColumns}
                  onChange={(next) =>
                    setVisibleColumns(next as Record<ColKey, boolean>)
                  }
                />
                <DensityToggle />
              </>
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
          </div>

          {/* Row 3: removable chips for every active filter atom */}
          {activeChips.length > 0 && (
            <ActiveFilterChips
              chips={activeChips}
              totalCount={activeFilterCount}
              onClearAll={clearAllFilters}
            />
          )}
        </div>

        {/* ===================== Content (table or grid) ===================== */}
        {hydrationMessage && (
          <div className="mb-4 rounded-[12px] border border-[#45D4C0]/20 bg-[#45D4C0]/7 px-3.5 py-2.5 text-[12.5px] text-[#1A6D63]">
            {hydrationMessage}
          </div>
        )}

        {showPendingSearch ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} columns={4} />
          ) : (
            <DataTableSkeleton columns={6} rows={8} />
          )
        ) : filteredPaquetes.length === 0 ? (
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
        ) : isPendingPage ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} columns={4} />
          ) : (
            <DataTableSkeleton columns={6} rows={8} />
          )
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
            <Table className="!overflow-x-auto !overflow-y-visible [&>table]:min-w-[980px]">
              <TableHeader>
                <TableRow>
                  {canEdit && (
                    <TableHead className="w-[40px] text-center">
                      <Checkbox
                        checked={
                          paginatedPaquetes.length > 0 &&
                          paginatedPaquetes.every((p) => selected.has(p.id))
                        }
                        onCheckedChange={() =>
                          togglePageSelected(
                            paginatedPaquetes.length > 0 &&
                              paginatedPaquetes.every((p) => selected.has(p.id)),
                          )
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead
                    variant="id"
                    className="w-[96px] whitespace-nowrap text-center"
                  >
                    <SortableHead
                      direction={sort.direction("id")}
                      onSort={() => sort.toggle("id")}
                      align="center"
                    >
                      ID
                    </SortableHead>
                  </TableHead>
                  <TableHead>
                    <SortableHead
                      direction={sort.direction("titulo")}
                      onSort={() => sort.toggle("titulo")}
                    >
                      Paquete
                    </SortableHead>
                  </TableHead>
                  {visibleColumns.destino && (
                    <TableHead className="text-center">
                      <SortableHead
                        direction={sort.direction("destino")}
                        onSort={() => sort.toggle("destino")}
                        align="center"
                      >
                        Destino
                      </SortableHead>
                    </TableHead>
                  )}
                  {visibleColumns.temporada && (
                    <TableHead>
                      <SortableHead
                        direction={sort.direction("temporada")}
                        onSort={() => sort.toggle("temporada")}
                      >
                        Temporada
                      </SortableHead>
                    </TableHead>
                  )}
                  {visibleColumns.tipo && (
                    <TableHead>
                      <SortableHead
                        direction={sort.direction("tipo")}
                        onSort={() => sort.toggle("tipo")}
                      >
                        Tipo
                      </SortableHead>
                    </TableHead>
                  )}
                  {visibleColumns.noches && (
                    <TableHead className="text-center">
                      <SortableHead
                        direction={sort.direction("noches")}
                        onSort={() => sort.toggle("noches")}
                        align="center"
                      >
                        Noches
                      </SortableHead>
                    </TableHead>
                  )}
                  {visibleColumns.estado && (
                    <TableHead>
                      <SortableHead
                        direction={sort.direction("estado")}
                        onSort={() => sort.toggle("estado")}
                      >
                        Estado
                      </SortableHead>
                    </TableHead>
                  )}
                  {visibleColumns.precio &&
                    canSeePricing.venta !== false && (
                      <TableHead variant="price" className="text-center">
                        <SortableHead
                          direction={sort.direction("precio")}
                          onSort={() => sort.toggle("precio")}
                          align="center"
                        >
                          Precio
                        </SortableHead>
                      </TableHead>
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

                return (
                  <TableRow
                    key={paquete.id}
                    selected={selected.has(paquete.id)}
                    className="cursor-pointer"
                    onClick={() => router.push(`/backend/paquetes/${paquete.id}`)}
                  >
                    {canEdit && (
                      <TableCell
                        className="w-[40px] text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowSelected(paquete.id);
                        }}
                      >
                        <Checkbox
                          checked={selected.has(paquete.id)}
                          onCheckedChange={() => toggleRowSelected(paquete.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell variant="id" className="whitespace-nowrap">
                      {paquete.id}
                    </TableCell>

                    {/* Título (with destino sublabel when that column is hidden) */}
                    <TableCell className="max-w-[260px]">
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
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
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
                      <TableCell className="text-center font-mono text-[12px] tabular-nums text-neutral-600">
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
                      <TableCell variant="price" className="text-center">
                        <span
                          className={`font-mono font-semibold tabular-nums text-neutral-900 ${
                            price.isRange ? "text-[12.5px]" : "text-[13.5px]"
                          }`}
                        >
                          {price.main}
                        </span>
                      </TableCell>
                    )}

                    {canEdit && (
                      <TableCell
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/backend/paquetes/${paquete.id}?tab=datos`);
                        }}
                      >
                        <div className="flex items-center justify-center gap-0.5 lg:justify-end">
                          <ActionTooltip label="Ver">
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/backend/paquetes/${paquete.id}`);
                              }}
                              aria-label="Ver"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          <ActionTooltip label="Editar">
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/backend/paquetes/${paquete.id}?tab=datos`);
                              }}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          <ActionTooltip label="Clonar">
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={(e) => handleClone(e, paquete.id)}
                              aria-label="Clonar"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
                          <ActionTooltip label="Eliminar">
                            <Button
                              variant="icon"
                              size="xs"
                              onClick={(e) => handleOpenDelete(e, paquete)}
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ActionTooltip>
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
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* ===================== Bulk delete modal ===================== */}
        <Modal
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          size="sm"
        >
          <ModalHeader title="Eliminar varios paquetes">{null}</ModalHeader>
          <ModalBody>
            <p className="text-neutral-700">
              ¿Eliminar {selected.size} paquete{selected.size === 1 ? "" : "s"}?
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              Esta acción no se puede deshacer.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setBulkDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleBulkDelete}>
              Eliminar {selected.size}
            </Button>
          </ModalFooter>
        </Modal>

        {/* ===================== Delete modal ===================== */}
        <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        size="sm"
      >
        <ModalHeader title="Eliminar Paquete">{null}</ModalHeader>
        <ModalBody>
          <p className="text-neutral-700">
            ¿Está seguro que desea eliminar &ldquo;{deleteTarget?.titulo}
            &rdquo;?
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            Esta acción no se puede deshacer.
          </p>
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

      {/* ===================== Bulk action bar ===================== */}
      {canEdit && (
        <BulkActionBar
          count={selected.size}
          label={(n) =>
            `${n} paquete${n === 1 ? "" : "s"} seleccionado${n === 1 ? "" : "s"}`
          }
          onClear={() => setSelected(new Set())}
          actions={
            <>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<SendIcon className="h-3.5 w-3.5" />}
                onClick={handleBulkPublish}
                className="!text-white hover:!bg-white/10"
              >
                Publicar
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Eye className="h-3.5 w-3.5" />}
                onClick={handleBulkUnpublish}
                className="!text-white hover:!bg-white/10"
              >
                A revisión
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<ArchiveIcon className="h-3.5 w-3.5" />}
                onClick={handleBulkArchive}
                className="!text-white hover:!bg-white/10"
              >
                Archivar
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                onClick={handleBulkClone}
                className="!text-white hover:!bg-white/10"
              >
                Clonar
              </Button>
              <Button
                variant="danger"
                size="xs"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => setBulkDeleteOpen(true)}
              >
                Eliminar
              </Button>
            </>
          }
        />
      )}
      </Tooltip.Provider>
    </>
  );
}
