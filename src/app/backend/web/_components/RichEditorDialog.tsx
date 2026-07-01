"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MediaPicker } from "./MediaPicker";
import { WysiwygEditor } from "./WysiwygEditor";

export type RichField =
  | { type: "text"; key: string; label: string; placeholder?: string; required?: boolean }
  | { type: "email"; key: string; label: string; required?: boolean }
  | { type: "url"; key: string; label: string }
  | { type: "image"; key: string; label: string; hideUrl?: boolean; compact?: boolean }
  | { type: "html"; key: string; label: string; placeholder?: string; rows?: number }
  | { type: "textarea"; key: string; label: string; rows?: number }
  | { type: "rating"; key: string; label: string; max?: number };

type Props = {
  title: string;
  fields: RichField[];
  values: Record<string, string>;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
};

/**
 * Drawer lateral derecho usado por todos los editores CMS (FAQ, Terms, Clientes,
 * Equipo, etc.). Soporta text/email/url/image (uploader) y un editor visual
 * (WysiwygEditor) para campos HTML — formato visible, sin dependencias pesadas.
 *
 * Reemplaza al viejo modal centrado: editar texto largo en un panel ancho a la
 * derecha es más cómodo y deja ver la lista/preview debajo.
 */
export function RichEditorDialog({
  title,
  fields,
  values: initial,
  onClose,
  onSave,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  // Estado de apertura para animar el slide-in/out sin desmontar de golpe.
  const [open, setOpen] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    // Próximo frame: pasa de translate-x-full a 0 → desliza al entrar.
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);
    window.setTimeout(onClose, 250); // espera a que termine la transición
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(values);
      requestClose();
    } finally {
      setSaving(false);
    }
  };

  // Portal a <body>: el layout del backend tiene ancestros con transform
  // (preview escalado), y position:fixed se posicionaría contra ellos en vez
  // del viewport. El portal saca el drawer de ese contexto.
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-[250ms] ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={requestClose}
      />
      {/* Drawer lateral derecho */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col transition-transform duration-[250ms] ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <button
            onClick={requestClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {f.label}
                  {"required" in f && f.required && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                </label>
                {f.type === "text" && (
                  <Input
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                )}
                {f.type === "email" && (
                  <Input
                    type="email"
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.type === "url" && (
                  <Input
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder="https://…"
                  />
                )}
                {f.type === "image" && (
                  <MediaPicker
                    value={values[f.key] ?? ""}
                    onChange={(v) => set(f.key, v)}
                    accept="image/*"
                    hideUrl={f.hideUrl}
                    compact={f.compact}
                  />
                )}
                {f.type === "textarea" && (
                  <textarea
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={f.rows ?? 3}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                )}
                {f.type === "rating" && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: f.max ?? 5 }).map((_, i) => {
                      const val = i + 1;
                      const active = (Number(values[f.key]) || 0) >= val;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => set(f.key, String(val))}
                          className="p-1 transition-transform hover:scale-110"
                          aria-label={`${val} ${val === 1 ? "estrella" : "estrellas"}`}
                          title={`${val} de ${f.max ?? 5}`}
                        >
                          <Star
                            className={`w-7 h-7 ${
                              active
                                ? "fill-amber-400 text-amber-400"
                                : "text-neutral-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 text-sm text-neutral-500 tabular-nums">
                      {Number(values[f.key]) || 0}/{f.max ?? 5}
                    </span>
                  </div>
                )}
                {f.type === "html" && (
                  <WysiwygEditor
                    value={values[f.key] ?? ""}
                    onChange={(v) => set(f.key, v)}
                    placeholder={f.placeholder}
                    minRows={f.rows ?? 8}
                  />
                )}
              </div>
            ))}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-2 bg-neutral-50/50">
          <Button variant="secondary" size="sm" onClick={requestClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
