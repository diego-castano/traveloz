"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, Link2, ImageIcon, Film } from "lucide-react";
import { uploadFile } from "@/components/lib/upload";
import { useToast } from "@/components/ui/Toast";

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
};

export function MediaPicker({
  value,
  onChange,
  accept = "image/*",
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const isVideo =
    accept.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(value);

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadFile(file, {
        folder: "site",
        onProgress: (p) => setProgress(p),
      });
      onChange(result.url);
      toast("success", "Archivo subido", file.name);
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

      {/* Power-user URL paste — collapsed by default */}
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
    </div>
  );
}
