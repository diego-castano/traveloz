"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Copy, Trash2, Map } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter } from "@/components/ui/SearchFilter";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import {
  useCircuitos,
  useServiceState,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { useProveedores } from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
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
  const { activeBrandId } = useBrand();

  // Data hooks
  const circuitos = useCircuitos();
  const serviceState = useServiceState();
  const proveedores = useProveedores();
  const { createCircuito, deleteCircuito, createCircuitoDia, createPrecioCircuito } =
    useServiceActions();

  const packageState = usePackageState();

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

  function handleClone(e: React.MouseEvent, c: Circuito) {
    e.stopPropagation();
    // Deep clone: Circuito + all CircuitoDia + all PrecioCircuito
    const newC = createCircuito({
      brandId: c.brandId,
      nombre: "Copia de " + c.nombre,
      noches: c.noches,
      proveedorId: c.proveedorId,
    });
    // Clone all CircuitoDia records referencing the original
    const dias = serviceState.circuitoDias.filter((d) => d.circuitoId === c.id);
    dias.forEach((d) =>
      createCircuitoDia({
        circuitoId: newC.id,
        numeroDia: d.numeroDia,
        titulo: d.titulo,
        descripcion: d.descripcion,
        orden: d.orden,
      }),
    );
    // Clone all PrecioCircuito records referencing the original
    const precios = serviceState.preciosCircuito.filter((p) => p.circuitoId === c.id);
    precios.forEach((p) =>
      createPrecioCircuito({
        circuitoId: newC.id,
        periodoDesde: p.periodoDesde,
        periodoHasta: p.periodoHasta,
        precio: p.precio,
      }),
    );
    toast("success", "Circuito clonado", "Se copio el circuito con todos sus dias y precios");
  }

  function handleOpenDelete(e: React.MouseEvent, c: Circuito) {
    e.stopPropagation();
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

  return (
    <>
      <PageHeader
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

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        onFilterToggle={() => undefined}
        placeholder="Buscar por nombre..."
        className="mb-6"
      />

      {filteredCircuitos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Map className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay circuitos registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Noches</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCircuitos.map((circuito) => (
                <TableRow
                  key={circuito.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/circuitos/${circuito.id}`)}
                >
                  <TableCell className="font-medium text-neutral-800">
                    {circuito.nombre}
                    {(paqueteCountMap[circuito.id] ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-brand-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-teal-400">
                        {paqueteCountMap[circuito.id]} paq.
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{circuito.noches}</TableCell>
                  <TableCell>
                    {proveedorMap[circuito.proveedorId] ?? "--"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/circuitos/${circuito.id}`);
                        }}
                        aria-label="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleClone(e, circuito)}
                            aria-label="Clonar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, circuito)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-center">
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
