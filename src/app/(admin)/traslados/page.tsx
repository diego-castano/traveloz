"use client";

import { useEffect, useMemo, useState } from "react";
import { Tooltip } from "radix-ui";
import { Bus, Plus, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { EmptyState } from "@/components/ui/data/EmptyState";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { Select } from "@/components/ui/Select";
import { SelectCascade } from "@/components/ui/form/SelectCascade";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/form/Field";
import { StatusDot } from "@/components/ui/data/StatusDot";
import {
  useTraslados,
  useServiceActions,
  useServiceLoading,
} from "@/components/providers/ServiceProvider";
import { useProveedores, usePaises } from "@/components/providers/CatalogProvider";
import { useBrand } from "@/components/providers/BrandProvider";
import { usePackageState } from "@/components/providers/PackageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import { matchesSearch } from "@/lib/search";
import type { Traslado, TipoTraslado } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const TIPO_FILTERS = [
  { key: "REGULAR", label: "Regular" },
  { key: "PRIVADO", label: "Privado" },
];

const TIPO_OPTIONS = [
  { value: "REGULAR", label: "Regular" },
  { value: "PRIVADO", label: "Privado" },
];

type TrasladoFormState = {
  nombre: string;
  tipo: TipoTraslado;
  paisId: string;
  ciudadId: string;
  proveedorId: string;
  precio: string;
};

function nullableId(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

function emptyForm(tipo: TipoTraslado = "REGULAR"): TrasladoFormState {
  return {
    nombre: "",
    tipo,
    paisId: "",
    ciudadId: "",
    proveedorId: "",
    precio: "",
  };
}

function trasladoLabel(traslado: Traslado) {
  return traslado.nombre;
}

function normalizePrice(value: string) {
  return Number(value.replace(",", "."));
}

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
  const paises = usePaises();
  const { createTraslado, updateTraslado, deleteTraslado } = useServiceActions();
  const loading = useServiceLoading();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Traslado | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Traslado | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TrasladoFormState>(emptyForm());

  // ---------------------------------------------------------------------------
  // Lookup maps
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
    const map: Record<string, string> = {};
    for (const proveedor of allProveedores) {
      map[proveedor.id] = proveedor.nombre;
    }
    return map;
  }, [allProveedores]);

  const paisMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pais of paises) {
      map[pais.id] = pais.nombre;
    }
    return map;
  }, [paises]);

  const ciudadMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pais of paises) {
      for (const ciudad of pais.ciudades) {
        map[ciudad.id] = ciudad.nombre;
      }
    }
    return map;
  }, [paises]);

  const paisOptions = useMemo(
    () => paises.map((pais) => ({ value: pais.id, label: pais.nombre })),
    [paises],
  );

  const proveedorOptions = useMemo(
    () =>
      allProveedores
        .filter((proveedor) => proveedor.servicio === "TRASLADOS" && !proveedor.deletedAt)
        .map((proveedor) => ({ value: proveedor.id, label: proveedor.nombre })),
    [allProveedores],
  );

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const filteredTraslados = useMemo(() => {
    let rows = traslados;

    if (tipoFilter) {
      rows = rows.filter((traslado) => traslado.tipo === tipoFilter);
    }

    if (search.trim()) {
      rows = rows.filter((traslado) =>
        matchesSearch(
          search,
          traslado.id,
          traslado.nombre,
          paisMap[traslado.paisId],
          ciudadMap[traslado.ciudadId],
          proveedorMap[traslado.proveedorId],
        ),
      );
    }

    return rows;
  }, [traslados, search, tipoFilter, paisMap, ciudadMap, proveedorMap]);

  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter]);

  useEffect(() => {
    if (modalOpen) return;
    setSaving(false);
  }, [modalOpen]);

  const totalPages = Math.max(1, Math.ceil(filteredTraslados.length / PAGE_SIZE));

  const paginatedTraslados = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTraslados.slice(start, start + PAGE_SIZE);
  }, [filteredTraslados, page]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openCreate(defaultTipo: TipoTraslado = (tipoFilter as TipoTraslado) ?? "REGULAR") {
    setEditTarget(null);
    setForm(emptyForm(defaultTipo));
    setModalOpen(true);
  }

  function openEdit(traslado: Traslado) {
    setEditTarget(traslado);
    setForm({
      nombre: traslado.nombre,
      tipo: traslado.tipo,
      paisId: traslado.paisId,
      ciudadId: traslado.ciudadId,
      proveedorId: traslado.proveedorId ?? "",
      precio: String(traslado.precio ?? ""),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const nombre = form.nombre.trim();
    const precio = normalizePrice(form.precio);

    if (!nombre) {
      toast("warning", "Nombre requerido", "Ingresa un nombre para el traslado.");
      return;
    }
    if (!form.paisId) {
      toast("warning", "Pais requerido", "Elegí un país antes de guardar.");
      return;
    }
    if (!form.ciudadId) {
      toast("warning", "Ciudad requerida", "Elegí una ciudad antes de guardar.");
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      toast("warning", "Precio requerido", "Ingresa un precio mayor a cero.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        brandId: activeBrandId,
        nombre,
        tipo: form.tipo,
        paisId: nullableId(form.paisId),
        ciudadId: nullableId(form.ciudadId),
        proveedorId: nullableId(form.proveedorId),
        precio,
      };

      if (editTarget) {
        await updateTraslado({
          ...editTarget,
          ...payload,
        } as Traslado);
        toast("success", "Traslado actualizado", `"${nombre}" guardado correctamente.`);
      } else {
        await createTraslado(payload as any);
        toast("success", "Traslado creado", `"${nombre}" fue creado correctamente.`);
      }

      setModalOpen(false);
      setEditTarget(null);
      setPage(1);
    } catch (err) {
      toast(
        "error",
        "Error al guardar",
        err instanceof Error ? err.message : "Intenta nuevamente",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleOpenDelete(traslado: Traslado) {
    setDeleteTarget(traslado);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteTraslado(deleteTarget.id);
      toast(
        "success",
        "Traslado eliminado",
        `"${deleteTarget.nombre}" fue eliminado correctamente.`,
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
        title="Traslados"
        subtitle="Gestion de transfers y traslados"
        action={
          canEdit ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
              Nuevo Traslado
            </Button>
          ) : undefined
        }
      />

      <DataTableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Buscar por nombre, país, ciudad o proveedor...",
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
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
                Nuevo Traslado
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
                <DataTableHead align="center">Tipo</DataTableHead>
                <DataTableHead align="center">País</DataTableHead>
                <DataTableHead align="center">Ciudad</DataTableHead>
                <DataTableHead align="center">Proveedor</DataTableHead>
                <DataTableHead align="right">Precio USD</DataTableHead>
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>

            <DataTableBody>
              {paginatedTraslados.map((traslado) => (
                <DataTableRow
                  key={traslado.id}
                  interactive={canEdit}
                  onClick={canEdit ? () => openEdit(traslado) : undefined}
                >
                  <DataTableCell variant="primary">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10.5px] font-medium tracking-wide text-neutral-500">
                        ID {traslado.id}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-neutral-900">
                          {trasladoLabel(traslado)}
                        </div>
                        <div className="mt-0.5 text-[11px] font-normal text-neutral-400">
                          Toca para editar o usa las acciones rápidas
                        </div>
                      </div>
                      {(paqueteCountMap[traslado.id] ?? 0) > 0 && (
                        <span className="ml-1 inline-flex shrink-0 items-center rounded-full bg-brand-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-teal-400">
                          {paqueteCountMap[traslado.id]} paq.
                        </span>
                      )}
                    </div>
                  </DataTableCell>

                  <DataTableCell align="center">
                    <StatusDot variant={traslado.tipo === "REGULAR" ? "active" : "draft"}>
                      {traslado.tipo === "REGULAR" ? "Regular" : "Privado"}
                    </StatusDot>
                  </DataTableCell>

                  <DataTableCell variant="muted" align="center">
                    {paisMap[traslado.paisId] ?? "--"}
                  </DataTableCell>

                  <DataTableCell variant="muted" align="center">
                    {ciudadMap[traslado.ciudadId] ?? "--"}
                  </DataTableCell>

                  <DataTableCell variant="muted" align="center">
                    {proveedorMap[traslado.proveedorId] ?? "--"}
                  </DataTableCell>

                  <DataTableCell variant="price" align="right">
                    {formatCurrency(traslado.precio)}
                  </DataTableCell>

                  <DataTableCell align="right">
                    <Tooltip.Provider delayDuration={220}>
                      <div className="flex items-center justify-end gap-0.5">
                        {canEdit && (
                          <>
                            <QuickAction
                              label="Editar"
                              icon={Pencil}
                              onClick={() => openEdit(traslado)}
                            />
                            <QuickAction
                              label="Eliminar"
                              icon={Trash2}
                              destructive
                              onClick={() => handleOpenDelete(traslado)}
                            />
                          </>
                        )}
                      </div>
                    </Tooltip.Provider>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>

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

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditTarget(null);
            setSaving(false);
          }
        }}
        size="lg"
      >
        <ModalHeader
          title={editTarget ? "Editar Traslado" : "Nuevo Traslado"}
          description="Carga nombre, país, ciudad, proveedor y precio en un solo paso."
        >
          {null}
        </ModalHeader>
        <ModalBody>
          <FieldGroup columns={1}>
            <Field>
              <FieldLabel required>Nombre</FieldLabel>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Traslado aeropuerto - hotel"
                autoFocus
              />
            </Field>

            <Field>
              <FieldLabel required>Tipo</FieldLabel>
              <Select
                value={form.tipo}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, tipo: value as TipoTraslado }))
                }
                options={TIPO_OPTIONS}
                placeholder="Seleccionar tipo..."
              />
            </Field>

            <Field>
              <SelectCascade
                parentLabel="País"
                childLabel="Ciudad"
                parentValue={form.paisId}
                onParentChange={(value) =>
                  setForm((prev) => ({ ...prev, paisId: value, ciudadId: "" }))
                }
                parentOptions={paisOptions}
                childValue={form.ciudadId}
                onChildChange={(value) =>
                  setForm((prev) => ({ ...prev, ciudadId: value }))
                }
                childOptions={(paisId) =>
                  paises
                    .find((pais) => pais.id === paisId)
                    ?.ciudades.map((ciudad) => ({
                      value: ciudad.id,
                      label: ciudad.nombre,
                    })) ?? []
                }
                parentPlaceholder="Seleccionar país..."
                childPlaceholder="Seleccionar ciudad..."
              />
              <FieldDescription>
                Primero elegí el país para filtrar solo sus ciudades y hacer la carga más clara.
              </FieldDescription>
            </Field>

            <FieldGroup columns={2}>
              <Field>
                <FieldLabel>Proveedor</FieldLabel>
                <Select
                  value={form.proveedorId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, proveedorId: value }))
                  }
                  options={proveedorOptions}
                  placeholder="Seleccionar proveedor..."
                />
              </Field>

              <Field>
                <FieldLabel required>Precio USD</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.precio}
                  onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))}
                  placeholder="0"
                  className="text-right"
                />
              </Field>
            </FieldGroup>
          </FieldGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setModalOpen(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editTarget ? "Guardar cambios" : "Crear traslado"}
          </Button>
        </ModalFooter>
      </Modal>

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
            <p className="mt-2 text-sm text-neutral-400">
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

function QuickAction({
  label,
  icon: Icon,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className={[
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-400/30",
            destructive
              ? "text-neutral-500 hover:bg-brand-red-50 hover:text-[#CC2030]"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800",
          ].join(" ")}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label={label}
          title={label}
        >
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.75} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="z-[120] rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-700 shadow-[0_10px_24px_rgba(17,17,36,0.12)]"
        >
          {label}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
