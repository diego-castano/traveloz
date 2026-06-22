"use client";

// ---------------------------------------------------------------------------
// /backend/web/categorias — CRUD for CategoriaDestacada (home slider items).
//
// Reordering is drag-and-drop (no manual "orden" number) and the image is
// uploaded straight to the bucket (no pasting URLs), matching the rest of the
// Frontend editors.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import {
  listCategoriasDestacadas,
  createCategoriaDestacada,
  updateCategoriaDestacada,
  deleteCategoriaDestacada,
} from "@/actions/categorias-destacadas.actions";
import { SortableList } from "../_components/SortableList";
import { RichEditorDialog } from "../_components/RichEditorDialog";
import { useWebEdit } from "../_components/web-edit-context";

type Row = Awaited<ReturnType<typeof listCategoriasDestacadas>>[number];

export default function WebCategoriasPage() {
  const { refreshPreview } = useWebEdit();
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const refresh = () =>
    listCategoriasDestacadas().then((rows) => {
      setItems(rows);
      refreshPreview();
    });
  useEffect(() => {
    refresh();
  }, []);

  const onSave = async (values: Record<string, string>) => {
    const data = {
      titulo: values.titulo?.trim() ?? "",
      imagen: values.imagen?.trim() ?? "",
      link: values.link?.trim() ?? "",
    };
    if (editing === "new") {
      await createCategoriaDestacada({ ...data, orden: items.length });
    } else if (editing) {
      await updateCategoriaDestacada(editing.id, data);
    }
    await refresh();
  };

  const initialValues =
    editing && editing !== "new"
      ? { titulo: editing.titulo, imagen: editing.imagen, link: editing.link }
      : { titulo: "", imagen: "", link: "" };

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">
          Categorías destacadas
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Items del slider de la home (ej. Lunas de miel, Salidas grupales,
          Cruceros). Arrastrá para ordenar.
        </p>
      </div>

      <SortableList
        items={items.map((i) => ({
          id: i.id,
          title: i.titulo,
          subtitle: i.link,
          thumbUrl: i.imagen || "",
          activo: i.activa,
          orden: i.orden,
        }))}
        onCreate={() => setEditing("new")}
        onEdit={(item) => {
          const row = items.find((i) => i.id === item.id);
          if (row) setEditing(row);
        }}
        onToggleActive={async (item) => {
          await updateCategoriaDestacada(item.id, { activa: !item.activo });
          await refresh();
        }}
        onDelete={async (item) => {
          await deleteCategoriaDestacada(item.id);
          await refresh();
        }}
        onReorder={async (next) => {
          for (const it of next) {
            await updateCategoriaDestacada(it.id, { orden: it.orden });
          }
          await refresh();
        }}
        emptyMessage="Sin categorías cargadas. Hacé click en + Nueva."
        createLabel="+ Nueva"
      />

      {editing && (
        <RichEditorDialog
          title={editing === "new" ? "Nueva categoría" : "Editar categoría"}
          fields={[
            {
              type: "text",
              key: "titulo",
              label: "Título",
              placeholder: "ej. Lunas de miel",
              required: true,
            },
            {
              type: "image",
              key: "imagen",
              label: "Imagen (se sube al bucket)",
              hideUrl: true,
            },
            {
              type: "text",
              key: "link",
              label: "Link",
              placeholder: "/destinos?tipo=lunas-de-miel",
              required: true,
            },
          ]}
          values={initialValues}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}
