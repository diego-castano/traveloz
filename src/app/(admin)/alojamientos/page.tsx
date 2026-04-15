"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Trash2, Hotel } from "lucide-react";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
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
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import {
  useAlojamientos,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { usePaises, useProveedores } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useServiceLoading } from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import type { Alojamiento } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// StarRating inline component
// ---------------------------------------------------------------------------

function StarRating({ categoria }: { categoria: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < categoria
              ? "h-3 w-3 fill-amber-400 text-amber-400"
              : "h-3 w-3 text-neutral-600"
          }
        />
      ))}
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
  const { createAlojamiento, deleteAlojamiento } = useServiceActions();
  const paises = usePaises();
  const proveedores = useProveedores();
  const packageState = usePackageState();
  const loading = useServiceLoading();

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

  // Component state
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Alojamiento | null>(null);
  const [isShaking, setIsShaking] = useState(false);

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

  const proveedorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of proveedores) {
      map[p.id] = p.nombre;
    }
    return map;
  }, [proveedores]);

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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredAlojamientos.length / ITEMS_PER_PAGE);

  const paginatedAlojamientos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAlojamientos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlojamientos, currentPage]);

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
    setIsShaking(true);
    setTimeout(() => {
      deleteAlojamiento(deleteTarget.id);
      toast("success", "Alojamiento eliminado", `"${deleteTarget.nombre}" fue eliminado correctamente`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
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
              onClick={() => router.push("/alojamientos/nuevo")}
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
      />

      {filteredAlojamientos.length === 0 ? (
        <EmptyState
          icon={Hotel}
          title="No hay alojamientos registrados"
          description="Registra un hotel o alojamiento para poder asignarlo a paquetes."
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/alojamientos/nuevo")}
              >
                Nuevo Alojamiento
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead>ID</DataTableHead>
                <DataTableHead>Hotel</DataTableHead>
                <DataTableHead>Ciudad</DataTableHead>
                <DataTableHead>Pais</DataTableHead>
                <DataTableHead>Categoria</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedAlojamientos.map((alojamiento) => (
                <DataTableRow
                  key={alojamiento.id}
                  onClick={() => router.push(`/alojamientos/${alojamiento.id}`)}
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
                    <StarRating categoria={alojamiento.categoria} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => router.push(`/alojamientos/${alojamiento.id}`),
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

          <div className="mt-5 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
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
        <ModalHeader title="Eliminar Alojamiento">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={
              isShaking
                ? { x: [...interactions.deleteShake.animate.x] }
                : {}
            }
            transition={isShaking ? interactions.deleteShake.transition : undefined}
          >
            <p className="text-neutral-700">
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.nombre}&rdquo;?
            </p>
            <p className="text-sm text-neutral-400 mt-2">
              Esta accion no se puede deshacer.
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
