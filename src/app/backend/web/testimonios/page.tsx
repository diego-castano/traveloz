"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  listTestimonios,
  createTestimonio,
  updateTestimonio,
  deleteTestimonio,
} from "@/actions/testimonios.actions";

type Row = Awaited<ReturnType<typeof listTestimonios>>[number];

const EMPTY = {
  ubicacion: "",
  titulo: "",
  texto: "",
  autor: "",
  rating: 5,
  imageUrl: "",
};

export default function WebTestimoniosPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [, start] = useTransition();
  const [draft, setDraft] = useState(EMPTY);

  const refresh = () => listTestimonios().then(setRows);
  useEffect(() => {
    refresh();
  }, []);

  const open = (r?: Row) => {
    setEditing(r ?? null);
    setDraft(
      r
        ? {
            ubicacion: r.ubicacion,
            titulo: r.titulo,
            texto: r.texto,
            autor: r.autor,
            rating: r.rating,
            imageUrl: r.imageUrl ?? "",
          }
        : EMPTY,
    );
    setShowForm(true);
  };

  const onSubmit = () =>
    start(async () => {
      try {
        const payload = {
          ...draft,
          imageUrl: draft.imageUrl || null,
        };
        if (editing) {
          await updateTestimonio(editing.id, payload);
        } else {
          await createTestimonio(payload);
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

  const onTogglePublicado = (r: Row) =>
    start(async () => {
      await updateTestimonio(r.id, { publicado: !r.publicado });
      await refresh();
    });

  const onDelete = (id: string) =>
    start(async () => {
      if (!confirm("¿Eliminar este testimonio?")) return;
      await deleteTestimonio(id);
      await refresh();
      toast("success", "Eliminado");
    });

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Testimonios</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Relatos de viajeros. Solo los <strong>publicados</strong> aparecen
            en la home.
          </p>
        </div>
        <Button onClick={() => open()} variant="primary" size="sm">
          <Plus className="w-4 h-4" />
          Nuevo
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <h3 className="font-medium">
            {editing ? "Editar testimonio" : "Nuevo testimonio"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Ubicación (ej. Punta Cana)"
              value={draft.ubicacion}
              onChange={(e) => setDraft({ ...draft, ubicacion: e.target.value })}
            />
            <Input
              placeholder="Autor"
              value={draft.autor}
              onChange={(e) => setDraft({ ...draft, autor: e.target.value })}
            />
          </div>
          <Input
            placeholder="Título"
            value={draft.titulo}
            onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
          />
          <textarea
            placeholder="Texto del testimonio"
            value={draft.texto}
            onChange={(e) => setDraft({ ...draft, texto: e.target.value })}
            rows={5}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm bg-white"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Rating (1-5)
              </label>
              <Input
                type="number"
                min={1}
                max={5}
                value={String(draft.rating)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rating: Math.max(1, Math.min(5, Number(e.target.value) || 5)),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Imagen URL (opcional)
              </label>
              <Input
                placeholder="/site/img/slider-4.webp"
                value={draft.imageUrl}
                onChange={(e) =>
                  setDraft({ ...draft, imageUrl: e.target.value })
                }
              />
            </div>
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
              <th className="text-left px-4 py-2 font-medium">Ubicación</th>
              <th className="text-left px-4 py-2 font-medium">Título</th>
              <th className="text-left px-4 py-2 font-medium">Autor</th>
              <th className="text-left px-4 py-2 font-medium">★</th>
              <th className="text-left px-4 py-2 font-medium">Estado</th>
              <th className="text-right px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-400">
                  No hay testimonios todavía. Hacé click en{" "}
                  <strong>Nuevo</strong> para crear el primero.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-100 hover:bg-neutral-50/50"
              >
                <td className="px-4 py-3 text-neutral-900">{r.ubicacion}</td>
                <td className="px-4 py-3">{r.titulo}</td>
                <td className="px-4 py-3 text-neutral-600">{r.autor}</td>
                <td className="px-4 py-3 inline-flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onTogglePublicado(r)}
                    className={`px-2 py-1 text-xs rounded font-medium ${
                      r.publicado
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {r.publicado ? "Publicado" : "Borrador"}
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
