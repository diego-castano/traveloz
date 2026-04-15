"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Copy, Trash2, Package } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter, type FilterChip } from "@/components/ui/SearchFilter";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import {
  usePaquetes,
  usePackageActions,
  usePackageState,
  useAllOpcionesHoteleras,
} from "@/components/providers/PackageProvider";
import {
  useTemporadas,
  useTiposPaquete,
} from "@/components/providers/CatalogProvider";
import { useAereos, useServiceState } from "@/components/providers/ServiceProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { usePackageLoading } from "@/components/providers/PackageProvider";
import { formatCurrency, computePaquetePrecios } from "@/lib/utils";
import type { Paquete } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const estadoBadge = {
  ACTIVO: { variant: "active" as const, label: "Activo" },
  BORRADOR: { variant: "draft" as const, label: "Borrador" },
  INACTIVO: { variant: "inactive" as const, label: "Inactivo" },
};

const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// PaquetesPage
// ---------------------------------------------------------------------------

export default function PaquetesPage() {
  const router = useRouter();
  const { canEdit, canSeePricing } = useAuth();
  const { toast } = useToast();

  // Data hooks
  const paquetes = usePaquetes();
  const { clonePaquete, deletePaquete } = usePackageActions();
  const packageState = usePackageState();
  const serviceState = useServiceState();
  const temporadas = useTemporadas();
  const tiposPaquete = useTiposPaquete();
  const aereos = useAereos();
  const allOpciones = useAllOpcionesHoteleras();
  const loading = usePackageLoading();

  // Per-paquete price derivation: recomputes using current service prices with
  // period matching so listing prices stay in sync when a service price changes
  // (Fase 2 — no more stale OpcionHotelera.precioVenta reads).
  const preciosMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computePaquetePrecios>> = {};
    for (const paq of paquetes) {
      map[paq.id] = computePaquetePrecios(paq, allOpciones, packageState, serviceState);
    }
    return map;
  }, [paquetes, allOpciones, packageState, serviceState]);

  // Component state
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Paquete | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived lookup maps
  // ---------------------------------------------------------------------------

  const temporadaMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of temporadas) {
      map[t.id] = t.nombre;
    }
    return map;
  }, [temporadas]);

  const aereoMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of aereos) {
      map[a.id] = a.destino;
    }
    return map;
  }, [aereos]);

  // Pre-compute destino for each paquete by looking up the first assigned aereo
  const destinoMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const paq of paquetes) {
      const firstAereoAssignment = packageState.paqueteAereos.find(
        (pa) => pa.paqueteId === paq.id,
      );
      if (firstAereoAssignment) {
        const destino = aereoMap[firstAereoAssignment.aereoId];
        if (destino) {
          map[paq.id] = destino;
        }
      }
    }
    return map;
  }, [paquetes, packageState.paqueteAereos, aereoMap]);

  // ---------------------------------------------------------------------------
  // Filter chips
  // ---------------------------------------------------------------------------

  const filters: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];

    // Temporada chips
    for (const t of temporadas) {
      chips.push({
        label: t.nombre,
        value: `temporada:${t.id}`,
        active: activeFilters.includes(`temporada:${t.id}`),
      });
    }

    // Estado chips
    const estados: Array<{ label: string; value: string }> = [
      { label: "Activo", value: "estado:ACTIVO" },
      { label: "Borrador", value: "estado:BORRADOR" },
      { label: "Inactivo", value: "estado:INACTIVO" },
    ];
    for (const e of estados) {
      chips.push({
        label: e.label,
        value: e.value,
        active: activeFilters.includes(e.value),
      });
    }

    // Tipo chips
    for (const t of tiposPaquete) {
      chips.push({
        label: t.nombre,
        value: `tipo:${t.id}`,
        active: activeFilters.includes(`tipo:${t.id}`),
      });
    }

    return chips;
  }, [temporadas, tiposPaquete, activeFilters]);

  // ---------------------------------------------------------------------------
  // Filtered and paginated data
  // ---------------------------------------------------------------------------

  const filteredPaquetes = useMemo(() => {
    let result = paquetes;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q),
      );
    }

    // Temporada filters (OR within category)
    const temporadaFilters = activeFilters
      .filter((f) => f.startsWith("temporada:"))
      .map((f) => f.replace("temporada:", ""));
    if (temporadaFilters.length > 0) {
      result = result.filter((p) => temporadaFilters.includes(p.temporadaId));
    }

    // Estado filters (OR within category)
    const estadoFilters = activeFilters
      .filter((f) => f.startsWith("estado:"))
      .map((f) => f.replace("estado:", ""));
    if (estadoFilters.length > 0) {
      result = result.filter((p) => estadoFilters.includes(p.estado));
    }

    // Tipo filters (OR within category)
    const tipoFilters = activeFilters
      .filter((f) => f.startsWith("tipo:"))
      .map((f) => f.replace("tipo:", ""));
    if (tipoFilters.length > 0) {
      result = result.filter((p) => tipoFilters.includes(p.tipoPaqueteId));
    }

    return result;
  }, [paquetes, search, activeFilters]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilters]);

  const totalPages = Math.ceil(filteredPaquetes.length / ITEMS_PER_PAGE);

  const paginatedPaquetes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPaquetes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPaquetes, currentPage]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleFilterToggle(value: string) {
    setActiveFilters((prev) =>
      prev.includes(value)
        ? prev.filter((f) => f !== value)
        : [...prev, value],
    );
  }

  function handleClone(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    clonePaquete(id);
    toast("success", "Paquete clonado", "Se creo una copia en estado Borrador");
  }

  function handleOpenDelete(e: React.MouseEvent, paquete: Paquete) {
    e.stopPropagation();
    setDeleteTarget(paquete);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deletePaquete(deleteTarget.id);
      toast("success", "Paquete eliminado", `"${deleteTarget.titulo}" fue eliminado correctamente`);
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
      <PageHeader
        title="Paquetes"
        subtitle="Gestion de paquetes de viaje"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/paquetes/nuevo")}
            >
              Nuevo Paquete
            </Button>
          ) : undefined
        }
      />

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onFilterToggle={handleFilterToggle}
        placeholder="Buscar paquetes..."
        className="mb-6"
      />

      {filteredPaquetes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Package className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No se encontraron paquetes</p>
        </div>
      ) : (
        <>
          <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Temporada</TableHead>
                <TableHead>Noches</TableHead>
                <TableHead>Estado</TableHead>
                {canSeePricing.neto && <TableHead variant="price">Neto</TableHead>}
                {canSeePricing.markup && <TableHead variant="markup">Markup</TableHead>}
                <TableHead variant="price">Precio Venta</TableHead>
                {canEdit && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPaquetes.map((paquete) => (
                <TableRow
                  key={paquete.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/paquetes/${paquete.id}`)}
                >
                  <TableCell variant="id">{paquete.id.slice(-4)}</TableCell>
                  <TableCell className="font-medium text-neutral-800">
                    {paquete.titulo}
                  </TableCell>
                  <TableCell>{paquete.destino || destinoMap[paquete.id] || "--"}</TableCell>
                  <TableCell>{temporadaMap[paquete.temporadaId] ?? "--"}</TableCell>
                  <TableCell>{paquete.noches}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadge[paquete.estado].variant}>
                      {estadoBadge[paquete.estado].label}
                    </Badge>
                  </TableCell>
                  {canSeePricing.neto && (
                    <TableCell variant="price">
                      {formatCurrency(preciosMap[paquete.id]?.netoFijos ?? paquete.netoCalculado)}
                    </TableCell>
                  )}
                  {canSeePricing.markup && (
                    <TableCell variant="markup">
                      {(() => {
                        const pricing = preciosMap[paquete.id];
                        if (pricing && pricing.opcionFactors.length > 1) {
                          const minF = Math.min(...pricing.opcionFactors);
                          const maxF = Math.max(...pricing.opcionFactors);
                          return `${minF} — ${maxF}`;
                        }
                        return pricing?.opcionFactors[0] ?? paquete.markup;
                      })()}
                    </TableCell>
                  )}
                  <TableCell variant="price" className="font-semibold">
                    {(() => {
                      const pricing = preciosMap[paquete.id];
                      if (!pricing || pricing.min === null) return formatCurrency(paquete.precioVenta);
                      if (pricing.min !== pricing.max) {
                        return `${formatCurrency(pricing.min)} — ${formatCurrency(pricing.max!)}`;
                      }
                      return formatCurrency(pricing.min);
                    })()}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/paquetes/${paquete.id}`);
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
                            router.push(`/paquetes/${paquete.id}?tab=datos`);
                          }}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={(e) => handleClone(e, paquete.id)}
                          aria-label="Clonar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={(e) => handleOpenDelete(e, paquete)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Right fade scroll indicator (mobile) */}
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-white/80 to-transparent md:hidden" />
          </div>

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
        <ModalHeader title="Eliminar Paquete">{null}</ModalHeader>
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
              Esta seguro que desea eliminar &ldquo;{deleteTarget?.titulo}&rdquo;?
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
