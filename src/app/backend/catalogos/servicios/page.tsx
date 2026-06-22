"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconPicker } from "@/components/ui/IconPicker";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import {
  listServicios,
  createServicio,
  updateServicio,
  deleteServicio,
} from "@/actions/catalogo-servicios.actions";
import { useToast } from "@/components/ui/Toast";

type Row = Awaited<ReturnType<typeof listServicios>>[number];

export default function ServiciosCatalogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isPending, start] = useTransition();
  const [draft, setDraft] = useState({
    nombre: "",
    icon: "vuelo",
    descripcion: "",
  });
  const { toast } = useToast();

  const refresh = () => listServicios().then(setRows);
  useEffect(() => {
    refresh();
  }, []);

  const onCreate = () => {
    if (!draft.nombre.trim()) return;
    start(async () => {
      try {
        await createServicio(draft);
        setDraft({ nombre: "", icon: "vuelo", descripcion: "" });
        await refresh();
        toast("success", "Servicio creado");
      } catch (e) {
        toast("error", "Error", (e as Error).message);
      }
    });
  };

  const onToggle = (r: Row) =>
    start(async () => {
      await updateServicio(r.id, { activo: !r.activo });
      await refresh();
    });

  const onDelete = (id: string) =>
    start(async () => {
      if (!confirm("¿Eliminar este servicio?")) return;
      try {
        await deleteServicio(id);
        await refresh();
        toast("success", "Eliminado");
      } catch (e) {
        toast(
          "error",
          "No se pudo eliminar",
          "El servicio puede estar asociado a un paquete. Quitalo de los paquetes primero.",
        );
      }
    });

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Catálogo de servicios incluidos
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Estos son los servicios que se asignan a cada paquete desde el tab{" "}
          <strong>Frontend</strong> del paquete y aparecen en la lista{" "}
          <em>Incluye</em> de la página pública.
        </p>
      </div>

      {/* Create row */}
      <div className="flex gap-3 items-end p-4 bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Nombre
          </label>
          <Input
            value={draft.nombre}
            onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
            placeholder="ej. Pasaje aéreo Mvd-GIG"
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Icono
          </label>
          <IconPicker
            value={draft.icon}
            onChange={(v) => setDraft({ ...draft, icon: v })}
          />
        </div>
        <Button
          onClick={onCreate}
          disabled={isPending || !draft.nombre.trim()}
          variant="primary"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </Button>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Icono</th>
              <th className="text-left px-4 py-2 font-medium">Nombre</th>
              <th className="text-left px-4 py-2 font-medium">Estado</th>
              <th className="text-right px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-neutral-400">
                  No hay servicios cargados todavía.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-100 hover:bg-neutral-50/50"
              >
                <td className="px-4 py-3 text-neutral-700">
                  <ServiceIcon icon={r.icon} size={22} />
                </td>
                <td className="px-4 py-3 text-neutral-900">{r.nombre}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggle(r)}
                    className={`px-2 py-1 text-xs rounded font-medium ${
                      r.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {r.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
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
