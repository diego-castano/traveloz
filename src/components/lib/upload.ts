"use client";

/**
 * Client-side helpers for the /api/upload endpoint backed by S3-compatible
 * object storage (Tigris on Railway).
 *
 *   - `uploadFile`        XHR multipart with progress events.
 *   - `uploadFiles`       Concurrency-capped parallel batch with per-file
 *                         progress.
 *   - `compressImage`     browser-image-compression wrapper (client-side
 *                         shrink before upload — saves 5–10× bytes for phone
 *                         photos at no perceptible quality loss).
 *   - `uploadByUrl`       Pastes an external URL → server fetches + re-hosts.
 *   - `presignedUpload`   Direct browser → bucket via S3 presigned PUT URL.
 *                         Skips the Next.js server entirely; meant for already-
 *                         processed payloads (e.g. cropper output).
 *   - `deleteFile`        Best-effort bucket cleanup.
 */

import imageCompression from "browser-image-compression";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface UploadedFile {
  key: string;
  url: string;
  hash?: string;
  size?: number;
  contentType?: string;
  width?: number;
  height?: number;
}

/** 0..100 percentage during the upload. */
export type UploadProgress = (percent: number, loaded: number, total: number) => void;

export interface UploadOptions {
  folder?: string;
  onProgress?: UploadProgress;
  /** AbortSignal — cancels the in-flight request mid-upload. */
  signal?: AbortSignal;
  /** Disable server WebP conversion when you absolutely need the original. */
  convertToWebp?: boolean;
}

// ---------------------------------------------------------------------------
// Concurrency cap
// ---------------------------------------------------------------------------

/** Default max simultaneous uploads to a single endpoint. */
export const DEFAULT_CONCURRENCY = 4;

async function pool<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return next();
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next()),
  );
  return results;
}

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

export interface CompressionOptions {
  /** Max output size in MB. Default 1.5 MB. */
  maxSizeMB?: number;
  /** Max width or height. Default 2400 px. */
  maxWidthOrHeight?: number;
  /** When false, returns the original file untouched. */
  enabled?: boolean;
  /** Mimes that should never be re-encoded (e.g. animated GIFs). */
  skipMimes?: string[];
}

const DEFAULT_SKIP = ["image/gif", "image/svg+xml"];

/**
 * Compresses (and optionally resizes) an image client-side. Returns the
 * compressed file or the original if compression is disabled / skipped.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<File> {
  if (options.enabled === false) return file;
  if (!file.type.startsWith("image/")) return file;
  const skip = options.skipMimes ?? DEFAULT_SKIP;
  if (skip.includes(file.type)) return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: options.maxSizeMB ?? 1.5,
      maxWidthOrHeight: options.maxWidthOrHeight ?? 2400,
      useWebWorker: true,
      // Preserve transparency for PNG/WebP; otherwise prefer the original
      // type so we don't surprise the server with a different MIME.
      fileType: file.type,
      initialQuality: 0.86,
    });
    // imageCompression returns a Blob — wrap to keep `name`.
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch {
    // On any failure, fall back to the original. The server pipeline still
    // handles huge files (resize + re-encode), so this is purely a perf opt.
    return file;
  }
}

// ---------------------------------------------------------------------------
// uploadFile — XHR with progress
// ---------------------------------------------------------------------------

export function uploadFile(
  file: File,
  optionsOrFolder?: UploadOptions | string,
): Promise<UploadedFile> {
  const options: UploadOptions =
    typeof optionsOrFolder === "string"
      ? { folder: optionsOrFolder }
      : (optionsOrFolder ?? {});

  return new Promise<UploadedFile>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (options.folder) form.append("folder", options.folder);
    if (options.convertToWebp === false) form.append("convertToWebp", "false");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);
    xhr.responseType = "json";

    if (options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        options.onProgress?.(percent, e.loaded, e.total);
      };
      xhr.upload.onloadend = () => {
        options.onProgress?.(100, file.size, file.size);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = xhr.response as UploadedFile | null;
        if (!body || !body.url) {
          reject(new Error("Respuesta de upload inválida"));
          return;
        }
        resolve(body);
        return;
      }
      const errBody = xhr.response as { error?: string } | null;
      reject(
        new Error(errBody?.error ?? `Upload falló (HTTP ${xhr.status})`),
      );
    };
    xhr.onerror = () => reject(new Error("Falló la conexión durante el upload"));
    xhr.ontimeout = () => reject(new Error("Tiempo de espera agotado"));
    xhr.onabort = () => reject(new DOMException("Upload cancelado", "AbortError"));

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        reject(new DOMException("Upload cancelado", "AbortError"));
        return;
      }
      options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

// ---------------------------------------------------------------------------
// uploadFiles — concurrency-capped batch
// ---------------------------------------------------------------------------

export interface UploadFilesOptions extends Omit<UploadOptions, "onProgress"> {
  onFileProgress?: (
    index: number,
    percent: number,
    loaded: number,
    total: number,
  ) => void;
  /** Default 4. */
  concurrency?: number;
  /** Compress images client-side before uploading. Default enabled. */
  compress?: CompressionOptions | false;
  /** Telemetry hook — receives one summary event after all files settle. */
  onTelemetry?: (event: UploadTelemetryEvent) => void;
}

export interface UploadTelemetryEvent {
  total: number;
  succeeded: number;
  failed: number;
  bytesUploaded: number;
  durationMs: number;
}

export async function uploadFiles(
  files: File[] | FileList,
  options?: UploadFilesOptions | string,
): Promise<UploadedFile[]> {
  const opts: UploadFilesOptions =
    typeof options === "string" ? { folder: options } : (options ?? {});
  const list = Array.from(files);
  const t0 = performance.now();

  const compressOpts =
    opts.compress === false ? { enabled: false } : (opts.compress ?? {});

  const settled = await pool(
    list,
    async (rawFile, i) => {
      try {
        const file = await compressImage(rawFile, compressOpts);
        const result = await uploadFile(file, {
          folder: opts.folder,
          signal: opts.signal,
          convertToWebp: opts.convertToWebp,
          onProgress: opts.onFileProgress
            ? (percent, loaded, total) =>
                opts.onFileProgress?.(i, percent, loaded, total)
            : undefined,
        });
        return { ok: true as const, result, size: file.size };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al subir";
        return { ok: false as const, error: message, size: rawFile.size };
      }
    },
    Math.max(1, Math.min(opts.concurrency ?? DEFAULT_CONCURRENCY, 8)),
  );

  const ok: UploadedFile[] = [];
  const errors: string[] = [];
  let bytesUploaded = 0;
  for (const r of settled) {
    if (r.ok) {
      ok.push(r.result);
      bytesUploaded += r.size;
    } else {
      errors.push(r.error);
    }
  }

  opts.onTelemetry?.({
    total: list.length,
    succeeded: ok.length,
    failed: errors.length,
    bytesUploaded,
    durationMs: Math.round(performance.now() - t0),
  });

  if (errors.length && !ok.length) throw new Error(errors.join("; "));
  return ok;
}

// ---------------------------------------------------------------------------
// uploadByUrl — server-side fetch + re-host
// ---------------------------------------------------------------------------

export async function uploadByUrl(params: {
  url: string;
  folder?: string;
  filename?: string;
}): Promise<UploadedFile> {
  const res = await fetch("/api/upload/by-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Upload from URL falló (${res.status})`);
  }
  return (await res.json()) as UploadedFile;
}

// ---------------------------------------------------------------------------
// Presigned (direct browser → bucket)
// ---------------------------------------------------------------------------

/**
 * Two-step direct upload:
 *
 *   1. Ask the server for a short-lived presigned PUT URL.
 *   2. PUT the bytes straight to the bucket via XHR (so we still get progress).
 *
 * Useful for big files (>10 MB) or to take Next.js out of the byte path.
 * Skips the sharp pipeline → only call when the bytes are already safe to
 * persist as-is (e.g. the output of <ImageCropper />).
 */
export async function presignedUpload(
  blob: Blob,
  params: { folder?: string; filename?: string; onProgress?: UploadProgress; signal?: AbortSignal },
): Promise<UploadedFile> {
  const presigned = await fetch("/api/upload/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: blob.type || "application/octet-stream",
      filename: params.filename,
      folder: params.folder,
    }),
  });
  if (!presigned.ok) {
    const body = (await presigned.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `No se pudo firmar el upload (${presigned.status})`);
  }
  const { url, key, publicUrl } = (await presigned.json()) as {
    url: string;
    key: string;
    publicUrl: string;
  };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    if (params.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        params.onProgress?.(percent, e.loaded, e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`PUT directo falló (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Conexión perdida durante PUT directo"));
    xhr.onabort = () => reject(new DOMException("Upload cancelado", "AbortError"));
    if (params.signal) {
      if (params.signal.aborted) {
        xhr.abort();
        reject(new DOMException("Upload cancelado", "AbortError"));
        return;
      }
      params.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(blob);
  });

  return { key, url: publicUrl, contentType: blob.type, size: blob.size };
}

// ---------------------------------------------------------------------------
// deleteFile — best-effort bucket cleanup
// ---------------------------------------------------------------------------

export async function deleteFile(urlOrKey: string): Promise<boolean> {
  if (!urlOrKey) return false;
  try {
    const isUrl = /^https?:\/\//i.test(urlOrKey) || urlOrKey.startsWith("/");
    const body = isUrl ? { url: urlOrKey } : { key: urlOrKey };
    const res = await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}
