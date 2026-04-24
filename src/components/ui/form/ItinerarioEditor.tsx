"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";
import { uploadFile } from "@/components/lib/upload";

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
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

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
      setUploading((n) => n + files.length);
      const uploaded: string[] = [];
      for (const f of files) {
        try {
          const { url } = await uploadFile(f, folder);
          uploaded.push(url);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al subir");
        } finally {
          setUploading((n) => n - 1);
        }
      }
      if (uploaded.length > 0) {
        onImagesChange([...imagesRef.current, ...uploaded]);
      }
    },
    [folder, onImagesChange],
  );

  const handlePaste = React.useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
      }
    },
    [handleFiles, readOnly],
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
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onPaste={handlePaste}
          readOnly={readOnly}
          rows={rows}
          placeholder={placeholder}
          className="w-full resize-y rounded-[8px] bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />

        {!readOnly && (
          <div className="flex items-center justify-between border-t border-hairline px-3 py-1.5 text-[11.5px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Pega (⌘V) o arrastra imágenes aquí
            </span>
            <div className="flex items-center gap-2">
              {uploading > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F8F5] px-2 py-0.5 text-[10.5px] font-medium text-[#2A9E8E]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Subiendo {uploading}
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
