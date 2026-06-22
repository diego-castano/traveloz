"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Pencil, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export type ListItem = {
  id: string;
  title: string;
  subtitle?: string;
  thumbUrl?: string;
  activo: boolean;
  orden: number;
};

type Props<T extends ListItem> = {
  items: T[];
  onCreate: () => void;
  onEdit: (item: T) => void;
  onToggleActive: (item: T) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  onReorder?: (items: T[]) => Promise<void>;
  emptyMessage?: string;
  createLabel?: string;
};

/**
 * Generic admin list with thumbnail / title / subtitle / activate-toggle /
 * delete / edit, and drag-and-drop reordering (dnd-kit) when `onReorder` is
 * provided. Used by FAQ, Terms, Clientes, Equipo, servicios and categorías so
 * every Frontend list shares the same interaction model.
 */
export function SortableList<T extends ListItem>({
  items,
  onCreate,
  onEdit,
  onToggleActive,
  onDelete,
  onReorder,
  emptyMessage = "No hay elementos cargados todavía.",
  createLabel = "+ Nuevo",
}: Props<T>) {
  const { toast } = useToast();
  const [, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((x) => x.id === active.id);
    const to = items.findIndex((x) => x.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(items, from, to).map((x, i) => ({ ...x, orden: i }));
    start(async () => {
      try {
        await onReorder(next);
      } catch (e) {
        toast("error", "Error al reordenar", (e as Error).message);
      }
    });
  };

  const handleDelete = (item: T) => {
    if (!confirm(`¿Eliminar "${item.title}"?`)) return;
    setBusyId(item.id);
    start(async () => {
      try {
        await onDelete(item);
        toast("success", "Eliminado");
      } catch (e) {
        toast("error", "Error al eliminar", (e as Error).message);
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleToggle = (item: T) => {
    setBusyId(item.id);
    start(async () => {
      try {
        await onToggleActive(item);
      } catch (e) {
        toast("error", "Error", (e as Error).message);
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onCreate} variant="primary" size="sm">
          <Plus className="w-4 h-4" />
          {createLabel}
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-400">
            {emptyMessage}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-neutral-100">
                {items.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    draggable={!!onReorder}
                    busy={busyId === item.id}
                    onEdit={() => onEdit(item)}
                    onToggle={() => handleToggle(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function Row<T extends ListItem>({
  item,
  draggable,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: T;
  draggable: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !draggable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : item.activo ? 1 : 0.6,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white px-4 py-3 hover:bg-neutral-50"
    >
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
          className="cursor-grab text-neutral-300 hover:text-neutral-600 active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Thumb */}
      {item.thumbUrl !== undefined && (
        <div className="w-12 h-12 rounded-md bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
          {item.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.3";
              }}
            />
          ) : (
            <span className="text-neutral-400 text-[10px]">sin foto</span>
          )}
        </div>
      )}

      {/* Title + subtitle */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-neutral-900 truncate">
          {item.title}
        </div>
        {item.subtitle && (
          <div className="text-[12px] text-neutral-500 truncate">
            {item.subtitle}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={`px-2 py-1 rounded-md text-[11px] font-medium ring-1 ring-inset ${
            item.activo
              ? "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100"
              : "bg-neutral-100 text-neutral-500 ring-neutral-200 hover:bg-neutral-200"
          }`}
          title={item.activo ? "Despublicar" : "Publicar"}
        >
          {item.activo ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-neutral-500 hover:text-violet-600"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="p-1.5 text-neutral-500 hover:text-red-600"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}
