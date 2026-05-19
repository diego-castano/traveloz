"use client";

/**
 * DocumentUploader — list-style uploader for non-image attachments.
 *
 * Used for: vouchers, contracts, brochures, fichas técnicas, supplier docs.
 * Renders one row per file with name, size, type icon, download link, and a
 * remove action. Accepts PDFs by default; pass `accept` to override.
 *
 *   <DocumentUploader
 *     documents={alojamiento.documentos}
 *     onAdd={handleAdd}
 *     onRemove={handleRemove}
 *     folder={`alojamientos/${alojamiento.id}/docs`}
 *   />
 */

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileText,
  X,
  Download,
  Copy as CopyIcon,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/components/lib/cn";
import { glassMaterials } from "@/components/lib/glass";
import { springs } from "@/components/lib/animations";
import { deleteFile, uploadFile, type UploadedFile } from "@/components/lib/upload";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentItem {
  id: string;
  url: string;
  name: string;
  size?: number;
  contentType?: string;
}

interface UploadingItem {
  id: string;
  name: string;
  size: number;
  percent: number;
  error?: string | null;
  abort: () => void;
}

export interface DocumentUploaderProps {
  documents: DocumentItem[];
  onAdd?: (uploaded: UploadedFile[]) => void;
  onRemove?: (id: string) => void;
  maxDocuments?: number;
  folder?: string;
  /** MIME accept string for the input. Default: PDFs. */
  accept?: string;
  /** Best-effort bucket cleanup on remove. Default true. */
  deleteFromBucket?: boolean;
  className?: string;
}

const DEFAULT_ACCEPT = "application/pdf";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentUploader({
  documents,
  onAdd,
  onRemove,
  maxDocuments = 10,
  folder = "documentos",
  accept = DEFAULT_ACCEPT,
  deleteFromBucket = true,
  className,
}: DocumentUploaderProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [uploads, setUploads] = React.useState<UploadingItem[]>([]);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const inFlight = uploads.length;
  const canAddMore = documents.length + inFlight < maxDocuments;

  const updateRow = (id: string, patch: Partial<UploadingItem>) =>
    setUploads((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleFiles = React.useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || !onAdd) return;
      const allowed = (accept || DEFAULT_ACCEPT).split(",").map((t) => t.trim());
      const files = Array.from(list).filter((f) =>
        allowed.some((t) => t === f.type || (t.endsWith("/*") && f.type.startsWith(t.slice(0, -1)))),
      );
      const remaining = maxDocuments - documents.length - inFlight;
      const selected = files.slice(0, Math.max(0, remaining));
      if (selected.length === 0) return;

      setUploadError(null);
      const controllers = selected.map(() => new AbortController());
      const newRows: UploadingItem[] = selected.map((f, i) => ({
        id: `up-doc-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        percent: 0,
        error: null,
        abort: () => controllers[i].abort(),
      }));
      setUploads((prev) => [...prev, ...newRows]);

      const results = await Promise.all(
        selected.map(async (file, i) => {
          const row = newRows[i];
          try {
            const uploaded = await uploadFile(file, {
              folder,
              signal: controllers[i].signal,
              // Skip the WebP convert step for documents.
              convertToWebp: false,
              onProgress: (p) => updateRow(row.id, { percent: p }),
            });
            return {
              ok: true as const,
              uploaded: { ...uploaded, name: file.name, size: file.size },
            };
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

      const okFiles = results
        .map((r) => (r.ok ? r.uploaded : null))
        .filter((u): u is NonNullable<typeof u> => u != null);
      if (okFiles.length > 0) {
        onAdd(okFiles as UploadedFile[]);
      }
      const okIds = new Set(
        newRows.filter((_, i) => results[i].ok).map((r) => r.id),
      );
      setUploads((prev) => prev.filter((r) => !okIds.has(r.id)));

      const firstError = results.find((r) => !r.ok)?.error;
      if (firstError) setUploadError(firstError);
    },
    [accept, documents.length, folder, inFlight, maxDocuments, onAdd],
  );

  const handleRemove = (doc: DocumentItem) => {
    onRemove?.(doc.id);
    if (deleteFromBucket && doc.url) void deleteFile(doc.url);
  };

  // ---------------------------- Render ----------------------------

  return (
    <div className={cn("flex flex-col", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      {/* Dropzone */}
      <motion.div
        onClick={() => canAddMore && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (canAddMore) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (canAddMore) handleFiles(e.dataTransfer.files);
        }}
        animate={dragActive ? { scale: 1.01 } : { scale: 1 }}
        transition={springs.bouncy}
        className={cn(
          "flex h-[110px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl transition-colors",
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
        <Upload className={cn("h-5 w-5", dragActive ? "text-brand-teal-400" : "text-neutral-400")} />
        <p className="text-[13px] text-neutral-500">
          Arrastra documentos o haz clic para subir
        </p>
        <p className="text-[11px] text-neutral-400">
          PDF — máx 25 MB · {documents.length}/{maxDocuments}
        </p>
      </motion.div>

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
              {u.error && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#CC2030]">
                  <AlertTriangle size={12} />
                  {u.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {uploadError && uploads.length === 0 && (
        <p className="mt-2 text-[12px] text-[#CC2030]">{uploadError}</p>
      )}

      {documents.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-hairline overflow-hidden rounded-[12px] border border-hairline bg-white">
          <AnimatePresence initial={false}>
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onRemove={() => handleRemove(doc)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function DocumentRow({
  doc,
  onRemove,
}: {
  doc: DocumentItem;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      const absolute =
        typeof window !== "undefined" && doc.url.startsWith("/")
          ? new URL(doc.url, window.location.origin).toString()
          : doc.url;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked → silent */
    }
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.14 }}
      className="flex items-center gap-3 px-3 py-2.5"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-[#FBE9EC] text-[#CC2030]">
        <FileText size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[13px] font-medium text-neutral-900 hover:underline"
        >
          {doc.name}
        </a>
        <p className="text-[11px] text-neutral-400">
          {doc.contentType ?? "PDF"}
          {doc.size ? ` · ${(doc.size / 1024).toFixed(0)} KB` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copiado" : "Copiar URL"}
        className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        {copied ? <Check size={14} /> : <CopyIcon size={14} />}
      </button>
      <a
        href={doc.url}
        download={doc.name}
        target="_blank"
        rel="noreferrer"
        title="Descargar"
        className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <Download size={14} />
      </a>
      {confirming ? (
        <>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md bg-[#CC2030] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#A81727]"
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[11px] text-neutral-400 hover:text-neutral-700"
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          title="Eliminar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-[#CC2030]"
        >
          <X size={14} />
        </button>
      )}
    </motion.li>
  );
}
