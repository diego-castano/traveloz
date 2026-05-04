"use client";

import { useEffect, useState } from "react";
import {
  listClientesCorporativos,
  createClienteCorporativo,
  updateClienteCorporativo,
  deleteClienteCorporativo,
} from "@/actions/cms-content.actions";
import { SortableList } from "../_components/SortableList";
import { RichEditorDialog } from "../_components/RichEditorDialog";

type Row = Awaited<ReturnType<typeof listClientesCorporativos>>[number];

export default function WebClientesPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const refresh = () => listClientesCorporativos().then(setItems);
  useEffect(() => {
    refresh();
  }, []);

  const onSave = async (values: Record<string, string>) => {
    if (editing === "new") {
      await createClienteCorporativo({
        nombre: values.nombre,
        logoUrl: values.logoUrl,
        link: values.link || null,
      });
    } else if (editing) {
      await updateClienteCorporativo(editing.id, {
        nombre: values.nombre,
        logoUrl: values.logoUrl,
        link: values.link || null,
      });
    }
    await refresh();
  };

  const initialValues =
    editing && editing !== "new"
      ? {
          nombre: editing.nombre,
          logoUrl: editing.logoUrl,
          link: editing.link ?? "",
        }
      : { nombre: "", logoUrl: "", link: "" };

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">
          Clientes corporativos
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Logos del &ldquo;Confían en nosotros&rdquo; en{" "}
          <code>/corporativo</code>.
        </p>
      </div>

      <SortableList
        items={items.map((i) => ({
          id: i.id,
          title: i.nombre,
          subtitle: i.link ?? undefined,
          thumbUrl: i.logoUrl,
          activo: i.activo,
          orden: i.orden,
        }))}
        onCreate={() => setEditing("new")}
        onEdit={(item) => {
          const row = items.find((i) => i.id === item.id);
          if (row) setEditing(row);
        }}
        onToggleActive={async (item) => {
          await updateClienteCorporativo(item.id, { activo: !item.activo });
          await refresh();
        }}
        onDelete={async (item) => {
          await deleteClienteCorporativo(item.id);
          await refresh();
        }}
        onReorder={async (next) => {
          for (const it of next) {
            await updateClienteCorporativo(it.id, { orden: it.orden });
          }
          await refresh();
        }}
        emptyMessage="Sin clientes corporativos cargados."
      />

      {editing && (
        <RichEditorDialog
          title={editing === "new" ? "Nuevo cliente" : "Editar cliente"}
          fields={[
            {
              type: "text",
              key: "nombre",
              label: "Nombre del cliente",
              placeholder: "ej. Canal 10",
              required: true,
            },
            { type: "image", key: "logoUrl", label: "Logo" },
            {
              type: "url",
              key: "link",
              label: "Link (opcional)",
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
