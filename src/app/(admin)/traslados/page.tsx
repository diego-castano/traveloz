"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Bus } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import {
  DataTableToolbar,
  DataTablePageHeader,
} from "@/components/ui/data/DataTableToolbar";
import { EmptyState } from "@/components/ui/data/EmptyState";
import { StatusDot } from "@/components/ui/data/StatusDot";
import {
  InlineEditTable,
  type InlineEditColumn,
} from "@/components/ui/form/InlineEditTable";
import { Pagination } from "@/components/ui/Pagination";
import {
  useTraslados,
  useServiceActions,
} from "@/components/providers/ServiceProvider";
import {
  useProveedores,
  usePaises,
} from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { useServiceLoading } from "@/components/providers/ServiceProvider";
import { formatCurrency } from "@/lib/utils";
import type { Traslado, TipoTraslado } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const TIPO_FILTERS = [
  { key: "REGULAR", label: "Regular" },
  { key: "PRIVADO", label: "Privado" },
];

// ---------------------------------------------------------------------------
// TrasladosPage
// ---------------------------------------------------------------------------

export default function TrasladosPage() {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const { activeBrandId } = useBrand();

  // Data hooks
  const traslados = useTraslados();
  const packageState = usePackageState();
  const allProveedores = useProveedores();
  const proveedoresTraslados = useMemo(
    () => allProveedores.filter((p) => p.servicio === "TRASLADOS" && !p.deletedAt),
    [allProveedores],
  );
  const paises = usePaises();
  const { createTraslado, updateTraslado, deleteTraslado } = useServiceActions();
  const loading = useServiceLoading();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [deleteTarget, setDeleteTarget] = useState<Traslado | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Display maps (useMemo)
  // ---------------------------------------------------------------------------

  const paqueteCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    for (const pa of packageState.paqueteTraslados) {
      const key = `${pa.trasladoId}::${pa.paqueteId}`;
      if (!seen.has(key)) {
        seen.add(key);
        map[pa.trasladoId] = (map[pa.trasladoId] ?? 0) + 1;
      }
    }
    return map;
  }, [packageState.paqueteTraslados]);

  const proveedorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of allProveedores) {
      m[p.id] = p.nombre;
    }
    return m;
  }, [allProveedores]);

  const ciudadMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const pais of paises) {
      for (const c of pais.ciudades) {
        m[c.id] = c.nombre;
      }
    }
    return m;
  }, [paises]);

  const paisMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of paises) {
      m[p.id] = p.nombre;
    }
    return m;
  }, [paises]);

  // ---------------------------------------------------------------------------
  // Select options (computed once)
  // ---------------------------------------------------------------------------

  const tipoOptions = [
    { value: "REGULAR", label: "Regular" },
    { value: "PRIVADO", label: "Privado" },
  ];

  const paisOptions = useMemo(
    () => paises.map((p) => ({ value: p.id, label: p.nombre })),
    [paises],
  );

  const proveedorOptions = useMemo(
    () => proveedoresTraslados.map((p) => ({ value: p.id, label: p.nombre })),
    [proveedoresTraslados],
  );

  function ciudadOptionsFor(paisId: string | undefined) {
    return (
      paises
        .find((p) => p.id === paisId)
        ?.ciudades.map((c) => ({ value: c.id, label: c.nombre })) ?? []
    );
  }

  // ---------------------------------------------------------------------------
  // Filtered rows + pagination
  // ---------------------------------------------------------------------------

  const filteredTraslados = useMemo(() => {
    let rows = traslados;
    if (tipoFilter) {
      rows = rows.filter((t) => t.tipo === tipoFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.nombre.toLowerCase().includes(q) ||
          (paisMap[t.paisId] ?? "").toLowerCase().includes(q) ||
          (ciudadMap[t.ciudadId] ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [traslados, search, tipoFilter, paisMap, ciudadMap]);

  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTraslados.length / PAGE_SIZE));

  const paginatedTraslados = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTraslados.slice(start, start + PAGE_SIZE);
  }, [filteredTraslados, page]);

  // ---------------------------------------------------------------------------
  // Handlers — InlineEditTable async callbacks
  // ---------------------------------------------------------------------------

  async function handleSaveRow(row: Traslado) {
    try {
      if (row.id) {
        await updateTraslado(row);
        toast(
          "success",
          "Traslado actualizado",
          `"${row.nombre}" guardado correctamente`,
        );
      } else {
        await createTraslado({
          brandId: activeBrandId,
          nombre: row.nombre,
          tipo: row.tipo,
          paisId: row.paisId,
          ciudadId: row.ciudadId,
          proveedorId: row.proveedorId,
          precio: row.precio,
        });
        toast(
          "success",
          "Traslado creado",
          `"${row.nombre}" fue creado correctamente`,
        );
      }
    } catch (err) {
      toast(
        "error",
        "Error al guardar",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    }
  }

  function handleDeleteRow(row: Traslado) {
    setDeleteTarget(row);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(async () => {
      try {
        await deleteTraslado(deleteTarget.id);
        toast(
          "success",
          "Traslado eliminado",
          `"${deleteTarget.nombre}" fue eliminado correctamente`,
        );
      } catch (err) {
        toast(
          "error",
          "Error al eliminar",
          err instanceof Error ? err.message : "Intenta nuevamente",
        );
      }
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Columns for InlineEditTable
  // ---------------------------------------------------------------------------

  const columns: InlineEditColumn<Traslado>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (r) => (
        <span className="font-medium text-neutral-900">
          {r.nombre}
          {(paqueteCountMap[r.id] ?? 0) > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-brand-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-teal-400">
              {paqueteCountMap[r.id]} paq.
            </span>
          )}
        </span>
      ),
      editor: (r, update) => (
        <Input
          value={r.nombre ?? ""}
          onChange={(e) => update("nombre", e.target.value)}
          placeholder="Nombre del traslado"
        />
      ),
    },
    {
      key: "tipo",
      label: "Tipo",
      width: "130px",
      render: (r) => (
        <StatusDot variant={r.tipo === "REGULAR" ? "active" : "draft"}>
          {r.tipo === "REGULAR" ? "Regular" : "Privado"}
        </StatusDot>
      ),
      editor: (r, update) => (
        <Select
          value={r.tipo}
          onValueChange={(v) => update("tipo", v as TipoTraslado)}
          options={tipoOptions}
        />
      ),
    },
    {
      key: "paisId",
      label: "Pais",
      width: "160px",
      render: (r) => paisMap[r.paisId] ?? "—",
      editor: (r, update) => (
        <Select
          value={r.paisId}
          onValueChange={(v) => {
            update("paisId", v);
            update("ciudadId", "");
          }}
          options={paisOptions}
          placeholder="Pais..."
        />
      ),
    },
    {
      key: "ciudadId",
      label: "Ciudad",
      width: "160px",
      render: (r) => ciudadMap[r.ciudadId] ?? "—",
      editor: (r, update) => (
        <Select
          value={r.ciudadId}
          onValueChange={(v) => update("ciudadId", v)}
          options={ciudadOptionsFor(r.paisId)}
          placeholder="Ciudad..."
          disabled={!r.paisId}
        />
      ),
    },
    {
      key: "proveedorId",
      label: "Proveedor",
      width: "180px",
      render: (r) => proveedorMap[r.proveedorId] ?? "—",
      editor: (r, update) => (
        <Select
          value={r.proveedorId}
          onValueChange={(v) => update("proveedorId", v)}
          options={proveedorOptions}
          placeholder="Proveedor..."
        />
      ),
    },
    {
      key: "precio",
      label: "Precio USD",
      align: "right",
      width: "130px",
      render: (r) => (
        <span className="font-mono text-[13px] font-semibold text-neutral-900">
          {formatCurrency(r.precio)}
        </span>
      ),
      editor: (r, update) => (
        <Input
          type="number"
          value={String(r.precio ?? 0)}
          onChange={(e) => update("precio", parseFloat(e.target.value) || 0)}
          className="text-right"
        />
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <>
      <DataTablePageHeader
        title="Traslados"
        subtitle="Gestion de transfers y traslados"
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por nombre, pais o ciudad...",
        }}
        filters={TIPO_FILTERS}
        activeFilter={tipoFilter}
        onFilterChange={setTipoFilter}
        className="mb-4"
      />

      {filteredTraslados.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="No hay traslados registrados"
          description="Agrega un traslado para poder asignarlo a paquetes."
          action={
            canEdit ? (
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                Nuevo Traslado
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <InlineEditTable<Traslado>
            columns={columns}
            rows={paginatedTraslados}
            getRowId={(r) => r.id}
            onSave={handleSaveRow}
            onDelete={canEdit ? handleDeleteRow : undefined}
            onAdd={
              canEdit
                ? () =>
                    ({
                      nombre: "",
                      tipo: "REGULAR" as TipoTraslado,
                      paisId: "",
                      ciudadId: "",
                      proveedorId: "",
                      precio: 0,
                    }) as Partial<Traslado>
                : undefined
            }
            addLabel="Agregar traslado"
            emptyMessage="No hay traslados cargados"
          />

          {totalPages > 1 && (
            <div className="mt-5 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
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
        <ModalHeader title="Eliminar Traslado">{null}</ModalHeader>
        <ModalBody>
          <motion.div
            animate={
              isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}
            }
            transition={
              isShaking ? interactions.deleteShake.transition : undefined
            }
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
