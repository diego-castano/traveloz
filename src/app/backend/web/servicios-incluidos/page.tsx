"use client";

// ---------------------------------------------------------------------------
// /backend/web/servicios-incluidos — CRUD for CatalogoServicio.
//
// Servicios incluidos are the "Incluye" amenities shown on every package
// detail page (vuelo, traslado, alojamiento…). Each row has a name + an
// icon key that maps to a Traveloz SVG icon via the ServiceIcon registry.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import {
  listServicios,
  createServicio,
  updateServicio,
  deleteServicio,
} from "@/actions/catalogo-servicios.actions";
import { ICON_OPTIONS, ServiceIcon } from "@/components/ui/ServiceIcon";
import { SortableList } from "../_components/SortableList";
import { RichEditorDialog } from "../_components/RichEditorDialog";
import { useWebEdit } from "../_components/web-edit-context";

type Row = Awaited<ReturnType<typeof listServicios>>[number];

export default function WebServiciosIncluidosPage() {
  const { refreshPreview } = useWebEdit();
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const refresh = () =>
    listServicios().then((rows) => {
      setItems(rows);
      refreshPreview();
    });
  useEffect(() => {
    refresh();
  }, []);

  const onSave = async (values: Record<string, string>) => {
    const icon = (values.icon ?? "vuelo").trim() || "vuelo";
    if (editing === "new") {
      await createServicio({
        nombre: values.nombre,
        icon,
        descripcion: values.descripcion || null,
      });
    } else if (editing) {
      await updateServicio(editing.id, {
        nombre: values.nombre,
        icon,
        descripcion: values.descripcion || null,
      });
    }
    await refresh();
  };

  const initialValues =
    editing && editing !== "new"
      ? {
          nombre: editing.nombre,
          icon: editing.icon,
          descripcion: editing.descripcion ?? "",
        }
      : { nombre: "", icon: "vuelo", descripcion: "" };

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">
          Servicios incluidos
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Iconos y descripciones que aparecen en la lista <strong>Incluye</strong>{" "}
          de cada paquete en el sitio público. Cada servicio usa una clave de
          icono del set de Traveloz (ver el selector de iconos).
        </p>
      </div>

      <SortableList
        items={items.map((i) => ({
          id: i.id,
          title: i.nombre,
          subtitle: i.descripcion ?? `icon: ${i.icon}`,
          thumbNode: <ServiceIcon icon={i.icon} size={28} />,
          activo: i.activo,
          orden: i.orden,
        }))}
        onCreate={() => setEditing("new")}
        onEdit={(item) => {
          const row = items.find((i) => i.id === item.id);
          if (row) setEditing(row);
        }}
        onToggleActive={async (item) => {
          await updateServicio(item.id, { activo: !item.activo });
          await refresh();
        }}
        onDelete={async (item) => {
          await deleteServicio(item.id);
          await refresh();
        }}
        onReorder={async (next) => {
          for (const it of next) {
            await updateServicio(it.id, { orden: it.orden });
          }
          await refresh();
        }}
        emptyMessage="Sin servicios cargados. Hacé click en + Nuevo."
      />

      {editing && (
        <RichEditorDialog
          title={editing === "new" ? "Nuevo servicio" : "Editar servicio"}
          fields={[
            {
              type: "text",
              key: "nombre",
              label: "Nombre del servicio",
              placeholder: "ej. Pasaje aéreo",
              required: true,
            },
            {
              type: "text",
              key: "icon",
              label: `Icono — uno de: ${ICON_OPTIONS.map((o) => o.key).join(", ")}`,
              placeholder: "vuelo",
              required: true,
            },
            {
              type: "text",
              key: "descripcion",
              label: "Descripción (opcional)",
              placeholder: "Texto breve aclaratorio",
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
