"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Trash2, Hotel } from "lucide-react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data/DataTable";
import {
  DataTableToolbar,
  DataTablePageHeader,
} from "@/components/ui/data/DataTableToolbar";
import { RowActions } from "@/components/ui/data/RowActions";
import { EmptyState } from "@/components/ui/data/EmptyState";
import { SortableHead } from "@/components/ui/data/SortableHead";
import { useTableSort } from "@/components/ui/data/useTableSort";
import { DensityToggle } from "@/components/ui/data/Density";
import type { ColumnDef } from "@tanstack/react-table";
import { useAlojamientosQueryState } from "./searchParams";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import {
  useAlojamientos,
  useServiceActions,
  useServiceState,
} from "@/components/providers/ServiceProvider";
import { usePaises } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useToast } from "@/components/ui/Toast";
import { DataTableSkeleton, PageSkeleton } from "@/components/ui/Skeletons";
import {
  useServiceLoading,
  useServiceProgress,
} from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { formatCurrency } from "@/lib/utils";
import { formatStoredDate } from "@/lib/date";
import type { Alojamiento } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// StarRating inline component
// ---------------------------------------------------------------------------

function StarRating({
  categoria,
  onChange,
}: {
  categoria: number;
  onChange?: (next: number) => void;
}) {
  const interactive = !!onChange;
  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        const filled = i < categoria;
        const common = "h-3 w-3 transition-colors";
        const inner = filled
          ? "fill-amber-400 text-amber-400"
          : "text-neutral-600";
        if (!interactive) {
          return <Star key={i} className={`${common} ${inner}`} />;
        }
        return (
          <button
            key={i}
            type="button"
            title={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
            aria-label={`Fijar categoría a ${star}`}
            onClick={(e) => {
              e.stopPropagation();
              // Click on already-set value clears to 0 (toggle behaviour).
              onChange!(categoria === star ? 0 : star);
            }}
            className="cursor-pointer p-0.5 rounded hover:bg-amber-50"
          >
            <Star
              className={`${common} ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-neutral-400 hover:text-amber-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlojamientosPage
// ---------------------------------------------------------------------------

export default function AlojamientosPage() {
  const router = useRouter();
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();

  // Data hooks
  const alojamientos = useAlojamientos();
  const serviceState = useServiceState();
  const { createAlojamiento, deleteAlojamiento, updateAlojamiento } = useServiceActions();
  const paises = usePaises();
  const packageState = usePackageState();
  const loading = useServiceLoading();
  const {
    hydratingAlojamientos,
    totalAlojamientos,
    loadedAlojamientos,
  } = useServiceProgress();

  // Package usage count map
  const paqueteCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    for (const pa of packageState.paqueteAlojamientos) {
      const key = `${pa.alojamientoId}::${pa.paqueteId}`;
      if (!seen.has(key)) {
        seen.add(key);
        map[pa.alojamientoId] = (map[pa.alojamientoId] ?? 0) + 1;
      }
    }
    return map;
  }, [packageState.paqueteAlojamientos]);

  // URL-state filters (search, page) so refresh / share preserve the view.
  const [filters, setFilters] = useAlojamientosQueryState();
  const search = filters.q;
  const currentPage = filters.page + 1;
  const setSearch = (v: string) => setFilters({ q: v, page: 0 });
  const setCurrentPage = (next: number) => setFilters({ page: next - 1 });

  // Ephemeral UI state
  const [deleteTarget, setDeleteTarget] = useState<Alojamiento | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: "/" focuses search, "n" creates a new alojamiento.
  useEffect(() => {
    function isTyping(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "n" && canEdit) {
        e.preventDefault();
        router.push("/backend/alojamientos/nuevo");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canEdit, router]);

  // ---------------------------------------------------------------------------
  // Derived lookup maps
  // IMPORTANT: usePaises() returns (Pais & { ciudades: Ciudad[] })[]
  // We must iterate nested ciudades to build ciudadMap
  // ---------------------------------------------------------------------------

  const paisMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of paises) {
      map[p.id] = p.nombre;
    }
    return map;
  }, [paises]);

  const ciudadMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of paises) {
      for (const c of p.ciudades) {
        map[c.id] = c.nombre;
      }
    }
    return map;
  }, [paises]);

  const tarifaResumenMap = useMemo(() => {
    const map: Record<
      string,
      { total: number; vigente: number | null; minimo: number | null }
    > = {};
    const hoy = formatStoredDate(new Date()) ?? "";

    for (const precio of serviceState.preciosAlojamiento) {
      const current = map[precio.alojamientoId] ?? {
        total: 0,
        vigente: null,
        minimo: null,
      };

      current.total += 1;
      current.minimo =
        current.minimo === null
          ? precio.precioPorNoche
          : Math.min(current.minimo, precio.precioPorNoche);

      if (
        precio.periodoDesde &&
        precio.periodoHasta &&
        precio.periodoDesde <= hoy &&
        hoy <= precio.periodoHasta
      ) {
        current.vigente =
          current.vigente === null
            ? precio.precioPorNoche
            : Math.min(current.vigente, precio.precioPorNoche);
      }

      map[precio.alojamientoId] = current;
    }

    return map;
  }, [serviceState.preciosAlojamiento]);

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredAlojamientos = useMemo(() => {
    if (!search.trim()) return alojamientos;
    const q = search.toLowerCase();
    return alojamientos.filter((a) => {
      const nombreMatch = a.nombre.toLowerCase().includes(q);
      const ciudadMatch = (ciudadMap[a.ciudadId] ?? "").toLowerCase().includes(q);
      const paisMatch = (paisMap[a.paisId] ?? "").toLowerCase().includes(q);
      return nombreMatch || ciudadMatch || paisMatch;
    });
  }, [alojamientos, search, ciudadMap, paisMap]);

  // search resets page inline through setSearch above; no extra effect needed.

  const hasSearch = Boolean(search.trim());
  const visibleTotalAlojamientos = hasSearch
    ? filteredAlojamientos.length
    : hydratingAlojamientos
      ? Math.max(totalAlojamientos, filteredAlojamientos.length)
      : filteredAlojamientos.length;
  const totalPages = Math.max(
    1,
    Math.ceil(visibleTotalAlojamientos / ITEMS_PER_PAGE),
  );
  const isPendingPage =
    !hasSearch &&
    hydratingAlojamientos &&
    currentPage > 1 &&
    filteredAlojamientos.length < currentPage * ITEMS_PER_PAGE;
  const showPendingSearch =
    hasSearch && hydratingAlojamientos && filteredAlojamientos.length === 0;

  // Sortable columns for the alojamientos table.
  const sortColumns = useMemo<ColumnDef<Alojamiento>[]>(
    () => [
      { id: "id", accessorKey: "id" },
      { id: "nombre", accessorKey: "nombre" },
      {
        id: "ciudad",
        accessorFn: (row) => ciudadMap[row.ciudadId] ?? "",
      },
      {
        id: "pais",
        accessorFn: (row) => paisMap[row.paisId] ?? "",
      },
      { id: "categoria", accessorFn: (row) => row.categoria },
      {
        id: "tarifa",
        accessorFn: (row) => {
          const r = tarifaResumenMap[row.id];
          if (!r) return -1;
          return r.vigente ?? r.minimo ?? -1;
        },
      },
    ],
    [ciudadMap, paisMap, tarifaResumenMap],
  );

  const sort = useTableSort(filteredAlojamientos, sortColumns);

  const paginatedAlojamientos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sort.rows.slice(start, start + ITEMS_PER_PAGE);
  }, [sort.rows, currentPage]);

  const hydrationMessage = hydratingAlojamientos
    ? hasSearch
      ? "La búsqueda todavía está completando el listado. Algunos hoteles pueden aparecer en unos segundos."
      : `Mostrando la primera página mientras se cargan ${Math.max(
          totalAlojamientos - loadedAlojamientos,
          0,
        )} alojamientos restantes en segundo plano.`
    : null;

  useEffect(() => {
    if (currentPage > totalPages) {
      setFilters({ page: Math.max(0, totalPages - 1) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleClone(alojamiento: Alojamiento) {
    createAlojamiento({
      brandId: activeBrandId,
      nombre: `Copia de ${alojamiento.nombre}`,
      ciudadId: alojamiento.ciudadId,
      paisId: alojamiento.paisId,
      categoria: alojamiento.categoria,
      sitioWeb: alojamiento.sitioWeb,
    });
    toast("success", "Alojamiento clonado", `Se creo una copia de "${alojamiento.nombre}"`);
  }

  function handleOpenDelete(alojamiento: Alojamiento) {
    setDeleteTarget(alojamiento);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const { id, nombre } = deleteTarget;
    deleteAlojamiento(id);
    setDeleteTarget(null);
    toast("success", "Alojamiento eliminado", `"${nombre}" fue eliminado correctamente`);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <>
      <DataTablePageHeader
        title="Alojamientos"
        subtitle="Gestion de hoteles y alojamientos"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/backend/alojamientos/nuevo")}
            >
              Nuevo Alojamiento
            </Button>
          ) : undefined
        }
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por hotel, ciudad o pais...",
        }}
        className="mb-4"
      >
        <DensityToggle />
      </DataTableToolbar>

      {hydrationMessage && (
        <div className="mb-4 rounded-[12px] border border-[#45D4C0]/20 bg-[#45D4C0]/7 px-3.5 py-2.5 text-[12.5px] text-[#1A6D63]">
          {hydrationMessage}
        </div>
      )}

      {showPendingSearch ? (
      <DataTableSkeleton columns={6} rows={8} />
      ) : filteredAlojamientos.length === 0 ? (
        <EmptyState
          icon={Hotel}
          title="No hay alojamientos registrados"
          description="Registra un hotel o alojamiento para poder asignarlo a paquetes."
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/backend/alojamientos/nuevo")}
              >
                Nuevo Alojamiento
              </Button>
            ) : undefined
          }
        />
      ) : isPendingPage ? (
        <DataTableSkeleton columns={6} rows={8} />
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead>
                  <SortableHead
                    direction={sort.direction("id")}
                    onSort={() => sort.toggle("id")}
                  >
                    ID
                  </SortableHead>
                </DataTableHead>
                <DataTableHead>
                  <SortableHead
                    direction={sort.direction("nombre")}
                    onSort={() => sort.toggle("nombre")}
                  >
                    Hotel
                  </SortableHead>
                </DataTableHead>
                <DataTableHead>
                  <SortableHead
                    direction={sort.direction("ciudad")}
                    onSort={() => sort.toggle("ciudad")}
                  >
                    Ciudad
                  </SortableHead>
                </DataTableHead>
                <DataTableHead>
                  <SortableHead
                    direction={sort.direction("pais")}
                    onSort={() => sort.toggle("pais")}
                  >
                    Pais
                  </SortableHead>
                </DataTableHead>
                <DataTableHead>
                  <SortableHead
                    direction={sort.direction("categoria")}
                    onSort={() => sort.toggle("categoria")}
                  >
                    Categoria
                  </SortableHead>
                </DataTableHead>
                <DataTableHead align="right">
                  <SortableHead
                    direction={sort.direction("tarifa")}
                    onSort={() => sort.toggle("tarifa")}
                    align="right"
                  >
                    Tarifas
                  </SortableHead>
                </DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedAlojamientos.map((alojamiento) => (
                <DataTableRow
                  key={alojamiento.id}
                  onClick={() => router.push(`/backend/alojamientos/${alojamiento.id}`)}
                  interactive
                >
                  <DataTableCell variant="id">{alojamiento.id.slice(-4)}</DataTableCell>
                  <DataTableCell variant="primary">
                    {alojamiento.nombre}
                    {(paqueteCountMap[alojamiento.id] ?? 0) > 0 && (
                      <span className="ml-2 font-mono text-[10.5px] text-neutral-400">
                        {paqueteCountMap[alojamiento.id]} paq.
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell variant="muted">{ciudadMap[alojamiento.ciudadId] ?? "--"}</DataTableCell>
                  <DataTableCell variant="muted">{paisMap[alojamiento.paisId] ?? "--"}</DataTableCell>
                  <DataTableCell>
                    <StarRating
                      categoria={alojamiento.categoria}
                      onChange={
                        canEdit
                          ? (next) =>
                              updateAlojamiento({
                                ...alojamiento,
                                categoria: next,
                              })
                          : undefined
                      }
                    />
                  </DataTableCell>
                  <DataTableCell align="right">
                    {(() => {
                      const resumen = tarifaResumenMap[alojamiento.id];
                      if (!resumen) {
                        return <span className="text-neutral-300">Sin tarifas</span>;
                      }

                      const amount =
                        resumen.vigente !== null ? resumen.vigente : resumen.minimo;

                      return (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12.5px] font-semibold text-neutral-900">
                              {amount !== null
                                ? resumen.vigente !== null
                                  ? formatCurrency(amount)
                                  : `Desde ${formatCurrency(amount)}`
                                : "—"}
                            </span>
                            <Badge
                              size="sm"
                              variant={resumen.vigente !== null ? "active" : "temporada"}
                            >
                              {resumen.total}{" "}
                              {resumen.total === 1 ? "periodo" : "periodos"}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            {resumen.vigente !== null
                              ? "Tarifa vigente"
                              : "Mejor tarifa disponible"}
                          </span>
                        </div>
                      );
                    })()}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => router.push(`/backend/alojamientos/${alojamiento.id}`),
                      }}
                      items={
                        canEdit
                          ? [
                              {
                                icon: Copy,
                                label: "Clonar",
                                onClick: () => handleClone(alojamiento),
                              },
                              {
                                icon: Trash2,
                                label: "Eliminar",
                                onClick: () => handleOpenDelete(alojamiento),
                                destructive: true,
                              },
                            ]
                          : []
                      }
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>

        </>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        size="sm"
      >
        <ModalHeader title="Eliminar Alojamiento">{null}</ModalHeader>
        <ModalBody>
          <p className="text-neutral-700">
            Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?
          </p>
          <p className="text-sm text-neutral-400 mt-2">
            Esta accion no se puede deshacer.
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
    </>
  );
}
