"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  listCategoriasDestacadas,
  createCategoriaDestacada,
  updateCategoriaDestacada,
  deleteCategoriaDestacada,
} from "@/actions/categorias-destacadas.actions";

type Row = Awaited<ReturnType<typeof listCategoriasDestacadas>>[number];

const EMPTY = { titulo: "", imagen: "", link: "", orden: 0 };

export default function WebCategoriasPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [, start] = useTransition();
  const [draft, setDraft] = useState(EMPTY);

  const refresh = () => listCategoriasDestacadas().then(setRows);
  useEffect(() => {
    refresh();
  }, []);

  const open = (r?: Row) => {
    setEditing(r ?? null);
    setDraft(
      r
        ? { titulo: r.titulo, imagen: r.imagen, link: r.link, orden: r.orden }
        : EMPTY,
    );
    setShowForm(true);
  };

  const onSubmit = () =>
    start(async () => {
      try {
        if (editing) {
          await updateCategoriaDestacada(editing.id, draft);
        } else {
          await createCategoriaDestacada(draft);
        }
        setShowForm(false);
        setEditing(null);
        setDraft(EMPTY);
        await refresh();
        toast("success", editing ? "Actualizado" : "Creado");
      } catch (e) {
        toast("error", "Error", (e as Error).message);
      }
    });

  const onToggleActiva = (r: Row) =>
    start(async () => {
      await updateCategoriaDestacada(r.id, { activa: !r.activa });
      await refresh();
    });

  const onDelete = (id: string) =>
    start(async () => {
      if (!confirm("¿Eliminar esta categoría?")) return;
      await deleteCategoriaDestacada(id);
      await refresh();
      toast("success", "Eliminado");
    });

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Categorías destacadas
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Items del slider de la home (ej. Lunas de miel, Salidas grupales,
            Cruceros).
          </p>
        </div>
        <Button onClick={() => open()} variant="primary" size="sm">
          <Plus className="w-4 h-4" />
          Nueva
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <h3 className="font-medium">
            {editing ? "Editar categoría" : "Nueva categoría"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Título
              </label>
              <Input
                value={draft.titulo}
                onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Orden
              </label>
              <Input
                type="number"
                value={String(draft.orden)}
                onChange={(e) =>
                  setDraft({ ...draft, orden: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Imagen URL
            </label>
            <Input
              placeholder="/site/img/slider-1.webp"
              value={draft.imagen}
              onChange={(e) => setDraft({ ...draft, imagen: e.target.value })}
            />
            {draft.imagen && (
              <img
                src={draft.imagen}
                alt=""
                className="mt-2 max-h-32 rounded border border-neutral-200"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Link
            </label>
            <Input
              placeholder="/destinos?tipo=lunas-de-miel"
              value={draft.link}
              onChange={(e) => setDraft({ ...draft, link: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-neutral-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={onSubmit}>
              {editing ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Imagen</th>
              <th className="text-left px-4 py-2 font-medium">Título</th>
              <th className="text-left px-4 py-2 font-medium">Link</th>
              <th className="text-left px-4 py-2 font-medium">Orden</th>
              <th className="text-left px-4 py-2 font-medium">Estado</th>
              <th className="text-right px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-400">
                  No hay categorías cargadas todavía.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-100 hover:bg-neutral-50/50"
              >
                <td className="px-4 py-3">
                  <img
                    src={r.imagen}
                    alt=""
                    className="w-16 h-12 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-neutral-900">{r.titulo}</td>
                <td className="px-4 py-3 text-neutral-500 text-xs">
                  <code>{r.link}</code>
                </td>
                <td className="px-4 py-3 text-neutral-600">{r.orden}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleActiva(r)}
                    className={`px-2 py-1 text-xs rounded font-medium ${
                      r.activa
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {r.activa ? "Activa" : "Inactiva"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => open(r)}
                    className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
