"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Copy, Trash2, Check, X, Bus } from "lucide-react";
import { motion } from "motion/react";
import { interactions } from "@/components/lib/animations";
import { glassMaterials } from "@/components/lib/glass";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Card } from "@/components/ui/Card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
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
// Inline input styling — copied from aereo detail page per RESEARCH.md
// ---------------------------------------------------------------------------

const inlineInputClassName =
  "w-full rounded-[6px] border border-neutral-150/50 bg-white/70 px-2 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#3BBFAD] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_0_4px_rgba(59,191,173,0.4)] focus:bg-white/85 transition-all backdrop-blur-sm";

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

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draftRow, setDraftRow] = useState<Partial<Traslado>>({});
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<
    Partial<Omit<Traslado, "id" | "brandId" | "createdAt" | "updatedAt" | "deletedAt">>
  >({});
  const [deleteTarget, setDeleteTarget] = useState<Traslado | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [search, setSearch] = useState("");

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
  // Cascading ciudad options
  // ---------------------------------------------------------------------------

  const draftCiudadOptions = useMemo(
    () =>
      paises
        .find((p) => p.id === draftRow.paisId)
        ?.ciudades.map((c) => ({ value: c.id, label: c.nombre })) ?? [],
    [paises, draftRow.paisId],
  );

  const newCiudadOptions = useMemo(
    () =>
      paises
        .find((p) => p.id === newRow.paisId)
        ?.ciudades.map((c) => ({ value: c.id, label: c.nombre })) ?? [],
    [paises, newRow.paisId],
  );

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

  // ---------------------------------------------------------------------------
  // Filtered rows
  // ---------------------------------------------------------------------------

  const filteredTraslados = useMemo(() => {
    if (!search.trim()) return traslados;
    const q = search.toLowerCase();
    return traslados.filter(
      (t) =>
        t.nombre.toLowerCase().includes(q) ||
        (paisMap[t.paisId] ?? "").toLowerCase().includes(q) ||
        (ciudadMap[t.ciudadId] ?? "").toLowerCase().includes(q),
    );
  }, [traslados, search, paisMap, ciudadMap]);

  // ---------------------------------------------------------------------------
  // Handlers — edit mode
  // ---------------------------------------------------------------------------

  function handleStartEdit(t: Traslado) {
    setAddingRow(false);
    setNewRow({});
    setEditingRowId(t.id);
    setDraftRow({
      nombre: t.nombre,
      tipo: t.tipo,
      paisId: t.paisId,
      ciudadId: t.ciudadId,
      proveedorId: t.proveedorId,
      precio: t.precio,
    });
  }

  function handleCancelEdit() {
    setEditingRowId(null);
    setDraftRow({});
  }

  function handleSaveEdit() {
    const existing = traslados.find((t) => t.id === editingRowId);
    if (!existing) return;
    updateTraslado({ ...existing, ...draftRow } as Traslado);
    toast("success", "Traslado actualizado", `"${draftRow.nombre ?? existing.nombre}" guardado correctamente`);
    setEditingRowId(null);
    setDraftRow({});
  }

  // ---------------------------------------------------------------------------
  // Handlers — add mode
  // ---------------------------------------------------------------------------

  function handleStartAdd() {
    setEditingRowId(null);
    setDraftRow({});
    setAddingRow(true);
    setNewRow({ nombre: "", tipo: "REGULAR", paisId: "", ciudadId: "", proveedorId: "", precio: 0 });
  }

  function handleCancelAdd() {
    setAddingRow(false);
    setNewRow({});
  }

  function handleSaveAdd() {
    createTraslado({
      brandId: activeBrandId,
      nombre: newRow.nombre!,
      tipo: newRow.tipo!,
      paisId: newRow.paisId!,
      ciudadId: newRow.ciudadId!,
      proveedorId: newRow.proveedorId!,
      precio: newRow.precio!,
    });
    toast("success", "Traslado creado", `"${newRow.nombre}" fue creado correctamente`);
    setAddingRow(false);
    setNewRow({});
  }

  // ---------------------------------------------------------------------------
  // Handlers — clone & delete
  // ---------------------------------------------------------------------------

  function handleClone(t: Traslado) {
    createTraslado({
      brandId: t.brandId,
      nombre: `Copia de ${t.nombre}`,
      tipo: t.tipo,
      paisId: t.paisId,
      ciudadId: t.ciudadId,
      proveedorId: t.proveedorId,
      precio: t.precio,
    });
    toast("success", "Traslado clonado", `Se creo una copia de "${t.nombre}"`);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    setTimeout(() => {
      deleteTraslado(deleteTarget.id);
      toast("success", "Traslado eliminado", `"${deleteTarget.nombre}" fue eliminado correctamente`);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Tipo badge
  // ---------------------------------------------------------------------------

  function TipoBadge({ tipo }: { tipo: TipoTraslado }) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        style={
          tipo === "REGULAR"
            ? { background: "rgba(59,191,173,0.12)", color: "#1A9E8B" }
            : { background: "rgba(108,43,217,0.10)", color: "#6C2BD9" }
        }
      >
        {tipo === "REGULAR" ? "Regular" : "Privado"}
      </span>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageSkeleton variant="table" />;

  return (
    <>
      <PageHeader
        title="Traslados"
        subtitle="Gestion de transfers y traslados"
        action={
          canEdit ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleStartAdd}
            >
              Nuevo Traslado
            </Button>
          ) : undefined
        }
      />

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        onFilterToggle={() => undefined}
        placeholder="Buscar por nombre, pais o ciudad..."
        className="mb-6"
      />

      {filteredTraslados.length === 0 && !addingRow ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Bus className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No hay traslados registrados</p>
        </div>
      ) : (
        <Card static>
          <div
            className="overflow-x-auto rounded-[inherit]"
            style={glassMaterials.frosted}
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-16">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-28">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-36">
                    Pais
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-36">
                    Ciudad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 w-40">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500 w-28">
                    Precio (USD)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500 w-28">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTraslados.map((t) =>
                  editingRowId === t.id ? (
                    // Edit mode row
                    <tr
                      key={t.id}
                      className="border-b border-neutral-100/80 bg-[rgba(59,191,173,0.03)]"
                    >
                      <td className="px-4 py-2">
                        <span className="text-xs text-neutral-400 font-mono">
                          {t.id.slice(-4)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className={inlineInputClassName}
                          value={draftRow.nombre ?? ""}
                          onChange={(e) =>
                            setDraftRow((d) => ({ ...d, nombre: e.target.value }))
                          }
                          placeholder="Nombre del traslado"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          options={tipoOptions}
                          value={draftRow.tipo}
                          onValueChange={(v) =>
                            setDraftRow((d) => ({ ...d, tipo: v as TipoTraslado }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          options={paisOptions}
                          value={draftRow.paisId}
                          onValueChange={(v) =>
                            setDraftRow((d) => ({ ...d, paisId: v, ciudadId: "" }))
                          }
                          placeholder="Pais..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          options={draftCiudadOptions}
                          value={draftRow.ciudadId}
                          onValueChange={(v) =>
                            setDraftRow((d) => ({ ...d, ciudadId: v }))
                          }
                          placeholder="Ciudad..."
                          disabled={!draftRow.paisId}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          options={proveedorOptions}
                          value={draftRow.proveedorId}
                          onValueChange={(v) =>
                            setDraftRow((d) => ({ ...d, proveedorId: v }))
                          }
                          placeholder="Proveedor..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className={`${inlineInputClassName} text-right`}
                          value={draftRow.precio ?? 0}
                          onChange={(e) =>
                            setDraftRow((d) => ({
                              ...d,
                              precio: parseFloat(e.target.value) || 0,
                            }))
                          }
                          min={0}
                          step={0.01}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={handleSaveEdit}
                            aria-label="Guardar"
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="icon"
                            size="xs"
                            onClick={handleCancelEdit}
                            aria-label="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // View mode row
                    <tr
                      key={t.id}
                      className="border-b border-neutral-100/80 hover:bg-white/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-400 font-mono">
                          {t.id.slice(-4)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-800">
                        {t.nombre}
                        {(paqueteCountMap[t.id] ?? 0) > 0 && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-brand-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-teal-400">
                            {paqueteCountMap[t.id]} paq.
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TipoBadge tipo={t.tipo} />
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {paisMap[t.paisId] ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {ciudadMap[t.ciudadId] ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {proveedorMap[t.proveedorId] ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-700 font-medium">
                        {formatCurrency(t.precio)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <Button
                                variant="icon"
                                size="xs"
                                onClick={() => handleStartEdit(t)}
                                aria-label="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="icon"
                                size="xs"
                                onClick={() => handleClone(t)}
                                aria-label="Clonar"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="icon"
                                size="xs"
                                onClick={() => setDeleteTarget(t)}
                                aria-label="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}

                {/* Add row */}
                {addingRow && (
                  <tr className="border-b border-neutral-100/80 bg-[rgba(59,191,173,0.04)]">
                    <td className="px-4 py-2">
                      <span className="text-xs text-neutral-300">nuevo</span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className={inlineInputClassName}
                        value={newRow.nombre ?? ""}
                        onChange={(e) =>
                          setNewRow((r) => ({ ...r, nombre: e.target.value }))
                        }
                        placeholder="Nombre del traslado"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        options={tipoOptions}
                        value={newRow.tipo}
                        onValueChange={(v) =>
                          setNewRow((r) => ({ ...r, tipo: v as TipoTraslado }))
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        options={paisOptions}
                        value={newRow.paisId}
                        onValueChange={(v) =>
                          setNewRow((r) => ({ ...r, paisId: v, ciudadId: "" }))
                        }
                        placeholder="Pais..."
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        options={newCiudadOptions}
                        value={newRow.ciudadId}
                        onValueChange={(v) =>
                          setNewRow((r) => ({ ...r, ciudadId: v }))
                        }
                        placeholder="Ciudad..."
                        disabled={!newRow.paisId}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        options={proveedorOptions}
                        value={newRow.proveedorId}
                        onValueChange={(v) =>
                          setNewRow((r) => ({ ...r, proveedorId: v }))
                        }
                        placeholder="Proveedor..."
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className={`${inlineInputClassName} text-right`}
                        value={newRow.precio ?? 0}
                        onChange={(e) =>
                          setNewRow((r) => ({
                            ...r,
                            precio: parseFloat(e.target.value) || 0,
                          }))
                        }
                        min={0}
                        step={0.01}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={handleSaveAdd}
                          aria-label="Guardar nuevo"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="icon"
                          size="xs"
                          onClick={handleCancelAdd}
                          aria-label="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
