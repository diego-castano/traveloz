"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Copy, Trash2, Hotel } from "lucide-react";
import { Star } from "lucide-react";
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
  useAlojamientos,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import { usePaises, useProveedores } from "@/components/providers/CatalogProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useToast } from "@/components/ui/Toast";
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

  function handleClone(e: React.MouseEvent, alojamiento: Alojamiento) {
    e.stopPropagation();
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

  function handleOpenDelete(e: React.MouseEvent, alojamiento: Alojamiento) {
    e.stopPropagation();
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

  return (
    <>
      <PageHeader
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

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        onFilterToggle={() => {}}
        placeholder="Buscar por hotel, ciudad o pais..."
        className="mb-6"
      />

      {filteredAlojamientos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Hotel className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay alojamientos registrados</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Pais</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAlojamientos.map((alojamiento) => (
                <TableRow
                  key={alojamiento.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/alojamientos/${alojamiento.id}`)}
                >
                  <TableCell variant="id">{alojamiento.id.slice(-4)}</TableCell>
                  <TableCell className="font-medium text-neutral-800">
                    {alojamiento.nombre}
                    {(paqueteCountMap[alojamiento.id] ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-brand-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-teal-400">
                        {paqueteCountMap[alojamiento.id]} paq.
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{ciudadMap[alojamiento.ciudadId] ?? "--"}</TableCell>
                  <TableCell>{paisMap[alojamiento.paisId] ?? "--"}</TableCell>
                  <TableCell>
                    <StarRating categoria={alojamiento.categoria} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="icon"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/alojamientos/${alojamiento.id}`);
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
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/alojamientos/${alojamiento.id}`);
                            }}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleClone(e, alojamiento)}
                            aria-label="Clonar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={(e) => handleOpenDelete(e, alojamiento)}
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
