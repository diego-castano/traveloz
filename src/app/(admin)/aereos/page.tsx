"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Trash2, Plane } from "lucide-react";
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
import { matchesSearch } from "@/lib/search";

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

  // Data hooks
  const aereos = useAereos();
  const { createAereo, deleteAereo } = useServiceActions();
  const packageState = usePackageState();
  const loading = useServiceLoading();

  // Package usage count map
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

  // Component state
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Aereo | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredAereos = useMemo(() => {
    if (!search.trim()) return aereos;
    return aereos.filter((a) =>
      matchesSearch(search, a.ruta, a.destino, a.aerolinea),
    );
  }, [aereos, search]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredAereos.length / ITEMS_PER_PAGE);

  const paginatedAereos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAereos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAereos, currentPage]);

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
    toast("success", "Aereo clonado", `Se creo una copia de "${aereo.ruta}"`);
  }

  function handleOpenDelete(aereo: Aereo) {
    setDeleteTarget(aereo);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteAereo(deleteTarget.id);
      toast("success", "Aereo eliminado", `"${deleteTarget.ruta}" fue eliminado correctamente`);
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
        title="Aereos"
        subtitle="Gestion de vuelos y tarifas"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/aereos/nuevo")}
            >
              Nuevo Aereo
            </Button>
          ) : undefined
        }
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por ruta, destino o aerolinea...",
        }}
        className="mb-4"
      />

      {filteredAereos.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No hay vuelos registrados"
          description="Registra un vuelo para poder asignarlo a paquetes y cotizaciones."
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/aereos/nuevo")}
              >
                Nuevo Aereo
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
                <DataTableHead>Ruta</DataTableHead>
                <DataTableHead>Destino</DataTableHead>
                <DataTableHead>Aerolinea</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedAereos.map((aereo) => (
                <DataTableRow
                  key={aereo.id}
                  onClick={() => router.push(`/aereos/${aereo.id}`)}
                  interactive
                >
                  <DataTableCell variant="id">{aereo.id.slice(-4)}</DataTableCell>
                  <DataTableCell variant="primary">
                    {aereo.ruta}
                    {(paqueteCountMap[aereo.id] ?? 0) > 0 && (
                      <span className="ml-2 font-mono text-[10.5px] text-neutral-400">
                        {paqueteCountMap[aereo.id]} paq.
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell variant="muted">{aereo.destino}</DataTableCell>
                  <DataTableCell variant="muted">{aereo.aerolinea}</DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => router.push(`/aereos/${aereo.id}`),
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
        <ModalHeader title="Eliminar Aereo">{null}</ModalHeader>
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
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.ruta}&rdquo;?
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
