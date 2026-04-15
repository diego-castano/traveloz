"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Trash2, Map } from "lucide-react";
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
  useCircuitos,
  useServiceState,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { useProveedores } from "@/components/providers/CatalogProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useServiceLoading } from "@/components/providers/ServiceProvider";
import type { Circuito } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// CircuitosPage
// ---------------------------------------------------------------------------

export default function CircuitosPage() {
  const router = useRouter();
  const { canEdit } = useAuth();
  const { toast } = useToast();

  // Data hooks
  const circuitos = useCircuitos();
  const serviceState = useServiceState();
  const proveedores = useProveedores();
  const { createCircuito, deleteCircuito, createCircuitoDia, createPrecioCircuito } =
    useServiceActions();

  const packageState = usePackageState();
  const loading = useServiceLoading();

  // Component state
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Circuito | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // ---------------------------------------------------------------------------
  // Package usage count map
  // ---------------------------------------------------------------------------

  const paqueteCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    for (const pa of packageState.paqueteCircuitos) {
      const key = `${pa.circuitoId}::${pa.paqueteId}`;
      if (!seen.has(key)) {
        seen.add(key);
        map[pa.circuitoId] = (map[pa.circuitoId] ?? 0) + 1;
      }
    }
    return map;
  }, [packageState.paqueteCircuitos]);

  // ---------------------------------------------------------------------------
  // Proveedor name map
  // ---------------------------------------------------------------------------

  const proveedorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of proveedores) {
      m[p.id] = p.nombre;
    }
    return m;
  }, [proveedores]);

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredCircuitos = useMemo(() => {
    if (!search.trim()) return circuitos;
    const q = search.toLowerCase();
    return circuitos.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [circuitos, search]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredCircuitos.length / ITEMS_PER_PAGE);

  const paginatedCircuitos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCircuitos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCircuitos, currentPage]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleClone(c: Circuito) {
    // Deep clone: Circuito + all CircuitoDia + all PrecioCircuito
    try {
      const newC = await createCircuito({
        brandId: c.brandId,
        nombre: "Copia de " + c.nombre,
        noches: c.noches,
        proveedorId: c.proveedorId,
      });
      // Await all sub-entity creates so the user doesn't navigate away before
      // the deep clone finishes — otherwise orphans.
      const dias = serviceState.circuitoDias.filter((d) => d.circuitoId === c.id);
      const precios = serviceState.preciosCircuito.filter((p) => p.circuitoId === c.id);
      await Promise.all([
        ...dias.map((d) =>
          createCircuitoDia({
            circuitoId: newC.id,
            numeroDia: d.numeroDia,
            titulo: d.titulo,
            descripcion: d.descripcion,
            orden: d.orden,
          }),
        ),
        ...precios.map((p) =>
          createPrecioCircuito({
            circuitoId: newC.id,
            periodoDesde: p.periodoDesde,
            periodoHasta: p.periodoHasta,
            precio: p.precio,
          }),
        ),
      ]);
      toast("success", "Circuito clonado", "Se copio el circuito con todos sus dias y precios");
    } catch (err: any) {
      toast("error", "Error al clonar", err?.message ?? "No se pudo clonar el circuito");
    }
  }

  function handleOpenDelete(c: Circuito) {
    setDeleteTarget(c);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteCircuito(deleteTarget.id);
      toast(
        "success",
        "Circuito eliminado",
        `"${deleteTarget.nombre}" fue eliminado correctamente`,
      );
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
        title="Circuitos"
        subtitle="Gestion de circuitos y itinerarios"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/circuitos/nuevo")}
            >
              Nuevo Circuito
            </Button>
          ) : undefined
        }
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por nombre...",
        }}
        className="mb-4"
      />

      {filteredCircuitos.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No hay circuitos registrados"
          description="Crea un circuito con su itinerario y precios para poder asignarlo a paquetes."
          action={
            canEdit ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => router.push("/circuitos/nuevo")}
              >
                Nuevo Circuito
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                <DataTableHead>Nombre</DataTableHead>
                <DataTableHead align="right">Noches</DataTableHead>
                <DataTableHead>Proveedor</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedCircuitos.map((circuito) => (
                <DataTableRow
                  key={circuito.id}
                  onClick={() => router.push(`/circuitos/${circuito.id}`)}
                  interactive
                >
                  <DataTableCell variant="primary">
                    {circuito.nombre}
                    {(paqueteCountMap[circuito.id] ?? 0) > 0 && (
                      <span className="ml-2 font-mono text-[10.5px] text-neutral-400">
                        {paqueteCountMap[circuito.id]} paq.
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell variant="mono" align="right">
                    {circuito.noches}
                  </DataTableCell>
                  <DataTableCell variant="muted">
                    {proveedorMap[circuito.proveedorId] ?? "--"}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => router.push(`/circuitos/${circuito.id}`),
                      }}
                      items={
                        canEdit
                          ? [
                              {
                                icon: Copy,
                                label: "Clonar",
                                onClick: () => handleClone(circuito),
                              },
                              {
                                icon: Trash2,
                                label: "Eliminar",
                                onClick: () => handleOpenDelete(circuito),
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
        <ModalHeader title="Eliminar Circuito">{null}</ModalHeader>
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
