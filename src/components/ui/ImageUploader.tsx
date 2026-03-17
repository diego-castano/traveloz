"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Upload, X } from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";

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
  maxImages?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// ImageUploader Component
// ---------------------------------------------------------------------------

export function ImageUploader({
  images,
  onAdd,
  onRemove,
  onReorder,
  maxImages = 10,
  className,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = images.length < maxImages;

  // -----------------------------------------------------------------------
  // File handling (simulated -- prototype)
  // -----------------------------------------------------------------------

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !onAdd) return;
      const urls: string[] = [];
      const remaining = maxImages - images.length;
      const count = Math.min(files.length, remaining);

      for (let i = 0; i < count; i++) {
        // Simulated upload: create object URL from the dropped/selected file
        urls.push(URL.createObjectURL(files[i]));
      }

      if (urls.length > 0) {
        onAdd(urls);
      }
    },
    [onAdd, images.length, maxImages],
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
        <Upload
          className={cn(
            "h-6 w-6 transition-colors",
            dragActive ? "text-brand-teal-400" : "text-neutral-400",
          )}
        />
        <p
          className={cn(
            "text-sm text-center px-4 transition-colors",
            dragActive ? "text-brand-teal-500" : "text-neutral-400",
          )}
        >
          {isEmpty
            ? "Arrastra imagenes o haz clic para subir"
            : `Arrastra o haz clic para agregar (${images.length}/${maxImages})`}
        </p>
      </motion.div>

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mt-3">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              draggable
              onDragStart={() => handleThumbnailDragStart(index)}
              onDragOver={handleThumbnailDragOver}
              onDrop={() => handleThumbnailDrop(index)}
              onDragEnd={handleThumbnailDragEnd}
              whileDrag={{ scale: 1.03, zIndex: 10 }}
              transition={springs.bouncy}
              className={cn(
                "relative w-20 h-20 rounded-clay overflow-hidden cursor-grab active:cursor-grabbing",
                "group",
                dragItemIndex === index && "opacity-50",
              )}
            >
              <img
                src={image.url}
                alt={image.alt || `Imagen ${index + 1}`}
                className="object-cover w-full h-full"
              />

              {/* Remove button */}
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(image.id);
                  }}
                  className={cn(
                    "absolute top-1 right-1 w-5 h-5 rounded-full",
                    "bg-black/50 text-white",
                    "inline-flex items-center justify-center",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-red-500",
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
