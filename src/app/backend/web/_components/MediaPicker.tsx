"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadFile } from "@/components/lib/upload";
import { useToast } from "@/components/ui/Toast";

type Props = {
  value: string;
  onChange: (next: string) => void;
  accept?: string;
};

/**
 * Generic media picker for SiteSetting fields. Supports upload (via
 * /api/upload → S3 bucket) and pasting an external URL. Renders a thumbnail
 * preview for images and a <video> tag for videos.
 */
export function MediaPicker({
  value,
  onChange,
  accept = "image/*",
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isVideo = accept.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(value);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL del archivo o vacío para subir"
          className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-md hover:bg-violet-100 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress}%
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Subir archivo
            </>
          )}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center justify-center w-9 h-9 text-neutral-500 hover:text-red-600 border border-neutral-300 rounded-md hover:bg-red-50"
            title="Limpiar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onFile}
          className="hidden"
        />
      </div>

      {value && (
        <div className="rounded-md border border-neutral-200 overflow-hidden bg-neutral-50">
          {isVideo ? (
            <video
              src={value}
              controls
              className="w-full max-h-64"
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
        </div>
      )}
    </div>
  );
}
