"use client";

/**
 * ImageCropper — modal cropper built on `react-easy-crop`.
 *
 * Pattern:
 *
 *   const [pendingFile, setPendingFile] = useState<File | null>(null);
 *
 *   <input type="file" onChange={(e) => setPendingFile(e.target.files?.[0])} />
 *
 *   <ImageCropper
 *     file={pendingFile}
 *     aspect={16 / 10}                     // hero ratio
 *     onCancel={() => setPendingFile(null)}
 *     onConfirm={async (blob) => {
 *       // Send the cropped blob through the regular upload pipeline.
 *       const f = new File([blob], pendingFile!.name, { type: blob.type });
 *       const { url } = await uploadFile(f, "paquetes/hero");
 *       …
 *     }}
 *   />
 *
 * Implementation notes:
 *   - Loads the file as a blob URL on mount, revokes on unmount (no memory leak).
 *   - Returns a JPEG blob by default (smaller than PNG, kept transparent
 *     channel via WebP when the source supports it).
 *   - Uses Radix Dialog for overlay so it sits above the rest of the admin.
 */

import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog } from "radix-ui";
import { motion, AnimatePresence } from "motion/react";
import { Crop as CropIcon, RotateCw, ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ImageCropperProps {
  file: File | null;
  /** Output aspect ratio — pass null for free-form. */
  aspect?: number | null;
  /** Round overlay (avatars). */
  cropShape?: "rect" | "round";
  /** Output size cap in pixels for the longest edge. Default 2400. */
  maxOutput?: number;
  /** Output blob mime — default `image/webp` for size, fall back to `image/jpeg`. */
  outputType?: "image/webp" | "image/jpeg" | "image/png";
  outputQuality?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob, fileName: string) => void | Promise<void>;
}

export function ImageCropper({
  file,
  aspect = 16 / 10,
  cropShape = "rect",
  maxOutput = 2400,
  outputType = "image/webp",
  outputQuality = 0.86,
  title = "Recortar imagen",
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [areaPx, setAreaPx] = React.useState<Area | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Build & teardown the blob URL exactly with the file lifecycle.
  React.useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAreaPx(null);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleConfirm = async () => {
    if (!src || !file || !areaPx) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await renderCroppedBlob({
        src,
        area: areaPx,
        rotation,
        maxOutput,
        type: outputType,
        quality: outputQuality,
      });
      await onConfirm(
        blob,
        replaceExtension(file.name, mimeToExt(outputType)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al recortar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={!!file} onOpenChange={(open) => !open && !busy && onCancel()}>
      <AnimatePresence>
        {file && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-[410] flex items-center justify-center p-4 pointer-events-none">
              <Dialog.Content forceMount asChild>
                <motion.div
                  className="pointer-events-auto w-full max-w-[860px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_72px_-12px_rgba(0,0,0,0.5)]"
                  initial={{ opacity: 0, scale: 0.96, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
                    <div className="flex items-center gap-2">
                      <CropIcon className="h-4 w-4 text-neutral-400" />
                      <Dialog.Title className="text-[14px] font-semibold text-neutral-900">
                        {title}
                      </Dialog.Title>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onCancel}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      <X size={16} />
                    </button>
                  </header>

                  {/* Cropper canvas */}
                  <div className="relative h-[480px] w-full bg-neutral-900">
                    {src && (
                      <Cropper
                        image={src}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect ?? undefined}
                        cropShape={cropShape}
                        showGrid
                        objectFit="contain"
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_, px) => setAreaPx(px)}
                      />
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-3 border-t border-hairline bg-neutral-50/40 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-white text-neutral-500 hover:text-neutral-900"
                      aria-label="Zoom out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="h-1 w-48 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-[#8B5CF6]"
                    />
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-white text-neutral-500 hover:text-neutral-900"
                      aria-label="Zoom in"
                    >
                      <ZoomIn size={14} />
                    </button>

                    <span className="mx-2 h-5 w-px bg-hairline" />

                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="flex items-center gap-1.5 rounded-md border border-hairline bg-white px-2 py-1 text-[12px] text-neutral-700 hover:text-neutral-900"
                    >
                      <RotateCw size={13} />
                      Rotar
                    </button>

                    {error && (
                      <span className="ml-auto text-[12px] text-[#CC2030]">
                        {error}
                      </span>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                      <Button variant="ghost" size="xs" onClick={onCancel} disabled={busy}>
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={handleConfirm}
                        disabled={busy || !areaPx}
                        loading={busy}
                      >
                        {busy ? "Procesando..." : "Aplicar recorte"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

interface RenderArgs {
  src: string;
  area: Area;
  rotation: number;
  maxOutput: number;
  type: "image/webp" | "image/jpeg" | "image/png";
  quality: number;
}

async function renderCroppedBlob({
  src,
  area,
  rotation,
  maxOutput,
  type,
  quality,
}: RenderArgs): Promise<Blob> {
  const image = await loadImage(src);

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  // First canvas: rotated full image. Second canvas: crop window.
  const fullW = image.width * cos + image.height * sin;
  const fullH = image.width * sin + image.height * cos;

  const stage = document.createElement("canvas");
  stage.width = fullW;
  stage.height = fullH;
  const stageCtx = stage.getContext("2d");
  if (!stageCtx) throw new Error("Canvas no disponible");
  stageCtx.translate(fullW / 2, fullH / 2);
  stageCtx.rotate(radians);
  stageCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Cap the longest output dimension.
  const longest = Math.max(area.width, area.height);
  const scale = longest > maxOutput ? maxOutput / longest : 1;
  const outW = Math.round(area.width * scale);
  const outH = Math.round(area.height * scale);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas no disponible");
  outCtx.drawImage(
    stage,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outW,
    outH,
  );

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => {
        if (!blob) reject(new Error("toBlob devolvió null"));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

function mimeToExt(mime: string): string {
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "bin";
}

function replaceExtension(name: string, ext: string): string {
  return name.replace(/\.[^.]+$/, "") + `.${ext}`;
}
