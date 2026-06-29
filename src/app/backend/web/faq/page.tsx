"use client";

import { useEffect, useState } from "react";
import {
  listFaqTopics,
  createFaqTopic,
  updateFaqTopic,
  deleteFaqTopic,
} from "@/actions/cms-content.actions";
import { SortableList } from "../_components/SortableList";
import { RichEditorDialog } from "../_components/RichEditorDialog";
import { SettingsForm } from "../_components/SettingsForm";
import { useWebEdit } from "../_components/web-edit-context";

type Row = Awaited<ReturnType<typeof listFaqTopics>>[number];

export default function WebFaqPage() {
  const { refreshPreview } = useWebEdit();
  const [items, setItems] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const refresh = () =>
    listFaqTopics().then((rows) => {
      setItems(rows);
      refreshPreview();
    });
  useEffect(() => {
    refresh();
  }, []);

  const onSave = async (values: Record<string, string>) => {
    if (editing === "new") {
      await createFaqTopic({
        label: values.label,
        bodyHtml: values.bodyHtml,
        iconUrl: values.iconUrl || null,
      });
    } else if (editing) {
      await updateFaqTopic(editing.id, {
        label: values.label,
        bodyHtml: values.bodyHtml,
        iconUrl: values.iconUrl || null,
      });
    }
    await refresh();
  };

  const initialValues =
    editing && editing !== "new"
      ? {
          label: editing.label,
          bodyHtml: editing.bodyHtml,
          iconUrl: editing.iconUrl ?? "",
        }
      : { label: "", bodyHtml: "", iconUrl: "" };

  return (
    <div className="p-6 max-w-4xl space-y-8">
      {/* Header chrome: title, subtitle, banners */}
      <SettingsForm
        group="faq"
        title="Página /faq — Cabecera"
        blurb="Título, subtítulo y banners (desktop + mobile) que se muestran arriba de los topics."
        publicHref="/faq"
      />

      <div className="border-t border-neutral-200/80 pt-6">
        <h2 className="text-xl font-semibold text-neutral-900">
          Topics de FAQ
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Cada topic aparece como una tab en desktop y como acordeón en mobile.
        </p>
      </div>

      <SortableList
        items={items.map((i) => ({
          id: i.id,
          title: i.label,
          subtitle: i.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 100) + "…",
          thumbUrl: i.iconUrl ?? undefined,
          activo: i.activo,
          orden: i.orden,
        }))}
        onCreate={() => setEditing("new")}
        onEdit={(item) => {
          const row = items.find((i) => i.id === item.id);
          if (row) setEditing(row);
        }}
        onToggleActive={async (item) => {
          await updateFaqTopic(item.id, { activo: !item.activo });
          await refresh();
        }}
        onDelete={async (item) => {
          await deleteFaqTopic(item.id);
          await refresh();
        }}
        onReorder={async (next) => {
          for (const it of next) {
            await updateFaqTopic(it.id, { orden: it.orden });
          }
          await refresh();
        }}
        emptyMessage="Sin preguntas frecuentes. Hacé click en + Nuevo."
      />

      {editing && (
        <RichEditorDialog
          title={editing === "new" ? "Nueva pregunta" : "Editar pregunta"}
          fields={[
            {
              type: "text",
              key: "label",
              label: "Pregunta / Título del topic",
              placeholder: "ej. Documentación",
              required: true,
            },
            {
              type: "image",
              key: "iconUrl",
              label: "Icono (opcional)",
              compact: true,
            },
            {
              type: "html",
              key: "bodyHtml",
              label: "Respuesta",
              placeholder: "Escribí la respuesta. Seleccioná texto y usá la barra para negrita, subtítulos o listas.",
              rows: 14,
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
