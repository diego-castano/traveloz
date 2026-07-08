"use client";

import { useEffect, useState } from "react";
import {
  listTestimonios,
  createTestimonio,
  updateTestimonio,
  deleteTestimonio,
} from "@/actions/testimonios.actions";
import { SortableList } from "../_components/SortableList";
import { RichEditorDialog } from "../_components/RichEditorDialog";
import { useWebEdit } from "../_components/web-edit-context";

type Row = Awaited<ReturnType<typeof listTestimonios>>[number];

export default function WebTestimoniosPage() {
  const { refreshPreview } = useWebEdit();
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const refresh = () =>
    listTestimonios().then((rows) => {
      setItems(rows);
      refreshPreview();
    });
  useEffect(() => {
    refresh();
  }, []);

  const onSave = async (values: Record<string, string>) => {
    const payload = {
      ubicacion: values.ubicacion,
      titulo: values.titulo,
      texto: values.texto,
      autor: values.autor,
      rating: Math.max(1, Math.min(5, Number(values.rating) || 5)),
      imageUrl: values.imageUrl || null,
    };
    if (editing === "new") {
      await createTestimonio(payload);
    } else if (editing) {
      await updateTestimonio(editing.id, payload);
    }
    await refresh();
  };

  const initialValues =
    editing && editing !== "new"
      ? {
          ubicacion: editing.ubicacion,
          titulo: editing.titulo,
          texto: editing.texto,
          autor: editing.autor,
          rating: String(editing.rating),
          imageUrl: editing.imageUrl ?? "",
        }
      : {
          ubicacion: "",
          titulo: "",
          texto: "",
          autor: "",
          rating: "5",
          imageUrl: "",
        };

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">Testimonios</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Relatos de viajeros. Solo los <strong>publicados</strong> aparecen en
          la home. Arrastrá para reordenar.
        </p>
      </div>

      <SortableList
        items={items.map((i) => ({
          id: i.id,
          title: i.titulo,
          subtitle: `${i.ubicacion} · ${i.autor} · ${"★".repeat(i.rating)}`,
          thumbUrl: i.imageUrl ?? undefined,
          activo: i.publicado,
          orden: i.orden,
        }))}
        onCreate={() => setEditing("new")}
        onEdit={(item) => {
          const row = items.find((i) => i.id === item.id);
          if (row) setEditing(row);
        }}
        onToggleActive={async (item) => {
          await updateTestimonio(item.id, { publicado: !item.activo });
          await refresh();
        }}
        onDelete={async (item) => {
          await deleteTestimonio(item.id);
          await refresh();
        }}
        onReorder={async (next) => {
          for (const it of next) {
            await updateTestimonio(it.id, { orden: it.orden });
          }
          await refresh();
        }}
        emptyMessage="No hay testimonios todavía. Creá el primero con “Nuevo testimonio”."
        createLabel="+ Nuevo testimonio"
      />

      {editing && (
        <RichEditorDialog
          title={editing === "new" ? "Nuevo testimonio" : "Editar testimonio"}
          fields={[
            {
              type: "text",
              key: "ubicacion",
              label: "Ubicación",
              placeholder: "ej. Punta Cana",
              required: true,
            },
            { type: "text", key: "autor", label: "Autor", required: true },
            { type: "text", key: "titulo", label: "Título", required: true },
            {
              type: "textarea",
              key: "texto",
              label: "Texto del testimonio",
              rows: 8,
            },
            { type: "rating", key: "rating", label: "Rating", max: 5 },
            { type: "image", key: "imageUrl", label: "Imagen (opcional)", hideUrl: true },
          ]}
          values={initialValues}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}
