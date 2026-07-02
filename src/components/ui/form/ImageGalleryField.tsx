"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";
import { deleteFile, uploadFile } from "@/components/lib/upload";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

interface ImageGalleryFieldProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  readOnly?: boolean;
  /** Carpeta destino en el bucket (organiza las keys). */
  folder?: string;
}

/**
 * Galería de imágenes reutilizable: subir (arrastrar / pegar / botón),
 * reordenar arrastrando las miniaturas, borrar y ver a pantalla completa.
 * Sube directo al bucket vía `uploadFile` (misma infra que Aéreos), y el valor
 * es un `string[]` de URLs públicas. A diferencia del editor de Aéreos, acá se
 * pueden reordenar las imágenes.
 */
export function ImageGalleryField({
  images,
  onImagesChange,
  readOnly,
  folder = "galeria",
}: ImageGalleryFieldProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [progressByName, setProgressByName] = React.useState<
    Record<string, number>
  >({});
  const [error, setError] = React.useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  // Reordenamiento de miniaturas (drag & drop nativo).
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  const uploadingNames = Object.keys(progressByName);
  const uploading = uploadingNames.length;
  const averagePercent =
    uploading === 0
      ? 0
      : Math.round(
          uploadingNames.reduce((sum, k) => sum + (progressByName[k] ?? 0), 0) /
            uploading,
        );

  const imagesRef = React.useRef(images);
  React.useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const handleFilesRef = React.useRef<(f: FileList | File[]) => void>(() => {});

  const handleFiles = React.useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      setError(null);

      // Cada archivo lleva un slot único para que nombres repetidos no colisionen.
      const slots = files.map((f, i) => ({
        file: f,
        slot: `${Date.now()}:${i}:${f.name}`,
      }));
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
              error: err instanceof Error ? err.message : "Error al subir",
            };
          }
        }),
      );

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

  // Pegar (⌘/Ctrl+V) una captura de pantalla sube la imagen directo. Escuchamos
  // a nivel documento porque un contenedor div no recibe eventos de paste; solo
  // hay una galería montada a la vez (dentro del modal), así que no compite.
  React.useEffect(() => {
    handleFilesRef.current = handleFiles;
  }, [handleFiles]);
  React.useEffect(() => {
    if (readOnly) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      // No robar el paste cuando el foco está en un input/textarea editable.
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const files: File[] = [];
      for (const it of Array.from(e.clipboardData?.items ?? [])) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f && f.type.startsWith("image/")) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void handleFilesRef.current(files);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [readOnly]);

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    // Solo activar el dropzone de subida cuando se arrastra un archivo del SO,
    // no cuando se reordena una miniatura (esos drags no traen `Files`).
    if (dragIndex !== null) return;
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
    setDragActive(false);
    if (readOnly) return;
    const files = e.dataTransfer.files;
    // Si no hay archivos, es un drop de reordenamiento (lo manejan las
    // miniaturas con stopPropagation) — no hacemos nada acá.
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    await handleFiles(files);
  };

  const handleRemove = (url: string) => {
    if (readOnly) return;
    onImagesChange(images.filter((u) => u !== url));
    // Limpieza best-effort del bucket. El estado visible es la fuente de verdad:
    // si el borrado del bucket falla, la UI queda igual consistente.
    void deleteFile(url);
  };

  // -- Reordenamiento --
  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onImagesChange(next);
  };

  const resetReorder = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={dragActive ? { scale: 1.01, y: -1 } : { scale: 1, y: 0 }}
        transition={springs.gentle}
        className={cn(
          "relative overflow-hidden rounded-[10px] border transition-colors",
          dragActive ? "border-[#3BBFAD]" : "border-hairline",
        )}
        style={{
          ...(dragActive ? glassMaterials.frosted : { background: "#FFFFFF" }),
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 text-[11.5px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Arrastrá imágenes acá, o pegá una captura
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
            {!readOnly && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 font-medium text-neutral-700 transition-colors hover:bg-rail hover:text-neutral-900"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir
              </button>
            )}
          </div>
        </div>

        {images.length === 0 && uploading === 0 && (
          <div className="px-3 pb-3 text-[12px] text-neutral-400">
            Todavía no hay imágenes. Podés subir varias a la vez.
          </div>
        )}

        {(images.length > 0 || uploading > 0) && (
          <div className="grid grid-cols-4 gap-2 px-3 pb-3 sm:grid-cols-6">
            {images.map((url, i) => (
              <div
                key={url}
                draggable={!readOnly}
                onDragStart={(e) => {
                  if (readOnly) return;
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                  // Firefox necesita data en el dataTransfer para iniciar el drag.
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  if (readOnly || dragIndex === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (overIndex !== i) setOverIndex(i);
                }}
                onDrop={(e) => {
                  if (readOnly || dragIndex === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  moveImage(dragIndex, i);
                  resetReorder();
                }}
                onDragEnd={resetReorder}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-[8px] border bg-rail transition-all",
                  !readOnly && "cursor-grab active:cursor-grabbing",
                  overIndex === i && dragIndex !== null && dragIndex !== i
                    ? "border-[#3BBFAD] ring-2 ring-[#3BBFAD]/40"
                    : "border-hairline",
                  dragIndex === i && "opacity-40",
                )}
              >
                {/* Click abre la imagen a pantalla completa (con zoom). */}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="block h-full w-full cursor-zoom-in"
                  aria-label="Ampliar imagen"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </button>
                {/* Número de orden — ayuda visual de la secuencia. */}
                <span className="pointer-events-none absolute left-1 top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black/55 px-1 text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
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

      {images.length > 1 && !readOnly && (
        <p className="text-[11px] text-neutral-400">
          Arrastrá las miniaturas para reordenarlas. La primera es la principal.
        </p>
      )}

      {error && <p className="text-[12px] text-[#CC2030]">{error}</p>}

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
