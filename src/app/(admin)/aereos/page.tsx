"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Copy, Trash2, Plane } from "lucide-react";
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
  useAereos,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import type { Aereo } from "@/lib/types";

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
    const q = search.toLowerCase();
    return aereos.filter(
      (a) =>
        a.ruta.toLowerCase().includes(q) ||
        a.destino.toLowerCase().includes(q) ||
        a.aerolinea.toLowerCase().includes(q),
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

  function handleClone(e: React.MouseEvent, aereo: Aereo) {
    e.stopPropagation();
    createAereo({
      brandId: activeBrandId,
      ruta: `Copia de ${aereo.ruta}`,
      destino: aereo.destino,
      aerolinea: aereo.aerolinea,
      equipaje: aereo.equipaje,
      itinerario: aereo.itinerario,
    });
    toast("success", "Aereo clonado", `Se creo una copia de "${aereo.ruta}"`);
  }

  function handleOpenDelete(e: React.MouseEvent, aereo: Aereo) {
    e.stopPropagation();
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

  return (
    <>
      <PageHeader
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

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        onFilterToggle={() => undefined}
        placeholder="Buscar por ruta, destino o aerolinea..."
        className="mb-6"
      />

      {filteredAereos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Plane className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay vuelos registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Aerolinea</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAereos.map((aereo) => (
                <TableRow
                  key={aereo.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/aereos/${aereo.id}`)}
                >
                  <TableCell variant="id">{aereo.id.slice(-4)}</TableCell>
                  <TableCell className="font-medium text-neutral-800">
                    {aereo.ruta}
                    {(paqueteCountMap[aereo.id] ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-brand-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-teal-400">
                        {paqueteCountMap[aereo.id]} paq.
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{aereo.destino}</TableCell>
                  <TableCell>{aereo.aerolinea}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/aereos/${aereo.id}`);
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
                          router.push(`/aereos/${aereo.id}`);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleClone(e, aereo)}
                            aria-label="Clonar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, aereo)}
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
