"use client";

/**
 * ImageUploader — modern admin image gallery with:
 *
 *   • drag & drop dropzone with on-screen progress per file
 *   • client-side compression before each upload (browser-image-compression)
 *   • optional cropper-before-upload via <ImageCropper /> when `aspect` set
 *   • dnd-kit reorder (mouse, keyboard, touch)
 *   • bulk select + bulk delete
 *   • lightbox with arrow navigation, copy URL, download, alt-text editor
 *   • replace flow per item
 *   • paste-from-URL flow ("añadir por URL")
 *   • optional "Generar con IA" CTA in the empty state
 *   • best-effort bucket cleanup on remove
 */

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  X,
  Star,
  Pencil,
  Copy as CopyIcon,
  Download,
  Replace,
  Sparkles,
  Link as LinkIcon,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog } from "radix-ui";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";
import {
  compressImage,
  deleteFile,
  presignedUpload,
  uploadByUrl,
  uploadFile,
  uploadFiles,
} from "@/components/lib/upload";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { Button } from "@/components/ui/Button";

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
  /**
   * Marks the "principal" image by id instead of by position. When set (even to
   * an empty string), the principal badge/star follow this id rather than the
   * first item — so the featured photo can be any photo, independent of order.
   * Leave undefined to keep the default "first image is principal" behavior.
   */
  principalId?: string;
  /** Optional: persist alt text edits from the lightbox. */
  onUpdateAlt?: (id: string, alt: string) => void;
  /** Optional: replace the URL of an existing item with a freshly uploaded one. */
  onReplace?: (id: string, url: string) => void;
  maxImages?: number;
  className?: string;
  folder?: string;
  /** When set, files are sent through <ImageCropper /> before upload. */
  aspect?: number | null;
  /** Output type when cropping. */
  cropOutput?: "image/webp" | "image/jpeg" | "image/png";
  cropTitle?: string;
  /** Default true — best-effort delete from the bucket on remove. */
  deleteFromBucket?: boolean;
  /** Default true — show the lightbox on thumbnail click. */
  enableLightbox?: boolean;
  /** Default true — show the bulk-select checkboxes. */
  enableBulkSelect?: boolean;
  /** When set, the empty state shows a "Generar con IA" CTA. */
  onGenerateWithAI?: () => void;
}

interface UploadingItem {
  id: string;
  name: string;
  size: number;
  /** 0..100 — 100 means bytes flushed, server still processing. */
  percent: number;
  error?: string | null;
  abort: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageUploader({
  images,
  onAdd,
  onRemove,
  onReorder,
  onSetPrincipal,
  principalId,
  onUpdateAlt,
  onReplace,
  maxImages = 10,
  className,
  folder = "uploads",
  aspect = null,
  cropOutput = "image/webp",
  cropTitle = "Recortar imagen",
  deleteFromBucket = true,
  enableLightbox = true,
  enableBulkSelect = true,
  onGenerateWithAI,
}: ImageUploaderProps) {
  // ---------------------------- State ----------------------------
  const [dragActive, setDragActive] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [uploads, setUploads] = React.useState<UploadingItem[]>([]);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [pendingCrop, setPendingCrop] = React.useState<{
    files: File[];
    replaceFor?: string;
  } | null>(null);
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);
  const [byUrlOpen, setByUrlOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const replaceTargetRef = React.useRef<string | null>(null);

  const inFlight = uploads.length;
  const canAddMore = images.length + inFlight < maxImages;

  // ---------------------------- Helpers ----------------------------

  const updateRow = React.useCallback(
    (id: string, patch: Partial<UploadingItem>) => {
      setUploads((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [],
  );

  const runUploads = React.useCallback(
    async (files: File[], replaceFor?: string) => {
      if (files.length === 0) return;
      setUploadError(null);

      const controllers = files.map(() => new AbortController());
      const newRows: UploadingItem[] = files.map((f, i) => ({
        id: `up-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        percent: 0,
        error: null,
        abort: () => controllers[i].abort(),
      }));
      setUploads((prev) => [...prev, ...newRows]);

      const results = await Promise.all(
        files.map(async (raw, i) => {
          const row = newRows[i];
          try {
            const compressed = await compressImage(raw);
            const { url } = await uploadFile(compressed, {
              folder,
              signal: controllers[i].signal,
              onProgress: (percent) => updateRow(row.id, { percent }),
            });
            return { ok: true as const, url };
          } catch (err) {
            const msg =
              err instanceof Error
                ? err.name === "AbortError"
                  ? "Cancelado"
                  : err.message
                : "Error al subir";
            updateRow(row.id, { error: msg, percent: 0 });
            return { ok: false as const, error: msg };
          }
        }),
      );

      const okUrls = results
        .map((r) => (r.ok ? r.url : null))
        .filter((u): u is string => u != null);

      if (replaceFor && onReplace && okUrls[0]) {
        onReplace(replaceFor, okUrls[0]);
      } else if (onAdd && okUrls.length > 0) {
        onAdd(okUrls);
      }

      const okIds = new Set(
        newRows.filter((_, i) => results[i].ok).map((r) => r.id),
      );
      setUploads((prev) => prev.filter((r) => !okIds.has(r.id)));
      const firstError = results.find((r) => !r.ok)?.error;
      if (firstError) setUploadError(firstError);
    },
    [folder, onAdd, onReplace, updateRow],
  );

  const ingestFiles = React.useCallback(
    (fileList: FileList | File[] | null, replaceFor?: string) => {
      if (!fileList) return;
      const all = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/"),
      );
      const remaining = replaceFor ? 1 : maxImages - images.length - inFlight;
      const selected = all.slice(0, Math.max(0, remaining));
      if (selected.length === 0) return;

      // Cropper path: queue the file(s), let the user crop one by one.
      if (aspect != null) {
        setPendingCrop({ files: selected, replaceFor });
        return;
      }
      void runUploads(selected, replaceFor);
    },
    [aspect, images.length, inFlight, maxImages, runUploads],
  );

  // ---------------------------- Cropper flow ----------------------------

  const cropperFile = pendingCrop?.files[0] ?? null;

  const handleCropConfirm = async (blob: Blob, name: string) => {
    if (!pendingCrop) return;
    const file = new File([blob], name, { type: blob.type });
    await runUploads([file], pendingCrop.replaceFor);
    const remaining = pendingCrop.files.slice(1);
    setPendingCrop(remaining.length > 0 ? { ...pendingCrop, files: remaining } : null);
  };

  const handleCropCancel = () => setPendingCrop(null);

  // ---------------------------- File / drop handlers ----------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const replaceFor = replaceTargetRef.current ?? undefined;
    replaceTargetRef.current = null;
    ingestFiles(e.target.files, replaceFor);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClick = () => {
    if (canAddMore) fileInputRef.current?.click();
  };

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
    if (canAddMore) ingestFiles(e.dataTransfer.files);
  };

  // ---------------------------- Bulk select ----------------------------

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const selectAll = () => setSelected(new Set(images.map((i) => i.id)));
  const handleBulkRemove = () => {
    if (selected.size === 0 || !onRemove) return;
    Array.from(selected).forEach((id) => {
      const item = images.find((i) => i.id === id);
      if (!item) return;
      onRemove(id);
      if (deleteFromBucket && item.url) void deleteFile(item.url);
    });
    clearSelection();
  };

  // ---------------------------- Single remove ----------------------------

  const handleRemoveImage = React.useCallback(
    (item: ImageItem) => {
      onRemove?.(item.id);
      if (deleteFromBucket && item.url) void deleteFile(item.url);
      setSelected((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setConfirmDeleteId(null);
      // If the lightbox was on this image, close it.
      setLightboxIdx((idx) => (idx == null ? idx : Math.min(idx, images.length - 2)));
    },
    [onRemove, deleteFromBucket, images.length],
  );

  // ---------------------------- Replace ----------------------------

  const handleReplace = (id: string) => {
    if (!onReplace) return;
    replaceTargetRef.current = id;
    fileInputRef.current?.click();
  };

  // ---------------------------- Paste from URL ----------------------------

  const [byUrlValue, setByUrlValue] = React.useState("");
  const [byUrlBusy, setByUrlBusy] = React.useState(false);
  const [byUrlError, setByUrlError] = React.useState<string | null>(null);

  const handleByUrlSubmit = async () => {
    if (!byUrlValue.trim() || !onAdd) return;
    setByUrlBusy(true);
    setByUrlError(null);
    try {
      const { url } = await uploadByUrl({ url: byUrlValue.trim(), folder });
      onAdd([url]);
      setByUrlValue("");
      setByUrlOpen(false);
    } catch (err) {
      setByUrlError(err instanceof Error ? err.message : "No se pudo importar");
    } finally {
      setByUrlBusy(false);
    }
  };

  // ---------------------------- DnD-kit ----------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const from = images.findIndex((i) => i.id === active.id);
    const to = images.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(images, from, to));
  };

  // ---------------------------- Render ----------------------------

  const isEmpty = images.length === 0 && uploads.length === 0;

  return (
    <div className={cn("flex flex-col", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-2 text-[12px] text-neutral-500">
        <span>
          {images.length}/{maxImages} {images.length === 1 ? "imagen" : "imágenes"}
        </span>
        <span className="text-neutral-300">·</span>
        {onAdd && (
          <button
            type="button"
            onClick={() => setByUrlOpen(true)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <LinkIcon size={12} />
            Importar URL
          </button>
        )}
        {enableBulkSelect && images.length > 0 && (
          <>
            <span className="text-neutral-300">·</span>
            <button
              type="button"
              onClick={selected.size === images.length ? clearSelection : selectAll}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {selected.size === images.length ? "Deseleccionar" : "Seleccionar todas"}
            </button>
          </>
        )}
      </div>

      {/* Dropzone */}
      <motion.div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
        transition={springs.bouncy}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-colors",
          isEmpty ? "h-[180px]" : "h-[120px]",
          !canAddMore && "opacity-50 pointer-events-none",
        )}
        style={{
          ...glassMaterials.frostedSubtle,
          border: dragActive ? "2px dashed #3BBFAD" : "2px dashed #D2D5E5",
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
            ? "Arrastra imágenes o haz clic para subir"
            : `Arrastra o haz clic para agregar (${images.length}/${maxImages})`}
        </p>
        <p className="text-[11px] text-neutral-400">
          PNG · JPG · WEBP · AVIF · GIF · HEIC — hasta 25 MB
        </p>

        {isEmpty && onGenerateWithAI && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onGenerateWithAI();
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/8 px-3 py-1 text-[11.5px] font-medium text-[#8B5CF6] hover:bg-[#8B5CF6]/15"
          >
            <Sparkles size={12} />
            Generar con IA
          </button>
        )}
      </motion.div>

      {/* Per-file progress / errors */}
      {uploads.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="rounded-[10px] border border-hairline bg-white px-3 py-2 text-[12px]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium text-neutral-800">{u.name}</span>
                <span className="font-mono tabular-nums text-neutral-400">
                  {(u.size / 1024).toFixed(0)} KB
                </span>
                {u.error ? (
                  <button
                    type="button"
                    onClick={() => setUploads((prev) => prev.filter((r) => r.id !== u.id))}
                    className="text-[11px] font-medium text-[#CC2030] hover:underline"
                  >
                    Cerrar
                  </button>
                ) : u.percent < 100 ? (
                  <button
                    type="button"
                    onClick={u.abort}
                    className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700"
                  >
                    Cancelar
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-[#1A6D63]">Procesando…</span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    u.error ? "bg-[#CC2030]" : "bg-brand-teal-400",
                  )}
                  animate={{ width: `${u.error ? 100 : u.percent}%` }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                />
              </div>
              {u.error && <p className="mt-1 text-[11px] text-[#CC2030]">{u.error}</p>}
            </li>
          ))}
        </ul>
      )}

      {uploadError && uploads.length === 0 && (
        <p className="mt-2 text-[12px] text-[#CC2030]">{uploadError}</p>
      )}

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {images.map((image, index) => (
                <Thumbnail
                  key={image.id}
                  image={image}
                  index={index}
                  isFirst={
                    principalId !== undefined
                      ? image.id === principalId
                      : index === 0
                  }
                  selected={selected.has(image.id)}
                  enableBulkSelect={enableBulkSelect}
                  onToggleSelect={() => toggleSelected(image.id)}
                  onClickOpen={() => enableLightbox && setLightboxIdx(index)}
                  isConfirmingDelete={confirmDeleteId === image.id}
                  onAskDelete={() => setConfirmDeleteId(image.id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onConfirmDelete={() => handleRemoveImage(image)}
                  onSetPrincipal={onSetPrincipal ? () => onSetPrincipal(image.id) : undefined}
                  onReplace={onReplace ? () => handleReplace(image.id) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {enableBulkSelect && selected.size > 0 && (
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="mt-3 flex items-center gap-3 rounded-[10px] border border-hairline bg-neutral-900/95 px-3 py-2 text-[12px] text-white shadow-[0_8px_24px_-12px_rgba(17,17,36,0.45)]"
          >
            <span className="font-medium">{selected.size} seleccionadas</span>
            <span className="ml-auto" />
            {onSetPrincipal && selected.size === 1 && (
              <button
                type="button"
                onClick={() => {
                  const id = Array.from(selected)[0];
                  onSetPrincipal(id);
                  clearSelection();
                }}
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
              >
                <Star size={12} /> Principal
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkRemove}
              className="inline-flex items-center gap-1 rounded-md bg-[#CC2030] px-2 py-1 text-white hover:bg-[#A81727]"
            >
              <Trash2 size={12} /> Eliminar
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cropper modal */}
      {aspect != null && (
        <ImageCropper
          file={cropperFile}
          aspect={aspect}
          outputType={cropOutput}
          title={cropTitle}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}

      {/* Import-from-URL modal */}
      <Dialog.Root open={byUrlOpen} onOpenChange={setByUrlOpen}>
        <AnimatePresence>
          {byUrlOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay forceMount asChild>
                <motion.div
                  className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 pointer-events-none">
                <Dialog.Content forceMount asChild>
                  <motion.div
                    className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_18px_52px_-12px_rgba(17,17,36,0.35)]"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <Dialog.Title className="mb-1 text-[14px] font-semibold text-neutral-900">
                      Importar imagen desde URL
                    </Dialog.Title>
                    <p className="mb-3 text-[12px] text-neutral-500">
                      Pegá la URL de la imagen. La descargamos en el server y la
                      hospedamos en el bucket.
                    </p>
                    <input
                      type="url"
                      value={byUrlValue}
                      onChange={(e) => setByUrlValue(e.target.value)}
                      placeholder="https://example.com/foto.jpg"
                      autoFocus
                      className="w-full rounded-md border border-hairline bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-[#8B5CF6]/40 focus:ring-2 focus:ring-[#8B5CF6]/15"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleByUrlSubmit();
                      }}
                    />
                    {byUrlError && (
                      <p className="mt-2 text-[12px] text-[#CC2030]">{byUrlError}</p>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="ghost" size="xs" onClick={() => setByUrlOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => void handleByUrlSubmit()}
                        disabled={!byUrlValue.trim() || byUrlBusy}
                        loading={byUrlBusy}
                      >
                        {byUrlBusy ? "Importando..." : "Importar"}
                      </Button>
                    </div>
                  </motion.div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* Lightbox */}
      {enableLightbox && lightboxIdx != null && images[lightboxIdx] && (
        <Lightbox
          images={images}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={(next) =>
            setLightboxIdx(((next % images.length) + images.length) % images.length)
          }
          onUpdateAlt={onUpdateAlt}
          onRemove={(item) => handleRemoveImage(item)}
          onReplace={onReplace ? (id) => handleReplace(id) : undefined}
          onSetPrincipal={onSetPrincipal}
          principalId={principalId}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thumbnail (sortable)
// ---------------------------------------------------------------------------

interface ThumbnailProps {
  image: ImageItem;
  index: number;
  isFirst: boolean;
  selected: boolean;
  enableBulkSelect: boolean;
  onToggleSelect: () => void;
  onClickOpen: () => void;
  isConfirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onSetPrincipal?: () => void;
  onReplace?: () => void;
}

function Thumbnail({
  image,
  index,
  isFirst,
  selected,
  enableBulkSelect,
  onToggleSelect,
  onClickOpen,
  isConfirmingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onSetPrincipal,
  onReplace,
}: ThumbnailProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-xl border-2 transition-shadow",
        selected ? "border-[#8B5CF6]" : "border-transparent",
        isFirst && !selected && "ring-2 ring-amber-400 ring-offset-1",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt || `Imagen ${index + 1}`}
        className="h-full w-full cursor-pointer object-cover"
        onClick={onClickOpen}
        loading="lazy"
        decoding="async"
      />

      {/* Drag handle (full surface) */}
      <button
        type="button"
        {...listeners}
        className="absolute inset-x-0 top-0 h-3 cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
      />

      {/* Bulk-select checkbox */}
      {enableBulkSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          aria-label={selected ? "Deseleccionar" : "Seleccionar"}
          className={cn(
            "absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md border transition-all",
            selected
              ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
              : "border-white/70 bg-black/30 text-white/0 backdrop-blur-sm group-hover:text-white",
          )}
        >
          {selected ? <Check size={12} /> : null}
        </button>
      )}

      {/* Principal badge */}
      {isFirst && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
          <Star className="h-3 w-3 fill-current" />
          Principal
        </div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {isConfirmingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-red-500/85"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfirmDelete();
              }}
              className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-800"
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelDelete();
              }}
              className="text-[10px] text-white/80 hover:text-white"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover actions */}
      {!isConfirmingDelete && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent py-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onSetPrincipal && !isFirst && (
            <ThumbAction icon={Star} label="Marcar principal" onClick={onSetPrincipal} />
          )}
          {onReplace && (
            <ThumbAction icon={Replace} label="Reemplazar" onClick={onReplace} />
          )}
          <ThumbAction
            icon={X}
            label="Eliminar"
            onClick={onAskDelete}
            className="hover:!bg-red-500"
          />
        </div>
      )}
    </div>
  );
}

function ThumbAction({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-amber-400 hover:text-amber-900",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  images: ImageItem[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
  onUpdateAlt?: (id: string, alt: string) => void;
  onRemove: (item: ImageItem) => void;
  onReplace?: (id: string) => void;
  onSetPrincipal?: (id: string) => void;
  principalId?: string;
}

function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
  onUpdateAlt,
  onRemove,
  onReplace,
  onSetPrincipal,
  principalId,
}: LightboxProps) {
  const item = images[index];
  const [draftAlt, setDraftAlt] = React.useState(item.alt ?? "");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setDraftAlt(item.alt ?? ""), [item.id, item.alt]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNavigate(index + 1);
      else if (e.key === "ArrowLeft") onNavigate(index - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, onClose, onNavigate]);

  const absoluteUrl = (() => {
    if (typeof window === "undefined") return item.url;
    if (/^https?:/i.test(item.url)) return item.url;
    return new URL(item.url, window.location.origin).toString();
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — silently fail */
    }
  };

  const handleAltSave = () => {
    if (onUpdateAlt && draftAlt.trim() !== (item.alt ?? "").trim()) {
      onUpdateAlt(item.id, draftAlt.trim());
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-md" />
        <Dialog.Content
          aria-label="Vista de imagen"
          className="fixed inset-0 z-[410] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">Vista de imagen</Dialog.Title>
          <header className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <span className="text-[12px] tabular-nums text-white/60">
              {index + 1} / {images.length}
            </span>
            <div className="flex items-center gap-1">
              <LightboxAction
                icon={CopyIcon}
                label={copied ? "Copiado" : "Copiar URL"}
                onClick={handleCopy}
              />
              <LightboxAction
                icon={Download}
                label="Descargar"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = absoluteUrl;
                  a.download =
                    item.alt?.replace(/[^a-zA-Z0-9._-]/g, "_") || `imagen-${index + 1}`;
                  a.target = "_blank";
                  a.rel = "noreferrer";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
              />
              {onSetPrincipal &&
                (principalId !== undefined
                  ? item.id !== principalId
                  : index !== 0) && (
                  <LightboxAction
                    icon={Star}
                    label="Marcar principal"
                    onClick={() => onSetPrincipal(item.id)}
                  />
                )}
              {onReplace && (
                <LightboxAction
                  icon={Replace}
                  label="Reemplazar"
                  onClick={() => {
                    onReplace(item.id);
                    onClose();
                  }}
                />
              )}
              <LightboxAction
                icon={Trash2}
                label="Eliminar"
                onClick={() => onRemove(item)}
                danger
              />
              <LightboxAction icon={X} label="Cerrar" onClick={onClose} />
            </div>
          </header>

          <div className="relative flex flex-1 items-center justify-center px-4">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => onNavigate(index - 1)}
                className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Anterior"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.alt || `Imagen ${index + 1}`}
              className="max-h-[80vh] max-w-full object-contain"
            />
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => onNavigate(index + 1)}
                className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Siguiente"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>

          {onUpdateAlt && (
            <footer className="flex items-center gap-2 border-t border-white/10 bg-black/40 px-4 py-3">
              <Pencil className="h-4 w-4 text-white/50" />
              <input
                type="text"
                value={draftAlt}
                onChange={(e) => setDraftAlt(e.target.value)}
                onBlur={handleAltSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder="Texto alternativo (alt) — descripción para accesibilidad y SEO"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/40 outline-none"
              />
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LightboxAction({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        danger ? "text-red-300 hover:bg-red-500/20" : "text-white/80 hover:bg-white/15",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// Tiny helper to satisfy the React-DOM `presignedUpload` import without
// failing tree-shaking when callers haven't opted in. We export it so the
// linter doesn't flag the import as unused; some adopters will prefer it for
// big files.
export const __presignedUpload = presignedUpload;
export const __uploadFiles = uploadFiles;
