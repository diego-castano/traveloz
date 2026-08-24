"use client";

import { Fragment, useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Trash2, Plane } from "lucide-react";
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
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalClose } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import {
  useAereos,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useServiceLoading } from "@/components/providers/ServiceProvider";
import type { Aereo } from "@/lib/types";
import { matchesId, matchesSearch } from "@/lib/search";
import { sortByRecency } from "@/lib/recency";
import { RecentBadge } from "@/components/ui/data/RecentBadge";
import { useAereosQueryState } from "./searchParams";
import {
  PaquetesToggle,
  PaquetesRow,
  type PaqueteDelServicio,
} from "@/components/ui/data/PaquetesDelServicio";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// AereosPage
// ---------------------------------------------------------------------------

export default function AereosPage() {
  const router = useRouter();
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();

  // URL-state filters
  const [filters, setFilters] = useAereosQueryState();
  const search = filters.q;
  const currentPage = filters.page + 1;
  const setSearch = (v: string) => setFilters({ q: v, page: 0 });
  const setCurrentPage = (next: number) => setFilters({ page: next - 1 });

  // Data hooks
  const aereos = useAereos();
  const { createAereo, deleteAereo } = useServiceActions();
  const packageState = usePackageState();
  const loading = useServiceLoading();

  // Paquetes que usan cada aéreo. Antes acá sólo se contaba; ahora guardamos
  // la lista para poder desplegarla (el cliente pidió saber CUÁLES son, no
  // cuántos). El título sale de packageState.paquetes, que el provider hidrata
  // por tandas: un id que todavía no llegó se omite y el panel avisa que está
  // cargando.
  const paquetesPorAereo = useMemo(() => {
    const porId = new Map(packageState.paquetes.map((p) => [p.id, p]));
    const map: Record<string, PaqueteDelServicio[]> = {};
    const seen = new Set<string>();
    for (const pa of packageState.paqueteAereos) {
      const key = `${pa.aereoId}::${pa.paqueteId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const paquete = porId.get(pa.paqueteId);
      if (!paquete) continue;
      (map[pa.aereoId] ??= []).push({
        id: paquete.id,
        titulo: paquete.titulo,
        destino: paquete.destino,
        estado: paquete.estado,
      });
    }
    for (const lista of Object.values(map)) {
      lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    }
    return map;
  }, [packageState.paqueteAereos, packageState.paquetes]);

  // El contador sigue saliendo del join, no de la lista resuelta: así el chip
  // muestra el número real aunque los títulos todavía estén hidratando.
  const paqueteCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    for (const pa of packageState.paqueteAereos) {
      const key = `${pa.aereoId}::${pa.paqueteId}`;
      if (!seen.has(key)) {
        seen.add(key);
        map[pa.aereoId] = (map[pa.aereoId] ?? 0) + 1;
      }
    }
    return map;
  }, [packageState.paqueteAereos]);

  // Qué aéreo tiene el desplegable abierto (uno por vez: la tabla es densa y
  // dos paneles abiertos la vuelven ilegible).
  const [aereoExpandido, setAereoExpandido] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Aereo | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
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
        router.push("/backend/aereos/nuevo");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canEdit, router]);

  // ---------------------------------------------------------------------------
  // Filtered + sorted + paginated data
  // ---------------------------------------------------------------------------

  // Default order: newest first by createdAt (the user can still click a
  // header to override this via useTableSort).
  const filteredAereos = useMemo(() => {
    // El ID va por prefijo (matchesId) y los campos de texto por substring:
    // escribir "177" trae el aéreo 177, "17" abre el rango 17x, y "Madrid"
    // sigue filtrando por destino como siempre.
    const base = search.trim()
      ? aereos.filter(
          (a) =>
            matchesId(search, a.id) ||
            matchesSearch(search, a.ruta, a.destino, a.aerolinea),
        )
      : aereos;
    return sortByRecency(base);
  }, [aereos, search]);

  const sortColumns = useMemo<ColumnDef<Aereo>[]>(
    () => [
      { id: "id", accessorKey: "id" },
      { id: "ruta", accessorKey: "ruta" },
      { id: "destino", accessorKey: "destino" },
      { id: "aerolinea", accessorFn: (r) => r.aerolinea ?? "" },
    ],
    [],
  );

  const sort = useTableSort(filteredAereos, sortColumns);
  const totalPages = Math.max(1, Math.ceil(sort.rows.length / ITEMS_PER_PAGE));

  const paginatedAereos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sort.rows.slice(start, start + ITEMS_PER_PAGE);
  }, [sort.rows, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setFilters({ page: Math.max(0, totalPages - 1) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleClone(aereo: Aereo) {
    createAereo({
      brandId: activeBrandId,
      ruta: `Copia de ${aereo.ruta}`,
      destino: aereo.destino,
      aerolinea: aereo.aerolinea,
      equipaje: aereo.equipaje,
      itinerario: aereo.itinerario,
      escalas: aereo.escalas,
      codigoVueloIda: aereo.codigoVueloIda,
      codigoVueloVuelta: aereo.codigoVueloVuelta,
      duracionIda: aereo.duracionIda,
      duracionVuelta: aereo.duracionVuelta,
    });
    toast("success", "Aéreo clonado", `Se creó una copia de "${aereo.ruta}"`);
  }

  function handleOpenDelete(aereo: Aereo) {
    setDeleteTarget(aereo);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const { id, ruta } = deleteTarget;
    deleteAereo(id);
    setDeleteTarget(null);
    toast("success", "Aéreo eliminado", `"${ruta}" fue eliminado correctamente`);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <>
      <DataTablePageHeader
        title="Aéreos"
        subtitle="Gestión de vuelos y tarifas"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/backend/aereos/nuevo")}
            >
              Nuevo Aéreo
            </Button>
          ) : undefined
        }
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por ID, ruta, destino o aerolínea...",
        }}
        className="mb-4"
      >
        <DensityToggle />
      </DataTableToolbar>

      {filteredAereos.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No hay vuelos registrados"
          description="Registra un vuelo para poder asignarlo a paquetes y cotizaciones."
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/backend/aereos/nuevo")}
              >
                Nuevo Aéreo
              </Button>
            ) : undefined
          }
        />
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
                    direction={sort.direction("ruta")}
                    onSort={() => sort.toggle("ruta")}
                  >
                    Ruta
                  </SortableHead>
                </DataTableHead>
                <DataTableHead>
                  <SortableHead
                    direction={sort.direction("destino")}
                    onSort={() => sort.toggle("destino")}
                  >
                    Destino
                  </SortableHead>
                </DataTableHead>
                <DataTableHead>
                  <SortableHead
                    direction={sort.direction("aerolinea")}
                    onSort={() => sort.toggle("aerolinea")}
                  >
                    Aerolinea
                  </SortableHead>
                </DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedAereos.map((aereo) => (
                <Fragment key={aereo.id}>
                <DataTableRow
                  onClick={() => router.push(`/backend/aereos/${aereo.id}`)}
                  interactive
                >
                  <DataTableCell variant="id">{aereo.id.slice(-4)}</DataTableCell>
                  <DataTableCell variant="primary">
                    <span className="inline-flex items-center gap-2">
                      {aereo.ruta}
                      <RecentBadge createdAt={aereo.createdAt} />
                    </span>
                    <PaquetesToggle
                      count={paqueteCountMap[aereo.id] ?? 0}
                      open={aereoExpandido === aereo.id}
                      onToggle={() =>
                        setAereoExpandido((prev) =>
                          prev === aereo.id ? null : aereo.id,
                        )
                      }
                    />
                  </DataTableCell>
                  <DataTableCell variant="muted">{aereo.destino}</DataTableCell>
                  <DataTableCell variant="muted">{aereo.aerolinea}</DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => router.push(`/backend/aereos/${aereo.id}`),
                      }}
                      items={
                        canEdit
                          ? [
                              {
                                icon: Copy,
                                label: "Clonar",
                                onClick: () => handleClone(aereo),
                              },
                              {
                                icon: Trash2,
                                label: "Eliminar",
                                onClick: () => handleOpenDelete(aereo),
                                destructive: true,
                              },
                            ]
                          : []
                      }
                    />
                  </DataTableCell>
                </DataTableRow>
                {/* Desplegable: qué paquetes usan este aéreo. Va como fila
                    aparte con colSpan para no romper la grilla de columnas. */}
                <PaquetesRow
                  open={aereoExpandido === aereo.id}
                  colSpan={5}
                  paquetes={paquetesPorAereo[aereo.id] ?? []}
                  cargando={packageState.hydratingPaquetes}
                />
                </Fragment>
              ))}
            </DataTableBody>
          </DataTable>

          {totalPages > 1 && (
            <div className="mt-5 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        size="sm"
      >
        <ModalHeader title="Eliminar Aéreo">{null}</ModalHeader>
        <ModalBody>
          <p className="text-neutral-700">
            Esta seguro que desea eliminar &ldquo;{deleteTarget?.ruta}&rdquo;?
          </p>
          <p className="text-sm text-neutral-400 mt-2">
            Esta accion no se puede deshacer.
          </p>
        </ModalBody>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </ModalClose>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
