"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  Map,
  Eye,
  ChevronDown,
} from "lucide-react";
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
  const [expandedCircuitoId, setExpandedCircuitoId] = useState<string | null>(null);

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

  const circuitoDiasMap = useMemo(() => {
    const map: Record<string, typeof serviceState.circuitoDias> = {};
    for (const dia of serviceState.circuitoDias) {
      if (!map[dia.circuitoId]) {
        map[dia.circuitoId] = [];
      }
      map[dia.circuitoId].push(dia);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.orden - b.orden);
    }
    return map;
  }, [serviceState.circuitoDias]);

  useEffect(() => {
    setExpandedCircuitoId(null);
  }, [search, currentPage]);

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
                <DataTableHead align="center">Noches</DataTableHead>
                <DataTableHead align="center">Proveedor</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedCircuitos.flatMap((circuito) => {
                const expanded = expandedCircuitoId === circuito.id;
                const dias = circuito.itinerario ?? circuitoDiasMap[circuito.id] ?? [];

                return [
                  <DataTableRow
                    key={circuito.id}
                    onClick={() => router.push(`/circuitos/${circuito.id}`)}
                    interactive
                    selected={expanded}
                  >
                    <DataTableCell variant="primary">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCircuitoId(expanded ? null : circuito.id);
                          }}
                          aria-label={expanded ? "Ocultar itinerario" : "Mostrar itinerario"}
                          title={expanded ? "Ocultar itinerario" : "Mostrar itinerario"}
                          className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-hairline bg-white text-neutral-500 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>

                        <div className="min-w-0">
                          <div className="truncate">
                            {circuito.nombre}
                            {(paqueteCountMap[circuito.id] ?? 0) > 0 && (
                              <span className="ml-2 font-mono text-[10.5px] text-neutral-400">
                                {paqueteCountMap[circuito.id]} paq.
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] font-normal text-neutral-400">
                            Toca para ver el itinerario debajo
                          </div>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell variant="mono" align="center">
                      {circuito.noches}
                    </DataTableCell>
                    <DataTableCell variant="muted" align="center">
                      {proveedorMap[circuito.proveedorId] ?? "--"}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <RowActions
                        primary={{
                          icon: Eye,
                          label: "Ver",
                          onClick: () => router.push(`/circuitos/${circuito.id}`),
                        }}
                        items={
                          canEdit
                            ? [
                                {
                                  icon: Pencil,
                                  label: "Editar",
                                  onClick: () => router.push(`/circuitos/${circuito.id}`),
                                },
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
                  </DataTableRow>,
                  expanded ? (
                    <tr
                      key={`${circuito.id}-itinerario`}
                      className="border-b border-hairline bg-neutral-50/60"
                    >
                      <td colSpan={4} className="px-4 py-4">
                        <div className="rounded-[14px] border border-hairline bg-white px-4 py-3 shadow-[0_1px_2px_rgba(17,17,36,0.03)]">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                                Itinerario
                              </p>
                              <p className="text-[12.5px] text-neutral-500">
                                {dias.length > 0
                                  ? `${dias.length} día${dias.length === 1 ? "" : "s"} cargado${dias.length === 1 ? "" : "s"}`
                                  : "Aún no hay días cargados"}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/circuitos/${circuito.id}`)}
                            >
                              Abrir detalle
                            </Button>
                          </div>

                          {dias.length === 0 ? (
                            <p className="text-[13px] text-neutral-400">
                              Este circuito todavía no tiene itinerario cargado.
                            </p>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                              {dias.map((dia) => (
                                <div
                                  key={dia.id}
                                  className="flex gap-3 rounded-[12px] border border-neutral-100 bg-neutral-50 px-3 py-2.5"
                                >
                                  <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-teal-100 text-[11px] font-bold text-brand-teal-700">
                                    {dia.numeroDia}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-neutral-800">
                                      {dia.titulo}
                                    </p>
                                    {dia.descripcion && (
                                      <p className="mt-1 max-h-10 overflow-hidden text-[12px] leading-5 text-neutral-500">
                                        {dia.descripcion}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
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
