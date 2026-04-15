"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Copy, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { interactions } from "@/components/lib/animations";
import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data/DataTable";
import { DataTableToolbar } from "@/components/ui/data/DataTableToolbar";
import { RowActions } from "@/components/ui/data/RowActions";
import { EmptyState } from "@/components/ui/data/EmptyState";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/form/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Pagination } from "@/components/ui/Pagination";

// ---------------------------------------------------------------------------
// Public API — field + column definitions
// ---------------------------------------------------------------------------

export type CatalogFieldType =
  | "text"
  | "number"
  | "toggle"
  | "select"
  | "color";

export interface CatalogFieldDef {
  key: string;
  label: string;
  type: CatalogFieldType;
  required?: boolean;
  placeholder?: string;
  /** Options for `type: "select"`. */
  options?: { value: string; label: string }[];
  /** Column span inside the FieldGroup grid (1 or 2). */
  columns?: 1 | 2;
  /** Autofocus the first rendered input that sets this true. */
  autoFocus?: boolean;
  /**
   * Optional side-effect applied after this field changes in CREATE mode only.
   * Useful for slug auto-generation (e.g. `nombre` -> `slug`).
   */
  onChangeSideEffect?: (
    value: string,
    form: Record<string, unknown>,
  ) => Record<string, unknown>;
}

export interface CatalogColumnDef<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  variant?: "default" | "primary" | "muted" | "mono" | "id";
  align?: "left" | "right" | "center";
  className?: string;
}

export interface CatalogEditorProps<T extends { id: string }> {
  entityLabel: string;
  entityLabelPlural: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  rows: T[];
  columns: CatalogColumnDef<T>[];
  fields: CatalogFieldDef[];
  /** Factory for the "new" form state. */
  initialForm: () => Record<string, unknown>;
  /** Adapter: extract the form state from an existing row. */
  fromRow: (row: T) => Record<string, unknown>;
  onCreate: (form: Record<string, unknown>) => void | Promise<void>;
  onUpdate: (row: T, form: Record<string, unknown>) => void | Promise<void>;
  onDelete: (row: T) => void | Promise<void>;
  /** Validator — returns false to disable the Save button. */
  isValid?: (form: Record<string, unknown>) => boolean;
  /** Search predicate applied to rows. Omit to hide search. */
  searchFilter?: (row: T, query: string) => boolean;
  searchPlaceholder?: string;
  canEdit?: boolean;
  /** Page size (default 10). */
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// CatalogEditor
// ---------------------------------------------------------------------------

export function CatalogEditor<T extends { id: string }>({
  entityLabel,
  entityLabelPlural: _entityLabelPlural,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  rows,
  columns,
  fields,
  initialForm,
  fromRow,
  onCreate,
  onUpdate,
  onDelete,
  isValid,
  searchFilter,
  searchPlaceholder,
  canEdit = true,
  pageSize = DEFAULT_PAGE_SIZE,
}: CatalogEditorProps<T>) {
  // ---- Modal / form state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(() => initialForm());

  // ---- List state ----
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    if (!searchFilter || !search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => searchFilter(r, q));
  }, [rows, search, searchFilter]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // ---- Handlers ----

  function handleOpenCreate() {
    setEditTarget(null);
    setForm(initialForm());
    setModalOpen(true);
  }

  function handleOpenEdit(row: T) {
    setEditTarget(row);
    setForm(fromRow(row));
    setModalOpen(true);
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (isValid && !isValid(form)) return;
    if (editTarget) {
      await onUpdate(editTarget, form);
    } else {
      await onCreate(form);
    }
    setModalOpen(false);
  }

  function handleOpenDelete(row: T) {
    setDeleteTarget(row);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsShaking(true);
    const target = deleteTarget;
    setTimeout(async () => {
      await onDelete(target);
      setDeleteTarget(null);
      setIsShaking(false);
    }, 400);
  }

  // ---- Field change helper ----

  function setFieldValue(field: CatalogFieldDef, rawValue: unknown) {
    setForm((prev) => {
      const next = { ...prev, [field.key]: rawValue };
      if (!editTarget && field.onChangeSideEffect && typeof rawValue === "string") {
        return { ...next, ...field.onChangeSideEffect(rawValue, next) };
      }
      return next;
    });
  }

  // ---- Render helpers ----

  const saveDisabled = isValid ? !isValid(form) : false;

  const newButton = canEdit ? (
    <Button
      leftIcon={<Plus className="h-4 w-4" />}
      onClick={handleOpenCreate}
    >
      Nuevo {entityLabel}
    </Button>
  ) : undefined;

  return (
    <>
      {/* Toolbar — only if searchFilter provided; otherwise a bare action row */}
      {searchFilter ? (
        <DataTableToolbar
          search={{
            value: search,
            onChange: setSearch,
            placeholder:
              searchPlaceholder ?? `Buscar ${entityLabel.toLowerCase()}...`,
          }}
          action={newButton}
          className="mb-4"
        />
      ) : (
        canEdit && (
          <div className="mb-4 flex justify-end">{newButton}</div>
        )
      )}

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={EmptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={newButton}
        />
      ) : (
        <>
          <DataTable>
            <DataTableHeader>
              <DataTableRow header>
                {columns.map((c, i) => (
                  <DataTableHead key={i} align={c.align ?? "left"}>
                    {c.header}
                  </DataTableHead>
                ))}
                <DataTableHead align="right">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {paginatedRows.map((row) => (
                <DataTableRow
                  key={row.id}
                  onClick={() => handleOpenEdit(row)}
                  interactive
                >
                  {columns.map((c, i) => (
                    <DataTableCell
                      key={i}
                      variant={c.variant ?? "default"}
                      align={c.align ?? "left"}
                      className={c.className}
                    >
                      {c.cell(row)}
                    </DataTableCell>
                  ))}
                  <DataTableCell align="right">
                    <RowActions
                      primary={{
                        icon: Pencil,
                        label: "Editar",
                        onClick: () => handleOpenEdit(row),
                      }}
                      items={
                        canEdit
                          ? [
                              {
                                icon: Trash2,
                                label: "Eliminar",
                                onClick: () => handleOpenDelete(row),
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

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="md">
        <ModalHeader
          title={
            editTarget ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`
          }
          description={
            editTarget
              ? `Actualiza los datos del ${entityLabel.toLowerCase()}.`
              : `Crea un nuevo ${entityLabel.toLowerCase()}.`
          }
          icon={
            editTarget ? (
              <Pencil className="h-5 w-5" strokeWidth={2.2} />
            ) : (
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            )
          }
        />
        <form onSubmit={handleSave}>
          <ModalBody>
            <FieldGroup columns={2}>
              {fields.map((field) => {
                const value = form[field.key];
                const span = (field.columns ?? 1) as 1 | 2;

                if (field.type === "toggle") {
                  return (
                    <Field key={field.key} span={span} orientation="horizontal">
                      <Toggle
                        checked={Boolean(value)}
                        onCheckedChange={(v) => setFieldValue(field, v)}
                      />
                      <FieldLabel required={field.required}>
                        {field.label}
                      </FieldLabel>
                    </Field>
                  );
                }

                if (field.type === "select") {
                  return (
                    <Field key={field.key} span={span}>
                      <FieldLabel required={field.required}>
                        {field.label}
                      </FieldLabel>
                      <Select
                        value={value != null ? String(value) : undefined}
                        onValueChange={(v) => setFieldValue(field, v)}
                        options={field.options ?? []}
                        placeholder={field.placeholder}
                      />
                    </Field>
                  );
                }

                if (field.type === "color") {
                  return (
                    <Field key={field.key} span={span}>
                      <FieldLabel required={field.required}>
                        {field.label}
                      </FieldLabel>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={(value as string) ?? "#8B5CF6"}
                          onChange={(e) => setFieldValue(field, e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded-md border border-hairline bg-white"
                        />
                        <Input
                          value={(value as string) ?? ""}
                          onChange={(e) => setFieldValue(field, e.target.value)}
                          placeholder="#8B5CF6"
                          className="flex-1 font-mono"
                        />
                      </div>
                    </Field>
                  );
                }

                // text | number
                return (
                  <Field key={field.key} span={span}>
                    <FieldLabel required={field.required}>
                      {field.label}
                    </FieldLabel>
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={
                        value == null
                          ? ""
                          : field.type === "number"
                            ? String(value)
                            : (value as string)
                      }
                      onChange={(e) => {
                        const v =
                          field.type === "number"
                            ? Number(e.target.value)
                            : e.target.value;
                        setFieldValue(field, v);
                      }}
                      placeholder={field.placeholder}
                      autoFocus={field.autoFocus}
                    />
                  </Field>
                );
              })}
            </FieldGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saveDisabled}>
              {editTarget ? "Guardar cambios" : `Crear ${entityLabel.toLowerCase()}`}
            </Button>
          </ModalFooter>
        </form>
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
        <ModalHeader
          title={`Eliminar ${entityLabel}`}
          description="Esta accion no se puede deshacer."
          icon={<Trash2 className="h-5 w-5" strokeWidth={2.2} />}
          variant="destructive"
        />
        <ModalBody>
          <motion.div
            animate={
              isShaking ? { x: [...interactions.deleteShake.animate.x] } : {}
            }
            transition={
              isShaking ? interactions.deleteShake.transition : undefined
            }
          >
            <p className="text-[14px] text-neutral-700">
              Vas a eliminar{" "}
              <span className="font-semibold text-neutral-900">
                {deleteTarget
                  ? String(
                      (deleteTarget as unknown as { nombre?: string }).nombre ??
                        "",
                    )
                  : ""}
              </span>
              .
            </p>
            <p className="mt-2 text-[12.5px] text-neutral-500">
              Los registros vinculados mantendran su referencia historica.
            </p>
          </motion.div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Eliminar definitivamente
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

// Re-export unused Copy to keep lucide imports stable for downstream consumers
export { Copy };
