"use client";

import React, { useState, useCallback } from "react";
import { Pencil, Check, X, Trash2, Plus } from "lucide-react";
import { cn } from "@/components/lib/cn";

/**
 * InlineEditTable — generic inline-edit table primitive.
 *
 * Replaces the duplicated state machine in:
 *   - aereos/[id]/page.tsx  (PrecioAereo editor)
 *   - circuitos/[id]/page.tsx  (PrecioCircuito editor)
 *   - alojamientos/[id]/page.tsx  (PrecioAlojamiento editor)
 *   - traslados/page.tsx  (raw <table> inline edit)
 *
 * API:
 *   <InlineEditTable
 *     columns={[
 *       { key: "desde", label: "Periodo desde", width: "140px",
 *         render: (row) => formatDate(row.desde),
 *         editor: (row, update) => <DatePicker value={row.desde} onChange={(v) => update('desde', v)} />
 *       },
 *       { key: "precio", label: "Neto USD", align: "right",
 *         render: (row) => `$${row.precio}`,
 *         editor: (row, update) => <input type="number" value={row.precio} onChange={(e) => update('precio', Number(e.target.value))} />
 *       },
 *     ]}
 *     rows={precios}
 *     getRowId={(r) => r.id}
 *     onSave={async (row) => await savePrecio(row)}
 *     onDelete={async (row) => await deletePrecio(row.id)}
 *     onAdd={() => ({ desde: new Date(), hasta: new Date(), precio: 0 })}
 *     addLabel="Agregar periodo"
 *   />
 */

type Align = "left" | "right" | "center";

export interface InlineEditColumn<T> {
  key: string;
  label: string;
  width?: string;
  align?: Align;
  render: (row: T) => React.ReactNode;
  editor: (row: T, update: (key: string, value: unknown) => void) => React.ReactNode;
}

interface InlineEditTableProps<T> {
  columns: InlineEditColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onSave: (row: T) => void | Promise<void>;
  onDelete?: (row: T) => void | Promise<void>;
  /** Return a new empty row to start adding. */
  onAdd?: () => Partial<T>;
  addLabel?: string;
  emptyMessage?: string;
  className?: string;
}

export function InlineEditTable<T extends object>({
  columns,
  rows,
  getRowId,
  onSave,
  onDelete,
  onAdd,
  addLabel = "Agregar",
  emptyMessage = "Sin datos",
  className,
}: InlineEditTableProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [adding, setAdding] = useState<Partial<T> | null>(null);

  const updateDraft = useCallback((key: string, value: unknown) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const updateAdding = useCallback((key: string, value: unknown) => {
    setAdding((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const startEdit = (row: T) => {
    setEditingId(getRowId(row));
    setDraft({ ...row });
    setAdding(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const commitEdit = async () => {
    if (!draft) return;
    await onSave(draft);
    setEditingId(null);
    setDraft(null);
  };

  const startAdd = () => {
    if (!onAdd) return;
    setAdding(onAdd());
    setEditingId(null);
    setDraft(null);
  };

  const cancelAdd = () => setAdding(null);

  const commitAdd = async () => {
    if (!adding) return;
    await onSave(adding as T);
    setAdding(null);
  };

  return (
    <div
      className={cn("border-y border-hairline overflow-x-auto", className)}
    >
      <table
        className="w-full border-collapse"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        <thead
          style={{
            borderBottom: "1px solid rgba(17,17,36,0.07)",
            background: "rgba(17,17,36,0.02)",
          }}
        >
          <tr className="h-9">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-2 text-label font-medium text-neutral-500",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.align !== "right" && c.align !== "center" && "text-left"
                )}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.label}
              </th>
            ))}
            <th className="w-[90px] px-4 py-2 text-right text-label font-medium text-neutral-500">
              {/* actions column — no label */}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !adding && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-10 text-center text-[13px] text-neutral-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}

          {rows.map((row) => {
            const id = getRowId(row);
            const isEditing = editingId === id;
            const working = isEditing && draft ? draft : row;

            return (
              <tr
                key={id}
                className="group h-row border-b border-hairline transition-colors hover:bg-rail"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-2 text-[13.5px]",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center"
                    )}
                  >
                    {isEditing
                      ? c.editor(working, updateDraft)
                      : c.render(row)}
                  </td>
                ))}
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-0.5">
                    {isEditing ? (
                      <>
                        <IconButton
                          onClick={commitEdit}
                          ariaLabel="Guardar"
                          variant="confirm"
                        >
                          <Check className="h-[15px] w-[15px]" strokeWidth={2} />
                        </IconButton>
                        <IconButton
                          onClick={cancelEdit}
                          ariaLabel="Cancelar"
                        >
                          <X className="h-[15px] w-[15px]" strokeWidth={2} />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          onClick={() => startEdit(row)}
                          ariaLabel="Editar"
                        >
                          <Pencil className="h-[14px] w-[14px]" strokeWidth={1.75} />
                        </IconButton>
                        {onDelete && (
                          <IconButton
                            onClick={() => onDelete(row)}
                            ariaLabel="Eliminar"
                            variant="danger"
                          >
                            <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
                          </IconButton>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Add new row */}
          {adding && (
            <tr
              className="h-row border-b border-hairline"
              style={{ background: "rgba(59,191,173,0.04)" }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 py-2 text-[13.5px]",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center"
                  )}
                >
                  {c.editor(adding as T, updateAdding)}
                </td>
              ))}
              <td className="px-4 py-2">
                <div className="flex items-center justify-end gap-0.5">
                  <IconButton
                    onClick={commitAdd}
                    ariaLabel="Confirmar"
                    variant="confirm"
                  >
                    <Check className="h-[15px] w-[15px]" strokeWidth={2} />
                  </IconButton>
                  <IconButton onClick={cancelAdd} ariaLabel="Descartar">
                    <X className="h-[15px] w-[15px]" strokeWidth={2} />
                  </IconButton>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Add row trigger */}
      {onAdd && !adding && (
        <button
          type="button"
          onClick={startAdd}
          className="flex w-full items-center justify-center gap-1.5 border-t border-hairline bg-transparent px-4 py-2.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:bg-rail hover:text-neutral-800"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {addLabel}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IconButton — shared small icon button for inline edit rows
// ---------------------------------------------------------------------------

function IconButton({
  children,
  onClick,
  ariaLabel,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  variant?: "confirm" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-400/30",
        !variant && "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800",
        variant === "confirm" &&
          "text-[#2A9E8E] hover:bg-[rgba(59,191,173,0.12)]",
        variant === "danger" &&
          "text-neutral-500 hover:bg-brand-red-50 hover:text-[#CC2030]"
      )}
    >
      {children}
    </button>
  );
}
