"use client";

import { useState, useCallback } from "react";
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
import { GripVertical, Trash2, Plus, Sparkles, Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { IconPicker } from "@/components/ui/IconPicker";
import {
  type IncluyeItem,
  DEFAULT_INCLUYE_ICON,
  newIncluyeId,
} from "@/lib/incluye";

type CatalogServicio = { id: string; nombre: string; icon: string };

interface Props {
  items: IncluyeItem[];
  onChange: (items: IncluyeItem[]) => void;
  catalog: CatalogServicio[];
  onGenerate: () => Promise<IncluyeItem[]>;
  disabled?: boolean;
}

export function IncluyeEditor({
  items,
  onChange,
  catalog,
  onGenerate,
  disabled,
}: Props) {
  const [generating, setGenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  };

  const patchItem = useCallback(
    (id: string, patch: Partial<IncluyeItem>) => {
      onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    [items, onChange],
  );

  const removeItem = useCallback(
    (id: string) => onChange(items.filter((it) => it.id !== id)),
    [items, onChange],
  );

  const addFromCatalog = useCallback(
    (servicioId: string) => {
      const s = catalog.find((c) => c.id === servicioId);
      if (!s) return;
      onChange([
        ...items,
        {
          id: newIncluyeId(),
          servicioId: s.id,
          icon: s.icon || DEFAULT_INCLUYE_ICON,
          texto: s.nombre,
        },
      ]);
    },
    [catalog, items, onChange],
  );

  const addCustom = useCallback(() => {
    onChange([
      ...items,
      {
        id: newIncluyeId(),
        servicioId: null,
        icon: DEFAULT_INCLUYE_ICON,
        texto: "",
      },
    ]);
  }, [items, onChange]);

  const handleGenerate = useCallback(async () => {
    if (
      items.length > 0 &&
      !window.confirm(
        "Esto reemplaza la lista actual del Incluye con la generada desde los servicios del paquete. ¿Continuar?",
      )
    ) {
      return;
    }
    setGenerating(true);
    try {
      const generated = await onGenerate();
      onChange(generated);
    } finally {
      setGenerating(false);
    }
  }, [items.length, onGenerate, onChange]);

  const catalogOptions = catalog.map((c) => ({ value: c.id, label: c.nombre }));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || generating}
          onClick={handleGenerate}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generar incluido
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={addCustom}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-violet-300 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Agregar libre
        </button>
        <div className="min-w-[220px] flex-1">
          <SearchableSelect
            value=""
            onValueChange={addFromCatalog}
            options={catalogOptions}
            placeholder="Agregar del catálogo…"
            searchPlaceholder="Buscar servicio…"
            emptyText="Sin servicios en el catálogo"
            disabled={disabled}
          />
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center text-sm text-neutral-500">
          Todavía no hay items. Usá <strong>Generar incluido</strong> para
          armarlos desde los servicios del paquete, o agregá uno a mano.
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
            <ul className="space-y-2">
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  disabled={disabled}
                  onIcon={(icon) => patchItem(item.id, { icon })}
                  onText={(texto) => patchItem(item.id, { texto })}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableRow({
  item,
  disabled,
  onIcon,
  onText,
  onRemove,
}: {
  item: IncluyeItem;
  disabled?: boolean;
  onIcon: (icon: string) => void;
  onText: (texto: string) => void;
  onRemove: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label="Arrastrar para reordenar"
        className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing disabled:cursor-not-allowed"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <IconPicker value={item.icon} onChange={onIcon} disabled={disabled} />

      <input
        type="text"
        value={item.texto}
        disabled={disabled}
        placeholder="Texto del item (ej. Pasaje aéreo MVD / GIG / MVD)"
        onChange={(e) => onText(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-transparent bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-800 focus:border-violet-300 focus:bg-white focus:outline-none disabled:opacity-60"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label="Eliminar item"
        className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
