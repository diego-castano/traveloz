"use client";

import { useEffect, useState } from "react";
import {
  listPersonasContacto,
  createPersonaContacto,
  updatePersonaContacto,
  deletePersonaContacto,
} from "@/actions/cms-content.actions";
import { SortableList } from "../_components/SortableList";
import { RichEditorDialog } from "../_components/RichEditorDialog";
import { useWebEdit } from "../_components/web-edit-context";

type Row = Awaited<ReturnType<typeof listPersonasContacto>>[number];

export default function WebEquipoPage() {
  const { refreshPreview } = useWebEdit();
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const refresh = () =>
    listPersonasContacto().then((rows) => {
      setItems(rows);
      refreshPreview();
    });
  useEffect(() => {
    refresh();
  }, []);

  const onSave = async (values: Record<string, string>) => {
    if (editing === "new") {
      await createPersonaContacto({
        nombre: values.nombre,
        rol: values.rol,
        email: values.email,
        photoUrl: values.photoUrl || null,
      });
    } else if (editing) {
      await updatePersonaContacto(editing.id, {
        nombre: values.nombre,
        rol: values.rol,
        email: values.email,
        photoUrl: values.photoUrl || null,
      });
    }
    await refresh();
  };

  const initialValues =
    editing && editing !== "new"
      ? {
          nombre: editing.nombre,
          rol: editing.rol,
          email: editing.email,
          photoUrl: editing.photoUrl ?? "",
        }
      : { nombre: "", rol: "", email: "", photoUrl: "" };

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">
          Equipo de contacto
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Personas que aparecen al pie de <code>/corporativo</code> con sus
          fotos y emails.
        </p>
      </div>

      <SortableList
        items={items.map((i) => ({
          id: i.id,
          title: i.nombre,
          subtitle: `${i.rol} · ${i.email}`,
          thumbUrl: i.photoUrl ?? undefined,
          activo: i.activo,
          orden: i.orden,
        }))}
        onCreate={() => setEditing("new")}
        onEdit={(item) => {
          const row = items.find((i) => i.id === item.id);
          if (row) setEditing(row);
        }}
        onToggleActive={async (item) => {
          await updatePersonaContacto(item.id, { activo: !item.activo });
          await refresh();
        }}
        onDelete={async (item) => {
          await deletePersonaContacto(item.id);
          await refresh();
        }}
        onReorder={async (next) => {
          for (const it of next) {
            await updatePersonaContacto(it.id, { orden: it.orden });
          }
          await refresh();
        }}
        emptyMessage="Sin personas de contacto cargadas."
      />

      {editing && (
        <RichEditorDialog
          title={editing === "new" ? "Nueva persona" : "Editar persona"}
          fields={[
            { type: "text", key: "nombre", label: "Nombre completo", required: true },
            { type: "text", key: "rol", label: "Cargo / Rol", required: true },
            { type: "email", key: "email", label: "Email", required: true },
            { type: "image", key: "photoUrl", label: "Foto" },
          ]}
          values={initialValues}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}
