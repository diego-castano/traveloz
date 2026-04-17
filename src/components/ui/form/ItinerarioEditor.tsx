"use client";

import * as React from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/components/lib/cn";
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
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-[8px] border bg-white transition-colors",
          dragActive
            ? "border-[#3BBFAD] ring-2 ring-[#3BBFAD33]"
            : "border-hairline",
        )}
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 font-medium text-neutral-700 transition-colors hover:bg-rail"
            >
              <Upload className="h-3.5 w-3.5" />
              Subir
            </button>
          </div>
        )}

        {dragActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[8px] bg-[rgba(59,191,173,0.08)] text-[13px] font-medium text-[#2A9E8E]">
            Suelta para subir
          </div>
        )}
      </div>

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
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((url) => (
            <div
              key={url}
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
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div
              key={`up-${i}`}
              className="flex aspect-square items-center justify-center rounded-[8px] border border-dashed border-hairline bg-rail"
            >
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
