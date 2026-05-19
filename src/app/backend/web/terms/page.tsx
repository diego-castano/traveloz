"use client";

import { useEffect, useState } from "react";
import {
  listTermSections,
  createTermSection,
  updateTermSection,
  deleteTermSection,
} from "@/actions/cms-content.actions";
import { SortableList } from "../_components/SortableList";
import { RichEditorDialog } from "../_components/RichEditorDialog";
import { SettingsForm } from "../_components/SettingsForm";

type Row = Awaited<ReturnType<typeof listTermSections>>[number];

export default function WebTermsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const refresh = () => listTermSections().then(setItems);
  useEffect(() => {
    refresh();
  }, []);

  const onSave = async (values: Record<string, string>) => {
    if (editing === "new") {
      await createTermSection({
        title: values.title,
        bodyHtml: values.bodyHtml,
      });
    } else if (editing) {
      await updateTermSection(editing.id, {
        title: values.title,
        bodyHtml: values.bodyHtml,
      });
    }
    await refresh();
  };

  const initialValues =
    editing && editing !== "new"
      ? { title: editing.title, bodyHtml: editing.bodyHtml }
      : { title: "", bodyHtml: "" };

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <SettingsForm
        group="terms"
        title="Página /terms — Cabecera"
        blurb="Título, subtítulo y banners (desktop + mobile) que se muestran arriba de las secciones legales."
        publicHref="/terms"
      />

      <div className="border-t border-neutral-200/80 pt-6">
        <h2 className="text-xl font-semibold text-neutral-900">
          Secciones legales
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Cada sección se renderiza como acordeón en la página pública.
        </p>
      </div>

      <SortableList
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          subtitle: i.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 120) + "…",
          activo: i.activo,
          orden: i.orden,
        }))}
        onCreate={() => setEditing("new")}
        onEdit={(item) => {
          const row = items.find((i) => i.id === item.id);
          if (row) setEditing(row);
        }}
        onToggleActive={async (item) => {
          await updateTermSection(item.id, { activo: !item.activo });
          await refresh();
        }}
        onDelete={async (item) => {
          await deleteTermSection(item.id);
          await refresh();
        }}
        onReorder={async (next) => {
          for (const it of next) {
            await updateTermSection(it.id, { orden: it.orden });
          }
          await refresh();
        }}
        emptyMessage="Sin secciones cargadas. Hacé click en + Nuevo."
      />

      {editing && (
        <RichEditorDialog
          title={editing === "new" ? "Nueva sección" : "Editar sección"}
          fields={[
            {
              type: "text",
              key: "title",
              label: "Título de la sección",
              placeholder: "ej. Identificación de la agencia",
              required: true,
            },
            {
              type: "html",
              key: "bodyHtml",
              label: "Contenido (HTML)",
              placeholder: "<p>Texto legal…</p>",
              rows: 16,
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
