"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Upload, X, Star } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";
import { uploadFile } from "@/components/lib/upload";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageItem {
  id: string;
  url: string;
  alt?: string;
}

export interface ImageUploaderProps {
  images: ImageItem[];
  onAdd?: (urls: string[]) => void;
  onRemove?: (id: string) => void;
  onReorder?: (images: ImageItem[]) => void;
  onSetPrincipal?: (id: string) => void;
  maxImages?: number;
  className?: string;
  folder?: string;
}

// ---------------------------------------------------------------------------
// ImageUploader Component
// ---------------------------------------------------------------------------

export function ImageUploader({
  images,
  onAdd,
  onRemove,
  onReorder,
  onSetPrincipal,
  maxImages = 10,
  className,
  folder = "uploads",
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = images.length + uploading < maxImages;

  // -----------------------------------------------------------------------
  // File handling -- uploads to Railway Bucket via /api/upload
  // -----------------------------------------------------------------------

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !onAdd) return;
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const remaining = maxImages - images.length - uploading;
      const selected = list.slice(0, Math.max(0, remaining));
      if (selected.length === 0) return;

      setUploadError(null);
      setUploading((n) => n + selected.length);

      const urls: string[] = [];
      for (const f of selected) {
        try {
          const { url } = await uploadFile(f, folder);
          urls.push(url);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : "Error al subir");
        } finally {
          setUploading((n) => n - 1);
        }
      }
      if (urls.length > 0) onAdd(urls);
    },
    [onAdd, images.length, maxImages, uploading, folder],
  );

  const handleClick = () => {
    if (canAddMore) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // -----------------------------------------------------------------------
  // Dropzone drag events
  // -----------------------------------------------------------------------

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canAddMore) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (canAddMore) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // -----------------------------------------------------------------------
  // Thumbnail drag reorder (HTML5 drag & drop)
  // -----------------------------------------------------------------------

  const handleThumbnailDragStart = (index: number) => {
    setDragItemIndex(index);
  };

  const handleThumbnailDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleThumbnailDrop = (targetIndex: number) => {
    if (dragItemIndex === null || dragItemIndex === targetIndex || !onReorder)
      return;

    const reordered = [...images];
    const [moved] = reordered.splice(dragItemIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorder(reordered);
    setDragItemIndex(null);
  };

  const handleThumbnailDragEnd = () => {
    setDragItemIndex(null);
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const isEmpty = images.length === 0;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dropzone */}
      <motion.div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
        transition={springs.bouncy}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-glass cursor-pointer transition-colors",
          isEmpty ? "h-[160px]" : "h-[120px]",
          !canAddMore && "opacity-50 pointer-events-none",
        )}
        style={{
          ...glassMaterials.frostedSubtle,
          border: dragActive
            ? "2px dashed #3BBFAD"
            : "2px dashed #D2D5E5",
          background: dragActive
            ? "rgba(230,248,245,0.5)"
            : glassMaterials.frostedSubtle.background,
        }}
      >
        {uploading > 0 ? (
          <Loader2 className="h-6 w-6 animate-spin text-brand-teal-400" />
        ) : (
          <Upload
            className={cn(
              "h-6 w-6 transition-colors",
              dragActive ? "text-brand-teal-400" : "text-neutral-400",
            )}
          />
        )}
        <p
          className={cn(
            "text-sm text-center px-4 transition-colors",
            dragActive ? "text-brand-teal-500" : "text-neutral-400",
          )}
        >
          {uploading > 0
            ? `Subiendo ${uploading} imagen${uploading === 1 ? "" : "es"}...`
            : isEmpty
              ? "Arrastra imagenes o haz clic para subir"
              : `Arrastra o haz clic para agregar (${images.length}/${maxImages})`}
        </p>
      </motion.div>
      {uploadError && (
        <p className="mt-2 text-[12px] text-[#CC2030]">{uploadError}</p>
      )}

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mt-3">
          {images.map((image, index) => {
            const isFirst = index === 0;
            const isConfirmingDelete = confirmDeleteId === image.id;

            return (
              <motion.div
                key={image.id}
                layout
                layoutId={`img-${image.id}`}
                draggable
                onDragStart={() => handleThumbnailDragStart(index)}
                onDragOver={handleThumbnailDragOver}
                onDrop={() => handleThumbnailDrop(index)}
                onDragEnd={handleThumbnailDragEnd}
                whileDrag={{
                  scale: 1.12,
                  zIndex: 50,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                  rotate: 2,
                }}
                transition={springs.gentle}
                className={cn(
                  "relative w-20 h-20 rounded-clay overflow-hidden cursor-grab active:cursor-grabbing",
                  "group",
                  dragItemIndex === index && "opacity-50",
                  isFirst && "ring-2 ring-amber-400 ring-offset-1",
                )}
              >
                <img
                  src={image.url}
                  alt={image.alt || `Imagen ${index + 1}`}
                  className="object-cover w-full h-full"
                />

                {/* Principal badge */}
                {isFirst && (
                  <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-400 text-amber-900">
                    <Star className="w-3 h-3 fill-current" />
                    Principal
                  </div>
                )}

                {/* Delete confirmation overlay */}
                <AnimatePresence>
                  {isConfirmingDelete && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center gap-1 z-20"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove?.(image.id);
                          setConfirmDeleteId(null);
                        }}
                        className="text-[10px] font-semibold text-white bg-red-700 px-2 py-0.5 rounded-full hover:bg-red-800 transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="text-[10px] text-white/80 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover action buttons */}
                {!isConfirmingDelete && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Mark as principal */}
                    {onSetPrincipal && !isFirst && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetPrincipal(image.id);
                        }}
                        className="w-5 h-5 rounded-full bg-white/20 text-white inline-flex items-center justify-center hover:bg-amber-400 hover:text-amber-900 transition-colors"
                        title="Marcar como principal"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}

                    {/* Remove button */}
                    {onRemove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(image.id);
                        }}
                        className="w-5 h-5 rounded-full bg-white/20 text-white inline-flex items-center justify-center hover:bg-red-500 transition-colors"
                        title="Eliminar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
