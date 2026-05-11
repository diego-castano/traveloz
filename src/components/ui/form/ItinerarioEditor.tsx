"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bold,
  Heading,
  Image as ImageIcon,
  Italic,
  Loader2,
  Underline,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";
import { deleteFile, uploadFile } from "@/components/lib/upload";

interface ItinerarioEditorProps {
  text: string;
  onTextChange: (value: string) => void;
  images: string[];
  onImagesChange: (images: string[]) => void;
  readOnly?: boolean;
  folder?: string;
  placeholder?: string;
  rows?: number;
}

export function ItinerarioEditor({
  text,
  onTextChange,
  images,
  onImagesChange,
  readOnly,
  folder = "itinerarios",
  placeholder = "Detalle de vuelos, horarios y escalas. Pega texto o arrastra una imagen.",
  rows = 4,
}: ItinerarioEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [progressByName, setProgressByName] = React.useState<Record<string, number>>(
    {},
  );
  const [error, setError] = React.useState<string | null>(null);

  const uploadingNames = Object.keys(progressByName);
  const uploading = uploadingNames.length;
  const averagePercent =
    uploading === 0
      ? 0
      : Math.round(
          uploadingNames.reduce((sum, k) => sum + (progressByName[k] ?? 0), 0) /
            uploading,
        );

  // Sync external `text` prop into the contentEditable div without stomping
  // on the user's cursor. We treat plain-text inputs as already-valid HTML.
  React.useLayoutEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    const current = node.innerHTML;
    const incoming = text ?? "";
    if (current !== incoming) {
      node.innerHTML = incoming;
    }
  }, [text]);

  const applyFormat = React.useCallback(
    (command: "bold" | "italic" | "underline" | "formatBlock", value?: string) => {
      if (readOnly) return;
      editorRef.current?.focus();
      // execCommand is deprecated but still the simplest cross-browser API for
      // toggling inline formatting inside contentEditable. A full rich-text
      // library (Tiptap/Lexical) would be overkill for four format buttons.
      document.execCommand(command, false, value);
      if (editorRef.current) onTextChange(editorRef.current.innerHTML);
    },
    [onTextChange, readOnly],
  );

  const handleInput = () => {
    if (editorRef.current) onTextChange(editorRef.current.innerHTML);
  };

  const imagesRef = React.useRef(images);
  React.useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const handleFiles = React.useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      setError(null);

      // Tag each file with a unique slot so duplicate names don't collide.
      const slots = files.map((f, i) => ({ file: f, slot: `${Date.now()}:${i}:${f.name}` }));
      setProgressByName((prev) => ({
        ...prev,
        ...Object.fromEntries(slots.map((s) => [s.slot, 0])),
      }));

      const results = await Promise.all(
        slots.map(async ({ file: f, slot }) => {
          try {
            const { url } = await uploadFile(f, {
              folder,
              onProgress: (percent) =>
                setProgressByName((prev) => ({ ...prev, [slot]: percent })),
            });
            return { ok: true as const, slot, url };
          } catch (err) {
            return {
              ok: false as const,
              slot,
              error:
                err instanceof Error ? err.message : "Error al subir",
            };
          }
        }),
      );

      // Drop the tracking rows whose uploads have finished (success or error).
      setProgressByName((prev) => {
        const next = { ...prev };
        for (const r of results) delete next[r.slot];
        return next;
      });

      const uploaded = results.flatMap((r) => (r.ok ? [r.url] : []));
      const firstError = results.find((r) => !r.ok)?.error;
      if (uploaded.length > 0) {
        onImagesChange([...imagesRef.current, ...uploaded]);
      }
      if (firstError) setError(firstError);
    },
    [folder, onImagesChange],
  );

  const handlePaste = React.useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (readOnly) return;
      const items = Array.from(e.clipboardData.items ?? []);
      const files: File[] = [];
      for (const it of items) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f && f.type.startsWith("image/")) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        await handleFiles(files);
        return;
      }
      // Always paste as plain text so Amadeus/terminal dumps keep their line
      // breaks and column spacing. Rich-text sources lose their inline
      // formatting on the way in — users re-apply bold/italic via the toolbar.
      e.preventDefault();
      const textOnly = e.clipboardData.getData("text/plain") ?? "";
      const escaped = textOnly
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Preserve runs of 2+ spaces so Amadeus column alignment survives.
        .replace(/ {2,}/g, (m) => "&nbsp;".repeat(m.length))
        .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
        .replace(/\r?\n/g, "<br>");
      document.execCommand("insertHTML", false, escaped);
      if (editorRef.current) onTextChange(editorRef.current.innerHTML);
    },
    [handleFiles, onTextChange, readOnly],
  );

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (readOnly) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) await handleFiles(files);
  };

  const handleRemove = (url: string) => {
    if (readOnly) return;
    onImagesChange(images.filter((u) => u !== url));
    // Best-effort bucket cleanup. The DB row is the source of truth — if the
    // bucket delete fails, the user-visible state is still consistent.
    void deleteFile(url);
  };

  return (
    <div className="flex flex-col gap-2">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={
          dragActive
            ? { scale: 1.01, y: -1 }
            : { scale: 1, y: 0 }
        }
        transition={springs.gentle}
        className={cn(
          "relative overflow-hidden rounded-[10px] border transition-colors",
          dragActive ? "border-[#3BBFAD]" : "border-hairline",
        )}
        style={{
          ...(dragActive ? glassMaterials.frosted : { background: "#FFFFFF" }),
        }}
      >
        {!readOnly && (
          <div className="flex items-center gap-0.5 border-b border-hairline px-2 py-1">
            <ToolbarButton
              label="Título"
              icon={<Heading className="h-3.5 w-3.5" />}
              onClick={() => applyFormat("formatBlock", "H3")}
            />
            <div className="mx-1 h-4 w-px bg-hairline" />
            <ToolbarButton
              label="Negrita"
              icon={<Bold className="h-3.5 w-3.5" />}
              onClick={() => applyFormat("bold")}
            />
            <ToolbarButton
              label="Itálica"
              icon={<Italic className="h-3.5 w-3.5" />}
              onClick={() => applyFormat("italic")}
            />
            <ToolbarButton
              label="Subrayado"
              icon={<Underline className="h-3.5 w-3.5" />}
              onClick={() => applyFormat("underline")}
            />
          </div>
        )}

        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className={cn(
            "prose prose-sm max-w-none w-full rounded-[8px] bg-transparent px-3 py-2 text-sm text-neutral-900 focus:outline-none [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
            "before:empty:content-[attr(data-placeholder)] before:text-neutral-400",
          )}
          style={{ minHeight: `${rows * 22}px` }}
        />

        {!readOnly && (
          <div className="flex items-center justify-between border-t border-hairline px-3 py-1.5 text-[11.5px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Pega (⌘V) o arrastra imágenes aquí
            </span>
            <div className="flex items-center gap-2">
              {uploading > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F8F5] px-2 py-0.5 text-[10.5px] font-medium text-[#2A9E8E]">
                  <span className="relative inline-block h-1.5 w-12 overflow-hidden rounded-full bg-white/60">
                    <motion.span
                      animate={{ width: `${averagePercent}%` }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute left-0 top-0 h-full bg-[#2A9E8E]"
                    />
                  </span>
                  Subiendo {uploading} · {averagePercent}%
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 font-medium text-neutral-700 transition-colors hover:bg-rail hover:text-neutral-900"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {dragActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={springs.micro}
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[10px] bg-[rgba(59,191,173,0.08)] text-[13px] font-medium text-[#2A9E8E]"
            >
              Suelta para subir
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="text-[12px] text-[#CC2030]">{error}</p>
      )}

      {(images.length > 0 || uploading > 0) && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.04 } },
          }}
          className="grid grid-cols-4 gap-2 sm:grid-cols-6"
        >
          {images.map((url) => (
            <motion.div
              key={url}
              variants={{
                hidden: { opacity: 0, y: 8, scale: 0.96 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{ y: -2, scale: 1.02 }}
              transition={springs.micro}
              className="group relative aspect-square overflow-hidden rounded-[8px] border border-hairline bg-rail"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-[#CC2030] group-hover:opacity-100"
                  aria-label="Eliminar imagen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <motion.div
              key={`up-${i}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springs.micro}
              className="flex aspect-square items-center justify-center rounded-[8px] border border-dashed border-hairline bg-rail"
            >
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      // Use mousedown (not click) so the contentEditable div retains focus and
      // the active selection survives — execCommand needs a live selection.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
    >
      {icon}
    </button>
  );
}
