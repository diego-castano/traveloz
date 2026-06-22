"use client";

import { useCallback } from "react";
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
import { GripVertical, Trash2, Plus, X } from "lucide-react";
import {
  type FormField,
  type FormFieldType,
  type FormFieldOption,
  FIELD_TYPE_LABEL,
  TIPOS_CON_OPCIONES,
  nuevoId,
} from "@/lib/cotizador-form";

const ADD_TYPES: FormFieldType[] = [
  "texto",
  "parrafo",
  "numero",
  "email",
  "telefono",
  "rango_fechas",
  "seleccion",
  "multiple",
  "casilla",
  "nota",
];

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

function defaultsFor(tipo: FormFieldType): FormField {
  const base: FormField = { id: nuevoId(), tipo, etiqueta: "", requerido: false };
  if (TIPOS_CON_OPCIONES.includes(tipo)) {
    base.opciones = [{ id: nuevoId(), label: "" }];
  }
  return base;
}

export function FormBuilder({
  campos,
  onChange,
}: {
  campos: FormField[];
  onChange: (campos: FormField[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = campos.findIndex((c) => c.id === active.id);
    const to = campos.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(campos, from, to));
  };

  const patch = useCallback(
    (id: string, p: Partial<FormField>) => {
      onChange(campos.map((c) => (c.id === id ? { ...c, ...p } : c)));
    },
    [campos, onChange],
  );

  const changeType = useCallback(
    (id: string, tipo: FormFieldType) => {
      onChange(
        campos.map((c) => {
          if (c.id !== id) return c;
          const next: FormField = { ...c, tipo };
          if (TIPOS_CON_OPCIONES.includes(tipo) && (!next.opciones || next.opciones.length === 0)) {
            next.opciones = [{ id: nuevoId(), label: "" }];
          }
          return next;
        }),
      );
    },
    [campos, onChange],
  );

  const remove = useCallback(
    (id: string) => {
      // Limpiamos condiciones que apuntaban al campo borrado.
      onChange(
        campos
          .filter((c) => c.id !== id)
          .map((c) => (c.mostrarSi?.campoId === id ? { ...c, mostrarSi: undefined } : c)),
      );
    },
    [campos, onChange],
  );

  const add = (tipo: FormFieldType) => onChange([...campos, defaultsFor(tipo)]);

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={campos.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {campos.map((campo, i) => (
              <FieldCard
                key={campo.id}
                campo={campo}
                controles={campos.slice(0, i).filter((c) => c.tipo === "seleccion" || c.tipo === "casilla")}
                onPatch={(p) => patch(campo.id, p)}
                onChangeType={(t) => changeType(campo.id, t)}
                onRemove={() => remove(campo.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {campos.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          El formulario no tiene campos. Agregá el primero.
        </p>
      )}

      <div className="flex items-center gap-2">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) add(e.target.value as FormFieldType);
            e.target.value = "";
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 outline-none focus:border-neutral-900"
        >
          <option value="">+ Agregar campo…</option>
          {ADD_TYPES.map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-400">Arrastrá ⠿ para reordenar.</span>
      </div>
    </div>
  );
}

function FieldCard({
  campo,
  controles,
  onPatch,
  onChangeType,
  onRemove,
}: {
  campo: FormField;
  controles: FormField[];
  onPatch: (p: Partial<FormField>) => void;
  onChangeType: (t: FormFieldType) => void;
  onRemove: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: campo.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  const conOpciones = TIPOS_CON_OPCIONES.includes(campo.tipo);
  const esNota = campo.tipo === "nota";
  const conPlaceholder = campo.tipo === "texto" || campo.tipo === "parrafo" || campo.tipo === "email";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
          className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <select
          value={campo.tipo}
          onChange={(e) => onChangeType(e.target.value as FormFieldType)}
          className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-600 outline-none focus:border-neutral-900"
        >
          {ADD_TYPES.map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Eliminar campo"
          className="rounded-md p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        <input
          value={campo.etiqueta}
          onChange={(e) => onPatch({ etiqueta: e.target.value })}
          placeholder={esNota ? "Título (opcional)" : "Etiqueta del campo"}
          maxLength={200}
          className={inputClass}
        />

        {esNota ? (
          <textarea
            value={campo.contenido ?? ""}
            onChange={(e) => onPatch({ contenido: e.target.value })}
            placeholder="Texto informativo (ej. cláusulas, beneficios…)"
            rows={3}
            maxLength={2000}
            className={inputClass}
          />
        ) : (
          <>
            {conPlaceholder && (
              <input
                value={campo.placeholder ?? ""}
                onChange={(e) => onPatch({ placeholder: e.target.value })}
                placeholder="Texto de ejemplo (placeholder)"
                maxLength={200}
                className={inputClass}
              />
            )}
            <input
              value={campo.ayuda ?? ""}
              onChange={(e) => onPatch({ ayuda: e.target.value })}
              placeholder="Texto de ayuda (opcional)"
              maxLength={300}
              className={inputClass}
            />
          </>
        )}

        {conOpciones && (
          <OptionsEditor
            opciones={campo.opciones ?? []}
            onChange={(opciones) => onPatch({ opciones })}
          />
        )}

        {!esNota && (
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={campo.requerido}
              onChange={(e) => onPatch({ requerido: e.target.checked })}
              className="h-4 w-4"
            />
            Obligatorio
          </label>
        )}

        <ConditionEditor campo={campo} controles={controles} onPatch={onPatch} />
      </div>
    </div>
  );
}

function OptionsEditor({
  opciones,
  onChange,
}: {
  opciones: FormFieldOption[];
  onChange: (o: FormFieldOption[]) => void;
}) {
  const patch = (id: string, p: Partial<FormFieldOption>) =>
    onChange(opciones.map((o) => (o.id === id ? { ...o, ...p } : o)));
  const remove = (id: string) => onChange(opciones.filter((o) => o.id !== id));
  const add = () => onChange([...opciones, { id: nuevoId(), label: "" }]);

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
      <p className="text-xs font-medium text-neutral-500">Opciones</p>
      {opciones.map((o) => (
        <div key={o.id} className="flex items-start gap-2">
          <div className="flex-1 space-y-1.5">
            <input
              value={o.label}
              onChange={(e) => patch(o.id, { label: e.target.value })}
              placeholder="Opción"
              maxLength={200}
              className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <input
              value={o.descripcion ?? ""}
              onChange={(e) => patch(o.id, { descripcion: e.target.value })}
              placeholder="Aclaración / cláusula (opcional)"
              maxLength={300}
              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-500 outline-none focus:border-neutral-900"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(o.id)}
            aria-label="Quitar opción"
            className="mt-1 rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar opción
      </button>
    </div>
  );
}

function ConditionEditor({
  campo,
  controles,
  onPatch,
}: {
  campo: FormField;
  controles: FormField[];
  onPatch: (p: Partial<FormField>) => void;
}) {
  const activo = Boolean(campo.mostrarSi);
  const control = controles.find((c) => c.id === campo.mostrarSi?.campoId);

  // Valores posibles del campo de control: opciones (selección) o "Marcada" (casilla).
  const valores: { value: string; label: string }[] = control
    ? control.tipo === "casilla"
      ? [{ value: "si", label: "Marcada" }]
      : (control.opciones ?? []).map((o) => ({ value: o.id, label: o.label || "(sin nombre)" }))
    : [];

  if (controles.length === 0 && !activo) return null;

  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => {
            if (e.target.checked) {
              const first = controles[0];
              const firstVal =
                first?.tipo === "casilla" ? "si" : first?.opciones?.[0]?.id ?? "";
              onPatch({ mostrarSi: first ? { campoId: first.id, igualA: firstVal } : undefined });
            } else {
              onPatch({ mostrarSi: undefined });
            }
          }}
          disabled={controles.length === 0}
          className="h-4 w-4"
        />
        Mostrar solo si…
      </label>

      {activo && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <select
            value={campo.mostrarSi?.campoId ?? ""}
            onChange={(e) => {
              const c = controles.find((x) => x.id === e.target.value);
              const val = c?.tipo === "casilla" ? "si" : c?.opciones?.[0]?.id ?? "";
              onPatch({ mostrarSi: { campoId: e.target.value, igualA: val } });
            }}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
          >
            {controles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.etiqueta || "(sin etiqueta)"}
              </option>
            ))}
          </select>
          <span className="text-neutral-500">es</span>
          <select
            value={campo.mostrarSi?.igualA ?? ""}
            onChange={(e) =>
              onPatch({
                mostrarSi: { campoId: campo.mostrarSi?.campoId ?? "", igualA: e.target.value },
              })
            }
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
          >
            {valores.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
