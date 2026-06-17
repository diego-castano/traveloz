"use client";

import { useRef, useState } from "react";
import {
  Upload,
  X,
  Loader2,
  Link2,
  ImageIcon,
  Film,
  Info,
  AlertTriangle,
} from "lucide-react";
import { uploadFile } from "@/components/lib/upload";
import { useToast } from "@/components/ui/Toast";
import { getMediaHint } from "./media-hints";

// ---------------------------------------------------------------------------
// MediaPicker — modern drag-and-drop uploader for SiteSetting / package fields.
//
// Default surface is a single dropzone (drag a file OR click to browse). The
// raw URL input is hidden behind a small "Pegar URL" toggle so it stays out
// of the way for the common case but is still available for power users who
// want to point at an external asset.
// ---------------------------------------------------------------------------

type Props = {
  value: string;
  onChange: (next: string) => void;
  accept?: string;
  /** SiteSetting key; when set, MediaPicker looks up MEDIA_HINTS for size guidance. */
  settingKey?: string;
  /** Oculta el escape hatch "Pegar URL externa" — fuerza subir un archivo. */
  hideUrl?: boolean;
};

export function MediaPicker({
  value,
  onChange,
  accept = "image/*",
  settingKey,
  hideUrl = false,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const hint = getMediaHint(settingKey);

  const isVideo =
    accept.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(value);

  /**
   * Probe the dropped file against MEDIA_HINTS. Non-blocking — we only show a
   * yellow warning so the admin can choose whether to re-export the asset.
   * Returns the list of warnings to render under the field.
   */
  const computeWarnings = async (file: File): Promise<string[]> => {
    const out: string[] = [];
    if (hint?.maxKB && file.size > hint.maxKB * 1024) {
      const kb = Math.round(file.size / 1024);
      out.push(`Pesa ${kb} KB — recomendamos ≤ ${hint.maxKB} KB.`);
    }
    if (hint?.width && hint?.height && file.type.startsWith("image/")) {
      const tolerance = hint.tolerance ?? 64;
      const dims = await readImageDimensions(file);
      if (dims) {
        const dx = Math.abs(dims.width - hint.width);
        const dy = Math.abs(dims.height - hint.height);
        if (dx > tolerance || dy > tolerance) {
          out.push(
            `Es ${dims.width}×${dims.height} — recomendamos ${hint.width}×${hint.height}.`,
          );
        }
      }
    }
    return out;
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setWarnings([]);
    try {
      // Compute warnings in parallel with the upload — they don't block.
      const [result, computed] = await Promise.all([
        uploadFile(file, {
          folder: "site",
          onProgress: (p) => setProgress(p),
        }),
        computeWarnings(file),
      ]);
      onChange(result.url);
      setWarnings(computed);
      if (computed.length === 0) {
        toast("success", "Archivo subido", file.name);
      } else {
        toast(
          "info",
          "Subido con advertencias",
          computed.join(" "),
        );
      }
    } catch (err) {
      toast("error", "Error al subir", (err as Error).message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const Icon = accept.startsWith("video/") ? Film : ImageIcon;

  return (
    <div className="space-y-2">
      {hint && (
        <div className="flex items-start gap-1.5 text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0 text-violet-500" />
          <div className="leading-snug">
            <div className="text-neutral-800">{hint.label}</div>
            {hint.usage && (
              <div className="text-neutral-500 mt-0.5">{hint.usage}</div>
            )}
          </div>
        </div>
      )}
      {value ? (
        // ---- File present: thumbnail + actions ----
        <div className="relative group rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50">
          {isVideo ? (
            <video
              src={value}
              controls
              className="w-full max-h-64 bg-black"
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview"
              className="w-full max-h-64 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.3";
              }}
            />
          )}
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white/95 backdrop-blur text-neutral-800 rounded-md shadow-sm border border-neutral-200 hover:bg-white"
            >
              <Upload className="w-3.5 h-3.5" />
              Reemplazar
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center justify-center w-7 h-7 bg-white/95 backdrop-blur text-neutral-600 hover:text-red-600 rounded-md shadow-sm border border-neutral-200 hover:bg-red-50"
              title="Quitar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <div className="text-sm font-medium">Subiendo… {progress}%</div>
            </div>
          )}
        </div>
      ) : (
        // ---- Empty: dropzone ----
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`relative rounded-xl border-2 border-dashed transition cursor-pointer select-none ${
            dragActive
              ? "border-violet-500 bg-violet-50/60"
              : uploading
                ? "border-violet-200 bg-violet-50/40 cursor-wait"
                : "border-neutral-300 hover:border-violet-400 hover:bg-violet-50/30 bg-white"
          }`}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div
              className={`mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full transition ${
                dragActive
                  ? "bg-violet-500 text-white"
                  : "bg-violet-100 text-violet-600"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            <p className="text-sm font-medium text-neutral-800">
              {uploading
                ? `Subiendo… ${progress}%`
                : dragActive
                  ? "Soltá el archivo para subir"
                  : "Arrastrá un archivo o hacé click"}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              {accept.startsWith("video/")
                ? "MP4 / WebM / MOV — hasta ~100 MB"
                : "PNG / JPG / WebP / SVG — hasta ~10 MB"}
            </p>
            {uploading && (
              <div className="mt-3 w-48 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="hidden"
      />

      {warnings.length > 0 && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
          <ul className="leading-snug list-disc pl-3 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Power-user URL paste — collapsed by default. Se oculta con hideUrl. */}
      {!hideUrl && (
      <div>
        {showUrl ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://..."
              className="flex-1 border border-neutral-300 rounded-md px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowUrl(false)}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 px-1"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowUrl(true)}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-violet-600"
          >
            <Link2 className="w-3 h-3" />
            Pegar URL externa
          </button>
        )}
      </div>
      )}
    </div>
  );
}

/**
 * Read the natural dimensions of an image File without uploading it. Returns
 * null for non-images / unreadable blobs.
 */
function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
