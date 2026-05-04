"use client";

import { useEffect, useState } from "react";
import { X, Save, Bold, Italic, Link as LinkIcon, List } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MediaPicker } from "./MediaPicker";

export type RichField =
  | { type: "text"; key: string; label: string; placeholder?: string; required?: boolean }
  | { type: "email"; key: string; label: string; required?: boolean }
  | { type: "url"; key: string; label: string }
  | { type: "image"; key: string; label: string }
  | { type: "html"; key: string; label: string; placeholder?: string; rows?: number }
  | { type: "textarea"; key: string; label: string; rows?: number };

type Props = {
  title: string;
  fields: RichField[];
  values: Record<string, string>;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
};

/**
 * Modal-like dialog used by all CMS list editors (FAQ, Terms, Clientes, Equipo).
 * Supports text/email/url/image (uploader) and a lightweight HTML textarea
 * with quick insert buttons for bold/italic/link/list — no heavy WYSIWYG dep.
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(values);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const insertAt = (key: string, before: string, after: string) => {
    const ta = document.querySelector<HTMLTextAreaElement>(
      `textarea[data-rich-key="${key}"]`,
    );
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const sel = text.slice(start, end);
    const next = text.slice(0, start) + before + sel + after + text.slice(end);
    set(key, next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
            <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
                {f.type === "html" && (
                  <div className="border border-neutral-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20">
                    <div className="flex items-center gap-1 bg-neutral-50 border-b border-neutral-200 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => insertAt(f.key, "<strong>", "</strong>")}
                        className="p-1 text-neutral-600 hover:bg-neutral-200 rounded"
                        title="Negrita"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAt(f.key, "<em>", "</em>")}
                        className="p-1 text-neutral-600 hover:bg-neutral-200 rounded"
                        title="Cursiva"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertAt(f.key, '<a href="https://">', "</a>")
                        }
                        className="p-1 text-neutral-600 hover:bg-neutral-200 rounded"
                        title="Link"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertAt(
                            f.key,
                            "\n<ul>\n  <li>",
                            "</li>\n  <li>Item</li>\n</ul>",
                          )
                        }
                        className="p-1 text-neutral-600 hover:bg-neutral-200 rounded"
                        title="Lista"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-neutral-400 ml-auto">
                        Acepta HTML
                      </span>
                    </div>
                    <textarea
                      data-rich-key={f.key}
                      value={values[f.key] ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}
                      rows={f.rows ?? 8}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm bg-white outline-none font-mono resize-y"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-end gap-2 bg-neutral-50/50">
            <Button variant="secondary" size="sm" onClick={onClose}>
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
      </div>
    </>
  );
}
