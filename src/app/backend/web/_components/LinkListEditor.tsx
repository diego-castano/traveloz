// ---------------------------------------------------------------------------
// Editor amigable de listas de enlaces del footer. Reemplaza el textarea con
// JSON crudo por filas con "Texto" + "Enlace", botones de agregar, quitar y
// reordenar. Serializa al MISMO formato [{label, href}] que ya guarda el
// setting, así el footer público (Footer.tsx) no cambia.
// ---------------------------------------------------------------------------

"use client";

import { useMemo } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";

type LinkItem = { label: string; href: string };

function parseLinks(json: string): { items: LinkItem[]; ok: boolean } {
  const raw = (json ?? "").trim();
  if (!raw) return { items: [], ok: true };
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return { items: [], ok: false };
    return {
      items: arr.map((x) => ({
        label: String(x?.label ?? ""),
        href: String(x?.href ?? ""),
      })),
      ok: true,
    };
  } catch {
    return { items: [], ok: false };
  }
}

export function LinkListEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const { items, ok } = useMemo(() => parseLinks(value), [value]);

  // Serializa con las mismas claves que consume el footer público.
  const commit = (next: LinkItem[]) =>
    onChange(JSON.stringify(next.map((i) => ({ label: i.label, href: i.href }))));

  const patchRow = (index: number, patch: Partial<LinkItem>) =>
    commit(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const removeRow = (index: number) =>
    commit(items.filter((_, i) => i !== index));

  const moveRow = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const addRow = () => commit([...items, { label: "", href: "" }]);

  if (!ok) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
        <p className="text-[11px] text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          El valor guardado no es una lista de enlaces válida. Empezá de cero
          para editarlo con el editor.
        </p>
        <button
          type="button"
          onClick={() => commit([])}
          className="text-xs font-medium text-red-700 underline hover:no-underline"
        >
          Empezar de cero
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-neutral-400">
          No hay enlaces. Agregá el primero abajo.
        </p>
      )}

      {items.map((row, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50/50 p-2"
        >
          <div className="flex flex-col gap-0.5 pt-1">
            <button
              type="button"
              onClick={() => moveRow(i, -1)}
              disabled={i === 0}
              aria-label="Subir"
              className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:hover:text-neutral-400"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveRow(i, 1)}
              disabled={i === items.length - 1}
              aria-label="Bajar"
              className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:hover:text-neutral-400"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-neutral-400 mb-0.5">
                Texto
              </label>
              <Input
                value={row.label}
                placeholder="Ej: Nosotros"
                onChange={(e) => patchRow(i, { label: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-neutral-400 mb-0.5">
                Enlace
              </label>
              <Input
                value={row.href}
                placeholder="Ej: /about o https://…"
                onChange={(e) => patchRow(i, { href: e.target.value })}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeRow(i)}
            aria-label="Quitar enlace"
            className="mt-5 text-neutral-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900 mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar enlace
      </button>
    </div>
  );
}
