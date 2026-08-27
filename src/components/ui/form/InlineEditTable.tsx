"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/components/lib/cn";

/** Imperative handle so a parent can flush in-flight edit/add rows before
 * running its own save (e.g. a "Guardar Cambios" button at the page level). */
export interface InlineEditTableHandle {
  /** Commit the currently active draft or adding row, if any. Resolves once
   * the row's onSave has settled. Throws if onSave rejects. */
  commitPending: () => Promise<void>;
  /** True when there's an unsaved adding/editing row. */
  hasPending: () => boolean;
}

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
  /** Texto del boton primario que confirma la fila en edicion/alta. */
  confirmLabel?: string;
  emptyMessage?: string;
  className?: string;
}

// Fondos opacos equivalentes a los tokens translucidos sobre blanco. La
// columna de acciones es sticky, asi que necesita fondo solido: con un rgba()
// se transparentaria y dejaria ver las celdas que pasan por debajo.
// (el hover de fila, #F9F9FA = rail sobre blanco, va como clase Tailwind).
const BG_HEAD = "#FAFAFB";
const BG_ADDING = "#F7FCFC"; // = teal 4% sobre blanco

function InlineEditTableInner<T extends object>(
  {
    columns,
    rows,
    getRowId,
    onSave,
    onDelete,
    onAdd,
    addLabel = "Agregar",
    confirmLabel = "Guardar",
    emptyMessage = "Sin datos",
    className,
  }: InlineEditTableProps<T>,
  ref: React.Ref<InlineEditTableHandle>,
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [adding, setAdding] = useState<Partial<T> | null>(null);

  // Solo marcamos la separacion de la columna sticky cuando de verdad queda
  // contenido tapado a la derecha; si la tabla entra entera, no ensucia.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowsRight, setOverflowsRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () =>
      setOverflowsRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [rows.length, columns.length, adding, editingId]);

  const stickyEdge: React.CSSProperties = {
    borderLeft: `1px solid ${overflowsRight ? "rgba(17,17,36,0.10)" : "transparent"}`,
    boxShadow: overflowsRight
      ? "-8px 0 10px -8px rgba(17,17,36,0.22)"
      : undefined,
  };

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

  useImperativeHandle(
    ref,
    () => ({
      commitPending: async () => {
        if (adding) {
          await onSave(adding as T);
          setAdding(null);
          return;
        }
        if (editingId && draft) {
          await onSave(draft);
          setEditingId(null);
          setDraft(null);
        }
      },
      hasPending: () => adding !== null || (editingId !== null && draft !== null),
    }),
    [adding, draft, editingId, onSave],
  );

  return (
    <div className={cn("border-y border-hairline", className)}>
      <div ref={scrollRef} className="overflow-x-auto">
        {/* border-separate (y no collapse) porque Chrome no aplica
            position:sticky a celdas de una tabla colapsada. Los bordes de fila
            viven entonces en cada <td>, no en el <tr>. */}
        <table
          className="w-full border-separate border-spacing-0"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          <thead>
            <tr className="h-9">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "border-b border-hairline px-4 py-2 text-label font-medium text-neutral-500",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.align !== "right" && c.align !== "center" && "text-left"
                  )}
                  style={{
                    background: BG_HEAD,
                    ...(c.width ? { width: c.width } : null),
                  }}
                >
                  {c.label}
                </th>
              ))}
              {/* Acciones: width 1% + nowrap = la columna mide exactamente lo
                  que ocupan sus botones y el resto del ancho va al periodo. */}
              <th
                className="sticky right-0 z-20 border-b border-hairline px-3 py-2 text-right text-label font-medium text-neutral-500"
                style={{ width: "1%", background: BG_HEAD, ...stickyEdge }}
              >
                {/* actions column — no label */}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !adding && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="border-b border-hairline px-4 py-10 text-center text-[13px] text-neutral-400"
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
                  className="group h-row transition-colors hover:bg-rail"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "border-b border-hairline px-4 py-2 text-[13.5px]",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center"
                      )}
                    >
                      {isEditing
                        ? c.editor(working, updateDraft)
                        : c.render(row)}
                    </td>
                  ))}
                  {/* El fondo opaco solo hace falta cuando hay celdas pasando
                      por debajo; si la tabla entra entera, la celda hereda el
                      fondo de la fila y no se distingue del resto. */}
                  <td
                    className={cn(
                      "sticky right-0 z-10 whitespace-nowrap border-b border-hairline px-3 py-2",
                      overflowsRight && "bg-white group-hover:bg-[#F9F9FA]"
                    )}
                    style={stickyEdge}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <ActionButton onClick={commitEdit} variant="confirm">
                            {confirmLabel}
                          </ActionButton>
                          <ActionButton onClick={cancelEdit}>
                            Cancelar
                          </ActionButton>
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
              <tr className="h-row">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "border-b border-hairline px-4 py-2 text-[13.5px]",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center"
                    )}
                    style={{ background: BG_ADDING }}
                  >
                    {c.editor(adding as T, updateAdding)}
                  </td>
                ))}
                <td
                  className="sticky right-0 z-10 whitespace-nowrap border-b border-hairline px-3 py-2"
                  style={{ background: BG_ADDING, ...stickyEdge }}
                >
                  {/* Pedido de Gero (27/08): la fila nueva necesita un boton
                      explicito, no un check suelto arriba de todo. */}
                  <div className="flex items-center justify-end gap-1">
                    <ActionButton onClick={commitAdd} variant="confirm">
                      {confirmLabel}
                    </ActionButton>
                    <ActionButton onClick={cancelAdd}>Cancelar</ActionButton>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add row trigger — fuera del contenedor scrolleable para que no se
          desplace cuando la tabla desborda. */}
      {onAdd && !adding && (
        <button
          type="button"
          onClick={startAdd}
          className="flex w-full items-center justify-center gap-1.5 bg-transparent px-4 py-2.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:bg-rail hover:text-neutral-800"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {addLabel}
        </button>
      )}
    </div>
  );
}

// Generic forwardRef wrapper. The cast preserves the <T> generic which plain
// React.forwardRef erases.
export const InlineEditTable = React.forwardRef(InlineEditTableInner) as <
  T extends object,
>(
  props: InlineEditTableProps<T> & React.RefAttributes<InlineEditTableHandle>,
) => React.ReactElement | null;

// ---------------------------------------------------------------------------
// ActionButton — confirmar / cancelar con texto (fila en edicion y en alta)
// ---------------------------------------------------------------------------

function ActionButton({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "confirm";
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2",
        variant === "confirm"
          ? "bg-[#3BBFAD] text-white shadow-sm hover:bg-[#2A9E8E] focus-visible:ring-[#3BBFAD]/40"
          : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:ring-neutral-300"
      )}
    >
      {children}
    </button>
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
  variant?: "danger";
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
        variant === "danger" &&
          "text-neutral-500 hover:bg-brand-red-50 hover:text-[#CC2030]"
      )}
    >
      {children}
    </button>
  );
}
